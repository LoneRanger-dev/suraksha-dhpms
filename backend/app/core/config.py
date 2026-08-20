from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Suraksha DHPMS"
    environment: str = "development"
    # DATABASE_URL for local dev; DATABASE_POSTGRES_URL is what the Vercel
    # Neon integration actually names the pooled connection string (prefix
    # "DATABASE" + Neon's own "POSTGRES_URL" convention).
    database_url: str = Field(
        default="postgresql+asyncpg://suraksha:suraksha_dev_pw@localhost:5432/suraksha_dhpms",
        validation_alias=AliasChoices("DATABASE_URL", "DATABASE_POSTGRES_URL"),
    )
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "dev-secret-change-me"
    # Base URL of the deployed frontend - encoded into every QR card's scan
    # link, so it must point at wherever /scan/[token] is actually reachable.
    frontend_base_url: str = "https://suraksha-dhpms.vercel.app"
    cors_allow_origins: list[str] = [
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://suraksha-dhpms.vercel.app",
        "https://suraksha-dhpms-git-main-alone-ranger-s-projects.vercel.app",
    ]

    @field_validator("database_url")
    @classmethod
    def _use_asyncpg_driver(cls, value: str) -> str:
        """Normalizes whatever a Postgres provider hands out into a connection
        string asyncpg actually accepts:
        - postgres:// / postgresql:// -> postgresql+asyncpg:// (driver scheme)
        - drops `channel_binding` (libpq-only, asyncpg's connect() rejects it
          as an unknown kwarg) and renames `sslmode` -> `ssl` (asyncpg's name
          for the same option) — both appear in Neon's default connection
          strings, which is what Vercel's Postgres integration injects.
        """
        if value.startswith("postgres://"):
            value = "postgresql+asyncpg://" + value[len("postgres://") :]
        elif value.startswith("postgresql://") and "+asyncpg" not in value:
            value = "postgresql+asyncpg://" + value[len("postgresql://") :]

        parts = urlsplit(value)
        if not parts.query:
            return value

        query = parse_qs(parts.query)
        query.pop("channel_binding", None)
        if "sslmode" in query:
            query["ssl"] = query.pop("sslmode")
        new_query = urlencode(query, doseq=True)
        return urlunsplit((parts.scheme, parts.netloc, parts.path, new_query, parts.fragment))


settings = Settings()
