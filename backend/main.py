from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import auth_router, session_router
from websocket import websocket_router
from config import get_settings
from core import RequestIdMiddleware, register_exception_handlers


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="A Cognitive-Aware AI Teaching Assistant for Programming Education",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Middleware — order matters: outermost first.
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

register_exception_handlers(app)

app.include_router(auth_router)
app.include_router(session_router)
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