"use client";

import { usePathname } from "next/navigation";
import { Sidebar, type SidebarUser } from "@/components/sidebar";

export interface ShellUser extends SidebarUser {
  email: string;
}

// Wraps the app chrome. The /login route renders full-screen without the sidebar.
export function AppShell({ user, children }: { user: ShellUser | null; children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;
  return (
    <>
      <Sidebar user={user} />
      <div className="lg:pl-[220px]">
        <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">{children}</main>
      </div>
    </>
  );
}
