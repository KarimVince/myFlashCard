from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    admin_password_hash: str
    cors_origins: str = "http://localhost:3000"

    # Cloudflare R2 (S3-compatible)
    r2_account_id: str = ""
    r2_access_key_id: str = "local"
    r2_secret_access_key: str = ""
    r2_bucket: str = "myflashcard"
    r2_public_url: str = ""   # e.g. https://pub-xxxx.r2.dev

    # Legacy — kept so existing .env files don't break on startup
    supabase_url: str = ""
    supabase_service_key: str = ""
    storage_bucket: str = "deck-json"

    model_config = {"env_file": ".env", "case_sensitive": False}

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
