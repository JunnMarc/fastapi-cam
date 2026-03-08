from pydantic import BaseModel, Field


class CustomerFeatures(BaseModel):
    gender: str = Field(..., examples=["Male", "Female"])
    SeniorCitizen: int = Field(..., ge=0, le=1, examples=[0, 1])
    Partner: str = Field(..., examples=["Yes", "No"])
    Dependents: str = Field(..., examples=["Yes", "No"])
    tenure: int = Field(..., ge=0, examples=[1, 24])
    PhoneService: str = Field(..., examples=["Yes", "No"])
    MultipleLines: str = Field(..., examples=["Yes", "No", "No phone service"])
    InternetService: str = Field(..., examples=["DSL", "Fiber optic", "No"])
    OnlineSecurity: str = Field(..., examples=["Yes", "No", "No internet service"])
    OnlineBackup: str = Field(..., examples=["Yes", "No", "No internet service"])
    DeviceProtection: str = Field(..., examples=["Yes", "No", "No internet service"])
    TechSupport: str = Field(..., examples=["Yes", "No", "No internet service"])
    StreamingTV: str = Field(..., examples=["Yes", "No", "No internet service"])
    StreamingMovies: str = Field(..., examples=["Yes", "No", "No internet service"])
    Contract: str = Field(..., examples=["Month-to-month", "One year", "Two year"])
    PaperlessBilling: str = Field(..., examples=["Yes", "No"])
    PaymentMethod: str = Field(
        ...,
        examples=[
            "Electronic check",
            "Mailed check",
            "Bank transfer (automatic)",
            "Credit card (automatic)",
        ],
    )
    MonthlyCharges: float = Field(..., ge=0, examples=[70.35])
    TotalCharges: float = Field(..., ge=0, examples=[1397.5])


class PredictionResponse(BaseModel):
    prediction: str
    probability: float
    risk_level: str
