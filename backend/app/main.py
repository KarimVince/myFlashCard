from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import admin, builds, categories, decks
from app.config import settings

app = FastAPI(
    title="myFlashCard API",
    description="Public deck library and admin API for myFlashCard",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(decks.router)
app.include_router(categories.router)
app.include_router(builds.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}


# Serve local_storage/ when running without Supabase (dev only)
_local_storage_dir = Path(__file__).parent.parent / "local_storage"
_local_storage_dir.mkdir(exist_ok=True)
app.mount("/local-storage", StaticFiles(directory=str(_local_storage_dir)), name="local_storage")
