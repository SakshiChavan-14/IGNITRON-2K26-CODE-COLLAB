import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
  useCompetitionState,
  useCompetitionActivityLogs,
} from '../../hooks/useCompetition';
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
  FastForward,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: compState, refetch: refetchCompState } = useCompetitionState();
  const { data: activityLogs, refetch: refetchLogs } = useCompetitionActivityLogs();

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

  const handleRefreshAll = async () => {
    await Promise.all([fetchStats(), refetchCompState(), refetchLogs()]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Admin Control Center</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Live Tournament
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time competition operations, team orchestration & security monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={loading}
            className="px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/admin/competition"
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Competition Engine</span>
          </Link>
          <Link
            to="/admin/teams"
            className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-sky-500/20"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Teams</span>
          </Link>
          <Link
            to="/admin/import"
            className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-violet-600/20"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV Import</span>
          </Link>
        </div>
      </div>

      {/* Live State Machine Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
              Active Tournament State
            </span>
            <div className="text-xl font-bold text-white flex items-center gap-2">
              <span>{compState?.status || 'STANDBY'}</span>
              {compState?.isPaused && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                  Paused
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 font-mono">
              Current Arena: {compState?.currentRoundName || 'Standby Mode'}
            </div>
          </div>
        </div>

        <Link
          to="/admin/competition"
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <span>Open Full Control Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
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

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900 to-amber-950/20 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <FastForward className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Competition State Engine
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Start rounds, control server countdown timers, pause/resume official clocks, enter evaluation mode, and advance shortlisted teams.
            </p>
          </div>
          <div className="mt-6">
            <Link
              to="/admin/competition"
              className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              <span>Manage Tournament Progression</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900 to-sky-950/20 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Team Roster Administration
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              View all 20+ teams, manage participant details, generate single-use credentials, and terminate active concurrent sessions.
            </p>
          </div>
          <div className="mt-6">
            <Link
              to="/admin/teams"
              className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              <span>Open Team Roster Table</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900 to-violet-950/20 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Unstop CSV Bulk Ingestion
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Import registered teams from Unstop. Dynamically map columns, validate email uniqueness, and generate credentials in batch.
            </p>
          </div>
          <div className="mt-6">
            <Link
              to="/admin/import"
              className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
            >
              <span>Launch CSV Ingestion</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Audit Section */}
      <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
          Recent Competition Events
        </h3>

        <div className="divide-y divide-slate-800/80 max-h-60 overflow-y-auto">
          {activityLogs && activityLogs.length > 0 ? (
            activityLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="py-2 text-xs flex items-center justify-between gap-4 font-mono">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 text-[10px]">
                    {log.action}
                  </span>
                  <span>{log.description}</span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-slate-500 font-mono">
              No recent events.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
