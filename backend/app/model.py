import joblib
import pandas as pd
from pathlib import Path
from .config import settings


class ModelStore:
    def __init__(self) -> None:
        self.model = None
        self.scaler = None
        self.columns: list[str] = []

    def load(self) -> None:
        model_path = Path(settings.model_path)
        scaler_path = Path(settings.scaler_path)
        columns_path = Path(settings.columns_path)

        if not (model_path.exists() and scaler_path.exists() and columns_path.exists()):
            missing = [str(p) for p in [model_path, scaler_path, columns_path] if not p.exists()]
            raise FileNotFoundError(f"Missing model artifacts: {', '.join(missing)}")

        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        self.columns = joblib.load(columns_path)

    def predict(self, features: dict) -> tuple[int, float]:
        if self.model is None or self.scaler is None or not self.columns:
            self.load()

        input_df = pd.DataFrame([features])
        input_df = pd.get_dummies(input_df)
        input_df = input_df.reindex(columns=self.columns, fill_value=0)

        num_cols = ["tenure", "MonthlyCharges", "TotalCharges"]
        input_df[num_cols] = self.scaler.transform(input_df[num_cols])

        prediction = int(self.model.predict(input_df)[0])
        probability = float(self.model.predict_proba(input_df)[0][1])
        return prediction, probability


model_store = ModelStore()
