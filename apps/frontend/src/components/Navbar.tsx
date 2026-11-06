import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Users,
  FileSpreadsheet,
  LogOut,
  Activity,
  Terminal,
  UserCheck,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:shadow-sky-500/40 transition-shadow">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>IGNITRON</span>
              <span className="text-sky-400">2K26</span>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              Code Relay
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {user?.type === 'ADMIN' && (
            <>
              <Link
                to="/admin/dashboard"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive('/admin/dashboard')
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/admin/teams"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive('/admin/teams')
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Teams</span>
              </Link>
              <Link
                to="/admin/import"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive('/admin/import')
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>CSV Import</span>
              </Link>
            </>
          )}

          {user?.type === 'TEAM' && (
            <Link
              to="/team/dashboard"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive('/team/dashboard')
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Team Arena
            </Link>
          )}

          <Link
            to="/status"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              isActive('/status')
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Status</span>
          </Link>
        </nav>

        {/* User Session Bar / Action */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200">
                  {user.type === 'ADMIN' ? user.fullName : user.teamName}
                </span>
                <span className="text-[11px] font-mono text-slate-400 flex items-center justify-end gap-1">
                  {user.type === 'ADMIN' ? (
                    <span className="text-amber-400 font-bold tracking-wider">
                      [{user.role}]
                    </span>
                  ) : (
                    <>
                      <UserCheck className="w-3 h-3 text-emerald-400" />
                      <span>{user.activeParticipant.fullName}</span>
                      <span className="text-sky-400 font-mono">({user.teamCode})</span>
                    </>
                  )}
                </span>
              </div>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-rose-950/40 hover:border-rose-800/60 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors shadow-sm shadow-sky-500/20"
              >
                Team Login
              </Link>
              <Link
                to="/admin/login"
                className="px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors flex items-center gap-1"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

