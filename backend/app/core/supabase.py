from supabase import create_client, Client
from .config import settings
from functools import lru_cache


@lru_cache()
def get_admin_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def get_user_client(access_token: str) -> Client:
    """Create a Supabase client scoped to the user's JWT (respects RLS)."""
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    client.auth.set_session(access_token, "")
    return client
