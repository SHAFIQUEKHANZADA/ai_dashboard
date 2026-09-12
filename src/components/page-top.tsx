import type { ReactNode } from "react";

export function PageTop({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[26px]">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2.5">{right}</div>}
    </header>
  );
}

// Small labeled stat tile used across the secondary pages.
export function Tile({ label, value, tone = "ink" }: { label: string; value: string | number; tone?: "ink" | "green" | "red" | "blue" | "amber" }) {
  const color =
    tone === "green" ? "text-green" : tone === "red" ? "text-red" : tone === "blue" ? "text-blue" : tone === "amber" ? "text-amber" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
      <div className="text-[12px] font-medium text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold tracking-tight ${color}`}>{value}</div>
    </div>
  );
}
