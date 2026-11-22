from pydantic import BaseModel, EmailStr
from typing import Literal

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
    completed: bool = False

    # Missing value means cinema, preserving existing WatchPage requests.
    media_source: Literal["cinema", "anime"] = "cinema"

    # Anime-specific information.
    episode: int | None = None
    season: int | None = None
    total_episodes: int | None = None

class OpeningSeenRequest(BaseModel):
    media_id: str
    media_type: str
    title: str
    
class RoastRequest(BaseModel):

    description: str

    title: str | None = None

    media_type: str | None = None
