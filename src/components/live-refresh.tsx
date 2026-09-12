"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Keeps the dashboard live: re-fetches server data on an interval (and when the
// tab regains focus), and shows a "Live · updated Ns ago" pulse.
export function LiveRefresh({ intervalSec = 60 }: { intervalSec?: number }) {
  const router = useRouter();
  const [ago, setAgo] = useState(0);

  useEffect(() => {
    const refresh = () => {
      router.refresh();
      setAgo(0);
    };
    const poll = setInterval(refresh, intervalSec * 1000);
    const tick = setInterval(() => setAgo((a) => a + 1), 1000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      window.removeEventListener("focus", onFocus);
    };
  }, [router, intervalSec]);

  const label = ago < 60 ? `${ago}s ago` : `${Math.floor(ago / 60)}m ago`;
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
