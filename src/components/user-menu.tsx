"use client";

import { useState } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import { signOut } from "@/app/auth/actions";

export interface MenuUser {
  name: string;
  email: string;
  role: string;
}

function roleLabel(role: string) {
  return role === "group" ? "Group view" : role === "admin" ? "Admin" : "Store";
}

export function UserMenu({ user }: { user: MenuUser }) {
  const [open, setOpen] = useState(false);
  const initials = (user.name || user.email).split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2.5 shadow-[var(--shadow)] transition hover:bg-surface-2"
        aria-label="Account menu"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{initials}</span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[13px] font-semibold text-ink">{user.name}</span>
          <span className="block text-[11px] text-muted">{roleLabel(user.role)}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-3 border-b border-line p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{initials}</span>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13px] font-semibold text-ink">{user.name}</div>
                <div className="truncate text-[11px] text-muted">{user.email}</div>
                <div className="mt-0.5 text-[11px] font-medium capitalize text-brand">{roleLabel(user.role)}</div>
              </div>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium text-ink-soft transition-colors hover:bg-surface-2"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
