import React, { useEffect, useState } from 'react';
import { AdminNav } from '../../components/AdminNav';
import { competitionService } from '../../services/competition.service';
import { LeaderboardResponseDto } from '@ignitron/shared';
import {
  Trophy,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  Lock,
  Building,
} from 'lucide-react';

export const LeaderboardManagementPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponseDto | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await competitionService.getLeaderboard(selectedRound);
      setLeaderboard(data);
    } catch (err: any) {
      console.error('Failed to load leaderboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedRound]);

  const handleTogglePublish = async () => {
    if (!leaderboard) return;
    try {
      setToggling(true);
      const nextState = !leaderboard.isPublished;
      await competitionService.publishLeaderboard({
        roundNumber: selectedRound,
        isPublished: nextState,
      });
      await fetchLeaderboard();
    } catch (err: any) {
      alert(err.message || 'Failed to update leaderboard publication status');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] pb-12">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-950 flex items-center gap-3">
              <span>Leaderboard Administration</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                Official Scores
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Review contestant rankings, manage publication gates, and control public score visibility.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLeaderboard}
              disabled={loading}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleTogglePublish}
              disabled={toggling || loading}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-xs ${
                leaderboard?.isPublished
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white'
              }`}
            >
              {leaderboard?.isPublished ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>{toggling ? 'Updating...' : 'Unpublish Leaderboard'}</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>{toggling ? 'Publishing...' : 'Publish to Contestants'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Alert Banner */}
        <div
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            leaderboard?.isPublished
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                leaderboard?.isPublished
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {leaderboard?.isPublished ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                <span>
                  {leaderboard?.isPublished
                    ? 'Leaderboard Is Currently Published'
                    : 'Leaderboard Is Unpublished & Confidential'}
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/80 border border-current">
                  {leaderboard?.isPublished ? 'Publicly Visible' : 'Admin Only'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {leaderboard?.isPublished
                  ? 'Contestants can inspect published rankings on their participant dashboard.'
                  : 'Contestants cannot view ranks or scores until you explicitly publish this leaderboard.'}
                {leaderboard?.publishedAt && (
                  <span className="block font-mono text-[11px] text-slate-500 mt-1">
                    Published timestamp: {new Date(leaderboard.publishedAt).toLocaleString()}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Filter By Round */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-700">Scope:</span>
            <select
              value={selectedRound === undefined ? 'all' : selectedRound}
              onChange={(e) =>
                setSelectedRound(e.target.value === 'all' ? undefined : Number(e.target.value))
              }
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">Overall Tournament</option>
              <option value="1">Round 1: MCQ Arena</option>
              <option value="2">Round 2: Bug Hunt Arena</option>
              <option value="3">Round 3: Final Boss Coding</option>
            </select>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-600" />
              <span>
                Rankings Table ({leaderboard?.entries.length || 0}{' '}
                {leaderboard?.entries.length === 1 ? 'Team' : 'Teams'})
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Score ties broken by earliest submission timestamp
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs font-mono text-slate-400">
              Loading verified standings...
            </div>
          ) : !leaderboard || leaderboard.entries.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">No score records found for this round.</p>
              <p className="text-xs text-slate-400">Scores appear once participants submit solutions and evaluations run.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-mono uppercase text-[10px]">
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Team Code</th>
                    <th className="py-3 px-4">Team Name</th>
                    <th className="py-3 px-4">Institution</th>
                    <th className="py-3 px-4 text-right">Cumulative Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.entries.map((entry) => (
                    <tr
                      key={entry.teamCode || entry.teamName}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black font-mono ${
                            entry.rank === 1
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : entry.rank === 2
                              ? 'bg-slate-200 text-slate-800 border border-slate-300'
                              : entry.rank === 3
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'text-slate-500'
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                        {entry.teamCode || '---'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-950">
                        {entry.teamName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{entry.institution || 'Verified College'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-emerald-700">
                        {entry.score} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
