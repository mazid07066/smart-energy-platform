from __future__ import annotations
import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

def _required(name: str) -> str:
    value=os.getenv(name, "").strip()
    if not value: raise RuntimeError(f"Missing required environment variable: {name}. Open ml-service/.env and provide the value.")
    return value

def _as_bool(name: str, default: bool) -> bool:
    raw=os.getenv(name)
    return default if raw is None else raw.strip().lower() in {"1","true","yes","on"}

def _as_int(name: str, default: int) -> int:
    raw=os.getenv(name)
    return default if raw is None or not raw.strip() else int(raw)

@dataclass(frozen=True)
class Settings:
    firebase_database_url: str
    credentials_path: Path
    model_dir: Path
    cors_origins: tuple[str,...]
    prediction_interval_seconds: int
    retrain_interval_hours: int
    enable_scheduler: bool
    min_classification_rows: int
    min_forecast_rows: int
    history_limit: int

def load_settings() -> Settings:
    origins=tuple(x.strip() for x in os.getenv("CORS_ORIGINS","http://localhost:3000,http://127.0.0.1:3000").split(",") if x.strip())
    model_dir=Path(os.getenv("MODEL_DIR", str(Path.cwd()/"models"))).expanduser()
    s=Settings(_required("FIREBASE_DATABASE_URL"), Path(_required("GOOGLE_APPLICATION_CREDENTIALS")).expanduser(), model_dir, origins, max(5,_as_int("PREDICTION_INTERVAL_SECONDS",15)), max(1,_as_int("RETRAIN_INTERVAL_HOURS",6)), _as_bool("ENABLE_SCHEDULER",True), max(20,_as_int("MIN_CLASSIFICATION_ROWS",40)), max(30,_as_int("MIN_FORECAST_ROWS",60)), max(100,_as_int("HISTORY_LIMIT",10000)))
    if not s.credentials_path.exists(): raise RuntimeError(f"Firebase service-account file was not found at: {s.credentials_path}")
    s.model_dir.mkdir(parents=True, exist_ok=True)
    return s
settings=load_settings()
