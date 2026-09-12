"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

export function StoreFilter({ stores, store }: { stores: { id: string; name: string }[]; store: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  function set(v: string) {
    const p = new URLSearchParams(params.toString());
    if (v === "all") p.delete("store");
    else p.set("store", v);
    router.push(`${pathname}?${p.toString()}`);
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1 shadow-[var(--shadow)]">
      <span className="pl-1 text-xs font-medium text-muted">Store</span>
      <div className="relative">
        <select
          value={store}
          onChange={(e) => set(e.target.value)}
          className="appearance-none rounded-md bg-transparent py-1 pl-2 pr-7 text-sm font-semibold text-ink outline-none"
        >
          <option value="all">All Stores</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}
