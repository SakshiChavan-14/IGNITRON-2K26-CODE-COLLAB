import React from 'react';
import { NavLink } from 'react-router-dom';
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
  { label: 'Registered Teams', path: '/admin/teams', icon: Users },
  { label: 'Competition Control', path: '/admin/competition', icon: Sliders },
  { label: 'Question Management', path: '/admin/questions', icon: HelpCircle },
  { label: 'Submissions & Results', path: '/admin/submissions', icon: FileCheck2 },
  { label: 'Leaderboard', path: '/admin/leaderboard', icon: Trophy },
  { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
  { label: 'Reports & Export', path: '/admin/reports', icon: FileSpreadsheet },
];

export const AdminNav: React.FC = () => {
  return (
    <div className="bg-white border-b border-slate-200 shadow-2xs -mt-4 sm:-mt-6 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5 scrollbar-thin">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs'
                      : 'text-slate-600 hover:text-emerald-950 hover:bg-slate-50 border border-transparent'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
