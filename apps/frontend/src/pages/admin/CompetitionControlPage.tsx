import React, { useState } from 'react';
import {
  useCompetitionState,
  useServerTimer,
  useCompetitionActivityLogs,
} from '../../hooks/useCompetition';
import { competitionService } from '../../services/competition.service';
import { ShortlistingTeamItem, CompetitionStatus } from '@ignitron/shared';
import {
  Play,
  Pause,
  Square,
  FastForward,
  RotateCcw,
  CheckCircle2,
  Users,
  Award,
  AlertCircle,
  Radio,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

const COMPETITION_STEPS: Array<{ status: CompetitionStatus; label: string; desc: string }> = [
  { status: 'STANDBY', label: 'Standby', desc: 'Pre-event configuration' },
  { status: 'ROUND_1_ACTIVE', label: 'Round 1 Live', desc: 'MCQ Arena (30m)' },
  { status: 'ROUND_1_EVALUATION', label: 'R1 Evaluation', desc: 'Top 50% Shortlisting' },
  { status: 'ROUND_2_ACTIVE', label: 'Round 2 Live', desc: 'Bug Hunt Arena (40m)' },
  { status: 'ROUND_2_EVALUATION', label: 'R2 Evaluation', desc: 'Final 5-8 Shortlisting' },
  { status: 'ROUND_3_ACTIVE', label: 'Round 3 Live', desc: 'Final Boss Coding (60m)' },
  { status: 'FINAL_EVALUATION', label: 'Final Evaluation', desc: 'Scoring & Placements' },
  { status: 'COMPLETED', label: 'Completed', desc: 'Results Published' },
];

export const CompetitionControlPage: React.FC = () => {
  const { data: compState, refetch: refetchState } = useCompetitionState();
  const { data: activityLogs, refetch: refetchLogs } = useCompetitionActivityLogs();

  const timer = useServerTimer(
    compState?.deadlineAt,
    compState?.isPaused || false,
    compState?.remainingDurationSeconds,
  );

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Shortlisting Modal State
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [targetRound, setTargetRound] = useState<number>(2);
  const [candidateTeams, setCandidateTeams] = useState<ShortlistingTeamItem[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [shortlistLoading, setShortlistLoading] = useState(false);

  // Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetType, setResetType] = useState<'DEMO_ONLY' | 'FULL_RESET'>('DEMO_ONLY');

  const executeControl = async (action: any, extraPayload: any = {}) => {
    setErrorMsg(null);
    setLoadingAction(action);
    try {
      await competitionService.executeControl({
        action,
        ...extraPayload,
      });
      await refetchState();
      await refetchLogs();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to execute control action');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOpenShortlisting = async (roundNum: number) => {
    setTargetRound(roundNum);
    setErrorMsg(null);
    setShortlistLoading(true);
    setShowShortlistModal(true);
    try {
      const teams = await competitionService.getShortlistingTeams(roundNum);
      setCandidateTeams(teams);
      // Pre-select already eligible teams
      const preSelected = new Set(
        teams.filter((t) => t.nextRoundEligibility === 'ELIGIBLE').map((t) => t.teamId),
      );
      setSelectedTeamIds(preSelected);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load candidates for shortlisting');
      setShowShortlistModal(false);
    } finally {
      setShortlistLoading(false);
    }
  };

  const handleAutoSelectTop = (ratioOrCount: number) => {
    const sorted = [...candidateTeams].sort((a, b) => b.score - a.score);
    let countToSelect = 0;
    if (ratioOrCount < 1) {
      // ratio e.g. 0.5 (top 50%)
      countToSelect = Math.ceil(sorted.length * ratioOrCount);
    } else {
      // absolute count e.g. 6
      countToSelect = Math.min(sorted.length, ratioOrCount);
    }
    const chosen = new Set(sorted.slice(0, countToSelect).map((t) => t.teamId));
    setSelectedTeamIds(chosen);
  };

  const handleCommitShortlist = async () => {
    if (selectedTeamIds.size === 0) {
      alert('Please select at least one team to qualify.');
      return;
    }
    setShortlistLoading(true);
    try {
      await competitionService.submitShortlisting({
        roundNumber: targetRound,
        qualifiedTeamIds: Array.from(selectedTeamIds),
      });
      setShowShortlistModal(false);
      await refetchState();
      await refetchLogs();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to commit shortlisting decisions');
    } finally {
      setShortlistLoading(false);
    }
  };

  const handleGenerateDemoTeams = async () => {
    if (!window.confirm('Generate 20 demonstration teams with test rosters?')) return;
    setLoadingAction('DEMO_GEN');
    try {
      await competitionService.generateDemoData(20);
      await refetchState();
      await refetchLogs();
      alert('20 demonstration teams generated successfully.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to generate demo teams');
    } finally {
      setLoadingAction(null);
    }
  };

  const currentStepIndex = COMPETITION_STEPS.findIndex(
    (s) => s.status === compState?.status,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Global Competition Control Engine</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/30">
              Server Authoritative
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authoritative tournament state machine, server countdown timers, and progressive shortlisting
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateDemoTeams}
            disabled={!!loadingAction}
            className="px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Seed Demo Roster (20 Teams)</span>
          </button>

          <button
            onClick={() => setShowResetModal(true)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-rose-950/40 hover:border-rose-800/60 text-slate-400 hover:text-rose-400 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset State</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Control Engine Error</span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Visual Round Progression Stepper */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-6">
          Sequential Tournament State Machine
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {COMPETITION_STEPS.map((step, idx) => {
            const isCurrent = step.status === compState?.status;
            const isCompleted = currentStepIndex > idx;

            return (
              <div
                key={step.status}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-sky-500/10 border-sky-500/50 shadow-lg shadow-sky-500/10'
                    : isCompleted
                    ? 'bg-slate-950/60 border-emerald-800/40 text-slate-400'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold">
                      0{idx + 1}
                    </span>
                    {isCurrent ? (
                      <Radio className="w-3 h-3 text-sky-400 animate-pulse" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : null}
                  </div>
                  <div className={`text-xs font-bold leading-tight ${isCurrent ? 'text-white' : ''}`}>
                    {step.label}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-2 font-mono">
                  {step.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active State Command Center & Live Timer Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Timer & State Controls */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/30 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-1">
                Authoritative Server Clock
              </span>
              <div className="flex items-baseline gap-4">
                <span className={`text-4xl sm:text-5xl font-mono font-black tracking-wider ${
                  compState?.isPaused ? 'text-amber-400' : 'text-white'
                }`}>
                  {compState?.status.includes('ACTIVE')
                    ? timer.formatted
                    : '--:--:--'}
                </span>
                {compState?.isPaused && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                    Timer Paused
                  </span>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-mono text-slate-400 uppercase block mb-0.5">
                Current Status
              </span>
              <span className="text-base font-bold text-sky-400 font-mono">
                {compState?.status}
              </span>
              <div className="text-[11px] text-slate-500 font-mono">
                Round: {compState?.currentRoundName || 'None'}
              </div>
            </div>
          </div>

          {/* Action Control Buttons Grid */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3">
            {/* When in STANDBY */}
            {compState?.status === 'STANDBY' && (
              <button
                onClick={() => executeControl('START_ROUND_1')}
                disabled={!!loadingAction}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Round 1: MCQ Arena</span>
              </button>
            )}

            {/* When active round live */}
            {compState?.status.includes('ACTIVE') && (
              <>
                {compState.isPaused ? (
                  <button
                    onClick={() => executeControl('RESUME_ROUND')}
                    disabled={!!loadingAction}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume Timer</span>
                  </button>
                ) : (
                  <button
                    onClick={() => executeControl('PAUSE_ROUND')}
                    disabled={!!loadingAction}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause Timer</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (window.confirm('Conclude active round now and enter evaluation mode?')) {
                      executeControl('END_ROUND');
                    }
                  }}
                  disabled={!!loadingAction}
                  className="px-4 py-2 bg-slate-800 hover:bg-rose-950/60 hover:border-rose-800 text-rose-300 font-semibold text-xs rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>End Active Round</span>
                </button>
              </>
            )}

            {/* When in Round 1 Evaluation */}
            {compState?.status === 'ROUND_1_EVALUATION' && (
              <>
                <button
                  onClick={() => handleOpenShortlisting(2)}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-violet-600/20"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Shortlist for Round 2 (Top 50%)</span>
                </button>

                <button
                  onClick={() => executeControl('START_ROUND_2')}
                  disabled={!!loadingAction}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-sky-500/20"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Start Round 2: Bug Hunt Arena</span>
                </button>
              </>
            )}

            {/* When in Round 2 Evaluation */}
            {compState?.status === 'ROUND_2_EVALUATION' && (
              <>
                <button
                  onClick={() => handleOpenShortlisting(3)}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-violet-600/20"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Shortlist Finalists (5-8 Teams)</span>
                </button>

                <button
                  onClick={() => executeControl('START_ROUND_3')}
                  disabled={!!loadingAction}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-sky-500/20"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Start Round 3: Final Boss Coding</span>
                </button>
              </>
            )}

            {/* When in Final Evaluation */}
            {compState?.status === 'FINAL_EVALUATION' && (
              <button
                onClick={() => {
                  if (window.confirm('Officially conclude competition and finalize results?')) {
                    executeControl('COMPLETE_COMPETITION');
                  }
                }}
                disabled={!!loadingAction}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>Complete Competition & Publish</span>
              </button>
            )}

            {/* When Completed */}
            {compState?.status === 'COMPLETED' && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>All Competition Rounds Completed</span>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Live Metrics */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Participation Matrix
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Total Registered</span>
              <span className="font-mono font-bold text-white">{compState?.totalTeamsCount} Teams</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Current Round Eligible</span>
              <span className="font-mono font-bold text-emerald-400">{compState?.eligibleTeamsCount} Teams</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Active / In Progress</span>
              <span className="font-mono font-bold text-sky-400">{compState?.participatingTeamsCount} Teams</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Submissions Finished</span>
              <span className="font-mono font-bold text-amber-400">{compState?.completedTeamsCount} Teams</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log Audit Stream */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span>Server Audit Trail & Transition Log</span>
          </h3>
          <button
            onClick={() => refetchLogs()}
            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
          {activityLogs && activityLogs.length > 0 ? (
            activityLogs.map((log) => (
              <div key={log.id} className="py-2.5 text-xs flex items-center justify-between gap-4 font-mono">
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
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              No competition events recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Progressive Shortlisting Drawer */}
      {showShortlistModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-400" />
                  <span>Shortlist Teams for Round {targetRound}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review scores from previous round and select teams qualified to participate.
                </p>
              </div>
              <button
                onClick={() => setShowShortlistModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Quick Auto-select Buttons */}
            <div className="py-3 flex items-center gap-2 border-b border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Quick Selection:</span>
              {targetRound === 2 ? (
                <button
                  onClick={() => handleAutoSelectTop(0.5)}
                  className="px-2.5 py-1 bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/40 rounded text-xs font-mono font-semibold"
                >
                  Select Top 50%
                </button>
              ) : (
                <button
                  onClick={() => handleAutoSelectTop(6)}
                  className="px-2.5 py-1 bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/40 rounded text-xs font-mono font-semibold"
                >
                  Select Top 6 Finalists
                </button>
              )}
              <span className="text-xs font-mono text-emerald-400 ml-auto">
                {selectedTeamIds.size} / {candidateTeams.length} Selected
              </span>
            </div>

            {/* Candidates Table */}
            <div className="flex-1 overflow-y-auto py-2">
              {shortlistLoading ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Loading candidates...
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase font-mono text-slate-400 border-b border-slate-800 sticky top-0 bg-slate-900">
                    <tr>
                      <th className="py-2 px-3">Select</th>
                      <th className="py-2 px-3">Rank & Code</th>
                      <th className="py-2 px-3">Team Name</th>
                      <th className="py-2 px-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {candidateTeams.map((team) => {
                      const isSelected = selectedTeamIds.has(team.teamId);
                      return (
                        <tr
                          key={team.teamId}
                          onClick={() => {
                            const next = new Set(selectedTeamIds);
                            if (isSelected) next.delete(team.teamId);
                            else next.add(team.teamId);
                            setSelectedTeamIds(next);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-violet-950/20' : 'hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by row click
                              className="rounded border-slate-700 text-violet-600"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-sky-400">
                            #{team.rank} {team.teamCode}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-white">{team.teamName}</div>
                            <div className="text-[10px] text-slate-500">{team.institution || '—'}</div>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-400">
                            {team.score} pts
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setShowShortlistModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitShortlist}
                disabled={shortlistLoading || selectedTeamIds.size === 0}
                className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm & Advance {selectedTeamIds.size} Teams</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: State Reset */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Reset Competition State</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Resets the competition state machine back to <strong>STANDBY</strong>. Select what should be cleared:
            </p>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="resetType"
                  value="DEMO_ONLY"
                  checked={resetType === 'DEMO_ONLY'}
                  onChange={() => setResetType('DEMO_ONLY')}
                />
                <div>
                  <span className="font-semibold text-white block">Reset Demo Teams Only</span>
                  <span className="text-slate-500 text-[11px]">
                    Deletes simulated demo teams while preserving genuine registered teams.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="resetType"
                  value="FULL_RESET"
                  checked={resetType === 'FULL_RESET'}
                  onChange={() => setResetType('FULL_RESET')}
                />
                <div>
                  <span className="font-semibold text-rose-400 block">Full Progress Reset</span>
                  <span className="text-slate-500 text-[11px]">
                    Resets all round progress and eligibility for all teams back to STANDBY.
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  executeControl('RESET_COMPETITION', { resetType });
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
