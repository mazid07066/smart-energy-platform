from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from datetime import datetime,timezone
from typing import Any
from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.firebase_io import initialize_firebase,read_history,read_live
from app.model_store import load_metrics,models_ready
from app.predictor import predict_latest
from app.scheduler import scheduler_status,start_scheduler,stop_scheduler
from app.training import train_all_models
logging.basicConfig(level=logging.INFO,format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"); logger=logging.getLogger(__name__)
@asynccontextmanager
async def lifespan(_:FastAPI):
    initialize_firebase(); start_scheduler(); yield; stop_scheduler()
app=FastAPI(title="Smart Energy ML Service",version="1.0.0",description="Random Forest classification and demand forecasting service.",lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=list(settings.cors_origins),allow_credentials=False,allow_methods=["GET","POST","OPTIONS"],allow_headers=["Content-Type"])
@app.get("/")
def root(): return {"service":"Smart Energy ML Service","docs":"/docs","health":"/health"}
@app.get("/health")
def health()->dict[str,Any]: return {"status":"ok","timeUtc":datetime.now(timezone.utc).isoformat(),"firebaseConnected":True,"liveDataAvailable":bool(read_live()),"recentHistoryRecordsRead":len(read_history(limit=100)),"modelsReady":models_ready(),"scheduler":scheduler_status()}
@app.post("/train")
def train():
    try:return train_all_models()
    except ValueError as e: raise HTTPException(status_code=422,detail=str(e)) from e
    except Exception as e: logger.exception("Training failed"); raise HTTPException(status_code=500,detail=f"Training failed: {e}") from e
@app.post("/predict/latest")
def predict():
    try:return predict_latest()
    except FileNotFoundError as e: raise HTTPException(status_code=409,detail=str(e)) from e
    except ValueError as e: raise HTTPException(status_code=422,detail=str(e)) from e
    except Exception as e: logger.exception("Prediction failed"); raise HTTPException(status_code=500,detail=f"Prediction failed: {e}") from e
@app.get("/metrics")
def metrics():
    m=load_metrics()
    if not m: raise HTTPException(status_code=404,detail="No training metrics exist. Run POST /train first.")
    return m
