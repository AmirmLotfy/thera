import type { LucideIcon } from "lucide-react";
import {
  Home, MessageSquare, Smile, CalendarCheck, FileText, Bell, User,
  Zap, Users, Clock, DollarSign, Settings, BarChart2, ShieldCheck,
  BookOpen, Brain, Video, Banknote, Search,
} from "lucide-react";
import type { Role } from "@/lib/auth";

export type DashboardNavItem = {
  id: string;
  to: string;
  icon: LucideIcon;
  labelEn: string;
  labelAr: string;
  /** Shown in mobile bottom bar (4–5 slots); overflow goes to “More”. */
  isPrimary: boolean;
};

const secondaryPatient = (r: string): DashboardNavItem[] => [
  { id: "reports", to: `/dashboard/${r}/reports`, icon: FileText, labelEn: "Reports", labelAr: "التقارير", isPrimary: false },
  { id: "notifications", to: `/dashboard/${r}/notifications`, icon: Bell, labelEn: "Notifications", labelAr: "الإشعارات", isPrimary: false },
];

export function getDashboardNavItems(role: Role): DashboardNavItem[] {
  const r = role;

  if (role === "adult") {
    return [
      { id: "home", to: `/dashboard/${r}`, icon: Home, labelEn: "Home", labelAr: "الرئيسية", isPrimary: true },
      { id: "find", to: `/dashboard/${r}/find`, icon: Search, labelEn: "Find a therapist", labelAr: "احجز جلسة", isPrimary: true },
      { id: "bookings", to: `/dashboard/${r}/bookings`, icon: CalendarCheck, labelEn: "Bookings", labelAr: "الحجوزات", isPrimary: true },
      { id: "chat", to: `/dashboard/${r}/chat`, icon: MessageSquare, labelEn: "AI companion", labelAr: "المرافق", isPrimary: true },
      { id: "mood", to: `/dashboard/${r}/mood`, icon: Smile, labelEn: "Mood", labelAr: "المزاج", isPrimary: true },
      ...secondaryPatient(r),
      { id: "profile", to: `/dashboard/${r}/profile`, icon: User, labelEn: "Profile", labelAr: "الملف الشخصي", isPrimary: true },
    ];
  }

  if (role === "parent") {
    return [
      { id: "home", to: `/dashboard/${r}`, icon: Home, labelEn: "Home", labelAr: "الرئيسية", isPrimary: true },
      { id: "children", to: `/dashboard/${r}/children`, icon: Users, labelEn: "Children", labelAr: "الأطفال", isPrimary: true },
      { id: "find", to: `/dashboard/${r}/find`, icon: Search, labelEn: "Find a therapist", labelAr: "احجز جلسة", isPrimary: true },
      { id: "bookings", to: `/dashboard/${r}/bookings`, icon: CalendarCheck, labelEn: "Bookings", labelAr: "الحجوزات", isPrimary: true },
      { id: "chat", to: `/dashboard/${r}/chat`, icon: MessageSquare, labelEn: "AI companion", labelAr: "المرافق", isPrimary: true },
      { id: "mood", to: `/dashboard/${r}/mood`, icon: Smile, labelEn: "Mood", labelAr: "المزاج", isPrimary: false },
      ...secondaryPatient(r),
      { id: "profile", to: `/dashboard/${r}/profile`, icon: User, labelEn: "Profile", labelAr: "الملف الشخصي", isPrimary: true },
    ];
  }

  if (role === "teen") {
    return [
      { id: "home", to: `/dashboard/${r}`, icon: Home, labelEn: "Home", labelAr: "الرئيسية", isPrimary: true },
      { id: "find", to: `/dashboard/${r}/find`, icon: Search, labelEn: "Find a therapist", labelAr: "احجز جلسة", isPrimary: true },
      { id: "vibe", to: `/dashboard/${r}/vibe`, icon: Zap, labelEn: "Vibe", labelAr: "الطاقة", isPrimary: true },
      { id: "chat", to: `/dashboard/${r}/chat`, icon: MessageSquare, labelEn: "AI companion", labelAr: "المرافق", isPrimary: true },
      { id: "mood", to: `/dashboard/${r}/mood`, icon: Smile, labelEn: "Mood", labelAr: "المزاج", isPrimary: true },
      { id: "bookings", to: `/dashboard/${r}/bookings`, icon: CalendarCheck, labelEn: "Bookings", labelAr: "الحجوزات", isPrimary: false },
      { id: "reports", to: `/dashboard/${r}/reports`, icon: FileText, labelEn: "Reports", labelAr: "التقارير", isPrimary: false },
      { id: "notifications", to: `/dashboard/${r}/notifications`, icon: Bell, labelEn: "Notifications", labelAr: "الإشعارات", isPrimary: false },
      { id: "achievements", to: `/dashboard/${r}/achievements`, icon: Brain, labelEn: "Achievements", labelAr: "الإنجازات", isPrimary: false },
      { id: "profile", to: `/dashboard/${r}/profile`, icon: User, labelEn: "Profile", labelAr: "الملف الشخصي", isPrimary: true },
    ];
  }

  if (role === "therapist") {
    return [
      { id: "home", to: `/dashboard/${r}`, icon: Home, labelEn: "Home", labelAr: "الرئيسية", isPrimary: true },
      { id: "bookings", to: `/dashboard/${r}/bookings`, icon: CalendarCheck, labelEn: "Bookings", labelAr: "الحجوزات", isPrimary: true },
      { id: "availability", to: `/dashboard/${r}/availability`, icon: Clock, labelEn: "Availability", labelAr: "الأوقات", isPrimary: true },
      { id: "sessions", to: `/dashboard/${r}/sessions`, icon: Video, labelEn: "Sessions", labelAr: "الجلسات", isPrimary: true },
      { id: "instapay", to: `/dashboard/${r}/instapay`, icon: Banknote, labelEn: "InstaPay proofs", labelAr: "إثباتات InstaPay", isPrimary: false },
      { id: "reports", to: `/dashboard/${r}/reports`, icon: FileText, labelEn: "Reports", labelAr: "التقارير", isPrimary: false },
      { id: "chat", to: `/dashboard/${r}/chat`, icon: MessageSquare, labelEn: "AI companion", labelAr: "المرافق", isPrimary: false },
      { id: "notifications", to: `/dashboard/${r}/notifications`, icon: Bell, labelEn: "Notifications", labelAr: "الإشعارات", isPrimary: false },
      { id: "profile", to: `/dashboard/${r}/profile`, icon: User, labelEn: "Profile", labelAr: "الملف الشخصي", isPrimary: true },
    ];
  }

  // admin
  return [
    { id: "home", to: `/dashboard/admin`, icon: Home, labelEn: "Home", labelAr: "الرئيسية", isPrimary: true },
    { id: "users", to: `/dashboard/admin/users`, icon: Users, labelEn: "Users", labelAr: "المستخدمون", isPrimary: true },
    { id: "approvals", to: `/dashboard/admin/approvals`, icon: ShieldCheck, labelEn: "Approvals", labelAr: "الموافقات", isPrimary: true },
    { id: "payments", to: `/dashboard/admin/payments`, icon: DollarSign, labelEn: "Payments", labelAr: "المدفوعات", isPrimary: true },
    { id: "sessions", to: `/dashboard/admin/sessions`, icon: Video, labelEn: "Sessions", labelAr: "الجلسات", isPrimary: false },
    { id: "content", to: `/dashboard/admin/content`, icon: BookOpen, labelEn: "Content", labelAr: "المحتوى", isPrimary: false },
    { id: "ai-logs", to: `/dashboard/admin/ai-logs`, icon: Brain, labelEn: "AI logs", labelAr: "سجلات AI", isPrimary: false },
    { id: "analytics", to: `/dashboard/admin/analytics`, icon: BarChart2, labelEn: "Analytics", labelAr: "التحليلات", isPrimary: false },
    { id: "settings", to: `/dashboard/admin/settings`, icon: Settings, labelEn: "Settings", labelAr: "الإعدادات", isPrimary: false },
  ];
}

export function primaryNavItems(role: Role): DashboardNavItem[] {
  return getDashboardNavItems(role).filter((i) => i.isPrimary);
}

export function overflowNavItems(role: Role): DashboardNavItem[] {
  return getDashboardNavItems(role).filter((i) => !i.isPrimary);
}
