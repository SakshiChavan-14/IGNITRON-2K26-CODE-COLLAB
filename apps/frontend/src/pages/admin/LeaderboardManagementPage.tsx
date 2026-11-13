import React, { useEffect, useState } from 'react';
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
  Award,
  AlertTriangle,
  X,
} from 'lucide-react';

export const LeaderboardManagementPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<(LeaderboardResponseDto & { winnerTeam?: any }) | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Winner declaration modal state
  const [declareModalOpen, setDeclareModalOpen] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
  const [winnerNotes, setWinnerNotes] = useState<string>('');
  const [declaring, setDeclaring] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await competitionService.getLeaderboard(selectedRound);
      setLeaderboard(data as any);
      if (data?.entries?.length && !selectedWinnerId) {
        setSelectedWinnerId((data.entries[0] as any).teamId || '');
      }
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

  const handleDeclareWinner = async () => {
    if (!selectedWinnerId) {
      alert('Please select a winning team.');
      return;
    }
    try {
      setDeclaring(true);
      await competitionService.declareWinner(selectedWinnerId, winnerNotes);
      setDeclareModalOpen(false);
      setWinnerNotes('');
      await fetchLeaderboard();
      alert('Official winner declared and broadcast to all participants!');
    } catch (err: any) {
      alert(err.message || 'Failed to declare official winner');
    } finally {
      setDeclaring(false);
    }
  };

  // Tie detection among top ranks
  const topScore = leaderboard?.entries[0]?.score ?? 0;
  const tiedTeams = leaderboard?.entries.filter((e) => e.score === topScore && topScore > 0) || [];
  const hasScoreTie = tiedTeams.length > 1;

  return (
    <div className="min-h-screen bg-[#f8faf9] pb-12 pt-4">
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
            <button
              onClick={() => {
                if (leaderboard?.entries?.length && !selectedWinnerId) {
                  setSelectedWinnerId((leaderboard.entries[0] as any).teamId || '');
                }
                setDeclareModalOpen(true);
              }}
              disabled={loading || !leaderboard?.entries?.length}
              className="px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-xs bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white cursor-pointer disabled:opacity-50"
            >
              <Award className="w-4 h-4" />
              <span>Declare Official Winner</span>
            </button>
          </div>
        </div>

        {/* Official Winner Banner if declared */}
        {leaderboard?.winnerTeam && (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-emerald-500/15 border-2 border-amber-400/80 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-5 animate-in fade-in">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white shadow-md shrink-0">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    Official Champion of IGNITRON 2K26
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Declared {new Date(leaderboard.winnerTeam.declaredAt).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                  <span>{leaderboard.winnerTeam.teamName}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                    {leaderboard.winnerTeam.teamCode}
                  </span>
                </h2>
                <div className="text-xs text-slate-600 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{leaderboard.winnerTeam.institution || 'Verified College'}</span>
                  </span>
                  {leaderboard.winnerTeam.participants && (
                    <span className="text-slate-500">
                      &bull; Team: {leaderboard.winnerTeam.participants.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-amber-200">
              <span className="text-[10px] uppercase font-mono tracking-wider text-amber-900 font-bold">
                Grand Cumulative Score
              </span>
              <span className="text-3xl font-black font-mono text-emerald-900">
                {leaderboard.winnerTeam.totalScore} <span className="text-sm font-bold text-emerald-700">pts</span>
              </span>
            </div>
          </div>
        )}

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

        {/* Declare Winner Modal */}
        {declareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Declare Official Tournament Winner
                    </h3>
                    <p className="text-xs text-slate-500">
                      Finalize competition results and broadcast the championship banner.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDeclareModalOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {hasScoreTie && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Score Tie Detected:</strong>
                    <span>
                      {tiedTeams.length} teams share the top score of {topScore} pts. Select the winning team based on the tiebreak policy.
                    </span>
                  </div>
                </div>
              )}

              {/* Team Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider block">
                  Select Winning Team:
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {leaderboard?.entries.map((entry) => {
                    const isSelected = selectedWinnerId === (entry as any).teamId;
                    return (
                      <div
                        key={entry.teamCode || entry.teamName}
                        onClick={() => setSelectedWinnerId((entry as any).teamId || '')}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-2 ring-amber-400/40'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-mono font-bold text-[11px] text-slate-600">
                            #{entry.rank}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{entry.teamName}</span>
                              <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                                {entry.teamCode}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">{entry.institution || 'Verified College'}</div>
                          </div>
                        </div>
                        <span className="font-mono font-black text-amber-800">{entry.score} pts</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider block">
                  Declaration Notes / Panel Citation (Optional):
                </label>
                <textarea
                  value={winnerNotes}
                  onChange={(e) => setWinnerNotes(e.target.value)}
                  placeholder="e.g. Winner verified by the evaluation jury. Solved all Round 3 test cases with highest cumulative score."
                  className="w-full h-20 p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeclareModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeclareWinner}
                  disabled={declaring || !selectedWinnerId}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                >
                  {declaring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trophy className="w-3.5 h-3.5" />}
                  <span>{declaring ? 'Declaring...' : 'Confirm Winner Declaration'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
