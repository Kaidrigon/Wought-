import asyncio
import httpx
import random
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Response

from db import fanart_key
from routers.common import discover_tmdb, ensure_tmdb_token
from utils import (
    GENRE_MAP,
    TV_GENRE_IDS,
    USER_AGENTS,
    clean_html,
    fetch_anilist_json,
    fetch_tmdb_json,
    get_anilist_title,
    get_genre_names,
    get_hero_artwork,
    get_movie_artwork,
    get_tmdb_logo,
    parse_anilist_media_type,
    proxy_image_url,
    format_anilist_item,
)

router = APIRouter()


@router.get("/fanart/movie/{movie_id}")
async def fanart_movie(movie_id: int):
    return await get_movie_artwork(fanart_key, movie_id)


@router.get("/proxy-image")
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

@router.get("/proxy-anime-image")
async def proxy_anime_image(url: str):
    parsed_url = urlparse(url)

    # Only allow images hosted by AniList.
    hostname = parsed_url.hostname or ""

    if (
        parsed_url.scheme != "https"
        or not (
            hostname == "anilist.co"
            or hostname.endswith(".anilist.co")
        )
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid AniList image URL.",
        )

    try:
        async with httpx.AsyncClient(
            timeout=20,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0",
                "Referer": "https://anilist.co/",
            },
        ) as client:
            response = await client.get(url)
            response.raise_for_status()

            # Validate the final destination after redirects too.
            final_host = urlparse(str(response.url)).hostname or ""

            if not (
                final_host == "anilist.co"
                or final_host.endswith(".anilist.co")
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid image redirect.",
                )

            content_type = response.headers.get(
                "content-type",
                ""
            )

            if not content_type.startswith("image/"):
                raise HTTPException(
                    status_code=415,
                    detail="The requested resource is not an image.",
                )

            return Response(
                content=response.content,
                media_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=86400",
                },
            )

    except HTTPException:
        raise

    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve AniList image.",
        )

@router.get("/search/anime")
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


@router.get("/search")
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



@router.get("/discover/tv")
async def discover_tv(
    page: int = 1,
    genre_id: int | None = None,
    sort_by: str = "popularity.desc",
    year: int | None = None,
):
    allowed_sorts = {
        "popularity.desc",
        "popularity.asc",
        "vote_average.desc",
        "vote_average.asc",
        "first_air_date.desc",
        "first_air_date.asc",
    }

    if page < 1:
        raise HTTPException(
            status_code=400,
            detail="Page must be greater than zero."
        )

    if sort_by not in allowed_sorts:
        raise HTTPException(
            status_code=400,
            detail="Invalid sorting option."
        )

    params = {
        "page": page,
        "sort_by": sort_by,
        "include_adult": False,
        "include_null_first_air_dates": False,
    }

    if genre_id is not None:
        if genre_id not in TV_GENRE_IDS:
            raise HTTPException(
                status_code=400,
                detail="Invalid TV genre."
            )

        params["with_genres"] = genre_id

    if year is not None:
        if year < 1888 or year > 2100:
            raise HTTPException(
                status_code=400,
                detail="Invalid release year."
            )

        params["first_air_date_year"] = year

    return await discover_tmdb(
        "discover/tv",
        "tv",
        page,
        extra_params=params,
    )



@router.get("/discover/movies")
async def discover_movies(
    page: int = 1,
    genre_id: int | None = None,
    sort_by: str = "popularity.desc",
    year: int | None = None,
):
    allowed_sorts = {
        "popularity.desc",
        "popularity.asc",
        "vote_average.desc",
        "vote_average.asc",
        "primary_release_date.desc",
        "primary_release_date.asc",
        "revenue.desc",
    }

    if page < 1:
        raise HTTPException(
            status_code=400,
            detail="Page must be greater than zero.",
        )

    if sort_by not in allowed_sorts:
        raise HTTPException(
            status_code=400,
            detail="Invalid sorting option.",
        )

    params = {
        "page": page,
        "sort_by": sort_by,
        "include_adult": False,
        "include_video": False,
    }

    if genre_id is not None:
        if genre_id not in GENRE_MAP or genre_id >= 10000:
            raise HTTPException(
                status_code=400,
                detail="Invalid movie genre.",
            )

        params["with_genres"] = genre_id

    if year is not None:
        if year < 1888 or year > 2100:
            raise HTTPException(
                status_code=400,
                detail="Invalid release year.",
            )

        params["primary_release_year"] = year

    return await discover_tmdb(
        "discover/movie",
        "movie",
        page,
        extra_params=params,
    )



@router.get("/discover/anime")
async def discover_anime(
    page: int = 1,
    category: str = "movie",
    genre: str | None = None,
    sort_by: str = "popularity",
):
    formats = {
        "movie": ["MOVIE"],
        "tv": ["TV", "TV_SHORT", "ONA", "OVA", "SPECIAL"],
    }

    selected_formats = formats.get(category.lower())

    if not selected_formats:
        raise HTTPException(
            status_code=400,
            detail="Invalid anime category. Use 'movie' or 'tv'.",
        )

    if page < 1:
        raise HTTPException(
            status_code=400,
            detail="Page must be at least 1.",
        )

    sort_options = {
        "popularity": "POPULARITY_DESC",
        "score": "SCORE_DESC",
        "trending": "TRENDING_DESC",
        "newest": "START_DATE_DESC",
        "oldest": "START_DATE",
    }

    selected_sort = sort_options.get(sort_by.lower())

    if not selected_sort:
        raise HTTPException(
            status_code=400,
            detail="Invalid sort option.",
        )

    query = """
    query (
        $page: Int,
        $formats: [MediaFormat],
        $genres: [String],
        $sort: [MediaSort]
    ) {
        Page(page: $page, perPage: 20) {
            pageInfo {
                total
                currentPage
                lastPage
                hasNextPage
            }

            media(
                type: ANIME,
                format_in: $formats,
                genre_in: $genres,
                sort: $sort
            ) {
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
            "page": page,
            "formats": selected_formats,
            "genres": [genre] if genre else None,
            "sort": [selected_sort],
        },
    )

    page_data = (
        data.get("data", {})
        .get("Page", {})
    )

    media_list = page_data.get("media", [])
    page_info = page_data.get("pageInfo", {})

    return {
        "results": [
            format_anilist_item(item)
            for item in media_list
        ],
        "current_page": page_info.get("currentPage", page),
        "total_pages": page_info.get("lastPage", 1),
        "total_results": page_info.get("total", 0),
        "has_next_page": page_info.get("hasNextPage", False),
    }


@router.get("/trending")
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


@router.get("/now-playing")
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


@router.get("/test-tmdb-logo/{movie_id}")
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


@router.get("/trending/anime")
async def trending_anime(page: int = 1):
    query = """
    query ($page: Int) {
        Page(page: $page, perPage: 20) {
            media(type: ANIME, sort: TRENDING_DESC) {
                id
                title {
                    english
                    romaji
                }
                description
                coverImage {
                    large
                }
                bannerImage
                format
                genres
                startDate {
                    year
                }
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
            "release_date": str(
                item.get("startDate", {}).get("year") or "Unknown"
            ),
            "description": clean_html(item.get("description", "")),
            "poster_link": item.get("coverImage", {}).get("large"),
            "backdrop_link": item.get("bannerImage"),
            "genres": item.get("genres", []),
        }
        for item in media_list
    ]