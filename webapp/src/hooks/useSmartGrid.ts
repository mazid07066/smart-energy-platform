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

const defaultCommands: Commands = {
  automaticMode: true,
  relay1: true,
  relay2: true,
  resetAlarm: false,
  commandId: 0,
};

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
  const [lastError, setLastError] = useState<string | null>(null);

  /*
   * Use a lazy initializer so Date.now() is not called directly
   * during the component render expression.
   */
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

    const unsubscribers = [
      onValue(
        ref(database, ".info/connected"),
        (snapshot) => {
          setFirebaseConnected(snapshot.val() === true);
        },
        onError,
      ),

      onValue(
        ref(database, "smartGrid/live"),
        (snapshot) => {
          setLive((snapshot.val() ?? {}) as LiveData);
        },
        onError,
      ),

      onValue(
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
            .map(([id, item]) => ({
              id,
              ...item,
              timeLabel: item.serverTimestamp
                ? new Date(
                    item.serverTimestamp,
                  ).toLocaleTimeString()
                : id.slice(-8),
            }))
            .sort(
              (first, second) =>
                (first.serverTimestamp ?? 0) -
                (second.serverTimestamp ?? 0),
            );

          setHistory(points);
        },
        onError,
      ),

      onValue(
        ref(database, "smartGrid/commands"),
        (snapshot) => {
          setCommands({
            ...defaultCommands,
            ...((snapshot.val() ?? {}) as Partial<Commands>),
          });
        },
        onError,
      ),

      onValue(
        ref(database, "smartGrid/acknowledgement"),
        (snapshot) => {
          setAcknowledgement(
            (snapshot.val() ?? {}) as Acknowledgement,
          );
        },
        onError,
      ),

      onValue(
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
      ),

      onValue(
        ref(database, "smartGrid/ml/latest"),
        (snapshot) => {
          setMlLatest((snapshot.val() ?? {}) as MlOutput);
        },
        onError,
      ),

      onValue(
        ref(database, "smartGrid/ml/training"),
        (snapshot) => {
          setTraining(
            (snapshot.val() ?? {}) as TrainingMetrics,
          );
        },
        onError,
      ),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => {
        unsubscribe();
      });
    };
  }, []);

  const isDeviceOnline = useMemo(() => {
    if (!live.deviceOnline || !live.serverTimestamp) {
      return false;
    }

    return clock - live.serverTimestamp < 30_000;
  }, [clock, live.deviceOnline, live.serverTimestamp]);

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
    const commandId = Date.now();

    await update(ref(database, "smartGrid/commands"), {
      resetAlarm: true,
      commandId,
    });

    window.setTimeout(() => {
      update(ref(database, "smartGrid/commands"), {
        resetAlarm: false,
        commandId: Date.now(),
      }).catch((error: unknown) => {
        console.error("Alarm reset release failed:", error);
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
      process.env.NEXT_PUBLIC_ML_API_URL ??
      "http://127.0.0.1:8000";

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
        process.env.NEXT_PUBLIC_ML_API_URL ??
        "http://127.0.0.1:8000";

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
    live,
    history,
    commands,
    acknowledgement,
    labels,
    mlLatest,
    training,
    firebaseConnected,
    isDeviceOnline,
    lastError,
    sendCommand,
    resetAlarm,
    saveLabel,
    trainModel,
    predictLatest,
  };
}