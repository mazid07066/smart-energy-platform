from __future__ import annotations
import math,time
from datetime import datetime,timezone
from typing import Any
import numpy as np
from sklearn.ensemble import RandomForestClassifier,RandomForestRegressor
from sklearn.metrics import accuracy_score,confusion_matrix,f1_score,mean_absolute_error,mean_squared_error,precision_score,r2_score,recall_score
from sklearn.model_selection import train_test_split
from app.config import settings
from app.features import CLASS_NAMES,FORECAST_HORIZONS_SECONDS,MODEL_FEATURES,add_forecast_targets,history_to_dataframe
from app.firebase_io import read_dataset_labels,read_history,write_training_metrics,write_training_status
from app.model_store import save_classifier,save_forecast_model,save_metadata,save_metrics

def _native(v:Any)->Any:
    if isinstance(v,dict): return {str(k):_native(x) for k,x in v.items()}
    if isinstance(v,(list,tuple)): return [_native(x) for x in v]
    if isinstance(v,np.ndarray): return [_native(x) for x in v.tolist()]
    if isinstance(v,np.integer): return int(v)
    if isinstance(v,np.floating):
        x=float(v); return x if math.isfinite(x) else None
    if isinstance(v,float): return v if math.isfinite(v) else None
    return v

def _train_classifier(frame):
    d=frame.dropna(subset=MODEL_FEATURES+["label"]).copy()
    if len(d)<settings.min_classification_rows: raise ValueError(f"Classification needs at least {settings.min_classification_rows} usable labeled rows. Currently available: {len(d)}.")
    dist=d["label"].value_counts()
    if len(dist)<2: raise ValueError(f"Classification training needs at least two different classes. Current distribution: {dist.to_dict()}.")
    if not dist[dist<2].empty: raise ValueError(f"Every included class needs at least two usable rows. Insufficient classes: {dist[dist<2].to_dict()}.")
    X=d[MODEL_FEATURES].astype(float); y=d["label"].astype(str)
    test_size=max(len(y.unique()),int(round(len(d)*0.2))); test_size=min(test_size,len(d)-len(y.unique()))
    if test_size<len(y.unique()): raise ValueError("Not enough samples to create a representative test set. Collect more labeled history.")
    Xtr,Xte,ytr,yte=train_test_split(X,y,test_size=test_size,random_state=42,stratify=y)
    m=RandomForestClassifier(n_estimators=300,max_depth=14,min_samples_leaf=2,class_weight="balanced",random_state=42,n_jobs=-1,bootstrap=True,oob_score=True); m.fit(Xtr,ytr); p=m.predict(Xte)
    labels=[x for x in CLASS_NAMES if x in set(ytr)|set(yte)]
    imp={f:float(v) for f,v in sorted(zip(MODEL_FEATURES,m.feature_importances_),key=lambda z:z[1],reverse=True)}
    return m,{"accuracy":float(accuracy_score(yte,p)),"macroF1":float(f1_score(yte,p,average="macro",zero_division=0)),"precisionMacro":float(precision_score(yte,p,average="macro",zero_division=0)),"recallMacro":float(recall_score(yte,p,average="macro",zero_division=0)),"oobScore":float(m.oob_score_),"confusionMatrix":confusion_matrix(yte,p,labels=labels).tolist(),"classNames":labels,"classDistribution":{str(k):int(v) for k,v in y.value_counts().to_dict().items()},"trainRows":len(Xtr),"testRows":len(Xte),"featureImportance":imp}

def _train_forecast(frame,name):
    target=f"target_{name}"; d=frame.dropna(subset=MODEL_FEATURES+[target]).copy()
    if len(d)<settings.min_forecast_rows: raise ValueError(f"{name} forecasting needs at least {settings.min_forecast_rows} usable chronological rows. Currently available: {len(d)}.")
    cut=max(1,min(int(len(d)*0.8),len(d)-1)); tr=d.iloc[:cut]; te=d.iloc[cut:]
    Xtr=tr[MODEL_FEATURES].astype(float); ytr=tr[target].astype(float); Xte=te[MODEL_FEATURES].astype(float); yte=te[target].astype(float)
    m=RandomForestRegressor(n_estimators=300,max_depth=16,min_samples_leaf=2,random_state=42,n_jobs=-1); m.fit(Xtr,ytr); p=m.predict(Xte)
    return m,{"mae":float(mean_absolute_error(yte,p)),"rmse":float(math.sqrt(mean_squared_error(yte,p))),"r2":float(r2_score(yte,p)) if len(yte)>=2 else None,"trainRows":len(Xtr),"testRows":len(Xte),"horizonSeconds":FORECAST_HORIZONS_SECONDS[name]}

def train_all_models():
    started=time.perf_counter(); write_training_status("TRAINING","Training started.")
    try:
        frame=history_to_dataframe(read_history(),read_dataset_labels())
        if frame.empty: raise ValueError("No valid timestamped history records were found under smartGrid/history.")
        clf,cm=_train_classifier(frame); ff=add_forecast_targets(frame); fmodels={}; fm={}
        for name in FORECAST_HORIZONS_SECONDS: fmodels[name],fm[name]=_train_forecast(ff,name)
        version=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"); save_classifier(clf)
        for n,m in fmodels.items(): save_forecast_model(n,m)
        save_metadata({"modelVersion":version,"createdAtUtc":datetime.now(timezone.utc).isoformat(),"features":MODEL_FEATURES,"classificationClasses":[str(x) for x in clf.classes_],"historyRowsRead":len(frame)})
        payload=_native({"status":"TRAINED","message":"All Random Forest models trained successfully.","modelVersion":version,"trainingTimeSeconds":time.perf_counter()-started,**cm,"forecastMetrics":fm})
        save_metrics(payload); write_training_metrics(payload); return payload
    except Exception as exc:
        write_training_metrics({"status":"FAILED","message":str(exc),"trainingTimeSeconds":time.perf_counter()-started}); raise
