from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import RetentionCase, RetentionNote
from ..schemas import RetentionCaseCreate, RetentionCaseUpdate, RetentionCaseOut, RetentionNoteCreate, RetentionNoteOut
from ..config import settings
from .auth import get_current_user

router = APIRouter(prefix=f"/api/{settings.api_version}/retention-cases", tags=["retention"])

@router.get("", response_model=list[RetentionCaseOut])
def list_retention_cases(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
) -> list[RetentionCaseOut]:
    return db.query(RetentionCase).order_by(RetentionCase.id.desc()).all()

@router.post("", response_model=RetentionCaseOut)
def create_retention_case(
    payload: RetentionCaseCreate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
) -> RetentionCaseOut:
    existing = (
        db.query(RetentionCase)
        .filter(RetentionCase.customer_id == payload.customer_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Retention case already exists")
    case = RetentionCase(**payload.model_dump())
    db.add(case)
    db.commit()
    db.refresh(case)
    return case

@router.patch("/{case_id}", response_model=RetentionCaseOut)
def update_retention_case(
    case_id: int,
    payload: RetentionCaseUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
) -> RetentionCaseOut:
    case = db.query(RetentionCase).filter(RetentionCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Retention case not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(case, key, value)
    db.commit()
    db.refresh(case)
    return case

@router.get(
    "/{case_id}/notes",
    response_model=list[RetentionNoteOut],
)
def list_retention_notes(
    case_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
) -> list[RetentionNoteOut]:
    return (
        db.query(RetentionNote)
        .filter(RetentionNote.case_id == case_id)
        .order_by(RetentionNote.id.desc())
        .all()
    )

@router.post(
    "/{case_id}/notes",
    response_model=RetentionNoteOut,
)
def create_retention_note(
    case_id: int,
    payload: RetentionNoteCreate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
) -> RetentionNoteOut:
    case = db.query(RetentionCase).filter(RetentionCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Retention case not found")
    note = RetentionNote(case_id=case_id, note=payload.note)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note
