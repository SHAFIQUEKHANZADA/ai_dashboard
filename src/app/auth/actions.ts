"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_prev: unknown, formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/") || "/";
  if (!email || !password) return { error: "Enter your email and password." };

  const sb = await createClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: "Incorrect email or password." };
  redirect(next.startsWith("/") ? next : "/");
}

export async function signOut() {
  const sb = await createClient();
  await sb.auth.signOut();
  redirect("/login");
}
