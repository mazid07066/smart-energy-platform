"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  limitToLast,
  onValue,
  query,
  ref,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { database } from "@/lib/firebase";
import type {
  Acknowledgement,
  Commands,
  EventLabel,
  HistoryPoint,
  LiveData,
  MlOutput,
  TrainingMetrics,
} from "@/lib/types";

const DEVICE_STALE_AFTER_MS = 30_000;

const defaultCommands: Commands = {
  automaticMode: true,
  relay1: true,
  relay2: true,
  resetAlarm: false,
  commandId: 0,
};

/**
 * Firebase server timestamps use epoch milliseconds.
 * This helper also accepts epoch seconds in case an Arduino record was
 * accidentally written using seconds.
 */
function normalizeTimestampMs(value?: number): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  // Epoch timestamps before approximately 2001 when interpreted as
  // milliseconds are probably epoch seconds.
  if (value < 1_000_000_000_000) {
    return value * 1000;
  }

  return value;
}

export function useSmartGrid() {
  const [live, setLive] = useState<LiveData>({});
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [commands, setCommands] = useState<Commands>(defaultCommands);

  const [acknowledgement, setAcknowledgement] =
    useState<Acknowledgement>({});

  const [labels, setLabels] = useState<Record<string, EventLabel>>({});
  const [mlLatest, setMlLatest] = useState<MlOutput>({});
  const [training, setTraining] = useState<TrainingMetrics>({});

  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [firebaseServerOffsetMs, setFirebaseServerOffsetMs] =
    useState(0);

  const [lastLiveReceivedAtMs, setLastLiveReceivedAtMs] =
    useState<number | null>(null);

  const [lastError, setLastError] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const onError = (error: Error) => {
      setLastError(error.message);
    };

    const unsubscribeConnected = onValue(
      ref(database, ".info/connected"),
      (snapshot) => {
        setFirebaseConnected(snapshot.val() === true);
      },
      onError,
    );

    const unsubscribeServerOffset = onValue(
      ref(database, ".info/serverTimeOffset"),
      (snapshot) => {
        const value = snapshot.val();

        setFirebaseServerOffsetMs(
          typeof value === "number" &&
            Number.isFinite(value)
            ? value
            : 0,
        );
      },
      onError,
    );

    const unsubscribeLive = onValue(
      ref(database, "smartGrid/live"),
      (snapshot) => {
        setLive((snapshot.val() ?? {}) as LiveData);

        /*
         * This time records when the browser actually received a live
         * Firebase event. It protects against Arduino/browser clock
         * differences while still becoming stale when updates stop.
         */
        setLastLiveReceivedAtMs(Date.now());
      },
      onError,
    );

    const unsubscribeHistory = onValue(
      query(
        ref(database, "smartGrid/history"),
        limitToLast(500),
      ),
      (snapshot) => {
        const value = snapshot.val() as
          | Record<string, LiveData>
          | null;

        if (!value) {
          setHistory([]);
          return;
        }

        const points: HistoryPoint[] = Object.entries(value)
          .map(([id, item]) => {
            const timestampMs = normalizeTimestampMs(
              item.serverTimestamp,
            );

            return {
              id,
              ...item,
              serverTimestamp:
                timestampMs ?? item.serverTimestamp,
              timeLabel: timestampMs
                ? new Date(timestampMs).toLocaleTimeString()
                : id.slice(-8),
            };
          })
          .sort(
            (first, second) =>
              (first.serverTimestamp ?? 0) -
              (second.serverTimestamp ?? 0),
          );

        setHistory(points);
      },
      onError,
    );

    const unsubscribeCommands = onValue(
      ref(database, "smartGrid/commands"),
      (snapshot) => {
        setCommands({
          ...defaultCommands,
          ...((snapshot.val() ?? {}) as Partial<Commands>),
        });
      },
      onError,
    );

    const unsubscribeAcknowledgement = onValue(
      ref(database, "smartGrid/acknowledgement"),
      (snapshot) => {
        setAcknowledgement(
          (snapshot.val() ?? {}) as Acknowledgement,
        );
      },
      onError,
    );

    const unsubscribeLabels = onValue(
      ref(database, "smartGrid/datasetLabels"),
      (snapshot) => {
        const raw = snapshot.val() as
          | Record<string, { label?: EventLabel }>
          | null;

        const nextLabels: Record<string, EventLabel> = {};

        Object.entries(raw ?? {}).forEach(([id, item]) => {
          if (item.label) {
            nextLabels[id] = item.label;
          }
        });

        setLabels(nextLabels);
      },
      onError,
    );

    const unsubscribeMlLatest = onValue(
      ref(database, "smartGrid/ml/latest"),
      (snapshot) => {
        setMlLatest((snapshot.val() ?? {}) as MlOutput);
      },
      onError,
    );

    const unsubscribeTraining = onValue(
      ref(database, "smartGrid/ml/training"),
      (snapshot) => {
        setTraining(
          (snapshot.val() ?? {}) as TrainingMetrics,
        );
      },
      onError,
    );

    return () => {
      unsubscribeConnected();
      unsubscribeServerOffset();
      unsubscribeLive();
      unsubscribeHistory();
      unsubscribeCommands();
      unsubscribeAcknowledgement();
      unsubscribeLabels();
      unsubscribeMlLatest();
      unsubscribeTraining();
    };
  }, []);

  const normalizedLiveTimestampMs = useMemo(
    () => normalizeTimestampMs(live.serverTimestamp),
    [live.serverTimestamp],
  );

  const firebaseAdjustedNowMs =
    clock + firebaseServerOffsetMs;

  const timestampAgeMs = normalizedLiveTimestampMs
    ? Math.max(
        0,
        firebaseAdjustedNowMs - normalizedLiveTimestampMs,
      )
    : null;

  const receiveAgeMs = lastLiveReceivedAtMs
    ? Math.max(0, clock - lastLiveReceivedAtMs)
    : null;

  const timestampIsFresh =
    timestampAgeMs !== null &&
    timestampAgeMs < DEVICE_STALE_AFTER_MS;

  const firebaseStreamIsFresh =
    receiveAgeMs !== null &&
    receiveAgeMs < DEVICE_STALE_AFTER_MS;

  /*
   * A fresh timestamp or a recently received Firebase live update is
   * enough to show the device online.
   *
   * deviceOnline remains useful as diagnostic information, but it no
   * longer incorrectly overrides clear evidence of fresh updates.
   */
  const isDeviceOnline =
    firebaseConnected &&
    (timestampIsFresh || firebaseStreamIsFresh);

  const sendCommand = useCallback(
    async (
      changes: Partial<Omit<Commands, "commandId">>,
    ): Promise<void> => {
      setLastError(null);

      const payload = {
        ...changes,
        commandId: Date.now(),
      };

      try {
        await update(
          ref(database, "smartGrid/commands"),
          payload,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Command failed.";

        setLastError(message);
        throw error;
      }
    },
    [],
  );

  const resetAlarm = useCallback(async (): Promise<void> => {
    await update(ref(database, "smartGrid/commands"), {
      resetAlarm: true,
      commandId: Date.now(),
    });

    window.setTimeout(() => {
      update(ref(database, "smartGrid/commands"), {
        resetAlarm: false,
        commandId: Date.now(),
      }).catch((error: unknown) => {
        console.error(
          "Alarm reset release failed:",
          error,
        );
      });
    }, 1500);
  }, []);

  const saveLabel = useCallback(
    async (
      historyRecordId: string,
      label: EventLabel,
    ): Promise<void> => {
      await set(
        ref(
          database,
          `smartGrid/datasetLabels/${historyRecordId}`,
        ),
        {
          label,
          labeledAt: serverTimestamp(),
        },
      );
    },
    [],
  );

  const trainModel = useCallback(async (): Promise<unknown> => {
    const apiUrl =
      process.env.NEXT_PUBLIC_ML_API_URL?.trim();

    if (!apiUrl) {
      throw new Error(
        "The public ML API URL is not configured.",
      );
    }

    const response = await fetch(`${apiUrl}/train`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const responseBody = await response.text();

      throw new Error(
        responseBody ||
          `Training request failed: ${response.status}`,
      );
    }

    return response.json();
  }, []);

  const predictLatest =
    useCallback(async (): Promise<unknown> => {
      const apiUrl =
        process.env.NEXT_PUBLIC_ML_API_URL?.trim();

      if (!apiUrl) {
        throw new Error(
          "The public ML API URL is not configured.",
        );
      }

      const response = await fetch(
        `${apiUrl}/predict/latest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const responseBody = await response.text();

        throw new Error(
          responseBody ||
            `Prediction request failed: ${response.status}`,
        );
      }

      return response.json();
    }, []);

  return {
    live: {
      ...live,
      serverTimestamp:
        normalizedLiveTimestampMs ??
        live.serverTimestamp,
    },
    history,
    commands,
    acknowledgement,
    labels,
    mlLatest,
    training,
    firebaseConnected,
    firebaseServerOffsetMs,
    lastLiveReceivedAtMs,
    timestampAgeMs,
    receiveAgeMs,
    isDeviceOnline,
    lastError,
    sendCommand,
    resetAlarm,
    saveLabel,
    trainModel,
    predictLatest,
  };
}