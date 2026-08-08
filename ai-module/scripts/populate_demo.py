"""Populate demo consumption history and persist AI forecasts.

Run from the `ai-module/` folder:

    python scripts/populate_demo.py

It will:
- connect to the configured Postgres database
- pick a small set of facilities and medicines
- generate 12 months of synthetic consumption per facility/medicine
- insert into `consumption_history` (UPSERT)
- call `compute_and_save_forecasts` to persist forecasts into `ai_forecasts`

Note: ensure your DB is running and `ai-module` dependencies are installed.
"""

import os
import random
from datetime import datetime, timedelta
import psycopg2
import psycopg2.extras
# Ensure ai-module package imports work
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Load environment variables from ai-module/.env if present
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from app.routes.forecast import compute_and_save_forecasts, get_db


def get_db_conn():
    """Return a connection object. Uses the ai-module `get_db()` factory which
    supports Postgres and MySQL (controlled by DB_ENGINE env var).
    """
    conn = get_db()
    return conn


def sample_consumption_for_span(base, months, seasonality=0.15, noise=0.12):
    """Generate `months` consumption numbers around `base` with seasonality and noise."""
    out = []
    for i in range(months):
        # seasonal effect: month-based multiplier (simple sinusoidal-like)
        month = ((datetime.utcnow().month - months + i) % 12) + 1
        season_mult = 1.0 + seasonality * (1 if month in (1,2,3,11,12) else -0.5)
        value = int(max(0, round(base * season_mult * (1 + random.uniform(-noise, noise)))))
        out.append((month, value))
    return out


def populate_demo(limit_facilities=5, limit_medicines=6, months=12):
    conn = get_db_conn()
    engine = os.getenv('DB_ENGINE', 'postgres').lower()
    # Create a dictionary-style cursor for consistent row access
    if engine.startswith('mysql'):
        # mysql-connector: use dictionary cursor
        cur = conn.cursor(dictionary=True)
    else:
        # psycopg2 with RealDictCursor already returns dicts
        cur = conn.cursor()

    # pick a few facilities and medicines
    cur.execute('SELECT id, name, type FROM facilities WHERE is_active = true LIMIT %s', (limit_facilities,))
    facilities = cur.fetchall()
    if not facilities:
        print('No facilities found. Ensure the database has facilities seeded.')
        return

    cur.execute('SELECT id, name, unit FROM medicines WHERE is_active = true LIMIT %s', (limit_medicines,))
    medicines = cur.fetchall()
    if not medicines:
        print('No medicines found. Ensure the database has medicines seeded.')
        return

    print(f'Using {len(facilities)} facilities and {len(medicines)} medicines to generate demo consumption')

    now = datetime.utcnow()
    start_year = (now.replace(day=1) - timedelta(days=months*30)).year
    # For simplicity, build months back from current month
    entries = 0
    for f in facilities:
        for m in medicines:
            # choose a realistic base consumption according to unit
            base = random.randint(50, 800) if m['unit'] and m['unit'].lower().startswith('tab') else random.randint(10, 200)
            samples = sample_consumption_for_span(base, months)
            # insert each sample with upsert
            for i, (month, qty) in enumerate(samples, start=1):
                # compute year for this slot (simple backfill)
                dt = now - timedelta(days=(months - i) * 30)
                year = dt.year
                period_month = dt.month
                try:
                    engine = os.getenv('DB_ENGINE', 'postgres').lower()
                    if engine.startswith('mysql'):
                        # MySQL upsert
                        cur.execute(
                            '''INSERT INTO consumption_history (facility_id, medicine_id, quantity_consumed, period_month, period_year, recorded_at)
                               VALUES (%s,%s,%s,%s,%s, NOW())
                               ON DUPLICATE KEY UPDATE quantity_consumed = VALUES(quantity_consumed), recorded_at = NOW()''',
                            (f['id'], m['id'], qty, period_month, year))
                    else:
                        cur.execute(
                            '''INSERT INTO consumption_history (facility_id, medicine_id, quantity_consumed, period_month, period_year, recorded_at)
                               VALUES (%s,%s,%s,%s,%s, NOW())
                               ON CONFLICT (facility_id, medicine_id, period_month, period_year)
                               DO UPDATE SET quantity_consumed = EXCLUDED.quantity_consumed, recorded_at = NOW()''',
                            (f['id'], m['id'], qty, period_month, year))
                    entries += 1
                except Exception as e:
                    print('Insert error:', e)
    conn.commit()
    print(f'Inserted/updated {entries} consumption_history rows')

    # call forecast persistence (compute and save)
    try:
        saved = compute_and_save_forecasts(3)
        print(f'compute_and_save_forecasts saved {saved} forecast rows')
    except Exception as e:
        print('Error invoking compute_and_save_forecasts:', e)

    cur.close()
    conn.close()


if __name__ == '__main__':
    populate_demo()
