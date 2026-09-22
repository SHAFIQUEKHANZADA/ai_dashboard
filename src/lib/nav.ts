import {
  LayoutDashboard,
  PhoneCall,
  ShieldCheck,
  BadgeDollarSign,
  CalendarDays,
  MessagesSquare,
  FileBarChart,
  Building2,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// Phase 1 ships the Dashboard; the rest are placeholders per the spec.
export const NAV: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Call Analytics", href: "/call-analytics", icon: PhoneCall },
  { label: "Call Quality", href: "/call-quality", icon: ShieldCheck },
  { label: "Appraisals", href: "/appraisals", icon: BadgeDollarSign },
  { label: "Appointments", href: "/appointments", icon: CalendarDays },
  { label: "Conversations", href: "/conversations", icon: MessagesSquare },
  // Opportunities tab hidden per Reid's request (2026-09-18). The /opportunities
  // page still exists — restore this line (and the `Target` icon import) to bring
  // it back.  { label: "Opportunities", href: "/opportunities", icon: Target },
  { label: "Reports", href: "/reports", icon: FileBarChart },
  { label: "Dealerships", href: "/dealerships", icon: Building2 },
  { label: "Settings", href: "/settings", icon: Settings },
];

// Tabs an admin can grant/revoke per member (Dashboard is always available).
export const RESTRICTABLE_TABS = NAV.filter((n) => n.href !== "/").map((n) => ({ href: n.href, label: n.label }));
