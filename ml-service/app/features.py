from __future__ import annotations
from typing import Any
import numpy as np
import pandas as pd
CLASS_NAMES=["NORMAL","THEFT","OVERLOAD","CRITICAL"]
MODEL_FEATURES=["mainCurrentmA","user1CurrentmA","user2CurrentmA","unaccountedCurrentmA","estimatedPowerW","relay1State","relay2State","wifiRSSI","hour","dayOfWeek","mainLag1","mainLag2","mainRollingMean3","mainRollingStd3"]
FORECAST_HORIZONS_SECONDS={"forecast15Seconds":15,"forecast1Minute":60,"forecast5Minutes":300}
FORECAST_FIREBASE_FIELDS={"forecast15Seconds":"forecast15Seconds_mA","forecast1Minute":"forecast1Minute_mA","forecast5Minutes":"forecast5Minutes_mA"}

def status_to_label(status:Any)->str|None:
    if not isinstance(status,str): return None
    s=status.strip().upper()
    if s=="NORMAL": return "NORMAL"
    if "THEFT" in s: return "THEFT"
    if "CRITICAL" in s: return "CRITICAL"
    if "OVERLOAD" in s: return "OVERLOAD"
    return None

def _manual_label(v:Any)->str|None:
    if isinstance(v,dict): v=v.get("label")
    if not isinstance(v,str): return None
    v=v.strip().upper(); return v if v in CLASS_NAMES else None

def history_to_dataframe(history,labels):
    rows=[]
    for rid,rec in history.items():
        if not isinstance(rec,dict): continue
        manual=_manual_label(labels.get(rid)); derived=status_to_label(rec.get("status"))
        rows.append({"id":rid,**rec,"label":manual or derived,"labelSource":"MANUAL" if manual else ("STATUS" if derived else "UNLABELED")})
    if not rows: return pd.DataFrame()
    f=pd.DataFrame(rows)
    if "serverTimestamp" not in f.columns: f["serverTimestamp"]=np.nan
    f["serverTimestamp"]=pd.to_numeric(f["serverTimestamp"],errors="coerce"); f=f.dropna(subset=["serverTimestamp"]).sort_values("serverTimestamp").reset_index(drop=True)
    for c in ["mainCurrentmA","user1CurrentmA","user2CurrentmA","unaccountedCurrentmA","estimatedPowerW","wifiRSSI"]:
        if c not in f.columns: f[c]=0.0
        f[c]=pd.to_numeric(f[c],errors="coerce")
    for c in ["relay1State","relay2State"]:
        if c not in f.columns: f[c]=False
        f[c]=f[c].map(lambda v:1.0 if bool(v) else 0.0)
    ts=pd.to_datetime(f["serverTimestamp"],unit="ms",errors="coerce",utc=True)
    f["hour"]=ts.dt.hour.astype(float); f["dayOfWeek"]=ts.dt.dayofweek.astype(float)
    f["mainLag1"]=f["mainCurrentmA"].shift(1); f["mainLag2"]=f["mainCurrentmA"].shift(2)
    f["mainRollingMean3"]=f["mainCurrentmA"].rolling(3,min_periods=3).mean(); f["mainRollingStd3"]=f["mainCurrentmA"].rolling(3,min_periods=3).std(ddof=0)
    return f

def add_forecast_targets(frame):
    if frame.empty:return frame.copy()
    r=frame.copy(); ts=r["serverTimestamp"].to_numpy(float); cur=r["mainCurrentmA"].to_numpy(float)
    for name,sec in FORECAST_HORIZONS_SECONDS.items():
        target=np.full(len(r),np.nan)
        for i,t in enumerate(ts):
            j=int(np.searchsorted(ts,t+sec*1000,side="left"))
            if j<len(r): target[i]=cur[j]
        r[f"target_{name}"]=target
    return r

def latest_feature_row(frame):
    p=frame.dropna(subset=MODEL_FEATURES)
    if p.empty: raise ValueError("At least three valid chronological history records are required to calculate lag and rolling features.")
    return p.iloc[[-1]][MODEL_FEATURES].astype(float)
