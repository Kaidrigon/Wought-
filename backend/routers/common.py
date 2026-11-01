from fastapi import HTTPException

from db import read_token
from utils import fetch_tmdb_json, get_genre_names, proxy_image_url


def ensure_tmdb_token() -> str:
    if not read_token:
        raise HTTPException(status_code=500, detail="TMDB token is not configured")
    return read_token

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

async def discover_tmdb(
    path: str,
    media_type: str,
    page: int,
    extra_params: dict | None = None,
) -> dict:
    params = {
        "page": page,
        **(extra_params or {}),
    }

    data = await fetch_tmdb_json(
        f"https://api.themoviedb.org/3/{path}",
        ensure_tmdb_token(),
        params=params,
    )

    results = [
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
            "poster_link": proxy_image_url(
                item.get("poster_path")
            ),
            "genres": get_genre_names(
                item.get("genre_ids", [])
            ),
        }
        for item in data.get("results", [])
    ]

    return {
        "page": data.get("page", page),
        "total_pages": min(data.get("total_pages", 1), 500),
        "total_results": data.get("total_results", 0),
        "results": results,
    }
