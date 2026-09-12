import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client (client components — login form, live refresh).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
