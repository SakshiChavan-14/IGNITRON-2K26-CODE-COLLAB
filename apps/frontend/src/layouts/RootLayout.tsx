import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export const RootLayout: React.FC = () => {
  const location = useLocation();
  const isDarkPage = ['/', '/register', '/login', '/admin/login'].includes(location.pathname);
  const isLanding = location.pathname === '/';
  const isArenaOrWorkspace =
    location.pathname.startsWith('/team/arena') ||
    location.pathname.startsWith('/team/workspace') ||
    location.pathname === '/workspace';

  return (
    <div
      className={`flex flex-col min-h-screen font-sans ${
        isDarkPage
          ? 'bg-[#010905] text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200'
          : 'bg-[#f8faf9] text-slate-800 selection:bg-emerald-500/20 selection:text-emerald-900'
      }`}
    >
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col">
        <Outlet />
      </main>

      {/* App Footer (Landing page and full-screen arenas manage their own layouts) */}
      {!isLanding && !isArenaOrWorkspace && (
        <footer
          className={`py-6 text-center text-xs font-mono transition-colors ${
            isDarkPage
              ? 'border-t border-emerald-950/60 bg-[#010804] text-emerald-600/70'
              : 'border-t border-slate-200/80 bg-white/60 text-slate-500'
          }`}
        >
          IGNITRON 2K26 — Code Relay • Official University Tournament Platform
        </footer>
      )}
    </div>
  );
};
