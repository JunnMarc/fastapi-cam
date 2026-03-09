from datetime import datetime, timedelta, timezone
import os
import jwt
import hashlib
import hmac
from fastapi import HTTPException, status


JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
TOKEN_EXPIRE_MIN = int(os.getenv("TOKEN_EXPIRE_MIN", "480"))
PWD_SALT = os.getenv("PWD_SALT", "change-me-salt")


def hash_password(password: str) -> str:
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        PWD_SALT.encode("utf-8"),
        120_000,
    )
    return dk.hex()


def verify_password(password: str, password_hash: str) -> bool:
    expected = hash_password(password)
    return hmac.compare_digest(expected, password_hash)


def create_access_token(username: str, is_admin: int = 0) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MIN)
    payload = {"sub": username, "exp": expire, "admin": is_admin}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return payload
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from exc
