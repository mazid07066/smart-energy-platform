"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryPoint } from "@/lib/types";

export function CurrentChart({ data }: { data: HistoryPoint[] }) {
  return (
    <section className="panel rounded-2xl p-5">
      <h2 className="font-semibold text-white">Historical Current</h2>
      <p className="mt-1 text-sm text-slate-400">
        Latest {data.length} Firebase history records
      </p>
      <div className="mt-5 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="timeLabel" minTickGap={28} />
            <YAxis unit=" mA" width={78} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="mainCurrentmA"
              name="Main"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="user1CurrentmA"
              name="User 1"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="user2CurrentmA"
              name="User 2"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="unaccountedCurrentmA"
              name="Unaccounted"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function PowerChart({ data }: { data: HistoryPoint[] }) {
  return (
    <section className="panel rounded-2xl p-5">
      <h2 className="font-semibold text-white">Historical Power</h2>
      <p className="mt-1 text-sm text-slate-400">
        Estimated power reported by Arduino
      </p>
      <div className="mt-5 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="timeLabel" minTickGap={28} />
            <YAxis unit=" W" width={62} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="estimatedPowerW"
              name="Estimated power"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
