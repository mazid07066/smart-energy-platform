from __future__ import annotations
from typing import Any
import firebase_admin
from firebase_admin import credentials, db
from app.config import settings

def initialize_firebase()->None:
    if firebase_admin._apps: return
    firebase_admin.initialize_app(credentials.Certificate(str(settings.credentials_path)), {"databaseURL": settings.firebase_database_url})

def _reference(path:str)->db.Reference:
    initialize_firebase(); return db.reference(path)

def read_live()->dict[str,Any]:
    v=_reference("smartGrid/live").get(); return v if isinstance(v,dict) else {}

def read_history(limit:int|None=None)->dict[str,dict[str,Any]]:
    v=_reference("smartGrid/history").order_by_key().limit_to_last(limit or settings.history_limit).get(); return v if isinstance(v,dict) else {}

def read_dataset_labels()->dict[str,dict[str,Any]]:
    v=_reference("smartGrid/datasetLabels").get(); return v if isinstance(v,dict) else {}

def write_ml_latest(payload:dict[str,Any])->None:
    _reference("smartGrid/ml/latest").set({**payload,"serverTimestamp":{ ".sv":"timestamp"}})

def write_training_metrics(payload:dict[str,Any])->None:
    _reference("smartGrid/ml/training").set({**payload,"trainedAt":{ ".sv":"timestamp"}})

def write_training_status(status:str,message:str)->None:
    _reference("smartGrid/ml/training").update({"status":status,"message":message,"statusUpdatedAt":{ ".sv":"timestamp"}})
