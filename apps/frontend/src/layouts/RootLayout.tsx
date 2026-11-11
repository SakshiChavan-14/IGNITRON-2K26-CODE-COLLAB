import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export const RootLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#f8faf9] text-slate-800 font-sans selection:bg-emerald-500/20 selection:text-emerald-900">
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/60 py-4 text-center text-xs text-slate-500 font-mono">
        IGNITRON 2K26 — Code Relay • Official University Tournament Platform
      </footer>
    </div>
  );
};
