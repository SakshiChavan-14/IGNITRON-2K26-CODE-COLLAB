import React from 'react';
import {
  LayoutDashboard,
  Users,
  Sliders,
  HelpCircle,
  FileCheck2,
  Trophy,
  Megaphone,
  FileSpreadsheet,
} from 'lucide-react';

export const ADMIN_NAV_ITEMS = [
  { label: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Teams', path: '/admin/teams', icon: Users },
  { label: 'Competition Control', path: '/admin/competition', icon: Sliders },
  { label: 'Questions', path: '/admin/questions', icon: HelpCircle },
  { label: 'Submissions', path: '/admin/submissions', icon: FileCheck2 },
  { label: 'Leaderboard', path: '/admin/leaderboard', icon: Trophy },
  { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
  { label: 'Reports', path: '/admin/reports', icon: FileSpreadsheet },
];

export const AdminNav: React.FC = () => {
  // Navigation consolidated into unified primary Navbar header
  return null;
};
