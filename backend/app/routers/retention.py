from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import RetentionCase, RetentionNote, Customer
from ..schemas import RetentionCaseCreate, RetentionCaseUpdate, RetentionCaseOut, RetentionNoteCreate, RetentionNoteOut

from ..config import settings
from .auth import get_current_user

router = APIRouter(prefix=f"/api/{settings.api_version}/retention-cases", tags=["retention"])

@router.get("", response_model=list[RetentionCaseOut])
def list_retention_cases(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
) -> list[RetentionCaseOut]:
    cases = (
        db.query(
            RetentionCase,
            Customer.name.label("customer_name"),
            Customer.risk_level.label("customer_risk"),
        )
        .outerjoin(Customer, RetentionCase.customer_id == Customer.id)
        .order_by(RetentionCase.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []
    for r_case, c_name, c_risk in cases:
        case_dict = {
            **r_case.__dict__,
            "customer_name": c_name,
            "customer_risk": c_risk,
        }
        result.append(case_dict)
    return result

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
    
    was_resolved = case.status == "Resolved"

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(case, key, value)
        
    if payload.status == "Resolved" and not was_resolved:
        customer = db.query(Customer).filter(Customer.id == case.customer_id).first()
        if customer:
            customer.status = "Retained"
            customer.risk_level = "Low"
            customer.churn_probability = 0.0

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
