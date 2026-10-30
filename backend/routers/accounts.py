import re

from fastapi import APIRouter, Depends, HTTPException

from auth import create_token_for_user, get_current_user
from db import (
    favorites_collection,
    history_collection,
    opening_seen_collection,
    progress_collection,
    users_collection,
)
from schemas import FavoriteRequest, LoginRequest, OpeningSeenRequest, ProgressRequest, RegisterRequest
from utils import hash_password, normalize_mongo_docs, verify_password

router = APIRouter()


@router.post("/register")
async def register(user: RegisterRequest):
    email = user.email.lower().strip()
    if not email.endswith("@gmail.com"):
        raise HTTPException(status_code=400, detail="Only Gmail accounts are allowed")

    if len(user.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if len(user.password) > 128:
        raise HTTPException(status_code=400, detail="Password too long")
    if not re.search(r"[A-Z]", user.password):
        raise HTTPException(status_code=400, detail="Password must contain an uppercase letter")
    if not re.search(r"[a-z]", user.password):
        raise HTTPException(status_code=400, detail="Password must contain a lowercase letter")
    if not re.search(r"\d", user.password):
        raise HTTPException(status_code=400, detail="Password must contain a number")

    existing_user = await users_collection.find_one(
        {"$or": [{"email": email}, {"username": user.username}]}
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    await users_collection.insert_one(
        {
            "username": user.username,
            "email": email,
            "password_hash": hash_password(user.password),
        }
    )

    return {"message": "Account created successfully"}


@router.post("/login")
async def login(user: LoginRequest):
    email = user.email.lower().strip()
    db_user = await users_collection.find_one({"email": email})
    if not db_user or not verify_password(user.password, db_user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {"access_token": create_token_for_user(db_user["email"]), "token_type": "bearer"}


@router.post("/favorites")
async def add_favorite(favorite: FavoriteRequest, current_user=Depends(get_current_user)):
    existing = await favorites_collection.find_one(
        {"user_id": current_user["_id"], "media_id": favorite.media_id}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already in favorites")

    await favorites_collection.insert_one(
        {
            "user_id": current_user["_id"],
            "media_id": favorite.media_id,
            "media_type": favorite.media_type,
            "title": favorite.title,
            "poster": favorite.poster,
            "created_at": None,
        }
    )
    return {"message": "Added to favorites"}


@router.get("/favorites")
async def get_favorites(current_user=Depends(get_current_user)):
    favorites = await favorites_collection.find({"user_id": current_user["_id"]}).to_list(None)
    return normalize_mongo_docs(favorites)


@router.delete("/favorites/{media_id}")
async def delete_favorite(media_id: str, current_user=Depends(get_current_user)):
    result = await favorites_collection.delete_one(
        {"user_id": current_user["_id"], "media_id": media_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"message": "Favorite removed"}


@router.delete("/favorites")
async def clear_favorites(current_user=Depends(get_current_user)):
    result = await favorites_collection.delete_many({"user_id": current_user["_id"]})
    return {"message": "Favorites cleared", "deleted": result.deleted_count}


@router.post("/progress")
async def save_progress(progress: ProgressRequest, current_user=Depends(get_current_user)):
    progress_percent = (progress.current_time / progress.duration) if progress.duration > 0 else 0
    if progress_percent < 0.05:
        return {"message": "Progress too small to save."}

    if progress_percent >= 0.95:
        await history_collection.update_one(
            {"user_id": current_user["_id"], "media_id": progress.media_id},
            {
                "$set": {
                    "media_type": progress.media_type,
                    "title": progress.title,
                    "poster": progress.poster,
                    "completed_at": None,
                }
            },
            upsert=True,
        )
        await progress_collection.delete_one(
            {"user_id": current_user["_id"], "media_id": progress.media_id}
        )
        return {"message": "Movie added to Watch History."}

    await progress_collection.update_one(
        {"user_id": current_user["_id"], "media_id": progress.media_id},
        {
            "$set": {
                "media_type": progress.media_type,
                "title": progress.title,
                "poster": progress.poster,
                "current_time": progress.current_time,
                "duration": progress.duration,
                "updated_at": None,
            }
        },
        upsert=True,
    )
    return {"message": "Progress saved"}


@router.get("/progress")
async def get_progress(current_user=Depends(get_current_user)):
    progress = await progress_collection.find({"user_id": current_user["_id"]}).to_list(length=100)
    return normalize_mongo_docs(progress)


@router.get("/history")
async def get_history(current_user=Depends(get_current_user)):
    history = await history_collection.find({"user_id": current_user["_id"]}).sort("completed_at", -1).to_list(length=100)
    return normalize_mongo_docs(history)


@router.get("/opening/seen/{media_type}/{media_id}")
async def has_opening_seen(media_type: str, media_id: str, current_user=Depends(get_current_user)):
    found = await opening_seen_collection.find_one(
        {"user_id": current_user["_id"], "media_type": media_type, "media_id": media_id}
    )
    return {"seen": found is not None}


@router.post("/opening/seen")
async def mark_opening_seen(payload: OpeningSeenRequest, current_user=Depends(get_current_user)):
    await opening_seen_collection.update_one(
        {"user_id": current_user["_id"], "media_id": payload.media_id, "media_type": payload.media_type},
        {"$set": {"title": payload.title, "seen_at": None}},
        upsert=True,
    )
    return {"message": "Opening marked as seen"}


@router.delete("/history/{media_id}")
async def delete_history(media_id: str, current_user=Depends(get_current_user)):
    result = await history_collection.delete_one({"user_id": current_user["_id"], "media_id": media_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="History item not found")
    return {"message": "History item removed"}
