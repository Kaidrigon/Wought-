import os
import httpx
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("apki.env")

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client["movies"]

users_collection = db["users"]
favorites_collection = db["favorites"]
progress_collection = db["watch_progress"]
history_collection = db["watch_history"]
opening_seen_collection = db["opening_seen"]

read_token = os.getenv("TMDB_READ_TOKEN")
fanart_key = os.getenv("FANART_API_KEY")
http_client = httpx.AsyncClient(timeout=20.0)
