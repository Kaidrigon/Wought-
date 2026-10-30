from fastapi import APIRouter, HTTPException

from db import fanart_key
from routers.common import ensure_tmdb_token, get_tmdb_trailer
from utils import (
    clean_html,
    fetch_anilist_json,
    fetch_tmdb_json,
    get_anilist_title,
    get_movie_artwork,
    get_tmdb_logo,
    proxy_image_url,
)

router = APIRouter()


@router.get("/movie/{movie_id}")
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


@router.get("/tv/{tv_id}")
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


@router.get("/tv/{tv_id}/season/{season_number}")
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


@router.get("/anime/{anime_id}")
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
