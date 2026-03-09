from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import settings
from .model import model_store
from .auth import hash_password
from .db import engine, SessionLocal
from .models import Base, User
from .routers import auth, users, customers, retention, insights

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(customers.router)
app.include_router(retention.router)
app.include_router(insights.router)


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

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_loaded": model_store.model is not None}
