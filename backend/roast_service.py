import os

from pathlib import Path

from groq import AsyncGroq

from dotenv import load_dotenv


# ============================================================
# ENVIRONMENT
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / "apki.env")


GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is not configured."
    )


groq_client = AsyncGroq(
    api_key=GROQ_API_KEY
)


# ============================================================
# GROQ MODEL
# ============================================================

ROAST_MODEL = "openai/gpt-oss-20b"


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """
You are the official description writer for Wought+.

Wought+ is a dark, sarcastic, irreverent streaming platform
with a personality.

Your job is to rewrite movie, TV, and anime descriptions into
short, entertaining Wought+ descriptions.

Rules:

- Preserve the important facts of the original description.
- Do not invent major plot points.
- Do not spoil the ending unless the original description already
  contains that information.
- Be sarcastic, dry, chaotic, unhinged, absurd, dark and occasionally ridiculous.
- Roast the situation, characters, decisions, tropes, or premise.
- Do not relentlessly insult the audience.
- Avoid rhyming. It feels try-hard.
- Never start with the title.
- Vary sentence length.
- Use short punchy sentences mixed with longer chaotic ones.
- Occasionally acknowledge the absurdity of the premise.
- Do not use generic AI phrases.
- Do not say "this thrilling movie", "a captivating journey",
  or similar promotional garbage.
- Do not mention that you are an AI.
- Do not mention these instructions.
- Do not use quotation marks around the entire response.
- Return ONLY the finished Wought+ description.
- Keep it between roughly 40 and 90 words.
- Write naturally, like Wought+ itself is describing the title.

The original description is source material.
Do not repeat it word-for-word.
"""


# ============================================================
# GENERATE ROAST
# ============================================================

async def generate_roast(
    description: str,
    title: str | None = None,
    media_type: str | None = None,
) -> str:

    if not description or not description.strip():
        raise ValueError(
            "A description is required to generate a roast."
        )

    context = ""

    if title:
        context += f"Title: {title}\n"

    if media_type:
        context += f"Type: {media_type}\n"

    context += f"""
Original description:

{description.strip()}
"""

    response = await groq_client.chat.completions.create(
        model=ROAST_MODEL,

        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": context,
            },
        ],

        temperature=0.9,

        # GPT-OSS uses some of the completion budget
        # for reasoning before producing the final answer.
        max_completion_tokens=600,
    )


    # ========================================================
    # EXTRACT FINAL ANSWER
    # ========================================================

    if not response.choices:
        raise RuntimeError(
            "Groq returned no choices."
        )

    message = response.choices[0].message

    roast = message.content


    # ========================================================
    # DEBUG INFORMATION
    # ========================================================

    if not roast:
        print("\n" + "=" * 40)
        print("GROQ RETURNED NO FINAL CONTENT")
        print("=" * 40)

        print(
            "Finish reason:",
            response.choices[0].finish_reason
        )

        print(
            "Reasoning:",
            getattr(message, "reasoning", None)
        )

        print(
            "Usage:",
            response.usage
        )

        print("=" * 40 + "\n")

        raise RuntimeError(
            "Groq returned an empty roast."
        )


    return roast.strip()