"""Encryption utilities for user API keys and JWT verification."""
import base64
import os
from cryptography.fernet import Fernet
from jose import jwt, JWTError
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from .config import settings

bearer_scheme = HTTPBearer()


def get_fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY.encode()
    # Ensure proper Fernet key format
    if len(key) != 44:  # base64url-encoded 32 bytes
        key = base64.urlsafe_b64encode(key[:32].ljust(32, b'='))
    return Fernet(key)


def encrypt_api_key(plaintext: str) -> str:
    f = get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt_api_key(ciphertext: str) -> str:
    f = get_fernet()
    return f.decrypt(ciphertext.encode()).decode()


def get_supabase_admin() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Verify Supabase JWT and return user payload."""
    token = credentials.credentials
    try:
        # Supabase JWTs use the JWT secret from project settings
        # We verify via Supabase admin client
        supabase = get_supabase_admin()
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return {"id": str(user_response.user.id), "email": user_response.user.email}
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
