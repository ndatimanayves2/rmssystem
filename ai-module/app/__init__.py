from flask import Flask
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
import atexit


def create_app():
    app = Flask(__name__)
    CORS(app)

    from .routes.forecast import bp as forecast_bp
    app.register_blueprint(forecast_bp)

    # Start a background scheduler to compute and persist forecasts periodically.
    try:
        from .routes.forecast import compute_and_save_forecasts

        scheduler = BackgroundScheduler()
        # Run every day at 02:00 UTC by default; can be controlled with environment variables later.
        scheduler.add_job(lambda: compute_and_save_forecasts(3), 'cron', hour='2', minute='0')
        scheduler.start()

        # Shutdown scheduler when the app exits
        atexit.register(lambda: scheduler.shutdown(wait=False))
    except Exception:
        # If scheduling fails, continue without it (logged by caller)
        pass

    return app
