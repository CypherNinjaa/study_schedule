import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  FileCheck,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Library,
  Repeat,
  Settings as SettingsIcon,
  Sun,
  Target,
  Trophy,
} from 'lucide-react';
import type { RouteId } from '@/store/useUiStore';

/**
 * The documentation site ships in `public/docs`, so it's served from the same
 * origin as the app (honouring Vite's base path) and opens in a new tab.
 */
export const DOCS_URL = `${import.meta.env.BASE_URL}docs/index.html`;

export function openDocs() {
  window.open(DOCS_URL, '_blank', 'noopener,noreferrer');
}

/** Sidebar, mobile bottom bar and command palette all read this one list. */
export const NAV: { id: RouteId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'study', label: 'Study', icon: BookOpen },
  { id: 'exams', label: 'Exams', icon: FileCheck },
  { id: 'materials', label: 'Materials', icon: FolderOpen },
  { id: 'habits', label: 'Habits', icon: Repeat },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'timetable', label: 'Timetable', icon: GraduationCap },
  { id: 'subjects', label: 'Subjects', icon: Library },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];
