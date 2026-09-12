import {
  LayoutDashboard,
  PhoneCall,
  CalendarDays,
  MessagesSquare,
  Target,
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
  { label: "Appointments", href: "/appointments", icon: CalendarDays },
  { label: "Conversations", href: "/conversations", icon: MessagesSquare },
  { label: "Opportunities", href: "/opportunities", icon: Target },
  { label: "Reports", href: "/reports", icon: FileBarChart },
  { label: "Dealerships", href: "/dealerships", icon: Building2 },
  { label: "Settings", href: "/settings", icon: Settings },
];
