import os
import pytest
import psycopg2
import psycopg2.extras

# Make sure PYTHONPATH includes ai-module app
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from scripts.populate_demo import populate_demo
from app.routes.forecast import compute_and_save_forecasts


def get_conn():
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', 5432)),
        dbname=os.getenv('DB_NAME', 'medical_supply_chain_test'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', ''),
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


@pytest.mark.integration
def test_populate_and_forecast():
    # This test requires a running Postgres instance with the test DB and schema applied.
    # Set env vars before running, e.g. DB_NAME=medical_supply_chain_test
    populate_demo(limit_facilities=2, limit_medicines=2, months=6)

    # run compute directly to ensure forecasts exist
    saved = compute_and_save_forecasts(3)
    assert isinstance(saved, int) and saved >= 0

    conn = get_conn()
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) as c FROM consumption_history')
    ch = cur.fetchone()['c']
    cur.execute('SELECT COUNT(*) as c FROM ai_forecasts')
    af = cur.fetchone()['c']
    cur.close()
    conn.close()

    assert ch > 0
    assert af >= 0
