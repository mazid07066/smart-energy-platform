from __future__ import annotations
import numpy as np
from app.features import FORECAST_FIREBASE_FIELDS,history_to_dataframe,latest_feature_row
from app.firebase_io import read_dataset_labels,read_history,read_live,write_ml_latest
from app.model_store import load_classifier,load_forecast_model,load_metadata,models_ready

def _recommendation(c,conf):
    if c=="THEFT": return "Possible unaccounted-current event detected. Verify the bypass branch and authorized user loads immediately."
    if c=="OVERLOAD": return "Demand is above the normal operating range. Review loads and prepare non-priority load shedding."
    if c=="CRITICAL": return "Critical demand condition predicted. Keep Arduino local protection active and inspect the system immediately."
    if conf<0.60: return "Operation appears normal, but model confidence is low. Collect more balanced labeled data."
    return "Operation appears normal."

def predict_latest():
    if not models_ready(): raise FileNotFoundError("The complete model set is not available. Run POST /train first.")
    frame=history_to_dataframe(read_history(),read_dataset_labels()); X=latest_feature_row(frame); clf=load_classifier(); probs=clf.predict_proba(X)[0]; i=int(np.argmax(probs)); cls=str(clf.classes_[i]); conf=float(probs[i])
    forecasts={}
    for n,f in FORECAST_FIREBASE_FIELDS.items(): forecasts[f]=float(max(0.0,load_forecast_model(n).predict(X)[0]))
    meta=load_metadata(); live=read_live(); payload={"classification":cls,"classificationConfidence":conf,**forecasts,"recommendation":_recommendation(cls,conf),"modelVersion":meta.get("modelVersion","UNKNOWN"),"sourceHistoryRecordId":str(frame.iloc[-1]["id"]),"sourceDeviceTimestamp":int(frame.iloc[-1]["serverTimestamp"]),"liveArduinoStatus":live.get("status","UNKNOWN")}; write_ml_latest(payload); return payload
