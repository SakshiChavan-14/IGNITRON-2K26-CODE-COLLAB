import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminNav } from '../../components/AdminNav';
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
  Building,
  UserMinus,
  LogIn,
  Megaphone,
  Trophy,
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
    <div className="min-h-screen bg-[#f8faf9] pb-12">
      {/* 8-Section Admin Navigation Bar */}
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-950 flex items-center gap-3">
              <span>Admin Operations Center</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                Tournament Command
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Live tournament metrics, contestant registrations, terminal concurrency & system telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefreshAll}
              disabled={loading}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </button>
            <Link
              to="/admin/competition"
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Competition Engine</span>
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 border border-slate-300 shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
              <span>New Team Register</span>
            </Link>
          </div>
        </div>

        {/* Live State Machine Banner */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                Authoritative Competition State
              </span>
              <div className="text-xl font-extrabold text-emerald-950 flex items-center gap-2">
                <span>{compState?.status || 'STANDBY'}</span>
                {compState?.isPaused && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-mono font-bold">
                    Clock Paused
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-mono">
                Current Active Arena: <strong className="text-emerald-900">{compState?.currentRoundName || 'Standby Mode'}</strong>
              </div>
            </div>
          </div>

          <Link
            to="/admin/competition"
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-2 self-start sm:self-auto shadow-2xs"
          >
            <span>Open Progression Controls</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 6 Key Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total Teams */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Total Teams</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-950">
                {stats?.totalTeams ?? '...'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Registered squads
              </div>
            </div>
          </div>

          {/* Total Participants */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Contestants</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-950">
                {stats?.totalParticipants ?? '...'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                2 per team
              </div>
            </div>
          </div>

          {/* Active Teams */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Active Teams</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-700">
                {stats?.activeTeams ?? '...'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Eligible & verified
              </div>
            </div>
          </div>

          {/* Inactive Teams */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Inactive Teams</span>
              <UserX className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-rose-600">
                {stats?.inactiveTeams ?? '...'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Deactivated/withdrawn
              </div>
            </div>
          </div>

          {/* Unparticipated Teams */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Unparticipated</span>
              <UserMinus className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-amber-600">
                {stats?.unparticipatedTeams ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                No round submissions yet
              </div>
            </div>
          </div>

          {/* Active Concurrent Sessions */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Live Terminals</span>
              <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                {stats?.teamsWithActiveSessions ?? '...'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Concurrent sessions
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column: Recent Registrations & Recent Logins */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Registrations Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <span>Recent Registrations</span>
                </div>
                <Link
                  to="/admin/teams"
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {stats?.recentRegistrations && stats.recentRegistrations.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {stats.recentRegistrations.slice(0, 5).map((r) => (
                    <div key={r.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-950">{r.teamName}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                            {r.teamCode}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{r.institution || 'Verified College'}</span>
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          Contestants: {r.participants.map((p) => p.fullName).join(' & ')}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 font-mono">
                  No registrations recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Recent Login Activity Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-emerald-600" />
                  <span>Recent Login Activity</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Live Concurrency
                </span>
              </div>

              {stats?.recentLogins && stats.recentLogins.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {stats.recentLogins.slice(0, 6).map((s) => (
                    <div key={s.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-950">{s.teamName}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                            {s.teamCode}
                          </span>
                        </div>
                        <div className="text-slate-600 text-[11px] flex items-center gap-1.5 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Active: {s.participantName}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {s.status}
                        </span>
                        <div className="text-[10px] font-mono text-slate-400 mt-1">
                          {new Date(s.loginAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 font-mono">
                  No active session logs recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            to="/admin/competition"
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3 group-hover:scale-105 transition-transform">
                <FastForward className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-emerald-950 mb-1">
                Competition Engine
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Control timers, trigger round transitions & manage shortlisting gates.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-emerald-700 flex items-center gap-1">
              <span>Launch Control</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/admin/teams"
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-emerald-950 mb-1">
                Team Management
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Inspect contestants, reset passwords, release session locks & export CSVs.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-emerald-700 flex items-center gap-1">
              <span>View Roster</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/admin/announcements"
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3 group-hover:scale-105 transition-transform">
                <Megaphone className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-emerald-950 mb-1">
                Announcements
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Publish broadcasts, schedule bulletins, and issue urgent alerts.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-emerald-700 flex items-center gap-1">
              <span>Broadcast Alerts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/admin/leaderboard"
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3 group-hover:scale-105 transition-transform">
                <Trophy className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-emerald-950 mb-1">
                Leaderboard Standings
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Audit cumulative scores, verify podium ranks & toggle publication gates.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-emerald-700 flex items-center gap-1">
              <span>Publish Scores</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>

        {/* Recent Activity Audit Logs */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
              Recent System & Competition Events
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Audit trail from ActivityLog
            </span>
          </div>

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
                No recent events recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
