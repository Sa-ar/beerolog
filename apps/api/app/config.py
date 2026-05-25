from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = ""
    openai_api_key: str = ""
    cognito_user_pool_id: str = ""
    cognito_client_id: str = ""
    cognito_region: str = "us-east-1"
    api_secret: str = "dev-secret"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
