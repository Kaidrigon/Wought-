from fastapi import APIRouter, HTTPException

from roast_service import generate_roast
from schemas import RoastRequest

router = APIRouter()


@router.post("/roast")
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
