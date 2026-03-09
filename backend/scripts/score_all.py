import argparse
from datetime import datetime
from pathlib import Path
import sys

from sqlalchemy.orm import Session

# Ensure repo root is on sys.path when running as a script.
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.db import SessionLocal
from backend.app.model import model_store
from backend.app.models import AttritionScore, Customer
from backend.app.routers.customers import risk_band

def status_from_risk(risk_level: str) -> str:
    if risk_level == "High":
        return "At-Risk"
    if risk_level == "Low":
        return "Safe"
    return "Watch"


def build_features(customer: Customer) -> dict:
    return {
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


def score_batch(
    session: Session,
    customers: list[Customer],
    write_history: bool,
) -> int:
    now = datetime.utcnow()
    model_store.load()
    count = 0
    for customer in customers:
        features = build_features(customer)
        if customer.status == "Retained":
            probability = 0.0
            prediction = 0
            level = "Low"
            result = "STAY"
        else:
            prediction, probability = model_store.predict(features)
            level = risk_band(probability)
            result = "CHURN" if prediction == 1 else "STAY"
            customer.status = status_from_risk(level)

        customer.churn_probability = probability
        customer.risk_level = level
        customer.last_prediction_at = now
        session.add(customer)

        if write_history:
            session.add(
                AttritionScore(
                    customer_id=customer.id,
                    probability=probability,
                    risk_level=level,
                    prediction=result,
                )
            )
        count += 1
    return count


def score_all(batch_size: int, write_history: bool) -> None:
    session = SessionLocal()
    try:
        total = session.query(Customer).count()
        processed = 0
        offset = 0
        while offset < total:
            batch = (
                session.query(Customer)
                .order_by(Customer.id.asc())
                .offset(offset)
                .limit(batch_size)
                .all()
            )
            if not batch:
                break
            processed += score_batch(session, batch, write_history)
            session.commit()
            offset += batch_size
            print(f"Scored {processed}/{total}")
    finally:
        session.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Score all customers in the database")
    parser.add_argument("--batch-size", type=int, default=500)
    parser.add_argument(
        "--no-history",
        action="store_true",
        help="Do not write to attrition_scores history table",
    )
    args = parser.parse_args()

    score_all(args.batch_size, write_history=not args.no_history)


if __name__ == "__main__":
    main()
