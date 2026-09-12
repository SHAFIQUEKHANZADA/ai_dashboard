"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AudioLines } from "lucide-react";
import { NAV } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col bg-navy text-slate-300 lg:flex">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-7">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-blue">
          <AudioLines className="h-5 w-5" strokeWidth={2.4} />
        </span>
        <div className="leading-tight">
          <div className="text-[15px] font-bold text-white">Esther AI</div>
          <div className="text-[10px] font-medium tracking-wide text-slate-400">
            Every Call Creates<br />Opportunity
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-brand text-white shadow-sm"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Promo card */}
      <div className="m-3 rounded-xl bg-gradient-to-b from-navy-2 to-navy p-4 ring-1 ring-white/10">
        <div className="text-[13px] font-semibold text-white">AI Voices.</div>
        <div className="text-[13px] font-semibold text-blue">Real Opportunities.</div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          More conversations.<br />More customers.<br />A stronger tomorrow.
        </p>
        <svg viewBox="0 0 120 20" className="mt-3 h-4 w-full text-blue/70">
          <path
            d="M0 10 Q 10 2, 20 10 T 40 10 T 60 10 T 80 10 T 100 10 T 120 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </aside>
  );
}
