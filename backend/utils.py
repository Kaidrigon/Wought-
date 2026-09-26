import random

from datetime import datetime, timedelta

from typing import Any

from fastapi import HTTPException

import httpx

from jose import jwt

from passlib.context import CryptContext


USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",

    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",

    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
]


GENRE_MAP = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Science Fiction",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western",
    10759: "Action & Adventure",
    10762: "Kids",
    10763: "News",
    10764: "Reality",
    10765: "Sci-Fi & Fantasy",
    10766: "Soap",
    10767: "Talk",
    10768: "War & Politics",
}


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    password: str,
    hashed_password: str,
) -> bool:
    return pwd_context.verify(
        password,
        hashed_password,
    )


def create_access_token(
    data: dict,
    secret_key: str,
) -> str:

    to_encode = data.copy()

    expire = (
        datetime.utcnow()
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    to_encode.update({
        "exp": expire
    })

    return jwt.encode(
        to_encode,
        secret_key,
        algorithm=ALGORITHM,
    )


def decode_access_token(
    token: str,
    secret_key: str,
) -> dict[str, Any]:

    return jwt.decode(
        token,
        secret_key,
        algorithms=[ALGORITHM],
    )


def get_tmdb_headers(
    read_token: str,
) -> dict[str, str]:

    return {
        "accept": "application/json",
        "Authorization": f"Bearer {read_token}",
    }


def get_anilist_headers() -> dict[str, str]:

    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def clean_html(
    text: str | None,
) -> str:

    if not text:
        return ""

    return (
        text
        .replace("<br>", "")
        .replace("<i>", "")
        .replace("</i>", "")
    )



def proxy_image_url(
    image_path: str | None,
    size: str = "w500",
) -> str | None:
    if not image_path:
        return None

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

    return (
        f"/proxy-image?path="
        f"{image_path.lstrip('/')}"
        f"&size={size}"
    )


def get_genre_names(
    genre_ids: list[int] | None,
) -> list[str]:

    if not genre_ids:
        return []

    return [
        GENRE_MAP.get(
            gid,
            "Unknown",
        )
        for gid in genre_ids
    ]


def normalize_mongo_docs(
    items: list[dict],
) -> list[dict]:

    for item in items:
        item["_id"] = str(
            item["_id"]
        )

        item["user_id"] = str(
            item["user_id"]
        )

    return items


def get_anilist_title(
    item: dict,
) -> str | None:

    return (
        item.get(
            "title",
            {},
        ).get("english")
        or item.get(
            "title",
            {},
        ).get("romaji")
    )


def parse_anilist_media_type(
    raw_format: str | None,
) -> str:

    return (
        "movie"
        if raw_format == "MOVIE"
        else "tv"
    )


def format_anilist_item(
    item: dict,
) -> dict[str, Any]:

    return {
        "anilist_id": item.get("id"),

        "media_type": parse_anilist_media_type(
            item.get(
                "format",
                "",
            )
        ),

        "title": get_anilist_title(
            item
        ),

        "release_date": str(
            item.get(
                "startDate",
                {},
            ).get("year")
            or "Unknown"
        ),

        "description": clean_html(
            item.get(
                "description",
                "",
            )
        ),

        "poster_link": item.get(
            "coverImage",
            {},
        ).get("large"),

        "genres": item.get(
            "genres",
            [],
        ),
    }


async def get_movie_artwork(
    fanart_key: str,
    tmdb_id: int,
) -> dict[str, Any]:

    if not fanart_key:
        return {
            "logo": None,
            "background": None,
        }

    url = (
        f"https://webservice.fanart.tv/v3/"
        f"movies/{tmdb_id}"
    )

    headers = {
        "api-key": fanart_key
    }

    from db import http_client

    response = await http_client.get(
        url,
        headers=headers,
    )

    if response.status_code != 200:
        return {
            "logo": None,
            "background": None,
        }

    data = response.json()

    logo = None
    background = None

    if data.get("hdmovielogo"):
        logo = data[
            "hdmovielogo"
        ][0]["url"]

    elif data.get("movielogo"):
        logo = data[
            "movielogo"
        ][0]["url"]

    if data.get("moviebackground"):
        background = data[
            "moviebackground"
        ][0]["url"]

    return {
        "logo": logo,
        "background": background,
    }


async def get_tmdb_logo(
    tmdb_id: int,
    media_type: str,
    read_token: str,
) -> str | None:

    if media_type == "movie":

        url = (
            f"https://api.themoviedb.org/3/"
            f"movie/{tmdb_id}/images"
        )

    elif media_type == "tv":

        url = (
            f"https://api.themoviedb.org/3/"
            f"tv/{tmdb_id}/images"
        )

    else:
        return None

    try:

        data = await fetch_tmdb_json(
            url,
            read_token,
            params={
                "include_image_language": "en,null",
            },
            timeout=8.0,
        )

    except httpx.HTTPError:
        return None

    logos = data.get(
        "logos",
        [],
    )

    if not logos:
        return None

    english_logos = [
        logo
        for logo in logos
        if logo.get("iso_639_1") == "en"
    ]

    selected_logo = (
        english_logos[0]
        if english_logos
        else logos[0]
    )

    return selected_logo.get(
        "file_path"
    )


async def get_hero_artwork(
    tmdb_id: int,
    media_type: str,
    fanart_key: str,
    read_token: str,
) -> dict[str, Any]:

    fanart_artwork = {
        "logo": None,
        "background": None,
    }

    if media_type == "movie":

        try:

            fanart_artwork = (
                await get_movie_artwork(
                    fanart_key,
                    tmdb_id,
                )
            )

        except Exception:

            fanart_artwork = {
                "logo": None,
                "background": None,
            }

    if fanart_artwork.get("logo"):

        return {
            "logo": fanart_artwork["logo"],

            "background": fanart_artwork.get(
                "background"
            ),

            "logo_source": "fanart",
        }

    tmdb_logo = await get_tmdb_logo(
        tmdb_id,
        media_type,
        read_token,
    )

    if tmdb_logo:

        return {
            "logo": proxy_image_url(
                tmdb_logo
            ),

            "background": fanart_artwork.get(
                "background"
            ),

            "logo_source": "tmdb",
        }

    return {
        "logo": None,

        "background": fanart_artwork.get(
            "background"
        ),

        "logo_source": None,
    }


async def fetch_tmdb_json(
    url: str,
    read_token: str,
    params: dict | None = None,
    timeout: float = 20.0,
) -> dict[str, Any]:

    headers = get_tmdb_headers(
        read_token
    )

    try:

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=20.0,
                read=timeout,
                write=10.0,
                pool=10.0,
            ),
            follow_redirects=True,
        ) as http_client:

            response = await http_client.get(
                url,
                headers=headers,
                params=params,
            )

    except httpx.ConnectError as exc:

        print("========================================")
        print("TMDB CONNECTION ERROR")
        print("URL:", url)
        print("ERROR:", repr(exc))
        print("========================================")

        raise HTTPException(
            status_code=503,
            detail="TMDB is currently unreachable.",
        )

    except httpx.TimeoutException as exc:

        print("========================================")
        print("TMDB TIMEOUT")
        print("URL:", url)
        print("ERROR:", repr(exc))
        print("========================================")

        raise HTTPException(
            status_code=504,
            detail="TMDB took too long to respond.",
        )

    except httpx.HTTPError as exc:

        print("========================================")
        print("TMDB HTTP ERROR")
        print("URL:", url)
        print("ERROR:", repr(exc))
        print("========================================")

        raise HTTPException(
            status_code=503,
            detail="TMDB is temporarily unavailable.",
        )

    response.raise_for_status()

    return response.json()


async def fetch_anilist_json(
    query: str,
    variables: dict[str, Any] | None = None,
    timeout: float = 20.0,
) -> dict[str, Any]:

    headers = get_anilist_headers()

    async with httpx.AsyncClient(
        timeout=timeout
    ) as http_client:

        try:

            response = await http_client.post(
                "https://graphql.anilist.co",
                json={
                    "query": query,
                    "variables": variables or {},
                },
                headers=headers,
            )

        except httpx.TimeoutException:

            raise HTTPException(
                status_code=504,
                detail=(
                    "AniList is taking too long "
                    "to respond."
                ),
            )

        except httpx.HTTPError:

            raise HTTPException(
                status_code=503,
                detail=(
                    "AniList is temporarily "
                    "unavailable."
                ),
            )

    if response.is_success:

        return response.json()

    try:

        error_data = response.json()

    except Exception:

        error_data = None

    print("========================================")
    print(
        "ANILIST STATUS:",
        response.status_code,
    )
    print(
        "ANILIST BODY:",
        response.text,
    )
    print("========================================")

    message = (
        error_data
        .get(
            "errors",
            [{}],
        )[0]
        .get("message")
        if isinstance(
            error_data,
            dict,
        )
        else None
    )

    raise HTTPException(
        status_code=503,
        detail=(
            message
            or "AniList is temporarily "
            "unavailable."
        ),
    )