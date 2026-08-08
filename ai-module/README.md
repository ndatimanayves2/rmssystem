AI Module
=========

Purpose
-------
Provides demand forecasting and purchase recommendations for the medical supply chain.

Endpoints
---------
- GET /health : health check
- GET /forecast : compute forecasts on-the-fly (query params: facility_id, medicine_id, months_ahead)
- POST /forecast/save : compute and persist forecasts into `ai_forecasts` table (months_ahead optional)
- GET /recommendations : aggregated purchase recommendations for the next N months (query params: facility_id, months_ahead)

Scheduler
---------
A background scheduler runs daily (02:00 UTC) and invokes the forecast persistence job.

Setup
-----
- Build with Docker (project root):

```bash
docker compose build ai-module
```

- Run only AI module locally:

```bash
cd ai-module
pip install -r requirements.txt
python main.py
```

Demo data
---------
To populate demo consumption data and persist forecasts run:

```bash
cd ai-module
python scripts/populate_demo.py
```

This script will insert synthetic records into `consumption_history` and call the forecast persistence job.

Notes
-----
- The scheduler uses APScheduler; adjust schedule in `app/__init__.py` as needed.
- Recommendations endpoint calculates recommended purchase = max(0, predicted_total - (current_quantity - safety_stock)).
