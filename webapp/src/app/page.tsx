"use client";

import {
  Activity,
  BatteryCharging,
  Gauge,
  RadioTower,
  Unplug,
  Users,
  Zap,
} from "lucide-react";
import { ChartsPlaceholder } from "@/components/ChartsPlaceholder";
import { CurrentChart, PowerChart } from "@/components/Charts";
import { DatasetLab } from "@/components/DatasetLab";
import { MetricCard } from "@/components/MetricCard";
import { MlPanel } from "@/components/MlPanel";
import { RelayControl } from "@/components/RelayControl";
import { StatusBanner } from "@/components/StatusBanner";
import {
  formatCurrent,
  formatDateTime,
  formatPower,
  rssiQuality,
} from "@/lib/formatters";
import { useSmartGrid } from "@/hooks/useSmartGrid";

export default function Home() {
  const smartGrid = useSmartGrid();
  const { live } = smartGrid;

  return (
    <main className="mx-auto min-h-screen max-w-[1600px] px-4 py-6 md:px-8">
      <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-sky-300">
            Smart Energy Control Center
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-bold tracking-tight text-white md:text-4xl">
            IoT-Based Smart Energy Demand Forecasting & Theft Detection
            System
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Last Arduino update: {formatDateTime(live.serverTimestamp)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-300">
          Uptime: {live.deviceUptime ?? "00:00:00"}
        </div>
      </header>

      <StatusBanner
        live={live}
        online={smartGrid.isDeviceOnline}
        firebaseConnected={smartGrid.firebaseConnected}
      />

      {smartGrid.lastError && (
        <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
          Firebase error: {smartGrid.lastError}
        </div>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <MetricCard
          title="Main current"
          value={formatCurrent(live.mainCurrentmA)}
          subtitle={`Raw ADC: ${live.mainRawADC ?? 0}`}
          icon={Gauge}
        />
        <MetricCard
          title="User 1 current"
          value={formatCurrent(live.user1CurrentmA)}
          subtitle={`Relay: ${live.relay1State ? "ON" : "OFF"}`}
          icon={Users}
        />
        <MetricCard
          title="User 2 current"
          value={formatCurrent(live.user2CurrentmA)}
          subtitle={`Relay: ${live.relay2State ? "ON" : "OFF"}`}
          icon={Users}
        />
        <MetricCard
          title="Unaccounted"
          value={formatCurrent(live.unaccountedCurrentmA)}
          subtitle="Main minus authorized branches"
          icon={Unplug}
        />
        <MetricCard
          title="Estimated power"
          value={formatPower(live.estimatedPowerW)}
          subtitle="Arduino-calculated value"
          icon={Zap}
        />
        <MetricCard
          title="Wi-Fi RSSI"
          value={`${live.wifiRSSI ?? 0} dBm`}
          subtitle={rssiQuality(live.wifiRSSI)}
          icon={RadioTower}
        />
        <MetricCard
          title="Automatic mode"
          value={live.automaticMode ? "ON" : "OFF"}
          subtitle={live.alarmLatched ? "Alarm latched" : "Alarm clear"}
          icon={BatteryCharging}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        {smartGrid.history.length > 0 ? (
          <CurrentChart data={smartGrid.history} />
        ) : (
          <ChartsPlaceholder
            title="Historical Current"
            icon={Activity}
          />
        )}
        <RelayControl
          live={live}
          commands={smartGrid.commands}
          acknowledgement={smartGrid.acknowledgement}
          sendCommand={smartGrid.sendCommand}
          resetAlarm={smartGrid.resetAlarm}
        />
      </section>

      <section className="mt-6">
        {smartGrid.history.length > 0 ? (
          <PowerChart data={smartGrid.history} />
        ) : (
          <ChartsPlaceholder
            title="Historical Power"
            icon={Zap}
          />
        )}
      </section>

      <section className="mt-6">
        <DatasetLab
          history={smartGrid.history}
          savedLabels={smartGrid.labels}
          saveLabel={smartGrid.saveLabel}
        />
      </section>

      <section className="mt-6">
        <MlPanel
          latest={smartGrid.mlLatest}
          training={smartGrid.training}
          trainModel={smartGrid.trainModel}
          predictLatest={smartGrid.predictLatest}
        />
      </section>

      <footer className="py-8 text-center text-xs text-slate-500">
        Arduino local protection remains authoritative for theft, overload,
        critical overload, sensor fault, relay shutdown, and buzzer control.
      </footer>
    </main>
  );
}
