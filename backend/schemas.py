from pydantic import BaseModel, EmailStr

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class FavoriteRequest(BaseModel):
    media_id: str
    media_type: str
    title: str
    poster: str | None = None

class ProgressRequest(BaseModel):
    media_id: str
    media_type: str
    title: str
    poster: str | None = None
    current_time: int
    duration: int

class OpeningSeenRequest(BaseModel):
    media_id: str
    media_type: str
    title: str
    
class RoastRequest(BaseModel):

    description: str

    title: str | None = None

    media_type: str | None = None
