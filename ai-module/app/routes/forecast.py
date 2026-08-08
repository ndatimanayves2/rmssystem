from flask import Blueprint, jsonify, request
import os
import psycopg2
import psycopg2.extras
from ..models.forecaster import forecast_consumption
from datetime import datetime

bp = Blueprint("forecast", __name__)


def get_db():
    """Return a DB connection. Supports Postgres (default) and MySQL when DB_ENGINE=mysql."""
    engine = os.getenv("DB_ENGINE", "postgres").lower()
    if engine.startswith('mysql'):
        # mysql-connector-python
        import mysql.connector
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', 3306)),
            database=os.getenv('DB_NAME', 'medical_supply_chain'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
        )
        # caller expects cursor().fetchall() to return dict-like rows; ensure dictionary cursor when used
        return conn
    else:
        # Use sslmode=require when DB_SSL is true (e.g. managed Postgres like Render)
        sslmode = "require" if os.getenv("DB_SSL", "false").lower() == "true" else "disable"
        return psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", 5432),
            dbname=os.getenv("DB_NAME", "medical_supply_chain"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", ""),
            sslmode=sslmode,
            cursor_factory=psycopg2.extras.RealDictCursor,
        )


@bp.get("/health")
def health():
    return jsonify({"status": "OK"})


@bp.get("/forecast")
def forecast():
    facility_id = request.args.get("facility_id")
    medicine_id = request.args.get("medicine_id")
    months_ahead = int(request.args.get("months_ahead", 3))

    try:
        conn = get_db()
        engine = os.getenv('DB_ENGINE', 'postgres').lower()
        if engine.startswith('mysql'):
            cur = conn.cursor(dictionary=True)
        else:
            cur = conn.cursor()

        sql = """
            SELECT facility_id::text, medicine_id::text, period_month, period_year, quantity_consumed
            FROM consumption_history
            WHERE 1=1
        """
        params = []
        if facility_id:
            params.append(facility_id)
            sql += f" AND facility_id = %s"
        if medicine_id:
            params.append(medicine_id)
            sql += f" AND medicine_id = %s"
        sql += " ORDER BY period_year, period_month"

        cur.execute(sql, params)
        rows = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()

        # Group by (facility_id, medicine_id)
        groups = {}
        for row in rows:
            key = (row["facility_id"], row["medicine_id"])
            groups.setdefault(key, []).append(row)

        results = []
        for history in groups.values():
            results.extend(forecast_consumption(history, months_ahead))

        return jsonify({"data": results, "count": len(results)})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.post("/forecast/save")
def save_forecasts():
    """Compute and persist forecasts into ai_forecasts table.

    This route now delegates to `compute_and_save_forecasts` which is
    also called by the background scheduler for periodic updates.
    """
    months_ahead = int(request.args.get("months_ahead", 3))
    try:
        saved = compute_and_save_forecasts(months_ahead)
        return jsonify({"message": f"Saved {saved} forecasts"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def compute_and_save_forecasts(months_ahead: int = 3) -> int:
    """Compute forecasts for all facility/medicine groups and persist them.

    Returns the number of forecast rows attempted to save.
    """
    conn = get_db()
    engine = os.getenv('DB_ENGINE', 'postgres').lower()
    if engine.startswith('mysql'):
        cur = conn.cursor(dictionary=True)
    else:
        cur = conn.cursor()

    cur.execute("""
        SELECT facility_id::text, medicine_id::text, period_month, period_year, quantity_consumed
        FROM consumption_history ORDER BY period_year, period_month
    """)
    rows = [dict(r) for r in cur.fetchall()]

    groups = {}
    for row in rows:
        key = (row["facility_id"], row["medicine_id"])
        groups.setdefault(key, []).append(row)

    saved = 0
    for history in groups.values():
        forecasts = forecast_consumption(history, months_ahead)
        for f in forecasts:
            if engine.startswith('mysql'):
                cur.execute("""
                    INSERT INTO ai_forecasts
                        (facility_id, medicine_id, forecast_month, forecast_year,
                         predicted_quantity, confidence_score, model_version)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE predicted_quantity = VALUES(predicted_quantity), confidence_score = VALUES(confidence_score), model_version = VALUES(model_version)
                """, (
                    f["facility_id"], f["medicine_id"],
                    f["forecast_month"], f["forecast_year"],
                    f["predicted_quantity"], f["confidence_score"],
                    f["model_version"],
                ))
            else:
                cur.execute("""
                    INSERT INTO ai_forecasts
                        (facility_id, medicine_id, forecast_month, forecast_year,
                         predicted_quantity, confidence_score, model_version)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (facility_id, medicine_id, forecast_month, forecast_year)
                    DO UPDATE SET predicted_quantity = EXCLUDED.predicted_quantity,
                                  confidence_score = EXCLUDED.confidence_score,
                                  model_version = EXCLUDED.model_version,
                                  created_at = NOW()
                """, (
                    f["facility_id"], f["medicine_id"],
                    f["forecast_month"], f["forecast_year"],
                    f["predicted_quantity"], f["confidence_score"],
                    f["model_version"],
                ))
            saved += 1

    conn.commit()
    cur.close()
    conn.close()
    return saved


@bp.post('/chat')
def chat():
    """Simple rule-based, data-aware chatbot endpoint.

    Falls back gracefully if the main backend assistant is unavailable.
    Detects English/Kinyarwanda and returns a contextual answer.
    """
    data = request.get_json(silent=True) or {}
    message = (data.get('message') or '').strip()
    if not message:
        return jsonify({'error': 'Message is required'}), 400

    lower = message.lower()
    lang = 'rw' if any(k in lower for k in ['muraho', 'ni', 'muri', 'kuki', 'ninde', 'ryari', 'hehe', 'mbwira', 'urakoze', 'murakoze', 'ububiko', 'imiti', 'ibitaro', 'icyifuzo', 'kugura', 'guhabwa', 'amakuru']) else 'en'

    # Greeting
    if any(k in lower for k in ['hello', 'hi', 'hey', 'muraho', 'bite', 'amakuru']):
        return jsonify({'data': {
            'answer': 'Muraho! Ndi AI assistant. Mbaza ibijyanye n\'imiti, ububiko, koherezwa, forecasts cyangwa recommendations.'
                      if lang == 'rw'
                      else 'Hello! I\'m the AI assistant. Ask about medicines, stock, deliveries, forecasts, or recommendations.',
            'intent': 'greeting', 'lang': lang
        }})

    # Help
    if any(k in lower for k in ['help', 'ubufasha', 'mbariza']):
        return jsonify({'data': {
            'answer': 'Ndashobora gusubiza ibibazo kuri imiti, ububiko, koherezwa, forecasts na recommendations.'
                      if lang == 'rw'
                      else 'I can answer questions about medicines, stock, deliveries, forecasts, and recommendations.',
            'intent': 'help', 'lang': lang
        }})

    # Low stock
    if any(k in lower for k in ['low stock', 'out of stock', 'shortage', 'inkende', 'kabije', 'birangiye', 'nta']):
        return jsonify({'data': {
            'answer': 'Kugira wonne urutonde rwinjizwa ku rutonde rw\'inkende, komeza ugere kuri > Recommendations > Stock Management.'
                      if lang == 'rw'
                      else 'To see the low-stock list, go to the Stock Management / Recommendations page.',
            'intent': 'low_stock', 'lang': lang
        }})

    # Forecast
    if any(k in lower for k in ['forecast', 'predict', 'kuboneka', 'byahise', 'kubaho']):
        return jsonify({'data': {
            'answer': 'Forecasts ziboneka ku rupapuro rwa Forecast. Kugira uhite ubona, koresha "Populate forecasts".'
                      if lang == 'rw'
                      else 'Forecasts are available on the Forecast page. Use "Populate forecasts" to generate them.',
            'intent': 'forecast', 'lang': lang
        }})

    # Recommendations
    if any(k in lower for k in ['recommend', 'suggest', 'should i order', 'kugura', 'icyo kugura']):
        return jsonify({'data': {
            'answer': 'Recommendations ziboneka ku rupapuro rwa Recommendations.' if lang == 'rw'
                      else 'Recommendations are available on the Recommendations page.',
            'intent': 'recommendation', 'lang': lang
        }})

    # Default
    return jsonify({'data': {
        'answer': 'Nabisomye neza. Kugira amakuru yuzuye, koresha urupapuro rw\'imiti, ububiko, koherezwa cyangwa reports.'
                  if lang == 'rw'
                  else 'I understood. For complete details, use the medicines, stock, deliveries, or reports pages.',
        'intent': 'general', 'lang': lang
    }})


@bp.get('/recommendations')
def recommendations():
    """Return aggregated purchase recommendations for the next N months.

    Query params:
      - facility_id (optional) : filter by facility
      - months_ahead (optional) : months to aggregate (default 3)
    """
    try:
        facility_id = request.args.get('facility_id')
        months_ahead = int(request.args.get('months_ahead', 3))

        now = datetime.utcnow()
        current_index = now.year * 12 + now.month
        max_index = current_index + months_ahead

        conn = get_db()
        engine = os.getenv('DB_ENGINE', 'postgres').lower()
        if engine.startswith('mysql'):
            cur = conn.cursor(dictionary=True)
        else:
            cur = conn.cursor()

        sql = f"""
            SELECT af.facility_id, af.medicine_id,
                   SUM(af.predicted_quantity) as predicted_total,
                   AVG(af.confidence_score) as avg_confidence
            FROM ai_forecasts af
            WHERE (af.forecast_year * 12 + af.forecast_month) > %s
              AND (af.forecast_year * 12 + af.forecast_month) <= %s
        """
        params = [current_index, max_index]
        if facility_id:
            sql += " AND af.facility_id = %s"
            params.append(facility_id)
        sql += " GROUP BY af.facility_id, af.medicine_id"

        cur.execute(sql, params)
        groups = [dict(r) for r in cur.fetchall()]

        recommendations = []
        for g in groups:
            # get current inventory and medicine safety_stock/unit
            cur.execute("SELECT quantity FROM inventory WHERE facility_id = %s AND medicine_id = %s", (g['facility_id'], g['medicine_id']))
            inv = cur.fetchone()
            current_qty = inv['quantity'] if inv else 0

            cur.execute("SELECT name, unit, safety_stock FROM medicines WHERE id = %s", (g['medicine_id'],))
            med = cur.fetchone() or {'name': None, 'unit': None, 'safety_stock': 0}

            recommended = int(max(0, int(g['predicted_total']) - max(0, current_qty - (med['safety_stock'] or 0))))

            recommendations.append({
                'facility_id': g['facility_id'],
                'medicine_id': g['medicine_id'],
                'medicine_name': med['name'],
                'unit': med['unit'],
                'predicted_total': int(g['predicted_total']),
                'current_quantity': int(current_qty),
                'safety_stock': med['safety_stock'] or 0,
                'recommended_purchase': recommended,
                'avg_confidence': float(g['avg_confidence'] or 0),
            })

        cur.close()
        conn.close()
        # sort by recommended_purchase desc
        recommendations.sort(key=lambda r: r['recommended_purchase'], reverse=True)
        return jsonify({'data': recommendations, 'count': len(recommendations)})

    except Exception as e:
        return jsonify({'error': str(e)}), 500
</content>
