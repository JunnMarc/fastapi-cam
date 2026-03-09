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

    def explain(self, features: dict, top_k: int = 3) -> dict:
        if self.model is None or self.scaler is None or not self.columns:
            self.load()

        if not hasattr(self.model, "coef_"):
            return {"drivers": [], "protectors": []}

        input_df = pd.DataFrame([features])
        input_df = pd.get_dummies(input_df)
        input_df = input_df.reindex(columns=self.columns, fill_value=0)

        num_cols = ["tenure", "MonthlyCharges", "TotalCharges"]
        input_df[num_cols] = self.scaler.transform(input_df[num_cols])

        coefs = self.model.coef_[0]
        values = input_df.iloc[0].to_numpy()
        contributions = values * coefs

        items = [
            (name, contrib)
            for name, contrib in zip(self.columns, contributions)
            if abs(contrib) > 1e-6
        ]

        positives = sorted(
            ((n, c) for n, c in items if c > 0), key=lambda x: x[1], reverse=True
        )
        negatives = sorted(
            ((n, c) for n, c in items if c < 0), key=lambda x: x[1]
        )

        drivers = [self._format_feature(n) for n, _ in positives[:top_k]]
        protectors = [self._format_feature(n) for n, _ in negatives[:top_k]]

        return {"drivers": drivers, "protectors": protectors}

    def _format_feature(self, name: str) -> str:
        friendly = {
            "SeniorCitizen": "Senior citizen",
            "tenure": "Tenure length",
            "MonthlyCharges": "Monthly charges level",
            "TotalCharges": "Total charges level",
        }
        if name in friendly:
            return friendly[name]
        if "_" in name:
            base, value = name.split("_", 1)
            return f"{base}: {value}"
        return name


model_store = ModelStore()
