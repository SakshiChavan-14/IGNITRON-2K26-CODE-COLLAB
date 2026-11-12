import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ADMIN_NAV_ITEMS } from './AdminNav';
import {
  ShieldAlert,
  LogOut,
  Terminal,
  UserCheck,
  BookOpen,
  UserPlus,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const isLanding = location.pathname === '/';
  const isActive = (path: string) => location.pathname === path;

  const handleLogoClick = (e: React.MouseEvent) => {
    if (isLanding) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleRulesClick = (e: React.MouseEvent) => {
    if (isLanding) {
      e.preventDefault();
      const el = document.getElementById('rules');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        // dispatch custom event or trigger highlight if possible
        const hashEvent = new HashChangeEvent('hashchange');
        window.location.hash = 'rules';
        window.dispatchEvent(hashEvent);
      }
    } else {
      navigate('/#rules');
    }
  };

  // ---------------------------------------------------------------------------
  // 1. Landing Page Navbar (Futuristic Glowing Dark Glassmorphism)
  // ---------------------------------------------------------------------------
  if (isLanding) {
    return (
      <header className="sticky top-0 z-50 pt-3 sm:pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pointer-events-auto">
        <div className="w-full bg-[#02130a]/80 backdrop-blur-xl border border-emerald-500/30 rounded-2xl px-4 sm:px-6 h-16 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.65)]">
          {/* Brand — clicking on / scrolls smoothly to top */}
          <Link
            to="/"
            onClick={handleLogoClick}
            className="flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.5)] group-hover:scale-105 transition-transform">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                <span>IGNITRON</span>
                <span className="text-emerald-400">2K26</span>
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400/90 font-semibold leading-tight">
                Code Relay
              </div>
            </div>
          </Link>

          {/* Center Navigation: STRICTLY Rules ONLY (Workspace & Status removed) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-emerald-100/90 font-mono">
            <button
              type="button"
              onClick={handleRulesClick}
              className="flex items-center gap-1.5 text-emerald-200/80 hover:text-emerald-300 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Rules</span>
            </button>
          </nav>

          {/* User Session / Public Auth CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-white">
                    {user.type === 'ADMIN' ? user.fullName : user.teamName}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400/80 flex items-center justify-end gap-1">
                    {user.type === 'ADMIN' ? (
                      <span className="text-amber-400 font-bold tracking-wider">
                        [{user.role}]
                      </span>
                    ) : (
                      <>
                        <UserCheck className="w-3 h-3 text-emerald-400" />
                        <span>{user.activeParticipant.fullName}</span>
                        <span className="text-emerald-300 font-bold font-mono">
                          ({user.teamCode})
                        </span>
                      </>
                    )}
                  </span>
                </div>

                <Link
                  to={user.type === 'ADMIN' ? '/admin/dashboard' : '/team/dashboard'}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                >
                  Dashboard
                </Link>

                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 hover:bg-rose-950/50 hover:border-rose-500/50 text-emerald-300 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Mobile Rules Button */}
                <button
                  type="button"
                  onClick={handleRulesClick}
                  className="md:hidden p-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-200 hover:text-white transition-all"
                  title="Rules"
                >
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                </button>

                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 text-slate-950 transition-all shadow-[0_0_20px_rgba(16,185,129,0.6)] hover:shadow-[0_0_30px_rgba(16,185,129,0.9)] hover:scale-105 active:scale-95 flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Team</span>
                </Link>

                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-emerald-500/40 bg-emerald-950/50 text-emerald-200 hover:bg-emerald-900/60 hover:text-white transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                >
                  Team Login
                </Link>

                <Link
                  to="/admin/login"
                  className="px-3 py-2 rounded-xl text-xs font-medium border border-emerald-500/30 bg-emerald-950/30 text-emerald-300/80 hover:bg-emerald-900/50 hover:text-emerald-100 transition-all flex items-center gap-1"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Admin Header (Consolidated Single Header for all Admin Routes)
  // ---------------------------------------------------------------------------
  if (user?.type === 'ADMIN') {
    return (
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-3">
            {/* Left: Brand + Admin Badge */}
            <Link to="/admin/dashboard" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                <Terminal className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="text-sm sm:text-base font-extrabold tracking-tight text-emerald-950 flex items-center gap-1.5">
                  <span>IGNITRON</span>
                  <span className="text-emerald-600">2K26</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-800 font-semibold">
                    Code Relay
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Admin
                  </span>
                </div>
              </div>
            </Link>

            {/* Center: Single Responsive Nav with 8 items */}
            <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none max-w-2xl lg:max-w-3xl">
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isItemActive =
                  location.pathname === item.path ||
                  (item.path === '/admin/competition' && location.pathname === '/admin/control');

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                      isItemActive
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300/80 shadow-2xs'
                        : 'text-slate-600 hover:text-emerald-950 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isItemActive ? 'text-emerald-700' : 'text-emerald-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Admin User + Role Badge + Logout */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                  {user.fullName}
                </span>
                <span className="text-[10px] font-mono text-amber-700 font-bold uppercase tracking-wider">
                  [{user.role}]
                </span>
              </div>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Default App Navbar (Team & Public Light Competition Theme)
  // ---------------------------------------------------------------------------
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight text-emerald-950 flex items-center gap-1.5">
              <span>IGNITRON</span>
              <span className="text-emerald-600">2K26</span>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 font-semibold">
              Code Relay
            </div>
          </div>
        </Link>

        {/* Navigation / Role Context */}
        {user ? (
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Team Role Badge */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800">{user.teamName}</span>
              <span className="text-[11px] font-mono text-emerald-700 flex items-center justify-end gap-1">
                <UserCheck className="w-3 h-3 text-emerald-600" />
                <span>{user.activeParticipant.fullName}</span>
                <span className="text-slate-400 font-bold font-mono">({user.teamCode})</span>
              </span>
            </div>

            {/* Quick Links */}
            <div className="flex items-center gap-2">
              <Link
                to="/team/dashboard"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive('/team/dashboard')
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/team/workspace"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive('/team/workspace')
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                Workspace
              </Link>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/#rules"
              className="text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors px-2 py-1"
            >
              Rules
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-sm"
            >
              Register Team
            </Link>
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              Team Login
            </Link>
            <Link
              to="/admin/login"
              className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-amber-700 text-xs font-medium transition-colors"
            >
              Admin
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
