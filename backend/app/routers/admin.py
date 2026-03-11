from pathlib import Path
from datetime import datetime

import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import Customer, AttritionScore
from ..model import model_store
from ..schemas import (
    AdminSeedRequest,
    AdminSeedResponse,
    AdminScoreAllRequest,
    AdminScoreAllResponse,
)
from .auth import require_admin
from ..utils import risk_band, status_from_risk


router = APIRouter(prefix=f"/api/{settings.api_version}/admin", tags=["admin"])


CSV_PATH = Path("backend/data/WA_Fn-UseC_-Telco-Customer-Churn.csv")


def _as_str(value) -> str | None:
    if pd.isna(value):
        return None
    text = str(value).strip()
    return text if text else None


def _as_int(value) -> int | None:
    if pd.isna(value):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _as_float(value) -> float | None:
    if pd.isna(value):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _build_customer(row: pd.Series) -> Customer:
    return Customer(
        external_id=_as_str(row.get("external_id")),
        name=_as_str(row.get("name")),
        email=_as_str(row.get("email")),
        segment=_as_str(row.get("segment")),
        status=_as_str(row.get("status")) or "Active",
        region=_as_str(row.get("region")),
        province=_as_str(row.get("province")),
        city=_as_str(row.get("city")),
        barangay=_as_str(row.get("barangay")),
        service_type=_as_str(row.get("service_type")),
        plan_type=_as_str(row.get("plan_type")),
        gender=_as_str(row.get("gender")),
        SeniorCitizen=_as_int(row.get("SeniorCitizen")) or 0,
        Partner=_as_str(row.get("Partner")),
        Dependents=_as_str(row.get("Dependents")),
        tenure=_as_int(row.get("tenure")) or 0,
        PhoneService=_as_str(row.get("PhoneService")),
        MultipleLines=_as_str(row.get("MultipleLines")),
        InternetService=_as_str(row.get("InternetService")),
        OnlineSecurity=_as_str(row.get("OnlineSecurity")),
        OnlineBackup=_as_str(row.get("OnlineBackup")),
        DeviceProtection=_as_str(row.get("DeviceProtection")),
        TechSupport=_as_str(row.get("TechSupport")),
        StreamingTV=_as_str(row.get("StreamingTV")),
        StreamingMovies=_as_str(row.get("StreamingMovies")),
        Contract=_as_str(row.get("Contract")),
        PaperlessBilling=_as_str(row.get("PaperlessBilling")),
        PaymentMethod=_as_str(row.get("PaymentMethod")),
        MonthlyCharges=_as_float(row.get("MonthlyCharges")),
        TotalCharges=_as_float(row.get("TotalCharges")),
        notes=_as_str(row.get("notes")),
    )


@router.post("/seed", response_model=AdminSeedResponse)
def seed_db(
    payload: AdminSeedRequest,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
) -> AdminSeedResponse:
    df = pd.read_csv(CSV_PATH)
    if payload.limit:
        df = df.head(payload.limit)

    if payload.delete_all:
        db.query(AttritionScore).delete(synchronize_session=False)
        db.query(Customer).delete(synchronize_session=False)
        db.commit()

    customers = [_build_customer(row) for _, row in df.iterrows()]
    db.bulk_save_objects(customers)
    db.commit()
    return AdminSeedResponse(inserted=len(customers))


@router.post("/score-all", response_model=AdminScoreAllResponse)
def score_all(
    payload: AdminScoreAllRequest,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
) -> AdminScoreAllResponse:
    model_store.load()
    total = db.query(Customer).count()
    processed = 0
    offset = 0

    while offset < total:
        batch = (
            db.query(Customer)
            .order_by(Customer.id.asc())
            .offset(offset)
            .limit(payload.batch_size)
            .all()
        )
        if not batch:
            break
        now = datetime.utcnow()
        for customer in batch:
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

            prediction, probability = model_store.predict(features)
            level = risk_band(probability)
            result = "CHURN" if prediction == 1 else "STAY"

            customer.churn_probability = probability
            customer.risk_level = level
            customer.last_prediction_at = now
            customer.status = status_from_risk(level)
            db.add(customer)

            if payload.write_history:
                db.add(
                    AttritionScore(
                        customer_id=customer.id,
                        probability=probability,
                        risk_level=level,
                        prediction=result,
                    )
                )

        db.commit()
        processed += len(batch)
        offset += payload.batch_size

    return AdminScoreAllResponse(scored=processed)
