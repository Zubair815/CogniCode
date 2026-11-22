from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import auth_router, session_router, instructor_router
from websocket import websocket_router
from config import get_settings
from core import RequestIdMiddleware, register_exception_handlers
from db.session import Base, engine
import db.models  # noqa: F401 — register ORM tables before schema initialization


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="A Cognitive-Aware AI Teaching Assistant for Programming Education",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.on_event("startup")
def initialize_database() -> None:
    """Ensure all ORM tables exist in the configured PostgreSQL database."""
    Base.metadata.create_all(bind=engine)


app.add_middleware(RequestIdMiddleware)

configured_origins = [
    origin.strip().rstrip("/")
    for origin in (settings.frontend_url or "").split(",")
    if origin.strip()
]

allowed_origins = list(
    dict.fromkeys(
        [
            *configured_origins,
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ]
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$|^https://[a-zA-Z0-9-]+\.(vercel\.app|netlify\.app|onrender\.com)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

register_exception_handlers(app)

app.include_router(auth_router)
app.include_router(session_router)
app.include_router(instructor_router)
app.include_router(websocket_router)


@app.get("/", tags=["Meta"])
def root() -> dict:
    return {
        "project": settings.app_name,
        "group": "BSEF23-63",
        "status": "running",
        "version": settings.app_version,
    }


@app.get("/health", tags=["Meta"])
def health() -> dict:
    return {"status": "ok"}
