from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..schemas import UserCreate, UserOut
from ..db import get_db
from ..models import User
from ..auth import hash_password
from ..config import settings
from .auth import require_admin

router = APIRouter(prefix=f"/api/{settings.api_version}/users", tags=["users"])

@router.post("", response_model=UserOut)
def create_user(
    payload: UserCreate,
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserOut:
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        is_admin=payload.is_admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("", response_model=list[UserOut])
def list_users(
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[UserOut]:
    return db.query(User).order_by(User.id.asc()).all()
