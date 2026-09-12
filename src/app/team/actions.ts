"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { RESTRICTABLE_TABS } from "@/lib/nav";

type Role = "admin" | "group" | "store";

function parseRole(v: FormDataEntryValue | null): Role {
  const r = String(v ?? "store");
  return r === "admin" || r === "group" || r === "store" ? r : "store";
}

function parseStoreIds(formData: FormData): string[] {
  return formData.getAll("store_ids").map((s) => String(s)).filter(Boolean);
}

// Checkboxes are the ALLOWED tabs; we store the inverse (deny-list). Admins see
// everything, so their deny-list is always empty.
function parseHiddenTabs(formData: FormData, role: Role): string[] {
  if (role === "admin") return [];
  const allowed = new Set(formData.getAll("allow_tabs").map((s) => String(s)));
  return RESTRICTABLE_TABS.map((t) => t.href).filter((href) => !allowed.has(href));
}

// auth.users is shared with the dispatch app, so a person may already exist there
// without an Esther profile. Find them so "Add member" can adopt them.
async function findUserByEmail(sb: ReturnType<typeof createServiceClient>, email: string) {
  for (let page = 1; page <= 30; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const u = data.users.find((x) => (x.email || "").toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (data.users.length < 200) return null;
  }
  return null;
}

// store grants only matter for the 'store' role; admin/group see everything
async function setGrants(sb: ReturnType<typeof createServiceClient>, userId: string, role: Role, storeIds: string[]) {
  await sb.from("esther_user_stores").delete().eq("user_id", userId);
  if (role === "store" && storeIds.length) {
    await sb.from("esther_user_stores").insert(storeIds.map((store_id) => ({ user_id: userId, store_id })));
  }
}

export async function createMember(_prev: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = parseRole(formData.get("role"));
  const storeIds = parseStoreIds(formData);
  if (!email || !password) return { error: "Email and a temporary password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const sb = createServiceClient();
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  let uid: string;
  if (error || !data.user) {
    // already in shared auth → adopt them into the dashboard + set the given password
    const existing = await findUserByEmail(sb, email);
    if (!existing) return { error: error?.message ?? "Could not create user." };
    uid = existing.id;
    await sb.auth.admin.updateUserById(uid, { password, user_metadata: { full_name: name } });
  } else {
    uid = data.user.id;
  }
  const { error: pErr } = await sb.from("esther_profiles")
    .upsert({ id: uid, email, full_name: name, role, hidden_tabs: parseHiddenTabs(formData, role) });
  if (pErr) return { error: pErr.message };
  await setGrants(sb, uid, role, storeIds);

  revalidatePath("/team");
  return { ok: true };
}

export async function updateMember(_prev: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const role = parseRole(formData.get("role"));
  const name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const storeIds = parseStoreIds(formData);
  if (!userId) return { error: "Missing user." };
  if (userId === admin.id && role !== "admin") return { error: "You can't remove your own admin access." };

  const sb = createServiceClient();

  // name/email live on the auth user too — keep them in sync
  const authPayload: { user_metadata: { full_name: string }; email?: string; email_confirm?: boolean } = {
    user_metadata: { full_name: name },
  };
  if (email) { authPayload.email = email; authPayload.email_confirm = true; }
  const { error: aErr } = await sb.auth.admin.updateUserById(userId, authPayload);
  if (aErr) return { error: aErr.message.includes("already") ? "That email is already in use." : aErr.message };

  const { error } = await sb
    .from("esther_profiles")
    .update({ role, full_name: name || null, hidden_tabs: parseHiddenTabs(formData, role), ...(email ? { email } : {}) })
    .eq("id", userId);
  if (error) return { error: error.message };
  await setGrants(sb, userId, role, storeIds);

  revalidatePath("/team");
  return { ok: true };
}

export async function resetPassword(_prev: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!userId || password.length < 8) return { error: "Password must be at least 8 characters." };
  const sb = createServiceClient();
  const { error } = await sb.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteMember(_prev: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return { error: "Missing user." };
  if (userId === admin.id) return { error: "You can't remove yourself." };
  const sb = createServiceClient();
  const { error } = await sb.auth.admin.deleteUser(userId); // cascades profile + grants
  if (error) return { error: error.message };
  revalidatePath("/team");
  return { ok: true };
}
