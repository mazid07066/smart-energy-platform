import {
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  Radio,
  ShieldAlert,
} from "lucide-react";
import type { LiveData } from "@/lib/types";

type StatusBannerProps = {
  live: LiveData;
  online: boolean;
  firebaseConnected: boolean;
};

export function StatusBanner({
  live,
  online,
  firebaseConnected,
}: StatusBannerProps) {
  const alerts = [
    live.sensorFaultDetected && "Sensor fault",
    live.theftDetected && "Theft detected",
    live.overloadDetected && "Overload detected",
    live.criticalDetected && "Critical overload",
    live.alarmLatched && "Alarm latched",
  ].filter(Boolean) as string[];

  const healthy = online && alerts.length === 0;

  return (
    <section
      className={`rounded-2xl border p-5 ${
        healthy
          ? "border-emerald-400/25 bg-emerald-400/8"
          : "border-rose-400/30 bg-rose-400/10"
      }`}
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          {healthy ? (
            <CheckCircle2 className="mt-0.5 text-emerald-300" />
          ) : online ? (
            <ShieldAlert className="mt-0.5 text-rose-300" />
          ) : (
            <CircleOff className="mt-0.5 text-rose-300" />
          )}
          <div>
            <h2 className="font-semibold text-white">
              {online
                ? healthy
                  ? "System operating normally"
                  : "Protection warning active"
                : "Arduino is offline or data is stale"}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Arduino status: {live.status ?? "UNKNOWN"}
            </p>
            {alerts.length > 0 && (
              <p className="mt-2 text-sm text-rose-200">
                {alerts.join(" • ")}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1 rounded-full bg-black/20 px-3 py-2">
            <Radio size={14} />
            Firebase {firebaseConnected ? "connected" : "disconnected"}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-black/20 px-3 py-2">
            <AlertTriangle size={14} />
            Calibration {live.calibrationValid ? "valid" : "invalid"}
          </span>
        </div>
      </div>
    </section>
  );
}
