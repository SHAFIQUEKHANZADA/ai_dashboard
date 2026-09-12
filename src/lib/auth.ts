import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStores } from "@/lib/data";
import type { Store } from "@/lib/types";

export type Role = "admin" | "group" | "store";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  grantedStoreIds: string[]; // stores explicitly granted (matters for role 'store')
  hiddenTabs: string[]; // nav hrefs this member can't see (admins ignore this)
  canSeeGroup: boolean; // admin + group see the whole group total
  isAdmin: boolean;
}

// Current signed-in user + their dashboard role and store grants. null if signed out.
export async function getSessionUser(): Promise<SessionUser | null> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  let { data: profile } = await sb
    .from("esther_profiles")
    .select("id, full_name, email, role, hidden_tabs")
    .eq("id", user.id)
    .maybeSingle();

  // first login with no profile yet → self-provision least-privileged
  if (!profile) {
    const seed = {
      id: user.id,
      email: user.email ?? null,
      full_name: (user.user_metadata?.full_name as string) ?? null,
      role: "store" as Role,
      hidden_tabs: [] as string[],
    };
    await sb.from("esther_profiles").insert(seed);
    profile = seed;
  }

  const role = (profile.role ?? "store") as Role;
  const { data: grants } = await sb
    .from("esther_user_stores")
    .select("store_id")
    .eq("user_id", user.id);

  return {
    id: user.id,
    email: profile.email ?? user.email ?? "",
    name: profile.full_name || (profile.email ?? user.email ?? "User"),
    role,
    grantedStoreIds: (grants ?? []).map((g) => g.store_id),
    hiddenTabs: (profile.hidden_tabs ?? []) as string[],
    canSeeGroup: role === "admin" || role === "group",
    isAdmin: role === "admin",
  };
}

// Admins see every tab; everyone else is subject to their hidden_tabs deny-list.
export function canAccessTab(user: SessionUser, href: string): boolean {
  if (user.isAdmin || href === "/") return true;
  return !user.hiddenTabs.includes(href);
}

// Guard a page: ensures the user is signed in AND allowed this tab, else redirect.
export async function requireTab(href: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccessTab(user, href)) redirect("/");
  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

// The stores this user is allowed to see, respecting their role/grants.
export async function getAccessibleStores(user: SessionUser): Promise<Store[]> {
  const all = await getStores();
  if (user.canSeeGroup) return all;
  const set = new Set(user.grantedStoreIds);
  return all.filter((s) => set.has(s.id));
}
