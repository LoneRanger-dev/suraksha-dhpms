from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Suraksha DHPMS"
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://suraksha:suraksha_dev_pw@localhost:5432/suraksha_dhpms"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "dev-secret-change-me"
    cors_allow_origins: list[str] = [
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://suraksha-dhpms.vercel.app",
        "https://suraksha-dhpms-git-main-alone-ranger-s-projects.vercel.app",
    ]

    @field_validator("database_url")
    @classmethod
    def _use_asyncpg_driver(cls, value: str) -> str:
        """Normalizes whatever scheme a Postgres provider hands out (Neon/Vercel
        Postgres issue plain postgres:// or postgresql://) to the asyncpg driver
        this app is built on, so a pasted connection string just works."""
        if value.startswith("postgres://"):
            return "postgresql+asyncpg://" + value[len("postgres://") :]
        if value.startswith("postgresql://") and "+asyncpg" not in value:
            return "postgresql+asyncpg://" + value[len("postgresql://") :]
        return value


settings = Settings()
