import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: MetricCardProps) {
  return (
    <article className="panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="metric-value mt-2 text-2xl font-semibold text-white">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-sky-400/10 p-3 text-sky-300">
          <Icon size={21} />
        </div>
      </div>
    </article>
  );
}
