// Create (or promote) an Esther dashboard user from the CLI.
// Reads Supabase creds from ai_dashboard/.env.local (service-role — never commit).
//
//   node scripts/create_user.mjs --email a@b.com --password "Secret123" --role admin --name "Shafique"
//
// role: admin | group | store   (store users get scope later in the Team page)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dir = dirname(fileURLToPath(import.meta.url));
const env = {};
try {
  for (const line of readFileSync(join(__dir, "..", ".env.local"), "utf8").split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#") || !s.includes("=")) continue;
    const i = s.indexOf("=");
    env[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  }
} catch { /* fall back to process.env */ }

const URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error("Missing Supabase URL / service-role key in .env.local"); process.exit(1); }

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, "")] = process.argv[i + 1];
const { email, password, role = "store", name = "" } = args;
if (!email || !password) { console.error('Usage: --email <e> --password <p> [--role admin|group|store] [--name "Full Name"]'); process.exit(1); }
if (!["admin", "group", "store"].includes(role)) { console.error("role must be admin | group | store"); process.exit(1); }

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

// find existing user by email (paginate), else create
async function findUser(e) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => (x.email || "").toLowerCase() === e.toLowerCase());
    if (u) return u;
    if (data.users.length < 200) return null;
  }
  return null;
}

let user = await findUser(email);
if (user) {
  await sb.auth.admin.updateUserById(user.id, { password, user_metadata: { full_name: name } });
  console.log(`Updated existing auth user ${email}`);
} else {
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (error) { console.error("createUser failed:", error.message); process.exit(1); }
  user = data.user;
  console.log(`Created auth user ${email}`);
}

const { error: pErr } = await sb.from("esther_profiles").upsert({ id: user.id, email, full_name: name, role });
if (pErr) { console.error("profile upsert failed:", pErr.message); process.exit(1); }

console.log(`✓ ${email} is now role='${role}'. They can sign in at /login.`);
process.exit(0);
