"""
Module: backend.config
Purpose: Centralized application configuration loaded from environment
         variables. All secrets and tunable parameters are defined here
         to avoid hardcoding values across the codebase.
Author: Abdullah (BSEF23M526)
Created: 01/10/2026
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    Uses pydantic-settings to validate and parse environment variables
    at startup. Missing required values will raise a validation error
    before the application starts — fail-fast behavior.
    """

    # --- Application ---
    app_name: str = "CogniCode"
    app_env: str = "development"          # development | production
    app_version: str = "0.1.0"

    # --- Backend ---
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    frontend_url: str = "http://localhost:5173"

    # --- Database ---
    # Format: postgresql://user:password@host:port/dbname
    database_url: str = "postgresql://postgres:postgres@localhost:5432/cognicode"

    # --- Authentication ---
    jwt_secret: str = "CHANGE_THIS_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    # --- LLM (used later in Phase 3) ---
    llm_provider: str = "claude"
    llm_api_key: str = ""
    llm_model: str = "claude-3-5-sonnet-latest"

    # --- Cognitive Dependency Score Weights (BR-08) ---
    # Configurable so they can be tuned during evaluation without code changes.
    cds_weight_solution_request: float = 0.25
    cds_weight_hint_level: float = 0.25
    cds_weight_retry: float = 0.15
    cds_weight_time_gap: float = 0.10
    cds_weight_debugging: float = 0.15
    cds_weight_quiz: float = 0.10

    # Pydantic settings configuration.
    # Reads from .env file at project root; ignores extra env vars.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    """
    Return a cached Settings instance.

    Using lru_cache ensures the .env file is read only once per
    application lifecycle, not on every import.
    """
    return Settings()