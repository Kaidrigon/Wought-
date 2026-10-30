from fastapi import APIRouter

from routers.common import ensure_tmdb_token
from utils import (
    clean_html,
    fetch_anilist_json,
    fetch_tmdb_json,
    get_anilist_title,
    get_genre_names,
    parse_anilist_media_type,
    proxy_image_url,
)

router = APIRouter()


@router.get("/recommendations/movie/{movie_id}")
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


@router.get("/recommendations/tv/{tv_id}")
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


@router.get("/recommendations/anime/{anime_id}")
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
