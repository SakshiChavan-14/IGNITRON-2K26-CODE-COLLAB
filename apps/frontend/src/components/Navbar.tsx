import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Users,
  LogOut,
  Activity,
  Terminal,
  UserCheck,
  FastForward,
  BookOpen,
  FileCode,
  UserPlus,
  Code2,
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

  // ---------------------------------------------------------------------------
  // 1. Landing Page Navbar (Futuristic Glowing Dark Glassmorphism)
  // ---------------------------------------------------------------------------
  if (isLanding) {
    return (
      <header className="sticky top-0 z-50 pt-3 sm:pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pointer-events-auto">
        <div className="w-full bg-[#02130a]/80 backdrop-blur-xl border border-emerald-500/30 rounded-2xl px-4 sm:px-6 h-16 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.65)]">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
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

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-emerald-100/90 font-mono">
            <Link
              to={user?.type === 'TEAM' ? '/team/workspace' : '/workspace-preview'}
              className="flex items-center gap-1.5 text-emerald-200/80 hover:text-emerald-300 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all"
            >
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>Workspace</span>
            </Link>

            <Link
              to="/rules"
              className="flex items-center gap-1.5 text-emerald-200/80 hover:text-emerald-300 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Rules</span>
            </Link>

            <Link
              to="/status"
              className="flex items-center gap-1.5 text-emerald-200/80 hover:text-emerald-300 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Status</span>
            </Link>
          </nav>

          {/* User Session / Auth CTA */}
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
  // 2. Default App Navbar (Light Competition Dashboard Theme)
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

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {user?.type === 'ADMIN' && (
            <>
              <Link
                to="/admin/competition"
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive('/admin/competition')
                    ? 'bg-amber-100/80 text-amber-900 border border-amber-300'
                    : 'text-amber-800 hover:text-amber-950 hover:bg-amber-50'
                }`}
              >
                <FastForward className="w-4 h-4 text-amber-600" />
                <span>Control Engine</span>
              </Link>
              <Link
                to="/admin/dashboard"
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive('/admin/dashboard')
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'text-slate-600 hover:text-emerald-950 hover:bg-emerald-50/60'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/admin/teams"
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive('/admin/teams')
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'text-slate-600 hover:text-emerald-950 hover:bg-emerald-50/60'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Teams</span>
              </Link>
            </>
          )}

          {user?.type === 'TEAM' && (
            <>
              <Link
                to="/team/dashboard"
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive('/team/dashboard')
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'text-slate-600 hover:text-emerald-950 hover:bg-emerald-50/60'
                }`}
              >
                Team Arena
              </Link>
              <Link
                to="/team/workspace"
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive('/team/workspace') ||
                  isActive('/workspace') ||
                  isActive('/workspace-preview')
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'text-slate-600 hover:text-emerald-950 hover:bg-emerald-50/60'
                }`}
              >
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span>Workspace</span>
              </Link>
            </>
          )}

          <Link
            to="/rules"
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/rules')
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'text-slate-600 hover:text-emerald-950 hover:bg-emerald-50/60'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Rules</span>
          </Link>

          <Link
            to="/status"
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/status')
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'text-slate-600 hover:text-emerald-950 hover:bg-emerald-50/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>Status</span>
          </Link>
        </nav>

        {/* User Session Bar / Action */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-emerald-950">
                  {user.type === 'ADMIN' ? user.fullName : user.teamName}
                </span>
                <span className="text-[11px] font-mono text-slate-500 flex items-center justify-end gap-1">
                  {user.type === 'ADMIN' ? (
                    <span className="text-amber-700 font-bold tracking-wider">
                      [{user.role}]
                    </span>
                  ) : (
                    <>
                      <UserCheck className="w-3 h-3 text-emerald-600" />
                      <span>{user.activeParticipant.fullName}</span>
                      <span className="text-emerald-700 font-bold font-mono">
                        ({user.teamCode})
                      </span>
                    </>
                  )}
                </span>
              </div>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 rounded-lg bg-slate-100 border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/register"
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register Team</span>
              </Link>
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors"
              >
                Team Login
              </Link>
              <Link
                to="/admin/login"
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Admin</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
