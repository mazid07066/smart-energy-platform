export function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function formatCurrent(value: unknown): string {
  return `${numberOrZero(value).toFixed(1)} mA`;
}

export function formatPower(value: unknown): string {
  return `${numberOrZero(value).toFixed(2)} W`;
}

export function formatPercentage(value: unknown): string {
  return `${(numberOrZero(value) * 100).toFixed(1)}%`;
}

export function formatDateTime(timestamp?: number): string {
  if (!timestamp) return "Not available";
  return new Date(timestamp).toLocaleString();
}

export function rssiQuality(rssi?: number): string {
  if (typeof rssi !== "number") return "Unknown";
  if (rssi >= -55) return "Excellent";
  if (rssi >= -67) return "Good";
  if (rssi >= -75) return "Fair";
  return "Weak";
}
