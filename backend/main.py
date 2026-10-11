"""
Module: backend.main
Purpose: FastAPI application entry point.

         Wires together:
           - CORS for the React frontend
           - API routers (auth first; more to follow)
           - Root and health endpoints

Author: Abdullah (BSEF23M526)
Created: 10/10/2026
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import auth_router
from config import get_settings


settings = get_settings()


# --- Application ---
app = FastAPI(
    title=settings.app_name,
    description="A Cognitive-Aware AI Teaching Assistant for Programming Education",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)


# --- CORS ---
# Only the configured frontend origin is allowed. Wildcards are
# deliberately avoided so the browser enforces a tight boundary.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Routers ---
app.include_router(auth_router)


# --- Root ---
@app.get("/", tags=["Meta"])
def root() -> dict:
    """Return basic project metadata."""
    return {
        "project": settings.app_name,
        "group": "BSEF23-63",
        "status": "running",
        "version": settings.app_version,
    }


@app.get("/health", tags=["Meta"])
def health() -> dict:
    """Liveness probe for uptime checks."""
    return {"status": "ok"}