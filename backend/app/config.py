from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://serveratlas:serveratlas_secret@db:5432/serveratlas"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://serveratlas:serveratlas_secret@db:5432/serveratlas"
    CORS_ORIGINS: str = "*"

    class Config:
        env_file = ".env"

    @property
    def cors_origin_list(self) -> list[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
