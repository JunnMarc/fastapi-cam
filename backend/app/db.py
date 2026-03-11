from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os


def _build_database_url() -> tuple[str, dict]:
    """
    Switch between Postgres and SQLite based on env vars.

    Priority:
    1) DATABASE_URL (Postgres or other SQLAlchemy-supported URL)
    2) DB_PATH (SQLite file path)
    """
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        return database_url, {}

    db_path = os.getenv("DB_PATH", "backend/data/app.db")
    sqlite_url = f"sqlite:///{db_path}"
    return sqlite_url, {"check_same_thread": False}


SQLALCHEMY_DATABASE_URL, engine_kwargs = _build_database_url()
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
