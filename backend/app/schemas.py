from pydantic import BaseModel, Field
from datetime import datetime


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


class CustomerCreate(CustomerFeatures):
    external_id: str | None = Field(default=None, examples=["CUST-1009"])
    name: str | None = Field(default=None, examples=["Alex Morgan"])
    email: str | None = Field(default=None, examples=["alex@company.com"])
    segment: str | None = Field(default=None, examples=["SMB"])
    status: str | None = Field(default="Active", examples=["Active", "At-Risk"])
    region: str | None = Field(default=None, examples=["NCR", "Region IV-A"])
    province: str | None = Field(default=None, examples=["Laguna"])
    city: str | None = Field(default=None, examples=["San Pedro"])
    barangay: str | None = Field(default=None, examples=["United Bayanihan"])
    service_type: str | None = Field(default=None, examples=["Mobile", "Fiber"])
    plan_type: str | None = Field(default=None, examples=["Prepaid", "Postpaid"])
    notes: str | None = Field(default=None, examples=["VIP customer"])


class CustomerUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    segment: str | None = None
    status: str | None = None
    region: str | None = None
    province: str | None = None
    city: str | None = None
    barangay: str | None = None
    service_type: str | None = None
    plan_type: str | None = None
    notes: str | None = None


class CustomerOut(BaseModel):
    id: int
    external_id: str | None
    name: str | None
    email: str | None
    segment: str | None
    status: str | None
    region: str | None
    province: str | None
    city: str | None
    barangay: str | None
    service_type: str | None
    plan_type: str | None
    churn_probability: float | None
    risk_level: str | None
    last_prediction_at: datetime | None

    class Config:
        from_attributes = True


class CustomerDetail(CustomerOut):
    gender: str
    SeniorCitizen: int
    Partner: str
    Dependents: str
    tenure: int
    PhoneService: str
    MultipleLines: str
    InternetService: str
    OnlineSecurity: str
    OnlineBackup: str
    DeviceProtection: str
    TechSupport: str
    StreamingTV: str
    StreamingMovies: str
    Contract: str
    PaperlessBilling: str
    PaymentMethod: str
    MonthlyCharges: float
    TotalCharges: float
    notes: str | None


class PredictionResponse(BaseModel):
    prediction: str
    probability: float
    risk_level: str


class ScoreHistoryOut(BaseModel):
    id: int
    customer_id: int
    probability: float
    risk_level: str
    prediction: str
    created_at: datetime | None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    username: str
    password: str
    is_admin: int = 0


class UserOut(BaseModel):
    id: int
    username: str
    is_admin: int
    created_at: datetime | None

    class Config:
        from_attributes = True


class InsightBucket(BaseModel):
    label: str
    count: int


class InsightRiskBucket(BaseModel):
    label: str
    count: int
    rate: float


class InsightsResponse(BaseModel):
    total_customers: int
    avg_monthly_charges: float
    avg_tenure: float
    high_risk_rate: float
    contract_mix: list[InsightBucket]
    internet_mix: list[InsightBucket]
    tenure_buckets: list[InsightBucket]
    risk_breakdown: list[InsightBucket]
    region_mix: list[InsightBucket]
    province_mix: list[InsightBucket]
    city_mix: list[InsightBucket]
    service_mix: list[InsightBucket]
    plan_mix: list[InsightBucket]
    region_high_risk: list[InsightRiskBucket]
    city_high_risk: list[InsightRiskBucket]
