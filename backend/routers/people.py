from fastapi import APIRouter, HTTPException

from routers.common import ensure_tmdb_token
from utils import fetch_anilist_json, fetch_tmdb_json, proxy_image_url

router = APIRouter()


@router.get("/anime/person/{person_id}")
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


@router.get("/person/{person_id}")
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
