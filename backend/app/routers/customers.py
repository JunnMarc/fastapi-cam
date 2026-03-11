from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from ..db import get_db
from ..models import Customer, AttritionScore
from ..schemas import CustomerFeatures, CustomerCreate, CustomerUpdate, CustomerOut, CustomerDetail, PredictionResponse, ScoreHistoryOut
from ..model import model_store
from ..utils import risk_band, status_from_risk
from ..config import settings
from .auth import get_current_user

router = APIRouter(prefix=f"/api/{settings.api_version}", tags=["customers"])

@router.post("/predict", response_model=PredictionResponse)
def predict(
    payload: CustomerFeatures,
    _: str = Depends(get_current_user),
) -> PredictionResponse:
    try:
        prediction, probability = model_store.predict(payload.model_dump())
        explanation = model_store.explain(payload.model_dump())
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    result = "CHURN" if prediction == 1 else "STAY"
    return PredictionResponse(
        prediction=result,
        probability=round(probability, 4),
        risk_level=risk_band(probability),
        drivers=explanation.get("drivers", []),
        protectors=explanation.get("protectors", []),
    )

@router.post("/customers", response_model=CustomerOut)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
) -> CustomerOut:
    customer = Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.get("/customers", response_model=list[CustomerOut])
def list_customers(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
) -> list[CustomerOut]:
    return (
        db.query(Customer)
        .order_by(Customer.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

@router.get("/customers/{customer_id}", response_model=CustomerDetail)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
) -> CustomerDetail:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.patch("/customers/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
) -> CustomerOut:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    db.commit()
    db.refresh(customer)
    return customer

@router.post("/customers/{customer_id}/score", response_model=PredictionResponse)
def score_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
) -> PredictionResponse:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    features = {
        "gender": customer.gender,
        "SeniorCitizen": customer.SeniorCitizen,
        "Partner": customer.Partner,
        "Dependents": customer.Dependents,
        "tenure": customer.tenure,
        "PhoneService": customer.PhoneService,
        "MultipleLines": customer.MultipleLines,
        "InternetService": customer.InternetService,
        "OnlineSecurity": customer.OnlineSecurity,
        "OnlineBackup": customer.OnlineBackup,
        "DeviceProtection": customer.DeviceProtection,
        "TechSupport": customer.TechSupport,
        "StreamingTV": customer.StreamingTV,
        "StreamingMovies": customer.StreamingMovies,
        "Contract": customer.Contract,
        "PaperlessBilling": customer.PaperlessBilling,
        "PaymentMethod": customer.PaymentMethod,
        "MonthlyCharges": customer.MonthlyCharges,
        "TotalCharges": customer.TotalCharges,
    }

    if customer.status == "Retained":
        probability = 0.0
        prediction = 0
        explanation = {"drivers": [], "protectors": []}
        level = "Low"
        result = "STAY"
    else:
        prediction, probability = model_store.predict(features)
        explanation = model_store.explain(features)
        level = risk_band(probability)
        result = "CHURN" if prediction == 1 else "STAY"
        customer.status = "At-Risk" if level == "High" else "Safe" if level == "Low" else "Watch"


    customer.churn_probability = probability
    customer.risk_level = level
    customer.last_prediction_at = datetime.utcnow()
    customer.status = status_from_risk(level)
    db.add(customer)
    db.add(
        AttritionScore(
            customer_id=customer.id,
            probability=probability,
            risk_level=level,
            prediction=result,
        )
    )
    db.commit()

    return PredictionResponse(
        prediction=result,
        probability=round(probability, 4),
        risk_level=level,
        drivers=explanation.get("drivers", []),
        protectors=explanation.get("protectors", []),
    )

@router.get("/customers/{customer_id}/scores", response_model=list[ScoreHistoryOut])
def list_scores(
    customer_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
) -> list[ScoreHistoryOut]:
    return (
        db.query(AttritionScore)
        .filter(AttritionScore.customer_id == customer_id)
        .order_by(AttritionScore.id.desc())
        .all()
    )
