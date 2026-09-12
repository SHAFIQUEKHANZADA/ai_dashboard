import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Esther AI Performance Dashboard",
  description: "Daily performance overview — People + AI + More Sales Tomorrow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Sidebar />
        <div className="lg:pl-[220px]">
          <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
