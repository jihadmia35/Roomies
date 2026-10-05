import {
  LayoutDashboard,
  Utensils,
  Wallet,
  ReceiptText,
  History,
  ArrowLeftRight,
  CalendarDays,
  Users,
  Settings2,
  BookOpenCheck,
  Activity,
  ChartNoAxesCombined,
  Landmark,
  ArrowDownToLine,
  CheckCheck,
  FileText,
  UserRound,
} from 'lucide-react';
import { Role } from '@/domain/models';
export const sharedNav = [
  { path: '', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
  { path: 'my/meals', label: 'আমার মিল', icon: Utensils },
  { path: 'my/deposits', label: 'আমার জমা', icon: Wallet },
  { path: 'my/statement', label: 'মাসিক বিবরণী', icon: ReceiptText },
  { path: 'my/settlements', label: 'আমার নিষ্পত্তি', icon: ArrowLeftRight },
  { path: 'history', label: 'আগের মাসের হিসাব', icon: History },
  { path: 'profile', label: 'আমার প্রোফাইল', icon: UserRound },
];
export const managerNav = [
  { path: 'meals/daily', label: 'দৈনিক মিল', icon: CalendarDays },
  { path: 'meals/overview', label: 'মাসিক মিল', icon: ChartNoAxesCombined },
  { path: 'deposits', label: 'জমার খাতা', icon: Wallet },
  { path: 'expenses', label: 'খরচের খাতা', icon: ReceiptText },
  { path: 'members', label: 'সদস্য ও অংশগ্রহণ', icon: Users },
  { path: 'accounts', label: 'সদস্যদের হিসাব', icon: Landmark },
  { path: 'settings', label: 'মাসের নিয়ম', icon: Settings2 },
  { path: 'closing', label: 'মাস বন্ধ ও হস্তান্তর', icon: BookOpenCheck },
  { path: 'audit', label: 'কার্যক্রমের ইতিহাস', icon: Activity },
];
export const postNav = [
  { path: 'settlements', label: 'নিষ্পত্তি ড্যাশবোর্ড', icon: ArrowLeftRight },
  { path: 'settlements/payments', label: 'বকেয়া আদায়', icon: Wallet },
  { path: 'settlements/refunds', label: 'টাকা ফেরত', icon: ArrowDownToLine },
  { path: 'settlements/completed', label: 'সম্পন্ন নিষ্পত্তি', icon: CheckCheck },
  { path: 'report', label: 'বন্ধ মাসের প্রতিবেদন', icon: FileText },
];
export const navFor = (role: Role | null | undefined) => [
  ...sharedNav,
  ...(role === 'MANAGER' ? managerNav : role === 'POST_MANAGER' ? postNav : []),
];
