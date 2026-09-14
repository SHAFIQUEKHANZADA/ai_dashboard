"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown } from "lucide-react";
import { LiveRefresh } from "@/components/live-refresh";
import { UserMenu, type MenuUser } from "@/components/user-menu";
import { fmtDate } from "@/lib/format";

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
  user: MenuUser;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    router.push(`/?${p.toString()}`);
  }

  const prettyDate = fmtDate(date);

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

          {/* Account */}
          <UserMenu user={user} />
        </div>
      </div>

      {/* Status line */}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green" />
          All Systems Operational
        </span>
        <LiveRefresh lastSync={lastUpdated} intervalSec={60} />
        <span>Showing {prettyDate}</span>
      </div>
    </header>
  );
}

