import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { DashboardStatsDto } from '@ignitron/shared';
import {
  Users,
  UserCheck,
  UserX,
  Radio,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Admin Control Center</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Live Roster
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time competition operations, team orchestration & security monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/admin/teams"
            className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-sky-500/20"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Teams</span>
          </Link>
          <Link
            to="/admin/import"
            className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-violet-600/20"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Teams */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider">Total Teams</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white">
              {stats?.totalTeams ?? '...'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Registered competition teams
            </div>
          </div>
        </div>

        {/* Active Teams */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider">Active Teams</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-emerald-400">
              {stats?.activeTeams ?? '...'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Eligible for competition rounds
            </div>
          </div>
        </div>

        {/* Inactive Teams */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider">Deactivated</span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-rose-400">
              {stats?.inactiveTeams ?? '...'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Suspended or withdrawn teams
            </div>
          </div>
        </div>

        {/* Total Participants */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider">Contestants</span>
            <UserCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white">
              {stats?.totalParticipants ?? '...'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              2 participants per team
            </div>
          </div>
        </div>

        {/* Active Concurrent Sessions */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase tracking-wider">Live Sessions</span>
            <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-sky-400">
              {stats?.teamsWithActiveSessions ?? '...'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Currently logged-in terminals
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900 to-sky-950/30 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Team Roster & Account Administration
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              View all 20+ university teams, manage participant details, generate single-use credentials, reset team access passwords, and terminate active concurrent sessions.
            </p>
          </div>
          <div className="mt-6">
            <Link
              to="/admin/teams"
              className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              <span>Open Team Management Table</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900 to-violet-950/30 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Unstop CSV Bulk Roster Ingestion
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Import registered teams exported directly from Unstop. Dynamically map columns, validate email uniqueness, preview duplicates, and generate credentials in a transactional batch.
            </p>
          </div>
          <div className="mt-6">
            <Link
              to="/admin/import"
              className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
            >
              <span>Launch CSV Import Wizard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

