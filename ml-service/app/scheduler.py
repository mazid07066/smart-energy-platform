from __future__ import annotations
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.config import settings
from app.model_store import models_ready
from app.predictor import predict_latest
from app.training import train_all_models
logger=logging.getLogger(__name__); _scheduler=None
def _safe_predict():
    if not models_ready(): return
    try: predict_latest()
    except Exception: logger.exception("Scheduled prediction failed.")
def _safe_retrain():
    try: train_all_models()
    except Exception: logger.exception("Scheduled retraining failed.")
def start_scheduler():
    global _scheduler
    if not settings.enable_scheduler: return None
    if _scheduler and _scheduler.running:return _scheduler
    s=BackgroundScheduler(timezone="UTC",daemon=True,job_defaults={"coalesce":True,"max_instances":1,"misfire_grace_time":60})
    s.add_job(_safe_predict,"interval",seconds=settings.prediction_interval_seconds,id="predict_latest",replace_existing=True)
    s.add_job(_safe_retrain,"interval",hours=settings.retrain_interval_hours,id="retrain_models",replace_existing=True); s.start(); _scheduler=s; return s
def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:_scheduler.shutdown(wait=False)
    _scheduler=None
def scheduler_status():
    if not _scheduler or not _scheduler.running:return {"enabled":settings.enable_scheduler,"running":False}
    return {"enabled":True,"running":True,"jobs":[{"id":j.id,"nextRunTime":j.next_run_time.isoformat() if j.next_run_time else None} for j in _scheduler.get_jobs()]}
