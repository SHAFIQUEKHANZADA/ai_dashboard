import { AudioLines } from "lucide-react";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") ? sp.next : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <AudioLines className="h-6 w-6" strokeWidth={2.4} />
          </span>
          <h1 className="text-xl font-extrabold tracking-tight text-ink">Esther AI Dashboard</h1>
          <p className="text-sm text-muted">Sign in to your McGrath account</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)]">
          <LoginForm next={next} />
        </div>
        <p className="mt-4 text-center text-[11px] text-muted">
          Access is managed by your administrator.
        </p>
      </div>
    </div>
  );
}
