import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Request-scoped Supabase client that respects the signed-in user + RLS.
// Use in server components, route handlers, and server actions.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component — safe to ignore; middleware refreshes.
          }
        },
      },
    },
  );
}

// Service-role client for ingestion ONLY (bypasses RLS). Never import into code
// that runs in the browser or renders user-facing pages.
export function createServiceClient() {
  const { createClient: createRaw } = require("@supabase/supabase-js");
  return createRaw(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
