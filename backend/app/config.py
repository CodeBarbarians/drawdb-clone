from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 1440
    database_url: str = "sqlite:///./drawdb_clone.db"
    cors_origins: str = "http://localhost:5173"
    backend_base_url: str = "http://localhost:8000"
    frontend_base_url: str = "http://localhost:5173"
    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""

    class Config:
        env_file = ".env"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        # Render (and Heroku-style hosts) hand out "postgres://", but
        # SQLAlchemy 1.4+ only recognizes the "postgresql://" scheme.
        if self.database_url.startswith("postgres://"):
            return "postgresql://" + self.database_url[len("postgres://"):]
        return self.database_url


settings = Settings()
