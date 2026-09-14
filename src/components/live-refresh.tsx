"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Honest freshness indicator. It re-fetches server data on an interval (and when
// the tab regains focus) — but what it DISPLAYS is the true age of the data,
// measured from the last backend sync (`lastSync`), not from the browser poll.
// So if the sync stalls, this visibly climbs and turns red instead of always
// looking "live".
export function LiveRefresh({
  lastSync,
  intervalSec = 60,
  staleMinutes = 20,
}: {
  // Pass a sync timestamp to show honest data age; omit it for the legacy
  // "re-read Ns ago" behavior (used on historical/range pages).
  lastSync?: string | null;
  intervalSec?: number;
  staleMinutes?: number;
}) {
  const router = useRouter();
  const honest = lastSync !== undefined;
  const [now, setNow] = useState(() => Date.now());
  const [polledAt, setPolledAt] = useState(() => Date.now());

  useEffect(() => {
    const poll = setInterval(() => {
      router.refresh();
      setPolledAt(Date.now());
    }, intervalSec * 1000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const onFocus = () => {
      router.refresh();
      setPolledAt(Date.now());
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      window.removeEventListener("focus", onFocus);
    };
  }, [router, intervalSec]);

  // Legacy mode: just show how long since the browser last re-read the data.
  if (!honest) {
    const s = Math.max(0, Math.round((now - polledAt) / 1000));
    const label = s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green" />
        </span>
        Live · refreshed {label}
      </span>
    );
  }

  if (!lastSync) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-red">
        <span className="h-2 w-2 rounded-full bg-red" />
        No sync yet
      </span>
    );
  }

  const ageSec = Math.max(0, Math.round((now - new Date(lastSync).getTime()) / 1000));
  const ageLabel =
    ageSec < 60
      ? `${ageSec}s ago`
      : ageSec < 3600
        ? `${Math.floor(ageSec / 60)}m ago`
        : `${Math.floor(ageSec / 3600)}h ${Math.floor((ageSec % 3600) / 60)}m ago`;
  const stale = ageSec >= staleMinutes * 60;

  if (stale) {
    return (
      <span
        className="flex items-center gap-1.5 text-xs font-semibold text-red"
        title="The dashboard hasn't received fresh data from the sync in a while — numbers may be behind GHL."
      >
        <span className="h-2 w-2 rounded-full bg-red" />
        Data may be behind · synced {ageLabel}
      </span>
    );
  }

  return (
    <span
      className="flex items-center gap-1.5 text-xs text-muted"
      title={`Last successful sync: ${new Date(lastSync).toLocaleString("en-US", { timeZone: "America/Chicago" })} CT`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green" />
      </span>
      Live · synced {ageLabel}
    </span>
  );
}
