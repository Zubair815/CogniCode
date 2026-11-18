from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect

from api import auth_router, session_router, instructor_router
from websocket import websocket_router
from config import get_settings
from core import RequestIdMiddleware, register_exception_handlers
from db.session import Base, engine
import db.models  # noqa: F401 — register ORM tables before local initialization


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="A Cognitive-Aware AI Teaching Assistant for Programming Education",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.on_event("startup")
def initialize_local_database() -> None:
    """Create the small local demo schema when SQLite is selected."""
    if engine.dialect.name == "sqlite":
        Base.metadata.create_all(bind=engine)

# Middleware — order matters: outermost first.
app.add_middleware(RequestIdMiddleware)

allowed_origins = [
    settings.frontend_url,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
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
