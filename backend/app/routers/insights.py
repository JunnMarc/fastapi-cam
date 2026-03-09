from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case, String
from ..db import get_db
from ..models import Customer
from ..schemas import InsightsResponse, InsightBucket, InsightRiskBucket
from ..config import settings
from .auth import get_current_user

router = APIRouter(prefix=f"/api/{settings.api_version}/insights", tags=["insights"])

@router.get("", response_model=InsightsResponse)
def insights(db: Session = Depends(get_db), _: str = Depends(get_current_user)) -> InsightsResponse:
    # Get total count, avg monthly, avg tenure using single DB query
    stats = db.query(
        func.count(Customer.id).label("total"),
        func.avg(Customer.MonthlyCharges).label("avg_monthly"),
        func.avg(Customer.tenure).label("avg_tenure")
    ).first()

    total = stats.total or 0
    if total == 0:
        return InsightsResponse(
            total_customers=0,
            avg_monthly_charges=0.0,
            avg_tenure=0.0,
            high_risk_rate=0.0,
            contract_mix=[],
            internet_mix=[],
            tenure_buckets=[],
            risk_breakdown=[],
            region_mix=[],
            province_mix=[],
            city_mix=[],
            service_mix=[],
            plan_mix=[],
            region_high_risk=[],
            city_high_risk=[],
        )

    avg_monthly = stats.avg_monthly or 0.0
    avg_tenure = stats.avg_tenure or 0.0

    # High Risk Count
    high_risk = db.query(func.count(Customer.id)).filter(Customer.risk_level == "High").scalar() or 0
    scored = db.query(func.count(Customer.id)).filter(Customer.risk_level.in_(["High", "Medium", "Low"])).scalar() or 0
    high_risk_rate = (high_risk / scored) if scored else 0.0

    # Helper function for generic groupings
    def get_mix(column):
        results = db.query(
            func.coalesce(column, "Unknown").label("label"),
            func.count(Customer.id).label("count")
        ).group_by("label").order_by("label").all()
        return [InsightBucket(label=r.label, count=r.count) for r in results]

    # Helper function for risk groupings
    def get_risk_mix(column):
        results = db.query(
            func.coalesce(column, "Unknown").label("label"),
            func.count(Customer.id).label("total"),
            func.sum(case((Customer.risk_level == "High", 1), else_=0)).label("high")
        ).group_by("label").all()
        
        mix = []
        for r in results:
            total_count = r.total or 0
            high_count = r.high or 0
            rate = (high_count / total_count) if total_count else 0.0
            mix.append(InsightRiskBucket(label=r.label, count=high_count, rate=round(rate, 4)))
        return sorted(mix, key=lambda x: x.count, reverse=True)

    contract_mix = get_mix(Customer.Contract)
    internet_mix = get_mix(Customer.InternetService)
    risk_breakdown = get_mix(Customer.risk_level)
    region_mix = get_mix(Customer.region)
    province_mix = get_mix(Customer.province)
    city_mix = get_mix(Customer.city)
    service_mix = get_mix(Customer.service_type)
    plan_mix = get_mix(Customer.plan_type)
    
    region_high_risk = get_risk_mix(Customer.region)
    city_high_risk = get_risk_mix(Customer.city)

    # Complex Tenure Buckets using SQL CASE
    tenure_case = case(
        (Customer.tenure == None, "Unknown"),
        (Customer.tenure <= 12, "0-12"),
        (Customer.tenure <= 24, "13-24"),
        (Customer.tenure <= 48, "25-48"),
        (Customer.tenure <= 72, "49-72"),
        else_="73+"
    ).label("label")
    
    tenure_results = db.query(
        tenure_case,
        func.count(Customer.id).label("count")
    ).group_by("label").order_by("label").all()
    tenure_buckets = [InsightBucket(label=r.label, count=r.count) for r in tenure_results]

    return InsightsResponse(
        total_customers=total,
        avg_monthly_charges=round(avg_monthly, 2),
        avg_tenure=round(avg_tenure, 1),
        high_risk_rate=round(high_risk_rate, 4),
        contract_mix=contract_mix,
        internet_mix=internet_mix,
        tenure_buckets=tenure_buckets,
        risk_breakdown=risk_breakdown,
        region_mix=region_mix,
        province_mix=province_mix,
        city_mix=city_mix,
        service_mix=service_mix,
        plan_mix=plan_mix,
        region_high_risk=region_high_risk,
        city_high_risk=city_high_risk,
    )
