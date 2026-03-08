from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import settings
from .model import model_store
from .schemas import CustomerFeatures, PredictionResponse


app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def load_model() -> None:
    try:
        model_store.load()
    except FileNotFoundError:
        # Defer loading until first request if model artifacts are missing.
        pass


def risk_band(probability: float) -> str:
    if probability >= 0.7:
        return "High"
    if probability >= 0.4:
        return "Medium"
    return "Low"


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_loaded": model_store.model is not None}


@app.post(f"/api/{settings.api_version}/predict", response_model=PredictionResponse)
def predict(payload: CustomerFeatures) -> PredictionResponse:
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


@app.exception_handler(Exception)
def unhandled_exception(_, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": str(exc)})
