import argparse
from pathlib import Path
import sys

import pandas as pd

# Ensure repo root is on sys.path when running as a script.
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.db import Base, SessionLocal, engine
from backend.app.models import AttritionScore, Customer, RetentionCase, RetentionNote


DEFAULT_CSV = Path("backend/data/WA_Fn-UseC_-Telco-Customer-Churn.csv")


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


def _delete_all(session) -> None:
    session.query(RetentionNote).delete(synchronize_session=False)
    session.query(RetentionCase).delete(synchronize_session=False)
    session.query(AttritionScore).delete(synchronize_session=False)
    session.query(Customer).delete(synchronize_session=False)


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


def seed(csv_path: Path, delete_all: bool, limit: int | None) -> None:
    Base.metadata.create_all(bind=engine)

    df = pd.read_csv(csv_path)
    if limit:
        df = df.head(limit)

    session = SessionLocal()
    try:
        if delete_all:
            _delete_all(session)
            session.commit()

        customers = [_build_customer(row) for _, row in df.iterrows()]
        session.bulk_save_objects(customers)
        session.commit()
        print(f"Seeded {len(customers)} customers from {csv_path}")
    finally:
        session.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed SQLite DB with customers from CSV")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--delete-all", action="store_true", help="Delete existing data before import")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of rows imported")
    args = parser.parse_args()

    seed(args.csv, args.delete_all, args.limit)


if __name__ == "__main__":
    main()
