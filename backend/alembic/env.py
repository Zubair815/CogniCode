"""
Module: alembic.env
Purpose: Alembic runtime configuration.
         Loads DATABASE_URL from our pydantic Settings (so secrets
         never live in alembic.ini), and imports all ORM models so
         Alembic can auto-generate migrations from model changes.

Author: Abdullah (BSEF23M526)
Created: 2026-02-20
"""

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# --- Make `backend/` importable so `from db...`, `from config...` work ---
# env.py lives at backend/alembic/env.py. We add backend/ to sys.path
# so it behaves as if Alembic were run from backend/ directly.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# --- Load settings and models ---
from config import get_settings              # noqa: E402
from db.session import Base                   # noqa: E402
# Importing models registers them on Base.metadata, which Alembic
# uses to detect schema changes.
import db.models  # noqa: F401, E402


# --- Alembic Config object ---
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# --- Inject DATABASE_URL from our Settings ---
# This ensures the .env file is the single source of truth.
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)


# --- Target metadata for autogenerate ---
# Alembic compares this against the current DB schema.
target_metadata = Base.metadata


# =============================================================================
# OFFLINE MODE
# =============================================================================
def run_migrations_offline() -> None:
    """
    Run migrations without a live DB connection.

    Useful for generating SQL scripts to review before applying.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# =============================================================================
# ONLINE MODE
# =============================================================================
def run_migrations_online() -> None:
    """
    Run migrations against a live DB connection.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,               # detect column type changes
            compare_server_default=True,     # detect default changes
        )

        with context.begin_transaction():
            context.run_migrations()


# --- Entry point ---
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()