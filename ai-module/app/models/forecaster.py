import numpy as np
from datetime import datetime


def forecast_consumption(history: list[dict], months_ahead: int = 3) -> list[dict]:
    """
    Given a list of {period_year, period_month, quantity_consumed, medicine_id, facility_id},
    return forecasts for the next `months_ahead` months using linear regression.
    """
    if not history:
        return []

    # Sort by time
    history = sorted(history, key=lambda r: (r["period_year"], r["period_month"]))

    # Convert to numeric x (months since first record)
    base_year = history[0]["period_year"]
    base_month = history[0]["period_month"]

    def to_x(year, month):
        return (year - base_year) * 12 + (month - base_month)

    xs = np.array([to_x(r["period_year"], r["period_month"]) for r in history], dtype=float)
    ys = np.array([r["quantity_consumed"] for r in history], dtype=float)

    # Linear regression
    if len(xs) >= 2:
        coeffs = np.polyfit(xs, ys, 1)
        slope, intercept = coeffs
    else:
        slope, intercept = 0, ys[0] if len(ys) else 0

    # Confidence: R² clamped to [0,1]
    if len(xs) >= 2:
        y_pred = slope * xs + intercept
        ss_res = np.sum((ys - y_pred) ** 2)
        ss_tot = np.sum((ys - np.mean(ys)) ** 2)
        r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 1.0
        confidence = round(max(0.0, min(1.0, r2)) * 100, 2)
    else:
        confidence = 50.0

    # Last known period
    last = history[-1]
    last_x = to_x(last["period_year"], last["period_month"])

    forecasts = []
    for i in range(1, months_ahead + 1):
        future_x = last_x + i
        predicted = max(0, int(round(slope * future_x + intercept)))

        # Compute future year/month
        total_months = base_month - 1 + (base_year * 12) + future_x
        f_year = total_months // 12
        f_month = total_months % 12 + 1

        forecasts.append({
            "medicine_id": last["medicine_id"],
            "facility_id": last["facility_id"],
            "forecast_month": f_month,
            "forecast_year": f_year,
            "predicted_quantity": predicted,
            "confidence_score": confidence,
            "model_version": "linear_v1",
        })

    return forecasts
