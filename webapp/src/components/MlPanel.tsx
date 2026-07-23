"use client";

import { useMemo, useState } from "react";
import {
  BrainCircuit,
  LoaderCircle,
  Play,
  Sparkles,
} from "lucide-react";
import {
  formatCurrent,
  formatDateTime,
  formatPercentage,
} from "@/lib/formatters";
import type { MlOutput, TrainingMetrics } from "@/lib/types";

type MlPanelProps = {
  latest: MlOutput;
  training: TrainingMetrics;
  trainModel: () => Promise<unknown>;
  predictLatest: () => Promise<unknown>;
};

export function MlPanel({
  latest,
  training,
  trainModel,
  predictLatest,
}: MlPanelProps) {
  const [busy, setBusy] = useState<"train" | "predict" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const featureImportance = useMemo(
    () =>
      Object.entries(training.featureImportance ?? {}).sort(
        (a, b) => b[1] - a[1],
      ),
    [training.featureImportance],
  );

  async function run(
    type: "train" | "predict",
    action: () => Promise<unknown>,
  ) {
    setBusy(type);
    setMessage(null);
    try {
      await action();
      setMessage(
        type === "train"
          ? "Training request accepted."
          : "Prediction request completed.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `${error.message} The ML service may not be running yet.`
          : "ML request failed.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel rounded-2xl p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="text-violet-300" />
            <h2 className="font-semibold text-white">
              Random Forest Model Lab
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Classification and multi-horizon demand forecasting
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 font-medium text-white disabled:opacity-50"
            disabled={busy !== null}
            onClick={() => run("train", trainModel)}
          >
            {busy === "train" ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Play size={17} />
            )}
            Train
          </button>
          <button
            className="flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-400/10 px-4 py-2.5 font-medium text-violet-100 disabled:opacity-50"
            disabled={busy !== null}
            onClick={() => run("predict", predictLatest)}
          >
            {busy === "predict" ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Sparkles size={17} />
            )}
            Predict latest
          </button>
        </div>
      </div>

      {message && <p className="mt-4 text-sm text-violet-200">{message}</p>}

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <Stat title="Class" value={latest.classification ?? "WAITING"} />
        <Stat
          title="Confidence"
          value={formatPercentage(latest.classificationConfidence)}
        />
        <Stat
          title="15-second forecast"
          value={formatCurrent(latest.forecast15Seconds_mA)}
        />
        <Stat
          title="1-minute forecast"
          value={formatCurrent(latest.forecast1Minute_mA)}
        />
        <Stat
          title="5-minute forecast"
          value={formatCurrent(latest.forecast5Minutes_mA)}
        />
      </div>

      <div className="mt-4 rounded-xl bg-black/20 p-4">
        <p className="text-xs text-slate-400">Recommendation</p>
        <p className="mt-1 text-sm text-white">
          {latest.recommendation ??
            "Collect and label data, then train the models."}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Model: {latest.modelVersion ?? training.modelVersion ?? "None"} •
          Latest prediction: {formatDateTime(latest.serverTimestamp)}
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-black/20 p-4">
          <h3 className="font-medium text-white">
            Classification metrics
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Metric name="Accuracy" value={training.accuracy} />
            <Metric name="Macro F1" value={training.macroF1} />
            <Metric
              name="Precision"
              value={training.precisionMacro}
            />
            <Metric name="Recall" value={training.recallMacro} />
            <Metric name="OOB score" value={training.oobScore} />
            <Metric
              name="Training time"
              value={training.trainingTimeSeconds}
              percentage={false}
              suffix=" s"
            />
          </div>
        </div>

        <div className="rounded-xl bg-black/20 p-4">
          <h3 className="font-medium text-white">Feature importance</h3>
          <div className="mt-3 space-y-2">
            {featureImportance.slice(0, 8).map(([feature, value]) => (
              <div key={feature}>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">{feature}</span>
                  <span className="text-slate-400">
                    {(value * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-800">
                  <div
                    className="h-1.5 rounded-full bg-violet-400"
                    style={{ width: `${Math.min(value * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {featureImportance.length === 0 && (
              <p className="text-sm text-slate-400">
                No trained feature importance is available.
              </p>
            )}
          </div>
        </div>
      </div>

      <ConfusionMatrix training={training} />
    </section>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 p-4">
      <p className="text-xs text-slate-400">{title}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function Metric({
  name,
  value,
  percentage = true,
  suffix = "",
}: {
  name: string;
  value?: number;
  percentage?: boolean;
  suffix?: string;
}) {
  const display =
    typeof value !== "number"
      ? "—"
      : percentage
        ? `${(value * 100).toFixed(1)}%`
        : `${value.toFixed(2)}${suffix}`;
  return (
    <div>
      <p className="text-slate-400">{name}</p>
      <p className="font-medium text-white">{display}</p>
    </div>
  );
}

function ConfusionMatrix({ training }: { training: TrainingMetrics }) {
  const matrix = training.confusionMatrix ?? [];
  const classes = training.classNames ?? [];
  if (matrix.length === 0) return null;

  return (
    <div className="mt-5 overflow-x-auto rounded-xl bg-black/20 p-4">
      <h3 className="font-medium text-white">Confusion matrix</h3>
      <table className="mt-3 text-center text-sm">
        <thead>
          <tr>
            <th className="p-2 text-slate-500">Actual \ Predicted</th>
            {classes.map((className) => (
              <th key={className} className="p-2 text-slate-300">
                {className}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, rowIndex) => (
            <tr key={classes[rowIndex] ?? rowIndex}>
              <th className="p-2 text-left text-slate-300">
                {classes[rowIndex] ?? rowIndex}
              </th>
              {row.map((value, columnIndex) => (
                <td
                  key={`${rowIndex}-${columnIndex}`}
                  className="border border-slate-800 p-3 text-white"
                >
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
