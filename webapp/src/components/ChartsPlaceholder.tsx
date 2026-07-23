import type { LucideIcon } from "lucide-react";

export function ChartsPlaceholder({
  title,
  icon: Icon,
}: {
  title: string;
  icon: LucideIcon;
}) {
  return (
    <section className="panel flex min-h-80 items-center justify-center rounded-2xl p-5 text-center">
      <div>
        <Icon className="mx-auto text-slate-500" size={34} />
        <h2 className="mt-3 font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">
          Waiting for records under smartGrid/history.
        </p>
      </div>
    </section>
  );
}
