def risk_band(probability: float) -> str:
    if probability >= 0.7:
        return "High"
    if probability >= 0.4:
        return "Medium"
    return "Low"


def status_from_risk(risk_level: str) -> str:
    return "At-Risk" if risk_level in {"High", "Medium"} else "Active"
