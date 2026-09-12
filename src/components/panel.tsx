import type { ReactNode } from "react";

export function Panel({
  title,
  subtitle,
  icon,
  headerRight,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)] ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {icon && <span className="mt-0.5 text-brand">{icon}</span>}
          <div>
            <h3 className="text-[15px] font-bold text-ink">{title}</h3>
            {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
          </div>
        </div>
        {headerRight}
      </div>
      {children}
    </section>
  );
}
