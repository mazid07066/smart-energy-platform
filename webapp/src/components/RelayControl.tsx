"use client";

import { useState } from "react";
import {
  BellOff,
  LoaderCircle,
  Power,
  RefreshCw,
  Settings2,
} from "lucide-react";
import type { Acknowledgement, Commands, LiveData } from "@/lib/types";
import { formatDateTime } from "@/lib/formatters";

type RelayControlProps = {
  live: LiveData;
  commands: Commands;
  acknowledgement: Acknowledgement;
  sendCommand: (
    changes: Partial<Omit<Commands, "commandId">>,
  ) => Promise<void>;
  resetAlarm: () => Promise<void>;
};

export function RelayControl({
  live,
  commands,
  acknowledgement,
  sendCommand,
  resetAlarm,
}: RelayControlProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(name: string, action: () => Promise<void>) {
    setBusy(name);
    setMessage(null);
    try {
      await action();
      setMessage("Command written to Firebase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Command failed.");
    } finally {
      setBusy(null);
    }
  }

  const manualControlsDisabled = commands.automaticMode;

  return (
    <section className="panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">Remote Control</h2>
          <p className="mt-1 text-sm text-slate-400">
            Arduino protection logic remains the final authority.
          </p>
        </div>
        <Settings2 className="text-sky-300" />
      </div>

      <div className="mt-5 grid gap-3">
        <button
          className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-left disabled:opacity-50"
          disabled={busy !== null}
          onClick={() =>
            run("mode", () =>
              sendCommand({
                automaticMode: !commands.automaticMode,
              }),
            )
          }
        >
          <span>
            <span className="block font-medium text-white">
              Operating mode
            </span>
            <span className="text-sm text-slate-400">
              {commands.automaticMode ? "Automatic" : "Manual"}
            </span>
          </span>
          {busy === "mode" ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <RefreshCw />
          )}
        </button>

        {[1, 2].map((relayNumber) => {
          const key = relayNumber === 1 ? "relay1" : "relay2";
          const commandState =
            relayNumber === 1 ? commands.relay1 : commands.relay2;
          const actualState =
            relayNumber === 1 ? live.relay1State : live.relay2State;
          return (
            <button
              key={key}
              className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-40"
              disabled={manualControlsDisabled || busy !== null}
              onClick={() =>
                run(key, () =>
                  sendCommand({ [key]: !commandState }),
                )
              }
            >
              <span>
                <span className="block font-medium text-white">
                  Relay {relayNumber}
                </span>
                <span className="text-sm text-slate-400">
                  Actual: {actualState ? "ON" : "OFF"} • Requested:{" "}
                  {commandState ? "ON" : "OFF"}
                </span>
              </span>
              <Power />
            </button>
          );
        })}

        <button
          className="flex items-center justify-between rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-left disabled:opacity-50"
          disabled={busy !== null}
          onClick={() => run("alarm", resetAlarm)}
        >
          <span>
            <span className="block font-medium text-white">Reset alarm</span>
            <span className="text-sm text-slate-300">
              Sends a short reset pulse
            </span>
          </span>
          {busy === "alarm" ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <BellOff />
          )}
        </button>
      </div>

      <div className="mt-5 rounded-xl bg-black/20 p-4 text-sm">
        <p className="font-medium text-white">Acknowledgement</p>
        <p className="mt-1 text-slate-300">
          Status: {acknowledgement.status ?? "WAITING"}
        </p>
        <p className="text-slate-400">
          Command ID: {acknowledgement.commandId ?? 0}
        </p>
        <p className="text-slate-400">
          Time: {formatDateTime(acknowledgement.serverTimestamp)}
        </p>
        {acknowledgement.message && (
          <p className="mt-1 text-slate-300">{acknowledgement.message}</p>
        )}
      </div>

      {message && <p className="mt-3 text-sm text-sky-200">{message}</p>}
    </section>
  );
}
