import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Esther AI Performance Dashboard",
  description: "Daily performance overview — People + AI + More Sales Tomorrow.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const shellUser = user
    ? { name: user.name, email: user.email, role: user.role, isAdmin: user.isAdmin, hiddenTabs: user.hiddenTabs }
    : null;
  return (
    <html lang="en" data-theme="light" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppShell user={shellUser}>{children}</AppShell>
      </body>
    </html>
  );
}
