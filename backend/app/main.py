from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime
from .config import settings
from .model import model_store
from .auth import create_access_token, verify_token, hash_password, verify_password
from .schemas import (
    CustomerFeatures,
    PredictionResponse,
    CustomerCreate,
    CustomerUpdate,
    CustomerOut,
    CustomerDetail,
    ScoreHistoryOut,
    LoginRequest,
    LoginResponse,
    UserCreate,
    UserOut,
    InsightsResponse,
    InsightBucket,
    InsightRiskBucket,
)
from .db import get_db, engine, SessionLocal
from .models import Base, Customer, AttritionScore, User


app = FastAPI(title=settings.app_name, version="1.0.0")
security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def load_model() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == settings.admin_username).first()
        if not existing:
            admin = User(
                username=settings.admin_username,
                password_hash=hash_password(settings.admin_password),
                is_admin=1,
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()
    _ensure_customer_columns()
    try:
        model_store.load()
    except FileNotFoundError:
        # Defer loading until first request if model artifacts are missing.
        pass


def _ensure_customer_columns() -> None:
    columns = {
        "region": "TEXT",
        "province": "TEXT",
        "city": "TEXT",
        "barangay": "TEXT",
        "service_type": "TEXT",
        "plan_type": "TEXT",
    }
    with engine.connect() as conn:
        existing = {
            row[1] for row in conn.exec_driver_sql("PRAGMA table_info(customers)").fetchall()
        }
        for name, col_type in columns.items():
            if name not in existing:
                conn.exec_driver_sql(
                    f"ALTER TABLE customers ADD COLUMN {name} {col_type}"
                )


def risk_band(probability: float) -> str:
    if probability >= 0.7:
        return "High"
    if probability >= 0.4:
        return "Medium"
    return "Low"


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    payload = verify_token(credentials.credentials)
    return payload.get("sub", "unknown")


def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    payload = verify_token(credentials.credentials)
    if payload.get("admin") != 1:
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload.get("sub", "unknown")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_loaded": model_store.model is not None}


@app.post(f"/api/{settings.api_version}/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user.username, user.is_admin)
    return LoginResponse(access_token=token)


@app.post(f"/api/{settings.api_version}/users", response_model=UserOut)
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


@app.get(f"/api/{settings.api_version}/users", response_model=list[UserOut])
def list_users(
    _: str = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[UserOut]:
    return db.query(User).order_by(User.id.asc()).all()


@app.post(f"/api/{settings.api_version}/predict", response_model=PredictionResponse)
def predict(
    payload: CustomerFeatures,
    _: str = Depends(get_current_user),
) -> PredictionResponse:
    try:
        prediction, probability = model_store.predict(payload.model_dump())
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    result = "CHURN" if prediction == 1 else "STAY"
    return PredictionResponse(
        prediction=result,
        probability=round(probability, 4),
        risk_level=risk_band(probability),
    )


@app.post(f"/api/{settings.api_version}/customers", response_model=CustomerOut)
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


@app.get(f"/api/{settings.api_version}/customers", response_model=list[CustomerOut])
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


@app.get(f"/api/{settings.api_version}/customers/{{customer_id}}", response_model=CustomerDetail)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
) -> CustomerDetail:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@app.patch(f"/api/{settings.api_version}/customers/{{customer_id}}", response_model=CustomerOut)
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


@app.post(f"/api/{settings.api_version}/customers/{{customer_id}}/score", response_model=PredictionResponse)
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

    prediction, probability = model_store.predict(features)
    level = risk_band(probability)
    result = "CHURN" if prediction == 1 else "STAY"

    customer.churn_probability = probability
    customer.risk_level = level
    customer.last_prediction_at = datetime.utcnow()
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
        prediction=result, probability=round(probability, 4), risk_level=level
    )


@app.get(f"/api/{settings.api_version}/customers/{{customer_id}}/scores", response_model=list[ScoreHistoryOut])
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


@app.get(f"/api/{settings.api_version}/insights", response_model=InsightsResponse)
def insights(db: Session = Depends(get_db), _: str = Depends(get_current_user)) -> InsightsResponse:
    customers = db.query(Customer).all()
    total = len(customers)
    if total == 0:
        return InsightsResponse(
            total_customers=0,
            avg_monthly_charges=0.0,
            avg_tenure=0.0,
            high_risk_rate=0.0,
            contract_mix=[],
            internet_mix=[],
            tenure_buckets=[],
            risk_breakdown=[],
            region_mix=[],
            province_mix=[],
            city_mix=[],
            service_mix=[],
            plan_mix=[],
            region_high_risk=[],
            city_high_risk=[],
        )

    avg_monthly = sum(c.MonthlyCharges or 0 for c in customers) / total
    avg_tenure = sum(c.tenure or 0 for c in customers) / total

    def count_by(getter):
        counts = {}
        for c in customers:
            key = getter(c) or "Unknown"
            counts[key] = counts.get(key, 0) + 1
        return [InsightBucket(label=k, count=v) for k, v in sorted(counts.items())]

    def risk_by(getter):
        totals = {}
        highs = {}
        for c in customers:
            key = getter(c) or "Unknown"
            totals[key] = totals.get(key, 0) + 1
            if c.risk_level == "High":
                highs[key] = highs.get(key, 0) + 1
        results = []
        for key, total_count in totals.items():
            high_count = highs.get(key, 0)
            rate = (high_count / total_count) if total_count else 0.0
            results.append(
                InsightRiskBucket(label=key, count=high_count, rate=round(rate, 4))
            )
        return results

    def tenure_bucket(value):
        if value is None:
            return "Unknown"
        if value <= 12:
            return "0-12"
        if value <= 24:
            return "13-24"
        if value <= 48:
            return "25-48"
        if value <= 72:
            return "49-72"
        return "73+"

    contract_mix = count_by(lambda c: c.Contract)
    internet_mix = count_by(lambda c: c.InternetService)
    tenure_buckets = count_by(lambda c: tenure_bucket(c.tenure))
    risk_breakdown = count_by(lambda c: c.risk_level)
    region_mix = count_by(lambda c: c.region)
    province_mix = count_by(lambda c: c.province)
    city_mix = count_by(lambda c: c.city)
    service_mix = count_by(lambda c: c.service_type)
    plan_mix = count_by(lambda c: c.plan_type)
    region_high_risk = risk_by(lambda c: c.region)
    city_high_risk = risk_by(lambda c: c.city)

    high_risk = sum(1 for c in customers if c.risk_level == "High")
    scored = sum(1 for c in customers if c.risk_level in {"High", "Medium", "Low"})
    high_risk_rate = (high_risk / scored) if scored else 0.0

    return InsightsResponse(
        total_customers=total,
        avg_monthly_charges=round(avg_monthly, 2),
        avg_tenure=round(avg_tenure, 1),
        high_risk_rate=round(high_risk_rate, 4),
        contract_mix=contract_mix,
        internet_mix=internet_mix,
        tenure_buckets=tenure_buckets,
        risk_breakdown=risk_breakdown,
        region_mix=region_mix,
        province_mix=province_mix,
        city_mix=city_mix,
        service_mix=service_mix,
        plan_mix=plan_mix,
        region_high_risk=sorted(region_high_risk, key=lambda x: x.count, reverse=True),
        city_high_risk=sorted(city_high_risk, key=lambda x: x.count, reverse=True),
    )


@app.exception_handler(Exception)
def unhandled_exception(_, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": str(exc)})
