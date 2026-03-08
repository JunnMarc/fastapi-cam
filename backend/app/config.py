from pydantic import BaseModel
import os


class Settings(BaseModel):
    api_version: str = "v1"
    model_dir: str = os.getenv("MODEL_DIR", "backend/models")
    model_path: str = os.getenv("MODEL_PATH", "backend/models/churn_model.joblib")
    scaler_path: str = os.getenv("SCALER_PATH", "backend/models/scaler.joblib")
    columns_path: str = os.getenv("COLUMNS_PATH", "backend/models/model_columns.joblib")
    allow_origins: list[str] = os.getenv("ALLOW_ORIGINS", "http://localhost:5173").split(",")
    app_name: str = "Customer Attrition System"


settings = Settings()
