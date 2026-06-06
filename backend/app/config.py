from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Inventory & Order Management System"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/inventory_db"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
