from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://serveratlas:serveratlas_secret@db:5432/serveratlas"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://serveratlas:serveratlas_secret@db:5432/serveratlas"

    class Config:
        env_file = ".env"


settings = Settings()
