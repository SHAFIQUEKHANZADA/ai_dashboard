"use client";

import { useActionState, useState } from "react";
import { UserPlus, Trash2, KeyRound, ChevronDown, Shield, Building2, Layers } from "lucide-react";
import { createMember, updateMember, deleteMember, resetPassword } from "./actions";
import { RESTRICTABLE_TABS } from "@/lib/nav";

export interface StoreOpt { id: string; name: string }
export interface Member {
  id: string;
  email: string;
  name: string;
  role: "admin" | "group" | "store";
  storeIds: string[];
  hiddenTabs: string[];
}

const ROLE_META: Record<Member["role"], { label: string; hint: string; icon: typeof Shield; cls: string }> = {
  admin: { label: "Admin", hint: "Full access + manages the team", icon: Shield, cls: "bg-purple/10 text-purple" },
  group: { label: "Group", hint: "Sees all stores (group total)", icon: Layers, cls: "bg-blue/10 text-blue" },
  store: { label: "Store", hint: "Sees only assigned stores", icon: Building2, cls: "bg-green/10 text-green" },
};

function StorePicker({ stores, selected, disabled }: { stores: StoreOpt[]; selected: Set<string>; disabled: boolean }) {
  if (disabled) return <p className="text-[12px] text-muted">This role sees every store — no selection needed.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {stores.map((s) => (
        <label key={s.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-ink-soft has-[:checked]:border-brand has-[:checked]:bg-brand/10 has-[:checked]:text-brand">
          <input type="checkbox" name="store_ids" value={s.id} defaultChecked={selected.has(s.id)} className="accent-[var(--brand)]" />
          {s.name}
        </label>
      ))}
    </div>
  );
}

function TabPicker({ hidden, disabled }: { hidden: Set<string>; disabled: boolean }) {
  // checkbox = ALLOWED (checked). Dashboard is always available and not listed.
  if (disabled) return <p className="text-[12px] text-muted">Admins can see every tab.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {RESTRICTABLE_TABS.map((t) => (
        <label key={t.href} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-ink-soft has-[:checked]:border-brand has-[:checked]:bg-brand/10 has-[:checked]:text-brand">
          <input type="checkbox" name="allow_tabs" value={t.href} defaultChecked={!hidden.has(t.href)} className="accent-[var(--brand)]" />
          {t.label}
        </label>
      ))}
    </div>
  );
}

function AddMemberForm({ stores, onDone }: { stores: StoreOpt[]; onDone: () => void }) {
  const [state, action, pending] = useActionState(createMember, {});
  const [role, setRole] = useState<Member["role"]>("store");
  if (state?.ok) onDone();

  return (
    <form action={action} className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-ink-soft">Full name</label>
          <input name="full_name" className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand" placeholder="Jane Advisor" />
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-ink-soft">Email</label>
          <input name="email" type="email" required className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand" placeholder="jane@dealership.com" />
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-ink-soft">Temporary password</label>
          <input name="password" type="text" required minLength={8} className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand" placeholder="min 8 characters" />
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-ink-soft">Role</label>
          <select name="role" value={role} onChange={(e) => setRole(e.target.value as Member["role"])} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand">
            <option value="store">Store — only assigned stores</option>
            <option value="group">Group — all stores</option>
            <option value="admin">Admin — all + manage team</option>
          </select>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1.5 text-[12.5px] font-medium text-ink-soft">Store access</div>
        <StorePicker stores={stores} selected={new Set()} disabled={role !== "store"} />
      </div>
      <div className="mt-3">
        <div className="mb-1.5 text-[12.5px] font-medium text-ink-soft">Tab access</div>
        <TabPicker hidden={new Set()} disabled={role === "admin"} />
      </div>
      {state?.error && <p className="mt-3 rounded-lg bg-red/10 px-3 py-2 text-[13px] font-medium text-red">{state.error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {pending ? "Adding…" : "Add member"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-2">Cancel</button>
      </div>
    </form>
  );
}

function MemberRow({ member, stores, currentUserId }: { member: Member; stores: StoreOpt[]; currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Member["role"]>(member.role);
  const [upState, upAction, upPending] = useActionState(updateMember, {});
  const [pwState, pwAction, pwPending] = useActionState(resetPassword, {});
  const [delState, delAction, delPending] = useActionState(deleteMember, {});
  const RM = ROLE_META[member.role];
  const isSelf = member.id === currentUserId;
  const storeNames = member.role === "store"
    ? stores.filter((s) => member.storeIds.includes(s.id)).map((s) => s.name)
    : ["All stores"];

  return (
    <div className="rounded-xl border border-line bg-surface shadow-[var(--shadow)]">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
          {(member.name || member.email).split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-ink">{member.name || member.email}{isSelf && <span className="ml-2 text-[11px] font-normal text-muted">(you)</span>}</div>
          <div className="truncate text-[12px] text-muted">{member.email}</div>
        </div>
        <span className={`hidden items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${RM.cls}`}>
          <RM.icon className="h-3 w-3" /> {RM.label}
        </span>
        <span className="hidden max-w-[220px] truncate text-[12px] text-muted md:inline">{storeNames.join(", ") || "No stores"}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-line p-4">
          <form action={upAction} className="space-y-3">
            <input type="hidden" name="user_id" value={member.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12.5px] font-medium text-ink-soft">Full name</label>
                <input name="full_name" defaultValue={member.name} className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand" placeholder="Full name" />
              </div>
              <div>
                <label className="mb-1 block text-[12.5px] font-medium text-ink-soft">Email (login)</label>
                <input name="email" type="email" defaultValue={member.email} className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand" placeholder="name@dealership.com" />
              </div>
            </div>
            <div className="max-w-xs">
              <label className="mb-1 block text-[12.5px] font-medium text-ink-soft">Role</label>
              <select name="role" value={role} onChange={(e) => setRole(e.target.value as Member["role"])} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand">
                <option value="store">Store — only assigned stores</option>
                <option value="group">Group — all stores</option>
                <option value="admin">Admin — all + manage team</option>
              </select>
              <p className="mt-1 text-[11px] text-muted">{ROLE_META[role].hint}</p>
            </div>
            <div>
              <div className="mb-1.5 text-[12.5px] font-medium text-ink-soft">Store access</div>
              <StorePicker stores={stores} selected={new Set(member.storeIds)} disabled={role !== "store"} />
            </div>
            <div>
              <div className="mb-1.5 text-[12.5px] font-medium text-ink-soft">Tab access</div>
              <TabPicker hidden={new Set(member.hiddenTabs)} disabled={role === "admin"} />
            </div>
            {upState?.error && <p className="rounded-lg bg-red/10 px-3 py-2 text-[13px] font-medium text-red">{upState.error}</p>}
            {upState?.ok && <p className="text-[12.5px] font-medium text-green">Saved.</p>}
            <button type="submit" disabled={upPending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
              {upPending ? "Saving…" : "Save changes"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-line pt-4">
            <form action={pwAction} className="flex items-end gap-2">
              <input type="hidden" name="user_id" value={member.id} />
              <div>
                <label className="mb-1 block text-[12px] font-medium text-ink-soft">Reset password</label>
                <input name="password" type="text" minLength={8} placeholder="new password" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand" />
              </div>
              <button type="submit" disabled={pwPending} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-ink-soft hover:bg-surface-2 disabled:opacity-60">
                <KeyRound className="h-3.5 w-3.5" /> {pwPending ? "…" : "Set"}
              </button>
              {pwState?.ok && <span className="pb-2 text-[12.5px] font-medium text-green">Updated</span>}
              {pwState?.error && <span className="pb-2 text-[12.5px] font-medium text-red">{pwState.error}</span>}
            </form>

            {!isSelf && (
              <form action={delAction} className="ml-auto">
                <input type="hidden" name="user_id" value={member.id} />
                <button type="submit" disabled={delPending} className="inline-flex items-center gap-1.5 rounded-lg border border-red/30 px-3 py-2 text-[13px] font-medium text-red hover:bg-red/10 disabled:opacity-60">
                  <Trash2 className="h-3.5 w-3.5" /> {delPending ? "Removing…" : "Remove member"}
                </button>
                {delState?.error && <span className="ml-2 text-[12.5px] font-medium text-red">{delState.error}</span>}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TeamManager({ members, stores, currentUserId }: { members: Member[]; stores: StoreOpt[]; currentUserId: string }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted">{members.length} {members.length === 1 ? "member" : "members"}</p>
        {!adding && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            <UserPlus className="h-4 w-4" /> Add member
          </button>
        )}
      </div>

      {adding && <AddMemberForm stores={stores} onDone={() => setAdding(false)} />}

      <div className="space-y-2.5">
        {members.map((m) => (
          <MemberRow key={m.id} member={m} stores={stores} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  );
}
