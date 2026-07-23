"use client";

import { useMemo, useState } from "react";
import { Database, Download, Tag } from "lucide-react";
import { exportHistoryCsv } from "@/lib/csv";
import type { EventLabel, HistoryPoint } from "@/lib/types";

const supportedLabels: EventLabel[] = [
  "NORMAL",
  "THEFT",
  "OVERLOAD",
  "CRITICAL",
];

/**
 * Converts Arduino status values into the four ML target classes.
 *
 * Examples:
 * NORMAL                -> NORMAL
 * THEFT_DETECTED        -> THEFT
 * OVERLOAD_DETECTED     -> OVERLOAD
 * CRITICAL_OVERLOAD     -> CRITICAL
 */
function statusToLabel(status?: string): EventLabel | undefined {
  if (!status) {
    return undefined;
  }

  const normalizedStatus = status.trim().toUpperCase();

  if (normalizedStatus === "NORMAL") {
    return "NORMAL";
  }

  if (
    normalizedStatus === "THEFT" ||
    normalizedStatus === "THEFT_DETECTED" ||
    normalizedStatus.includes("THEFT")
  ) {
    return "THEFT";
  }

  if (
    normalizedStatus === "CRITICAL" ||
    normalizedStatus === "CRITICAL_DETECTED" ||
    normalizedStatus === "CRITICAL_OVERLOAD" ||
    normalizedStatus.includes("CRITICAL")
  ) {
    return "CRITICAL";
  }

  if (
    normalizedStatus === "OVERLOAD" ||
    normalizedStatus === "OVERLOAD_DETECTED" ||
    normalizedStatus.includes("OVERLOAD")
  ) {
    return "OVERLOAD";
  }

  return undefined;
}

type DatasetLabProps = {
  history: HistoryPoint[];
  savedLabels: Record<string, EventLabel>;
  saveLabel: (id: string, label: EventLabel) => Promise<void>;
};

export function DatasetLab({
  history,
  savedLabels,
  saveLabel,
}: DatasetLabProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | EventLabel>("ALL");
  const [message, setMessage] = useState<string | null>(null);

  /**
   * A manually saved Firebase label has priority.
   * If no manual label exists, the Arduino status is used.
   */
  const effectiveLabels = useMemo(() => {
    const result: Record<string, EventLabel> = {};

    history.forEach((point) => {
      const manualLabel = savedLabels[point.id];
      const automaticLabel = statusToLabel(point.status);

      if (manualLabel) {
        result[point.id] = manualLabel;
      } else if (automaticLabel) {
        result[point.id] = automaticLabel;
      }
    });

    return result;
  }, [history, savedLabels]);

  const classCounts = useMemo(() => {
    return supportedLabels.reduce(
      (counts, label) => {
        counts[label] = Object.values(effectiveLabels).filter(
          (value) => value === label,
        ).length;

        return counts;
      },
      {} as Record<EventLabel, number>,
    );
  }, [effectiveLabels]);

  const rows = useMemo(() => {
    return history
      .filter((point) => {
        if (filter === "ALL") {
          return true;
        }

        return effectiveLabels[point.id] === filter;
      })
      .slice(-30)
      .reverse();
  }, [history, filter, effectiveLabels]);

  async function handleLabelChange(
    historyRecordId: string,
    label: EventLabel,
  ) {
    setPending(historyRecordId);
    setMessage(null);

    try {
      await saveLabel(historyRecordId, label);
      setMessage(`Label ${label} saved successfully.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The label could not be saved.",
      );
    } finally {
      setPending(null);
    }
  }

  function handleCsvExport() {
    exportHistoryCsv(history, effectiveLabels);
  }

  return (
    <section className="panel rounded-2xl p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Database className="text-sky-300" />

            <h2 className="font-semibold text-white">Dataset Lab</h2>
          </div>

          <p className="mt-1 text-sm text-slate-400">
            Arduino status is currently used as the default machine-learning
            label. A manually selected label overrides the status-derived
            label.
          </p>
        </div>

        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 font-medium text-white transition hover:bg-sky-400"
          onClick={handleCsvExport}
        >
          <Download size={17} />
          Export CSV
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {supportedLabels.map((label) => (
          <div key={label} className="rounded-xl bg-black/20 p-3">
            <p className="text-xs text-slate-400">{label}</p>

            <p className="mt-1 text-xl font-semibold text-white">
              {classCounts[label]}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Tag size={17} className="text-slate-400" />

        <select
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as "ALL" | EventLabel)
          }
        >
          <option value="ALL">All records</option>

          {supportedLabels.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>

        <span className="text-xs text-slate-500">
          Showing the latest 30 matching records
        </span>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
          {message}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-700 text-slate-400">
            <tr>
              <th className="px-3 py-3">Time</th>
              <th className="px-3 py-3">Main mA</th>
              <th className="px-3 py-3">Unaccounted mA</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Label</th>
              <th className="px-3 py-3">Label source</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((point) => {
              const automaticLabel = statusToLabel(point.status);
              const manualLabel = savedLabels[point.id];
              const effectiveLabel = effectiveLabels[point.id];

              return (
                <tr
                  key={point.id}
                  className="border-b border-slate-800/80"
                >
                  <td className="whitespace-nowrap px-3 py-3 text-slate-200">
                    {point.serverTimestamp
                      ? new Date(point.serverTimestamp).toLocaleString()
                      : point.id}
                  </td>

                  <td className="px-3 py-3 text-slate-200">
                    {(point.mainCurrentmA ?? 0).toFixed(1)}
                  </td>

                  <td className="px-3 py-3 text-slate-200">
                    {(point.unaccountedCurrentmA ?? 0).toFixed(1)}
                  </td>

                  <td className="px-3 py-3">
                    <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-200">
                      {point.status ?? "UNKNOWN"}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    <select
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-white disabled:cursor-wait disabled:opacity-50"
                      value={effectiveLabel ?? ""}
                      disabled={pending === point.id}
                      onChange={(event) =>
                        handleLabelChange(
                          point.id,
                          event.target.value as EventLabel,
                        )
                      }
                    >
                      <option value="" disabled>
                        No valid label
                      </option>

                      {supportedLabels.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-3 py-3">
                    {manualLabel ? (
                      <span className="rounded-full bg-violet-400/10 px-2.5 py-1 text-xs text-violet-200">
                        Manual override
                      </span>
                    ) : automaticLabel ? (
                      <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-200">
                        Arduino status
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs text-amber-200">
                        Unmapped status
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="py-8 text-center text-slate-400">
            No history records match the selected filter.
          </p>
        )}
      </div>
    </section>
  );
}