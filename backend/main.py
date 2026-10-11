"""
Module: backend.main
Purpose: FastAPI application entry point.

         Wires together:
           - CORS for the React frontend
           - Request-ID middleware
           - Global error handlers
           - API routers (auth first; more to follow)
           - Root and health endpoints

Author: Abdullah (BSEF23M526)
Created: 10/10/2026
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import auth_router
from config import get_settings
from core import RequestIdMiddleware, register_exception_handlers


# --- Logging ---
# Basic config so errors show up in the console with timestamps.
# In production, replace with structured logging (JSON).
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

settings = get_settings()


# --- Application ---
app = FastAPI(
    title=settings.app_name,
    description="A Cognitive-Aware AI Teaching Assistant for Programming Education",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)


# --- Middleware (order matters — outermost first) ---
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],  # so frontend can read the request ID
)


# --- Global error handlers ---
register_exception_handlers(app)


# --- Routers ---
app.include_router(auth_router)


# --- Meta ---
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