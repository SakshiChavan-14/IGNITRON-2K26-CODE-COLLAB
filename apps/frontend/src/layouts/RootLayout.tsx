import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export const RootLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500/30 selection:text-sky-200">
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/30 py-4 text-center text-xs text-slate-500 font-mono">
        IGNITRON 2K26 — Code Relay • University Local Competition Platform • Phase 03
      </footer>
    </div>
  );
};
