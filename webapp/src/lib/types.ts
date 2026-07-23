export type EventLabel = "NORMAL" | "THEFT" | "OVERLOAD" | "CRITICAL";

export type LiveData = {
  serverTimestamp?: number;
  deviceUptimeMs?: number;
  deviceUptime?: string;
  deviceOnline?: boolean;
  mainRawADC?: number;
  user1RawADC?: number;
  user2RawADC?: number;
  mainZeroADC?: number;
  user1ZeroADC?: number;
  user2ZeroADC?: number;
  mainCurrentmA?: number;
  user1CurrentmA?: number;
  user2CurrentmA?: number;
  unaccountedCurrentmA?: number;
  estimatedPowerW?: number;
  status?: string;
  calibrationValid?: boolean;
  sensorFaultDetected?: boolean;
  theftDetected?: boolean;
  overloadDetected?: boolean;
  criticalDetected?: boolean;
  relay1State?: boolean;
  relay2State?: boolean;
  automaticMode?: boolean;
  alarmLatched?: boolean;
  theftCounter?: number;
  overloadCounter?: number;
  criticalCounter?: number;
  wifiRSSI?: number;
};

export type HistoryPoint = LiveData & {
  id: string;
  timeLabel: string;
};

export type Commands = {
  automaticMode: boolean;
  relay1: boolean;
  relay2: boolean;
  resetAlarm: boolean;
  commandId: number;
};

export type Acknowledgement = {
  status?: string;
  commandId?: number;
  serverTimestamp?: number;
  message?: string;
};

export type MlOutput = {
  serverTimestamp?: number;
  classification?: string;
  classificationConfidence?: number;
  forecast15Seconds_mA?: number;
  forecast1Minute_mA?: number;
  forecast5Minutes_mA?: number;
  recommendation?: string;
  modelVersion?: string;
};

export type TrainingMetrics = {
  status?: string;
  modelVersion?: string;
  trainedAt?: number;
  trainingTimeSeconds?: number;
  accuracy?: number;
  macroF1?: number;
  precisionMacro?: number;
  recallMacro?: number;
  oobScore?: number;
  confusionMatrix?: number[][];
  classNames?: string[];
  featureImportance?: Record<string, number>;
  forecastMetrics?: {
    forecast15Seconds?: ForecastMetric;
    forecast1Minute?: ForecastMetric;
    forecast5Minutes?: ForecastMetric;
  };
};

export type ForecastMetric = {
  mae?: number;
  rmse?: number;
  r2?: number;
};
