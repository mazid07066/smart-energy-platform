from __future__ import annotations
import json
from typing import Any
import joblib
from app.config import settings
CLASSIFIER_FILE=settings.model_dir/"classifier.joblib"
FORECAST_FILES={"forecast15Seconds":settings.model_dir/"forecast_15_seconds.joblib","forecast1Minute":settings.model_dir/"forecast_1_minute.joblib","forecast5Minutes":settings.model_dir/"forecast_5_minutes.joblib"}
METADATA_FILE=settings.model_dir/"metadata.json"; METRICS_FILE=settings.model_dir/"metrics.json"
def save_classifier(m): joblib.dump(m,CLASSIFIER_FILE)
def load_classifier():
    if not CLASSIFIER_FILE.exists(): raise FileNotFoundError("Classifier model does not exist. Run POST /train first.")
    return joblib.load(CLASSIFIER_FILE)
def save_forecast_model(n,m): joblib.dump(m,FORECAST_FILES[n])
def load_forecast_model(n):
    p=FORECAST_FILES[n]
    if not p.exists(): raise FileNotFoundError(f"Forecast model {n} does not exist. Run POST /train first.")
    return joblib.load(p)
def save_json(p,payload): p.write_text(json.dumps(payload,indent=2,ensure_ascii=False),encoding="utf-8")
def read_json(p): return {} if not p.exists() else json.loads(p.read_text(encoding="utf-8"))
def save_metadata(x): save_json(METADATA_FILE,x)
def load_metadata(): return read_json(METADATA_FILE)
def save_metrics(x): save_json(METRICS_FILE,x)
def load_metrics(): return read_json(METRICS_FILE)
def models_ready(): return CLASSIFIER_FILE.exists() and all(p.exists() for p in FORECAST_FILES.values())
