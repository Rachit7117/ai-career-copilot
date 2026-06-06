from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Career Copilot"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str          # service_role key — server only
    SUPABASE_ANON_KEY: str

    # Default AI (Groq)
    GROQ_API_KEY: str
    DEFAULT_MODEL: str = "groq/llama-3.3-70b-versatile"

    # Encryption key for user API keys (32-byte base64)
    ENCRYPTION_KEY: str

    # Upstash Redis (optional queue)
    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""

    # PostHog
    POSTHOG_API_KEY: str = ""

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "https://your-domain.com"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
