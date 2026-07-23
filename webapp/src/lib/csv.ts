import type { EventLabel, HistoryPoint } from "@/lib/types";

const columns = [
  "id",
  "serverTimestamp",
  "mainCurrentmA",
  "user1CurrentmA",
  "user2CurrentmA",
  "unaccountedCurrentmA",
  "estimatedPowerW",
  "relay1State",
  "relay2State",
  "automaticMode",
  "wifiRSSI",
  "status",
  "label",
] as const;

function escapeCsv(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportHistoryCsv(
  history: HistoryPoint[],
  labels: Record<string, EventLabel>,
): void {
  const rows = history.map((point) => [
    point.id,
    point.serverTimestamp,
    point.mainCurrentmA,
    point.user1CurrentmA,
    point.user2CurrentmA,
    point.unaccountedCurrentmA,
    point.estimatedPowerW,
    point.relay1State,
    point.relay2State,
    point.automaticMode,
    point.wifiRSSI,
    point.status,
    labels[point.id] ?? "",
  ]);

  const csv = [
    columns.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `smart-energy-dataset-${new Date()
    .toISOString()
    .replaceAll(":", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
