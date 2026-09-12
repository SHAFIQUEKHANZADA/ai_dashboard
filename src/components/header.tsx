"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar, ChevronDown, Sun, Moon } from "lucide-react";
import { LiveRefresh } from "@/components/live-refresh";

interface StoreOpt {
  id: string;
  name: string;
}

export function Header({
  stores,
  store,
  date,
  lastUpdated,
  canSeeGroup,
  user,
}: {
  stores: StoreOpt[];
  store: string; // "group" | store id
  date: string;
  lastUpdated: string | null;
  canSeeGroup: boolean;
  user: { name: string; role: string };
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    router.push(`/?${p.toString()}`);
  }

  const prettyDate = new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
  const updated = lastUpdated
    ? new Date(lastUpdated).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

  return (
    <header className="mb-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        {/* Title block */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
            Esther AI Performance Dashboard
          </h1>
          <p className="text-sm font-medium text-ink-soft">Daily Performance Overview</p>
          <p className="mt-0.5 text-xs text-muted">
            Turning every conversation into opportunity.
            <span className="mx-1.5 text-line">|</span>
            People + AI + More Sales Tomorrow.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date */}
          <label className="relative flex items-center">
            <Calendar className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
            <input
              type="date"
              value={date}
              onChange={(e) => setParam("date", e.target.value)}
              className="rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm font-medium text-ink shadow-[var(--shadow)] outline-none focus:border-brand"
              aria-label="Date"
            />
          </label>

          {/* Store */}
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1 shadow-[var(--shadow)]">
            <span className="pl-1 text-xs font-medium text-muted">Store</span>
            <div className="relative">
              <select
                value={store}
                onChange={(e) => setParam("store", e.target.value === "group" ? "" : e.target.value)}
                className="appearance-none rounded-md bg-transparent py-1 pl-2 pr-7 text-sm font-semibold text-ink outline-none"
                aria-label="Store"
              >
                {canSeeGroup && <option value="group">Group Total</option>}
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>
          </div>

          <ThemeToggle />

          {/* User */}
          <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 shadow-[var(--shadow)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {user.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </span>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-ink">{user.name}</div>
              <div className="text-[11px] text-muted">{user.role}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status line */}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green" />
          All Systems Operational
        </span>
        <LiveRefresh intervalSec={60} />
        <span>Showing {prettyDate}</span>
        <span>Last updated: {updated}</span>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("esther-theme");
      const isDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDark(isDark);
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    } catch { /* ignore */ }
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try { localStorage.setItem("esther-theme", next ? "dark" : "light"); } catch { /* ignore */ }
  }
  return (
    <button
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted shadow-[var(--shadow)] hover:text-ink"
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
