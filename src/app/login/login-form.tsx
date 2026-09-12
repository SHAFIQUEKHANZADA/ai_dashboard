"use client";

import { useActionState } from "react";
import { signIn } from "@/app/auth/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="mb-1 block text-[13px] font-medium text-ink-soft">Email</label>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
          placeholder="you@dealership.com"
        />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-ink-soft">Password</label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
          placeholder="••••••••"
        />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red/10 px-3 py-2 text-[13px] font-medium text-red">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
