import httpx
import asyncio
import random
import re
from fastapi import FastAPI, HTTPException, Response, Depends, status
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from roast_service import generate_roast

from auth import create_token_for_user, get_current_user
from db import (
    favorites_collection,
    history_collection,
    opening_seen_collection,
    progress_collection,
    read_token,
    fanart_key,
    users_collection,
)
from schemas import (
    FavoriteRequest,
    LoginRequest,
    OpeningSeenRequest,
    ProgressRequest,
    RegisterRequest,
    RoastRequest,
)
from utils import (
    USER_AGENTS,
    clean_html,
    fetch_anilist_json,
    fetch_tmdb_json,
    get_anilist_title,
    get_genre_names,
    get_movie_artwork,
    hash_password,
    normalize_mongo_docs,
    parse_anilist_media_type,
    proxy_image_url,
    verify_password,
    get_tmdb_logo,
    get_hero_artwork,
)

app = FastAPI(title="Wought+ Live API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",
                    "http://127.0.0.1:5173",
                    "http://10.53.173.216:5173",
                    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ensure_tmdb_token() -> str:
    if not read_token:
        raise HTTPException(status_code=500, detail="TMDB token is not configured")
    return read_token


@app.get("/")
def read_root():
    return {"message": "Welcome to the Wought+ API"}


@app.post("/register")
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


@app.post("/login")
async def login(user: LoginRequest):
    email = user.email.lower().strip()
    db_user = await users_collection.find_one({"email": email})
    if not db_user or not verify_password(user.password, db_user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {"access_token": create_token_for_user(db_user["email"]), "token_type": "bearer"}


@app.post("/favorites")
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


@app.get("/favorites")
async def get_favorites(current_user=Depends(get_current_user)):
    favorites = await favorites_collection.find({"user_id": current_user["_id"]}).to_list(None)
    return normalize_mongo_docs(favorites)


@app.delete("/favorites/{media_id}")
async def delete_favorite(media_id: str, current_user=Depends(get_current_user)):
    result = await favorites_collection.delete_one(
        {"user_id": current_user["_id"], "media_id": media_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"message": "Favorite removed"}


@app.delete("/favorites")
async def clear_favorites(current_user=Depends(get_current_user)):
    result = await favorites_collection.delete_many({"user_id": current_user["_id"]})
    return {"message": "Favorites cleared", "deleted": result.deleted_count}


@app.post("/progress")
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


@app.get("/progress")
async def get_progress(current_user=Depends(get_current_user)):
    progress = await progress_collection.find({"user_id": current_user["_id"]}).to_list(length=100)
    return normalize_mongo_docs(progress)


@app.get("/history")
async def get_history(current_user=Depends(get_current_user)):
    history = await history_collection.find({"user_id": current_user["_id"]}).sort("completed_at", -1).to_list(length=100)
    return normalize_mongo_docs(history)


@app.get("/opening/seen/{media_type}/{media_id}")
async def has_opening_seen(media_type: str, media_id: str, current_user=Depends(get_current_user)):
    found = await opening_seen_collection.find_one(
        {"user_id": current_user["_id"], "media_type": media_type, "media_id": media_id}
    )
    return {"seen": found is not None}


@app.post("/opening/seen")
async def mark_opening_seen(payload: OpeningSeenRequest, current_user=Depends(get_current_user)):
    await opening_seen_collection.update_one(
        {"user_id": current_user["_id"], "media_id": payload.media_id, "media_type": payload.media_type},
        {"$set": {"title": payload.title, "seen_at": None}},
        upsert=True,
    )
    return {"message": "Opening marked as seen"}


@app.delete("/history/{media_id}")
async def delete_history(media_id: str, current_user=Depends(get_current_user)):
    result = await history_collection.delete_one({"user_id": current_user["_id"], "media_id": media_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="History item not found")
    return {"message": "History item removed"}


@app.get("/fanart/movie/{movie_id}")
async def fanart_movie(movie_id: int):
    return await get_movie_artwork(fanart_key, movie_id)

@app.get("/proxy-image")
async def proxy_image(
    path: str,
    size: str = "w500",
):
    allowed_sizes = {
        "w300",
        "w500",
        "w780",
        "w1280",
        "w1920",
        "original",
    }

    if size not in allowed_sizes:
        size = "w500"

    clean_path = path.lstrip("/")

    hidden_gateway_url = (
        "https://images.weserv.nl/"
        f"?url=image.tmdb.org/t/p/{size}/{clean_path}"
    )

    headers = {
        "User-Agent": random.choice(USER_AGENTS)
    }

    async with httpx.AsyncClient(
        follow_redirects=True
    ) as http_client:
        try:
            response = await http_client.get(
                hidden_gateway_url,
                headers=headers,
                timeout=20,
            )

            response.raise_for_status()

        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Image download failed: {exc}"
                ),
            )

    return Response(
        content=response.content,
        media_type=response.headers.get(
            "content-type",
            "image/jpeg",
        ),
    )

@app.get("/search/anime")
async def search_anime(
    title: str,
    response: Response,
    page: int = 1,
    cb: str | None = None,
):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"

    query = """
    query ($search: String, $page: Int) {

        Page (page: $page, perPage: 10) {

            media (search: $search, type: ANIME) {

                id

                title {
                    english
                    romaji
                }

                description

                coverImage {
                    large
                }

                format

                genres

                startDate {
                    year
                }
            }
        }
    }
    """

    data = await fetch_anilist_json(
        query,
        {
            "search": title.strip(),
            "page": page,
        },
    )

    media_list = (
        data
        .get("data", {})
        .get("Page", {})
        .get("media", [])
    )

    cleaned = []

    for item in media_list:

        cleaned.append(
            {
                "anilist_id": item.get("id"),

                "media_type": parse_anilist_media_type(
                    item.get("format", "")
                ),

                "title": get_anilist_title(item),

                "release_date": str(
                    item.get("startDate", {}).get("year")
                    or "Unknown"
                ),

                "description": clean_html(
                    item.get("description", "")
                ),

                "poster_link": (
                    item.get("coverImage", {}).get("large")
                ),

                "genres": item.get("genres", []),
            }
        )

    if not cleaned:
        raise HTTPException(
            status_code=404,
            detail="No more anime found",
        )

    return cleaned

@app.get("/search")
async def search_unified(
    title: str,
    page: int = 1,
):
    data = await fetch_tmdb_json(
        "https://api.themoviedb.org/3/search/multi",
        ensure_tmdb_token(),
        params={
            "query": title.strip(),
            "page": page,
        },
    )

    results = []

    for item in data.get("results", []):

        media_type = item.get("media_type")

        if media_type not in ["movie", "tv"]:
            continue

        poster = proxy_image_url(
            item.get("poster_path")
        )

        backdrop = proxy_image_url(
            item.get("backdrop_path")
        )

        results.append(
            {
                "tmdb_id": item.get("id"),

                "media_type": media_type,

                "title": (
                    item.get("title")
                    if media_type == "movie"
                    else item.get("name")
                ),

                "release_date": (
                    item.get("release_date")
                    if media_type == "movie"
                    else item.get("first_air_date")
                ),

                "description": item.get("overview"),

                "poster_link": poster,

                "backdrop_link": backdrop,

                "logo_link": None,

                "genres": get_genre_names(
                    item.get("genre_ids", [])
                ),
            }
        )

    if not results:
        raise HTTPException(
            status_code=404,
            detail="No more movies or TV shows found",
        )

    return results

@app.get("/discover/tv")
async def discover_tv(page: int = 1):
    return await _discover_tmdb("tv/popular", "tv", page)


@app.get("/discover/movies")
async def discover_movies(page: int = 1):
    return await _discover_tmdb("movie/popular", "movie", page)


@app.get("/discover/anime")
async def discover_anime(page: int = 1):
    query = """
    query ($page: Int) {
        Page(page: $page, perPage: 20) {
            media(type: ANIME, sort: POPULARITY_DESC) {
                id
                title { english romaji }
                description
                coverImage { large }
                format
                genres
                startDate { year }
            }
        }
    }
    """
    data = await fetch_anilist_json(query, {"page": page})
    media_list = data.get("data", {}).get("Page", {}).get("media", [])
    return [
        {
            "anilist_id": item.get("id"),
            "media_type": parse_anilist_media_type(item.get("format", "")),
            "title": get_anilist_title(item),
            "release_date": str(item.get("startDate", {}).get("year") or "Unknown"),
            "description": clean_html(item.get("description", "")),
            "poster_link": item.get("coverImage", {}).get("large"),
            "genres": item.get("genres", []),
        }
        for item in media_list
    ]

@app.get("/trending")
async def trending_movies(page: int = 1):
    try:
        data = await fetch_tmdb_json(
        "https://api.themoviedb.org/3/trending/all/week",
        ensure_tmdb_token(),
        params={"page": page},
        timeout=20.0,
    )
    except httpx.TimeoutException:
        raise HTTPException(
        status_code=504,
        detail="TMDB took too long to respond.",
    )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="TMDB could not be reached.",
    )
        
    items = [
        item
        for item in data.get("results", [])
        if item.get("media_type") in ["movie", "tv"]
    ]

    hero_items = items[:6]

    artwork_tasks = [
        get_hero_artwork(
            tmdb_id=item["id"],
            media_type=item["media_type"],
            fanart_key=fanart_key,
            read_token=ensure_tmdb_token(),
        )
        for item in hero_items
    ]

    hero_artwork = await asyncio.gather(
        *artwork_tasks,
        return_exceptions=True,
    )

    results = []

    for index, item in enumerate(items):

        artwork = (
            hero_artwork[index]
            if index < len(hero_artwork)
            and isinstance(hero_artwork[index], dict)
            else {
                "logo": None,
                "background": None,
            }
        )

        poster = proxy_image_url(
            item.get("poster_path")
        )

        
        backdrop = proxy_image_url(
            item.get("backdrop_path"),
                size="w1920",
)


        results.append(
            {
                "tmdb_id": item.get("id"),

                "media_type": item.get("media_type"),

                "title": (
                    item.get("title")
                    if item.get("media_type") == "movie"
                    else item.get("name")
                ),

                "release_date": (
                    item.get("release_date")
                    if item.get("media_type") == "movie"
                    else item.get("first_air_date")
                ),

                "description": item.get("overview"),

                "poster_link": poster,

                "backdrop_link": (
                    artwork.get("background")
                    or backdrop
                ),

                "logo_link": artwork.get("logo"),

                "genres": get_genre_names(
                    item.get("genre_ids", [])
                ),
            }
        )

    return results

@app.get("/now-playing")
async def now_playing_movies(page: int = 1):

    async def fetch_region(region: str):

        return await fetch_tmdb_json(
            "https://api.themoviedb.org/3/movie/now_playing",
            ensure_tmdb_token(),
            params={
                "language": "en-US",
                "region": region,
                "page": page,
            },
        )

    us_data, india_data = await asyncio.gather(
        fetch_region("US"),
        fetch_region("IN"),
    )

    combined = []

    combined.extend(us_data.get("results", []))
    combined.extend(india_data.get("results", []))

    seen_ids = set()
    unique_movies = []

    for item in combined:

        movie_id = item.get("id")

        if not movie_id:
            continue

        if movie_id in seen_ids:
            continue

        seen_ids.add(movie_id)
        unique_movies.append(item)

    return [
        {
            "tmdb_id": item.get("id"),
            "media_type": "movie",

            "title": item.get("title"),

            "release_date":
                item.get("release_date"),

            "description":
                item.get("overview"),

            "poster_link":
                proxy_image_url(
                    item.get("poster_path")
                ),

            "backdrop_link":
                proxy_image_url(
                    item.get("backdrop_path")
                ),

            "logo_link":
                None,

            "genres":
                get_genre_names(
                    item.get("genre_ids", [])
                ),
        }

        for item in unique_movies
    ]

@app.get("/test-tmdb-logo/{movie_id}")
async def test_tmdb_logo(movie_id: int):
    logo = await get_tmdb_logo(
        movie_id,
        ensure_tmdb_token(),
    )

    return {
        "tmdb_id": movie_id,
        "logo_path": logo,
        "logo_url": proxy_image_url(logo) if logo else None,
    }

@app.get("/trending/anime")
async def trending_anime(page: int = 1):
    query = """
    query ($page: Int) {
        Page(page: $page, perPage: 20) {
            media(type: ANIME, sort: TRENDING_DESC) {
                id
                title { english romaji }
                description
                coverImage { large }
                format
                genres
                startDate { year }
            }
        }
    }
    """
    data = await fetch_anilist_json(query, {"page": page})
    media_list = data.get("data", {}).get("Page", {}).get("media", [])
    return [
        {
            "anilist_id": item.get("id"),
            "media_type": parse_anilist_media_type(item.get("format", "")),
            "title": get_anilist_title(item),
            "release_date": str(item.get("startDate", {}).get("year") or "Unknown"),
            "description": clean_html(item.get("description", "")),
            "poster_link": item.get("coverImage", {}).get("large"),
            "genres": item.get("genres", []),
        }
        for item in media_list
    ]

async def get_tmdb_trailer(
    media_type: str,
    media_id: int,
    tmdb_token: str,
):
    videos = await fetch_tmdb_json(
        f"https://api.themoviedb.org/3/{media_type}/{media_id}/videos",
        tmdb_token,
    )

    results = videos.get("results", [])

    youtube_videos = [
        video
        for video in results
        if video.get("site") == "YouTube"
        and video.get("key")
    ]

    # Prefer official YouTube trailers first.
    trailers = [
        video
        for video in youtube_videos
        if video.get("type") == "Trailer"
        and video.get("official") is True
    ]

    # If there is no official trailer, accept any YouTube trailer.
    if not trailers:
        trailers = [
            video
            for video in youtube_videos
            if video.get("type") == "Trailer"
        ]

    if not trailers:
        return None

    return (
        f"https://www.youtube.com/watch?v="
        f"{trailers[0]['key']}"
    )

@app.get("/movie/{movie_id}")
async def get_movie(movie_id: int):

    tmdb_token = ensure_tmdb_token()

    data = await fetch_tmdb_json(
        f"https://api.themoviedb.org/3/movie/{movie_id}",
        tmdb_token,
        params={
            "append_to_response": "credits"
        },
    )

    credits = data.get("credits", {})

    cast = [
        {
            "id": person.get("id"),
            "name": person.get("name"),
            "character": person.get("character"),
            "profile_link": proxy_image_url(
                person.get("profile_path")
            ),
            "department": "Acting",
            "job": None,
        }
        for person in credits.get("cast", [])[:20]
    ]

    crew = [
        {
            "id": person.get("id"),
            "name": person.get("name"),
            "character": None,
            "profile_link": proxy_image_url(
                person.get("profile_path")
            ),
            "department": person.get("department"),
            "job": person.get("job"),
        }
        for person in credits.get("crew", [])
        if person.get("job") in {
            "Director",
            "Executive Producer",
            "Producer",
            "Writer",
            "Creator",
            "Screenplay",
            "Story",
        }
    ][:20]

    artwork = await get_movie_artwork(
        fanart_key,
        movie_id,
    )

    tmdb_logo = await get_tmdb_logo(
        movie_id,
        "movie",
        tmdb_token,
    )

    trailer = await get_tmdb_trailer(
        "movie",
        movie_id,
        tmdb_token,
    )

    return {
        "tmdb_id":
            data.get("id"),

        "title":
            data.get("title"),

        "description":
            data.get("overview"),

        "poster_link":
            proxy_image_url(
                data.get("poster_path")
            ),

        "backdrop_link":
            artwork.get("background")
            or proxy_image_url(
                data.get("backdrop_path")
            ),

        "logo_link":
            artwork.get("logo")
            or (
                proxy_image_url(tmdb_logo)
                if tmdb_logo
                else None
            ),

        "release_date":
            data.get("release_date"),

        "runtime":
            data.get("runtime"),

        "rating":
            data.get("vote_average"),

        "genres": [
            genre.get("name")
            for genre in data.get("genres", [])
        ],

        "language":
            data.get("original_language"),

        "status":
            data.get("status"),

        "tagline":
            data.get("tagline"),

        "adult":
            data.get("adult"),

        "cast":
            cast,

        "crew":
            crew,

        "trailer":
            trailer,
    }


@app.get("/tv/{tv_id}")
async def get_tv(tv_id: int):

    tmdb_token = ensure_tmdb_token()

    data = await fetch_tmdb_json(
        f"https://api.themoviedb.org/3/tv/{tv_id}",
        tmdb_token,
        params={
            "append_to_response":
                "external_ids,credits"
        },
    )

    credits = data.get("credits", {})

    cast = [
        {
            "id": person.get("id"),
            "name": person.get("name"),
            "character": person.get("character"),
            "profile_link": proxy_image_url(
                person.get("profile_path")
            ),
            "department": "Acting",
            "job": None,
        }
        for person in credits.get("cast", [])[:20]
    ]

    crew = [
        {
            "id": person.get("id"),
            "name": person.get("name"),
            "character": None,
            "profile_link": proxy_image_url(
                person.get("profile_path")
            ),
            "department": person.get("department"),
            "job": person.get("job"),
        }
        for person in credits.get("crew", [])
        if person.get("job") in {
            "Director",
            "Executive Producer",
            "Producer",
            "Writer",
            "Creator",
            "Screenplay",
            "Story",
        }
    ][:20]

    seasons = [
        {
            "season_number":
                season.get("season_number"),

            "name":
                season.get("name"),

            "overview":
                season.get("overview"),

            "air_date":
                season.get("air_date"),

            "episode_count":
                season.get("episode_count"),

            "poster_link":
                proxy_image_url(
                    season.get("poster_path")
                ),
        }
        for season in data.get("seasons", [])
    ]

    trailer = await get_tmdb_trailer(
        "tv",
        tv_id,
        tmdb_token,
    )

    return {
        "tmdb_id":
            data.get("id"),

        "title":
            data.get("name"),

        "description":
            data.get("overview"),

        "poster_link":
            proxy_image_url(
                data.get("poster_path")
            ),

        "backdrop_link":
            proxy_image_url(
                data.get("backdrop_path")
            ),

        "first_air_date":
            data.get("first_air_date"),

        "last_air_date":
            data.get("last_air_date"),

        "runtime": (
            data.get("episode_run_time")[0]
            if data.get("episode_run_time")
            else None
        ),

        "rating":
            data.get("vote_average"),

        "genres": [
            genre.get("name")
            for genre in data.get("genres", [])
        ],

        "language":
            data.get("original_language"),

        "status":
            data.get("status"),

        "tagline":
            data.get("tagline"),

        "adult":
            data.get("adult"),

        "number_of_seasons":
            data.get("number_of_seasons"),

        "number_of_episodes":
            data.get("number_of_episodes"),

        "in_production":
            data.get("in_production"),

        "imdb_id":
            data.get(
                "external_ids",
                {}
            ).get("imdb_id"),

        "seasons":
            seasons,

        "cast":
            cast,

        "crew":
            crew,

        "trailer":
            trailer,
    }

@app.get("/tv/{tv_id}/season/{season_number}")
async def get_tv_season(
        tv_id: int,
    season_number: int,
    ):
    if season_number < 0:
        raise HTTPException(
status_code=400,
detail="Invalid season number.",
        )
    data = await fetch_tmdb_json(
f"https://api.themoviedb.org/3/tv/{tv_id}/season/{season_number}",
ensure_tmdb_token(),
    )
    return {
        "tv_id": data.get("show_id") or tv_id,
        "season_number": data.get("season_number"),
        "name": data.get("name"),
        "overview": data.get("overview"),
        "poster_link": proxy_image_url(
            data.get("poster_path")
        ),
        "air_date": data.get("air_date"),
        "episode_count": len(
            data.get("episodes", [])
        ),
        "episodes": [
            {
                "id": episode.get("id"),
                "episode_number": episode.get(
                    "episode_number"
                ),
                "name": episode.get("name"),
                "overview": episode.get(
                    "overview"
                ),
                "air_date": episode.get(
                    "air_date"
                ),
                "runtime": episode.get(
                    "runtime"
                ),
                "rating": episode.get(
                    "vote_average"
                ),
                "still_link": proxy_image_url(
                    episode.get("still_path")
                ),
            }
            for episode in data.get(
                "episodes",
                []
            )
        ],
    }

@app.get("/anime/{anime_id}")
async def get_anime(anime_id: int):

    query = """
    query ($id: Int) {
        Media(id: $id, type: ANIME) {

            id

            title {
                english
                romaji
                native
            }

            description

            coverImage {
                extraLarge
            }

            bannerImage

            format

            status

            episodes

            duration

            averageScore

            season

            seasonYear

            genres

            studios(isMain: true) {
                nodes {
                    name
                }
            }

            trailer {
                id
                site
            }

            characters(
                sort: [RELEVANCE, ROLE]
                perPage: 20
            ) {
                edges {
                    role

                    node {
                        id
                        name {
                            full
                        }
                        image {
                            large
                        }
                    }

                    voiceActors(language: JAPANESE) {
                        id
                        name {
                            full
                        }
                        image {
                            large
                        }
                    }
                }
            }

            staff(
                sort: [RELEVANCE]
                perPage: 20
            ) {
                edges {
                    role

                    node {
                        id
                        name {
                            full
                        }
                        image {
                            large
                        }
                    }
                }
            }
        }
    }
    """

    data = await fetch_anilist_json(
        query,
        {"id": anime_id},
    )

    anime = (
        data
        .get("data", {})
        .get("Media")
    )

    if anime is None:
        raise HTTPException(
            status_code=404,
            detail="Anime not found"
        )

    cast = []

    for edge in (
        anime
        .get("characters", {})
        .get("edges", [])
    ):

        character = edge.get("node") or {}

        voice_actors = (
            edge.get("voiceActors") or []
        )
        voice_actor = (
            voice_actors[0]
            if voice_actors
            else None
        )

        if not voice_actor:
            continue

        voice_actor_name = (
            voice_actor
            .get("name", {})
            .get("full")
        )

        if not voice_actor_name:
            continue

        cast.append({
            "id":
                voice_actor.get("id"),

            "name":
                voice_actor_name,

            "character":
                (
                    character
                    .get("name", {})
                    .get("full")
                ),

            "profile_link":
                voice_actor
                .get("image", {})
                .get("large"),

            "department":
                "Acting",

            "job":
                None,
        })

    crew = []

    allowed_staff_roles = {
        "Director",
        "Original Creator",
        "Original Creator / Creator",
        "Series Composition",
        "Script",
        "Screenplay",
        "Story",
        "Chief Animation Director",
        "Animation Director",
        "Character Design",
        "Music",
        "Producer",
    }

    for edge in (
        anime
        .get("staff", {})
        .get("edges", [])
    ):

        person = edge.get("node") or {}

        role = edge.get("role")

        if not role:
            continue

        if role not in allowed_staff_roles:
            continue

        person_name = (
            person
            .get("name", {})
            .get("full")
        )

        if not person_name:
            continue

        crew.append({
            "id":
                person.get("id"),

            "name":
                person_name,

            "character":
                None,

            "profile_link":
                person
                .get("image", {})
                .get("large"),

            "department":
                "Staff",

            "job":
                role,
        })

    trailer = anime.get("trailer")

    trailer_url = (
        f"https://www.youtube.com/watch?v={trailer['id']}"
        if trailer
        and trailer.get("site") == "youtube"
        and trailer.get("id")
        else None
    )

    return {
        "anilist_id":
            anime.get("id"),

        "title":
            get_anilist_title(anime),

        "romaji_title":
            anime
            .get("title", {})
            .get("romaji"),

        "native_title":
            anime
            .get("title", {})
            .get("native"),

        "description":
            clean_html(
                anime.get(
                    "description",
                    ""
                )
            ),

        "poster_link":
            anime
            .get("coverImage", {})
            .get("extraLarge"),

        "banner_link":
            anime.get("bannerImage"),

        "format":
            anime.get("format"),

        "status":
            anime.get("status"),

        "episodes":
            anime.get("episodes"),

        "duration":
            anime.get("duration"),

        "rating":
            anime.get("averageScore"),

        "season":
            anime.get("season"),

        "year":
            anime.get("seasonYear"),

        "genres":
            anime.get("genres"),

        "studios": [
            studio.get("name")
            for studio in (
                anime
                .get("studios", {})
                .get("nodes", [])
            )
        ],

        "trailer":
            trailer_url,

        "cast":
            cast,

        "crew":
            crew,
    }

@app.get("/anime/person/{person_id}")
async def get_anime_person(person_id: int):

    query = """
    query ($id: Int) {
        Staff(id: $id) {

            id

            name {
                full
                native
            }

            description

            image {
                large
            }

            dateOfBirth {
                year
                month
                day
            }

            dateOfDeath {
                year
                month
                day
            }

            homeTown

            primaryOccupations

            staffMedia(
                sort: START_DATE_DESC
                perPage: 20
            ) {
                edges {
                    node {
                        id

                        title {
                            romaji
                            english
                            native
                        }

                        type

                        format

                        startDate {
                            year
                            month
                            day
                        }

                        coverImage {
                            large
                        }
                    }
                }
            }
        }
    }
    """

    data = await fetch_anilist_json(
        query,
        {
            "id": person_id
        }
    )

    staff = (
        data
        .get("data", {})
        .get("Staff")
    )

    if not staff:
        raise HTTPException(
            status_code=404,
            detail="Anime person not found"
        )

    def format_date(date_data):
        if not date_data:
            return None

        year = date_data.get("year")
        month = date_data.get("month")
        day = date_data.get("day")

        if not year:
            return None

        if month and day:
            return f"{year:04d}-{month:02d}-{day:02d}"

        if month:
            return f"{year:04d}-{month:02d}"

        return str(year)

    credits = []

    for edge in (
        staff
        .get("staffMedia", {})
        .get("edges", [])
    ):

        media = edge.get("node") or {}

        if not media.get("id"):
            continue

        media_type = (
            media.get("type") or ""
        ).lower()

        title_data = (
            media.get("title") or {}
        )

        title = (
            title_data.get("english")
            or title_data.get("romaji")
            or title_data.get("native")
            or "Untitled"
        )

        credits.append(
            {
                "id":
                    media.get("id"),

                "title":
                    title,

                "media_type":
                    "anime"
                    if media_type == "anime"
                    else media_type,

                "character":
                    None,

                "job":
                    None,

                "poster_link":
                    (
                        media
                        .get("coverImage", {})
                        .get("large")
                    ),

                "release_date":
                    format_date(
                        media.get("startDate")
                    ),
            }
        )

    return {
        "id":
            staff.get("id"),

        "name":
            (
                staff
                .get("name", {})
                .get("full")
                or "Unknown"
            ),

        "biography":
            staff.get("description"),

        "birthday":
            format_date(
                staff.get("dateOfBirth")
            ),

        "deathday":
            format_date(
                staff.get("dateOfDeath")
            ),

        "place_of_birth":
            staff.get("homeTown"),

        "profile_link":
            (
                staff
                .get("image", {})
                .get("large")
            ),

        "known_for_department":
            (
                ", ".join(
                    staff.get(
                        "primaryOccupations"
                    ) or []
                )
                or None
            ),

        "credits":
            credits,
    }
    
@app.get("/person/{person_id}")
async def get_person(person_id: int):

    data = await fetch_tmdb_json(
        f"https://api.themoviedb.org/3/person/{person_id}",
        ensure_tmdb_token(),
        params={
            "append_to_response":
                "combined_credits"
        },
    )

    credits = data.get(
        "combined_credits",
        {}
    )

    known_for = []

    for item in credits.get("cast", []):

        known_for.append({
            "id":
                item.get("id"),

            "title":
                (
                    item.get("title")
                    or item.get("name")
                ),

            "media_type":
                item.get("media_type"),

            "character":
                item.get("character"),

            "poster_link":
                proxy_image_url(
                    item.get("poster_path")
                ),

            "release_date":
                (
                    item.get("release_date")
                    or item.get("first_air_date")
                ),
        })

    for item in credits.get("crew", []):

        known_for.append({
            "id":
                item.get("id"),

            "title":
                (
                    item.get("title")
                    or item.get("name")
                ),

            "media_type":
                item.get("media_type"),

            "character":
                None,

            "job":
                item.get("job"),

            "poster_link":
                proxy_image_url(
                    item.get("poster_path")
                ),

            "release_date":
                (
                    item.get("release_date")
                    or item.get("first_air_date")
                ),
        })

    return {
        "id":
            data.get("id"),

        "name":
            data.get("name"),

        "biography":
            data.get("biography"),

        "birthday":
            data.get("birthday"),

        "deathday":
            data.get("deathday"),

        "place_of_birth":
            data.get("place_of_birth"),

        "profile_link":
            proxy_image_url(
                data.get("profile_path")
            ),

        "known_for_department":
            data.get(
                "known_for_department"
            ),

        "credits":
            known_for,
    }

@app.get("/recommendations/movie/{movie_id}")
async def movie_recommendations(movie_id: int, page: int = 1):
    data = await fetch_tmdb_json(
        f"https://api.themoviedb.org/3/movie/{movie_id}/recommendations",
        ensure_tmdb_token(),
        params={"page": page},
    )
    return [
        {
            "tmdb_id": item.get("id"),
            "media_type": item.get("media_type"),
            "title": item.get("title"),
            "release_date": item.get("release_date"),
            "description": item.get("overview"),
            "rating": item.get("vote_average"),
            "poster_link": proxy_image_url(item.get("poster_path")),
            "genres": get_genre_names(item.get("genre_ids", [])),
        }
        for item in data.get("results", [])
    ]
@app.get("/recommendations/tv/{tv_id}")
async def tv_recommendations(tv_id: int, page: int = 1):
    data = await fetch_tmdb_json(
        f"https://api.themoviedb.org/3/tv/{tv_id}/recommendations",
        ensure_tmdb_token(),
        params={"page": page},
    )
    return [
        {
            "tmdb_id": item.get("id"),
            "media_type": "tv",
            "title": item.get("name"),
            "release_date": item.get("first_air_date"),
            "description": item.get("overview"),
            "rating": item.get("vote_average"),
            "poster_link": proxy_image_url(item.get("poster_path")),
            "genres": get_genre_names(item.get("genre_ids", [])),
        }
        for item in data.get("results", [])
    ]
@app.get("/recommendations/anime/{anime_id}")
async def anime_recommendations(anime_id: int):
    query = """
    query ($id: Int) {
        Media(id: $id, type: ANIME) {
            recommendations(sort: RATING_DESC, perPage: 20) {
                nodes {
                    mediaRecommendation {
                        id
                        title { english romaji }
                        description
                        coverImage { large }
                        format
                        genres
                        startDate { year }
                        averageScore
                    }
                }
            }
        }
    }
    """
    data = await fetch_anilist_json(query, {"id": anime_id})
    nodes = data.get("data", {}).get("Media", {}).get("recommendations", {}).get("nodes", [])
    return [
        {
            "anilist_id": anime.get("id"),
            "media_type": parse_anilist_media_type(anime.get("format")),
            "title": get_anilist_title(anime),
            "release_date": str(anime.get("startDate", {}).get("year") or "Unknown"),
            "description": clean_html(anime.get("description", "")),
            "poster_link": anime.get("coverImage", {}).get("large"),
            "rating": anime.get("averageScore"),
            "genres": anime.get("genres", []),
        }
        for node in nodes
        if (anime := node.get("mediaRecommendation"))
    ]
async def _discover_tmdb(path: str, media_type: str, page: int) -> list[dict]:
    data = await fetch_tmdb_json(
        f"https://api.themoviedb.org/3/{path}",
        ensure_tmdb_token(),
        params={"page": page},
    )
    return [
        {
            "tmdb_id": item.get("id"),
            "media_type": media_type,
            "title": item.get("title") if media_type == "movie" else item.get("name"),
            "release_date": item.get("release_date") if media_type == "movie" else item.get("first_air_date"),
            "description": item.get("overview"),
            "poster_link": proxy_image_url(item.get("poster_path")),
            "genres": get_genre_names(item.get("genre_ids", [])),
        }
        for item in data.get("results", [])
    ]


@app.post("/roast")
async def create_roast(request: RoastRequest):

    try:

        roast = await generate_roast(
            description=request.description,
            title=request.title,
            media_type=request.media_type,
        )

        return {
            "roast": roast,
        }

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:

        print(
            "Groq roast generation failed:",
            repr(error),
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to generate a Wought+ roast.",
        )

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
    
