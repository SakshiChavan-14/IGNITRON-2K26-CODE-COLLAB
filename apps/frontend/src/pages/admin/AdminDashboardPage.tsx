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
  UserPlus,
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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-950 flex items-center gap-3">
            <span>Admin Control Center</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
              Tournament Portal
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time competition operations, team registration orchestration & security monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={loading}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/admin/competition"
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Competition Engine</span>
          </Link>
          <Link
            to="/admin/teams"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Teams</span>
          </Link>
          <Link
            to="/register"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-500" />
            <span>Register Team</span>
          </Link>
        </div>
      </div>

      {/* Live State Machine Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
              Active Tournament State
            </span>
            <div className="text-xl font-extrabold text-emerald-950 flex items-center gap-2">
              <span>{compState?.status || 'STANDBY'}</span>
              {compState?.isPaused && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-mono font-bold">
                  Paused
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-mono">
              Current Arena: {compState?.currentRoundName || 'Standby Mode'}
            </div>
          </div>
        </div>

        <Link
          to="/admin/competition"
          className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <span>Open Full Control Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Teams */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Total Teams</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-950">
              {stats?.totalTeams ?? '...'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Registered competition teams
            </div>
          </div>
        </div>

        {/* Active Teams */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Active Teams</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-700">
              {stats?.activeTeams ?? '...'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Eligible for competition rounds
            </div>
          </div>
        </div>

        {/* Inactive Teams */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Deactivated</span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-rose-600">
              {stats?.inactiveTeams ?? '...'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Suspended or withdrawn teams
            </div>
          </div>
        </div>

        {/* Total Participants */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Contestants</span>
            <UserCheck className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-950">
              {stats?.totalParticipants ?? '...'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              2 participants per team
            </div>
          </div>
        </div>

        {/* Active Concurrent Sessions */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">Live Sessions</span>
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-600">
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
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4">
              <FastForward className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-emerald-950 mb-1">
              Competition State Engine
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Start rounds, control server countdown timers, pause/resume official clocks, enter evaluation mode, and advance shortlisted teams.
            </p>
          </div>
          <div className="mt-6">
            <Link
              to="/admin/competition"
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <span>Manage Tournament Progression</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-emerald-950 mb-1">
              Team Roster Administration
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              View registered teams, inspect contestants, export complete CSV rosters, and manage single-participant terminal locks.
            </p>
          </div>
          <div className="mt-6">
            <Link
              to="/admin/teams"
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <span>Open Team Roster Table</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4">
              <UserPlus className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-emerald-950 mb-1">
              Public Team Registration
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Open registration link for contestants to register two-person teams, establish team credentials, and generate unique access keys.
            </p>
          </div>
          <div className="mt-6">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <span>View Registration Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Audit Section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
          Recent Competition Events
        </h3>

        <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
          {activityLogs && activityLogs.length > 0 ? (
            activityLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="py-2.5 text-xs flex items-center justify-between gap-4 font-mono">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                    {log.action}
                  </span>
                  <span>{log.description}</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-slate-400 font-mono">
              No recent events.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
