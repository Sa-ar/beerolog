from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    openai_api_key: str
    cognito_user_pool_id: str
    cognito_client_id: str
    cognito_region: str = "us-east-1"
    api_secret: str

    class Config:
        env_file = ".env"


settings = Settings()  # type: ignore[call-arg]
