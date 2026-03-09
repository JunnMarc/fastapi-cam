from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from .db import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(64), index=True, nullable=True)
    name = Column(String(120), nullable=True)
    email = Column(String(120), nullable=True)
    segment = Column(String(80), nullable=True)
    status = Column(String(40), default="Active")

    gender = Column(String(10))
    SeniorCitizen = Column(Integer)
    Partner = Column(String(10))
    Dependents = Column(String(10))
    tenure = Column(Integer)
    PhoneService = Column(String(20))
    MultipleLines = Column(String(30))
    InternetService = Column(String(30))
    OnlineSecurity = Column(String(30))
    OnlineBackup = Column(String(30))
    DeviceProtection = Column(String(30))
    TechSupport = Column(String(30))
    StreamingTV = Column(String(30))
    StreamingMovies = Column(String(30))
    Contract = Column(String(30))
    PaperlessBilling = Column(String(10))
    PaymentMethod = Column(String(40))
    MonthlyCharges = Column(Float)
    TotalCharges = Column(Float)

    churn_probability = Column(Float, nullable=True)
    risk_level = Column(String(12), nullable=True)
    last_prediction_at = Column(DateTime(timezone=True), nullable=True)

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AttritionScore(Base):
    __tablename__ = "attrition_scores"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, index=True)
    probability = Column(Float)
    risk_level = Column(String(12))
    prediction = Column(String(12))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    is_admin = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
