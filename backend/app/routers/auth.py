from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from ..auth import create_access_token, verify_password, verify_token
from ..schemas import LoginRequest, LoginResponse
from ..db import get_db
from ..models import User
from ..config import settings

router = APIRouter(prefix=f"/api/{settings.api_version}", tags=["auth"])
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    payload = verify_token(credentials.credentials)
    return payload.get("sub", "unknown")

def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    payload = verify_token(credentials.credentials)
    if payload.get("admin") != 1:
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload.get("sub", "unknown")

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user.username, user.is_admin)
    return LoginResponse(access_token=token)
