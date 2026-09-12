import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/user-menu";
import { TeamManager, type Member, type StoreOpt } from "./team-manager";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const admin = await requireAdmin();
  const sb = createServiceClient();

  const [{ data: profiles }, { data: grants }, { data: stores }] = await Promise.all([
    sb.from("esther_profiles").select("id, email, full_name, role, hidden_tabs").order("created_at"),
    sb.from("esther_user_stores").select("user_id, store_id"),
    sb.from("esther_stores").select("id, name").eq("active", true).order("sort_order"),
  ]);

  const byUser = new Map<string, string[]>();
  for (const g of grants ?? []) {
    const arr = byUser.get(g.user_id) ?? [];
    arr.push(g.store_id);
    byUser.set(g.user_id, arr);
  }

  const members: Member[] = (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email ?? "",
    name: p.full_name ?? "",
    role: (p.role ?? "store") as Member["role"],
    storeIds: byUser.get(p.id) ?? [],
    hiddenTabs: (p.hidden_tabs ?? []) as string[],
  }));
  const storeOpts: StoreOpt[] = (stores ?? []).map((s) => ({ id: s.id, name: s.name }));

  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Team &amp; Access</h1>
          <p className="text-sm text-muted">
            Add members and choose exactly which stores each one can see — like sub-account access in GHL.
          </p>
        </div>
        <UserMenu user={{ name: admin.name, email: admin.email, role: admin.role }} />
      </div>
      <TeamManager members={members} stores={storeOpts} currentUserId={admin.id} />
    </>
  );
}
