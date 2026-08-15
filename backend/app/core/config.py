from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Suraksha DHPMS"
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://suraksha:suraksha_dev_pw@localhost:5432/suraksha_dhpms"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "dev-secret-change-me"
    cors_allow_origins: list[str] = ["http://localhost:3001", "http://127.0.0.1:3001"]


settings = Settings()
