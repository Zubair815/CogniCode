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


_INSECURE_SECRET_PLACEHOLDERS = frozenset({
    "",
    "secret",
    "changeme",
    "change_this_to_a_long_random_string",
    "replace_with_a_long_random_secret",
    "your_jwt_secret_here",
    "dev-secret",
})


def is_valid_jwt_secret(secret: str | None) -> bool:
    """Return True when jwt_secret is non-placeholder and >= 32 characters."""
    if not secret:
        return False
    stripped = secret.strip()
    if stripped.lower() in _INSECURE_SECRET_PLACEHOLDERS:
        return False
    return len(stripped) >= 32


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
    max_request_body_bytes: int = 1_048_576  # 1 MB HTTP payload limit

    # --- Database (PostgreSQL) ---
    # Set DATABASE_URL in backend/.env; no credentials are stored in source.
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/cognicode"

    # --- Authentication ---
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24            # legacy fallback if minutes unset
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    ws_ticket_expire_seconds: int = 60
    instructor_invite_code: str = ""
    cookie_samesite: str = ""             # "" => "none" in production, "lax" otherwise
    cookie_secure: bool | None = None     # None => True in production, False otherwise
    redis_url: str = ""                   # Optional Redis URL for multi-instance WS pub/sub

    # --- Rate Limiting ---
    auth_rate_limit_max: int = 10
    auth_rate_limit_window_seconds: int = 60
    register_rate_limit_max: int = 5
    register_rate_limit_window_seconds: int = 60
    ws_message_rate_limit_max: int = 15
    ws_message_rate_limit_window_seconds: int = 60
    ws_max_message_chars: int = 8000

    # --- LLM ---
    llm_provider: str = "ollama"          # "ollama" | "claude" | "groq"
    llm_api_key: str = ""
    llm_model: str = "claude-3-5-sonnet-latest"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    groq_model: str = "openai/gpt-oss-20b"

    # --- Vector DB / Chroma ---
    chroma_persist_dir: str = "./data/chroma"

    # --- Cognitive Dependency Score Weights (BR-08) ---
    # Configurable so they can be tuned during evaluation without code changes.
    cds_weight_solution_request: float = 0.25
    cds_weight_hint_level: float = 0.25
    cds_weight_retry: float = 0.15
    cds_weight_time_gap: float = 0.10
    cds_weight_debugging: float = 0.15
    cds_weight_quiz: float = 0.10

    # Pydantic settings configuration.
    # Reads from .env file or backend/.env; ignores extra env vars.
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
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
