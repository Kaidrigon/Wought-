import os

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from db import users_collection
from utils import create_access_token, decode_access_token, hash_password, verify_password

SECRET_KEY = os.getenv("JWT_SECRET_KEY")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def create_token_for_user(email: str) -> str:
    return create_access_token({"sub": email}, SECRET_KEY)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    if not SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT secret key is not configured"
        )

    try:
        payload = decode_access_token(token, SECRET_KEY)
        email = payload.get("sub")
        if email is None:
            raise ValueError()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    user = await users_collection.find_one({"email": email})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    return user
