from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import auth_router, instructor_router, quiz_router, session_router
from config import get_settings, is_valid_jwt_secret
from core import (
    MaxBodySizeMiddleware,
    RequestIdMiddleware,
    SecurityHeadersMiddleware,
    register_exception_handlers,
)
from websocket import websocket_router


settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Fail fast on startup if security secrets are missing or insecure."""
    active_settings = get_settings()
    if not is_valid_jwt_secret(active_settings.jwt_secret):
        raise RuntimeError(
            "Startup aborted: JWT_SECRET must be a non-default secret at least 32 characters long."
        )
    yield


app = FastAPI(
    title=settings.app_name,
    description="A Cognitive-Aware AI Teaching Assistant for Programming Education",
    version=settings.app_version,
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url="/redoc" if settings.app_env != "production" else None,
    lifespan=lifespan,
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(MaxBodySizeMiddleware)
app.add_middleware(RequestIdMiddleware)

APPROVED_PRODUCTION_ORIGINS = (
    "https://cognicode-dpq4.vercel.app",
)

configured_origins = [
    origin.strip().rstrip("/")
    for origin in (settings.frontend_url or "").split(",")
    if origin.strip()
]

if settings.app_env == "production":
    allowed_origins = list(
        dict.fromkeys([*configured_origins, *APPROVED_PRODUCTION_ORIGINS])
    )
else:
    allowed_origins = list(
        dict.fromkeys(
            [
                *configured_origins,
                *APPROVED_PRODUCTION_ORIGINS,
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ]
        )
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)

register_exception_handlers(app)

app.include_router(auth_router)
app.include_router(session_router)
app.include_router(instructor_router)
app.include_router(quiz_router)
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
