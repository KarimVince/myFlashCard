from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    admin_password_hash: str = ""   # legacy shared admin password; remove once admin accounts are in use
    cors_origins: str = "http://localhost:3000"

    # Accounts
    app_url: str = "http://localhost:3000"   # frontend base URL used in email links
    admin_email: str = ""                     # this account becomes admin once its email is verified
    resend_api_key: str = ""                  # empty → emails are printed to the log (dev)
    email_from: str = "myFlashCard <noreply@myflashcard.app>"

    # Fernet key encrypting API keys stored in the DB. Generate with:
    # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    secrets_key: str = ""

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
