import argparse
from pathlib import Path

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    normalized = {}
    for col in df.columns:
        key = col.strip().lstrip("\ufeff").strip('"')
        if key.replace(" ", "").lower() == "totalcharges":
            key = "TotalCharges"
        if key.replace(" ", "").lower() == "monthlycharges":
            key = "MonthlyCharges"
        if key.replace(" ", "").lower() == "seniorcitizen":
            key = "SeniorCitizen"
        normalized[col] = key
    return df.rename(columns=normalized)


def _read_csv_with_fallback(path: Path) -> pd.DataFrame:
    try:
        df = pd.read_csv(path)
        if len(df.columns) > 1:
            return df
    except Exception:
        df = None

    raw_text = path.read_text(encoding="utf-8")
    lines = [line for line in raw_text.splitlines() if line.strip()]
    rows = [
        [cell.strip().strip('"') for cell in line.strip().strip('"').split(",")]
        for line in lines
    ]
    header = rows[0]
    data = rows[1:]
    return pd.DataFrame(data, columns=header)


def load_dataset(path: Path) -> pd.DataFrame:
    if path.suffix.lower() in {".xls", ".xlsx"}:
        df = pd.read_excel(path)
    else:
        df = _read_csv_with_fallback(path)
    return _normalize_columns(df)


def train(csv_path: Path, output_dir: Path) -> None:
    df = load_dataset(csv_path)

    non_feature_columns = {
        "customerID",
        "external_id",
        "name",
        "email",
        "segment",
        "status",
        "region",
        "province",
        "city",
        "barangay",
        "service_type",
        "plan_type",
        "notes",
    }

    if "TotalCharges" not in df.columns:
        raise KeyError(
            "TotalCharges column not found. "
            "Check that the dataset header matches the Telco Churn schema."
        )

    df["tenure"] = pd.to_numeric(df["tenure"], errors="coerce")
    df["MonthlyCharges"] = pd.to_numeric(df["MonthlyCharges"], errors="coerce")
    df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce")

    df["tenure"] = df["tenure"].fillna(df["tenure"].median())
    df["MonthlyCharges"] = df["MonthlyCharges"].fillna(df["MonthlyCharges"].median())
    df["TotalCharges"] = df["TotalCharges"].fillna(df["TotalCharges"].median())
    if "SeniorCitizen" in df.columns:
        df["SeniorCitizen"] = pd.to_numeric(df["SeniorCitizen"], errors="coerce").fillna(0).astype(int)
    df = df.drop(columns=[c for c in non_feature_columns if c in df.columns], errors="ignore")

    if "Churn" not in df.columns:
        raise KeyError("Churn column not found. Check that the dataset has churn labels.")

    if df["Churn"].dtype.kind in {"i", "u", "f"}:
        df["Churn"] = df["Churn"].astype(int).clip(0, 1)
    else:
        df["Churn"] = (
            df["Churn"]
            .astype(str)
            .str.strip()
            .str.lower()
            .map({"yes": 1, "no": 0, "1": 1, "0": 0})
        )

    categorical_cols = df.select_dtypes(include=["object", "string"]).columns
    numerical_cols = ["tenure", "MonthlyCharges", "TotalCharges"]

    df_final = pd.get_dummies(df, columns=categorical_cols, drop_first=True)

    X = df_final.drop("Churn", axis=1)
    y = df_final["Churn"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    scaler = StandardScaler()
    X_train[numerical_cols] = scaler.fit_transform(X_train[numerical_cols])
    X_test[numerical_cols] = scaler.transform(X_test[numerical_cols])

    model = LogisticRegression(max_iter=1000, class_weight="balanced")
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    print("MODEL PERFORMANCE TESTING")
    print(f"Accuracy Score: {accuracy_score(y_test, predictions):.4f}")
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, predictions))
    print("\nDetailed Classification Report:")
    print(classification_report(y_test, predictions))

    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output_dir / "churn_model.joblib")
    joblib.dump(scaler, output_dir / "scaler.joblib")
    joblib.dump(X_train.columns.tolist(), output_dir / "model_columns.joblib")
    print("Success: Model, Scaler, and Columns saved to disk.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--csv",
        required=True,
        type=Path,
        help="Path to WA_Fn-UseC_-Telco-Customer-Churn.csv",
    )
    parser.add_argument(
        "--out",
        default=Path("backend/models"),
        type=Path,
        help="Output directory for model artifacts",
    )
    args = parser.parse_args()

    train(args.csv, args.out)


if __name__ == "__main__":
    main()
