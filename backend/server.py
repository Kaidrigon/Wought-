import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import accounts, catalog, details, people, recommendations, roasts

app = FastAPI(title="Wought+ Live API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://wought.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Welcome to the Wought+ API"}


app.include_router(accounts.router)
app.include_router(catalog.router)
app.include_router(details.router)
app.include_router(people.router)
app.include_router(recommendations.router)
app.include_router(roasts.router)


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
