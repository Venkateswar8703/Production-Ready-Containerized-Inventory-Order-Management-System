from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Inventory & Order Management System"
    API_V1_STR: str = "/api"
    # Fall back to SQLite in /tmp for serverless environments (Vercel)
    # In production Docker/Render, DATABASE_URL env var provides PostgreSQL
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "sqlite:////tmp/stockflow.db"
    )

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
