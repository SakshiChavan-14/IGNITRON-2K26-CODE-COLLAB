import React, { useState, useMemo } from 'react';
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
  RotateCcw,
  CheckCircle2,
  Users,
  Award,
  AlertCircle,
  Radio,
  Sparkles,
  RefreshCw,
  Search,
  Check,
  Lock,
  Clock,
  Sliders,
  ShieldCheck,
  Edit3,
  Megaphone,
  X,
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Shortlisting Modal State
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [targetRound, setTargetRound] = useState<number>(2);
  const [candidateTeams, setCandidateTeams] = useState<ShortlistingTeamItem[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [shortlistLoading, setShortlistLoading] = useState(false);

  // Shortlisting Filters, Search & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'IN_PROGRESS' | 'NOT_STARTED'>('ALL');
  const [sortBy, setSortBy] = useState<'RANK' | 'SCORE_ASC' | 'NAME_ASC'>('RANK');
  const [shortlistStep, setShortlistStep] = useState<'SELECT' | 'CONFIRM'>('SELECT');

  // Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetType, setResetType] = useState<'DEMO_ONLY' | 'FULL_RESET'>('DEMO_ONLY');

  // Duration Configuration Modal State
  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [durationTargetRound, setDurationTargetRound] = useState<number>(1);
  const [durationInputMinutes, setDurationInputMinutes] = useState<number>(30);
  const [durationConfirmLive, setDurationConfirmLive] = useState(false);
  const [durationSaving, setDurationSaving] = useState(false);

  // Synchronized Countdown Launch Modal State
  const [countdownModalOpen, setCountdownModalOpen] = useState(false);
  const [countdownTargetRound, setCountdownTargetRound] = useState<number>(1);
  const [countdownDurationSecs, setCountdownDurationSecs] = useState<number>(5);
  const [countdownLaunching, setCountdownLaunching] = useState(false);

  const handleOpenDurationModal = (roundNum: number) => {
    const roundSummary = compState?.rounds?.find((r) => r.roundNumber === roundNum);
    const defaultMins = roundNum === 1 ? 30 : roundNum === 2 ? 40 : 60;
    setDurationTargetRound(roundNum);
    setDurationInputMinutes(roundSummary?.durationMinutes ?? defaultMins);
    setDurationConfirmLive(false);
    setDurationModalOpen(true);
  };

  const handleSaveDuration = async () => {
    setDurationSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await competitionService.updateRoundDuration(
        durationTargetRound,
        durationInputMinutes,
        durationConfirmLive,
      );
      await refetchState();
      setSuccessMsg(res.message);
      setDurationModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update round duration');
    } finally {
      setDurationSaving(false);
    }
  };

  const handleOpenCountdownModal = (roundNum: number) => {
    setCountdownTargetRound(roundNum);
    setCountdownDurationSecs(5);
    setCountdownModalOpen(true);
  };

  const handleLaunchCountdown = async () => {
    setCountdownLaunching(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await competitionService.startSynchronizedCountdown(
        countdownTargetRound,
        countdownDurationSecs,
      );
      await refetchState();
      setSuccessMsg(res.message);
      setCountdownModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to start synchronized countdown');
    } finally {
      setCountdownLaunching(false);
    }
  };

  const handleCancelCountdown = async () => {
    setLoadingAction('CANCEL_COUNTDOWN');
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await competitionService.cancelSynchronizedCountdown();
      await refetchState();
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to cancel countdown');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAnnounceRound = async (roundNum: number) => {
    setLoadingAction(`ANNOUNCE_${roundNum}`);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await competitionService.announceUpcomingRound(roundNum);
      await refetchState();
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to announce round');
    } finally {
      setLoadingAction(null);
    }
  };

  const executeControl = async (action: any, extraPayload: any = {}) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoadingAction(action);
    try {
      const res = await competitionService.executeControl({
        action,
        ...extraPayload,
      });
      await refetchState();
      await refetchLogs();
      setSuccessMsg(res?.message || 'Control action executed successfully.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to execute control action');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOpenShortlisting = async (roundNum: number) => {
    setTargetRound(roundNum);
    setShortlistStep('SELECT');
    setErrorMsg(null);
    setSuccessMsg(null);
    setShortlistLoading(true);
    setShowShortlistModal(true);
    setSearchQuery('');
    setStatusFilter('ALL');
    setSortBy('RANK');
    try {
      const teams = await competitionService.getShortlistingTeams(roundNum);
      setCandidateTeams(teams);
      // Pre-select teams that are already marked ELIGIBLE for target round
      const preSelected = new Set(
        teams.filter((t) => t.nextRoundEligibility === 'ELIGIBLE').map((t) => t.teamId),
      );
      setSelectedTeamIds(preSelected);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load candidate teams for shortlisting');
      setShowShortlistModal(false);
    } finally {
      setShortlistLoading(false);
    }
  };

  const handleSelectAllFiltered = (filteredIds: string[]) => {
    const next = new Set(selectedTeamIds);
    filteredIds.forEach((id) => next.add(id));
    setSelectedTeamIds(next);
  };

  const handleDeselectAllFiltered = (filteredIds: string[]) => {
    const next = new Set(selectedTeamIds);
    filteredIds.forEach((id) => next.delete(id));
    setSelectedTeamIds(next);
  };

  const handleAutoSelectTop = (ratioOrCount: number) => {
    const sorted = [...candidateTeams].sort((a, b) => b.score - a.score);
    let countToSelect = 0;
    if (ratioOrCount < 1) {
      countToSelect = Math.ceil(sorted.length * ratioOrCount);
    } else {
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
      const res = await competitionService.submitShortlisting({
        roundNumber: targetRound,
        qualifiedTeamIds: Array.from(selectedTeamIds),
      });
      setShowShortlistModal(false);
      setShortlistStep('SELECT');
      await refetchState();
      await refetchLogs();
      setSuccessMsg(`Successfully finalized shortlist for Round ${targetRound}: ${res.qualifiedCount} teams qualified!`);
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
      setSuccessMsg('20 demonstration teams generated successfully.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to generate demo teams');
    } finally {
      setLoadingAction(null);
    }
  };

  // Filter and sort candidate teams
  const filteredCandidates = useMemo(() => {
    let list = [...candidateTeams];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.teamName.toLowerCase().includes(q) ||
          t.teamCode.toLowerCase().includes(q) ||
          (t.institution && t.institution.toLowerCase().includes(q)),
      );
    }
    if (statusFilter !== 'ALL') {
      list = list.filter((t) => t.participationStatus === statusFilter);
    }
    if (sortBy === 'RANK') {
      list.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'SCORE_ASC') {
      list.sort((a, b) => a.score - b.score);
    } else if (sortBy === 'NAME_ASC') {
      list.sort((a, b) => a.teamName.localeCompare(b.teamName));
    }
    return list;
  }, [candidateTeams, searchQuery, statusFilter, sortBy]);

  const currentStepIndex = COMPETITION_STEPS.findIndex(
    (s) => s.status === compState?.status,
  );

  // Round summary lookups
  const r1Summary = compState?.rounds?.find((r) => r.roundNumber === 1);
  const r2Summary = compState?.rounds?.find((r) => r.roundNumber === 2);
  const r3Summary = compState?.rounds?.find((r) => r.roundNumber === 3);

  // Derived state checks for independent round progression
  const isR1Completed =
    compState?.status === 'ROUND_1_EVALUATION' ||
    compState?.status === 'ROUND_2_ACTIVE' ||
    compState?.status === 'ROUND_2_EVALUATION' ||
    compState?.status === 'ROUND_3_ACTIVE' ||
    compState?.status === 'FINAL_EVALUATION' ||
    compState?.status === 'COMPLETED';

  const isR2Completed =
    compState?.status === 'ROUND_2_EVALUATION' ||
    compState?.status === 'ROUND_3_ACTIVE' ||
    compState?.status === 'FINAL_EVALUATION' ||
    compState?.status === 'COMPLETED';

  const isR3Completed =
    compState?.status === 'FINAL_EVALUATION' || compState?.status === 'COMPLETED';

  const r2ShortlistCount = r2Summary?.eligibleCount ?? 0;
  const isR2ShortlistFinalized = r2ShortlistCount > 0;

  const r3ShortlistCount = r3Summary?.eligibleCount ?? 0;
  const isR3ShortlistFinalized = r3ShortlistCount > 0;

  return (
    <div className="min-h-screen bg-[#f8faf9] pb-16">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pt-4">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-950 flex items-center gap-3">
              <span>Competition Control Center</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                Tournament Command
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Authoritative tournament state machine, independent round orchestrators & shortlisting progression.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateDemoTeams}
              disabled={!!loadingAction}
              className="px-3.5 py-2 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Seed Demo Roster (20 Teams)</span>
            </button>

            <button
              onClick={() => setShowResetModal(true)}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-rose-50 hover:border-rose-300 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset State</span>
            </button>
          </div>
        </div>

        {/* Active Synchronized Countdown Monitor */}
        {compState?.countdown?.active && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500 text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-inner font-mono">
                {compState.countdown.remainingSeconds}
              </div>
              <div>
                <div className="font-extrabold text-sm sm:text-base text-amber-950 flex items-center gap-2">
                  <span>Synchronized Launch in Progress</span>
                  <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-mono text-[10px] font-bold">
                    Round {compState.countdown.roundNumber}
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  Eligible contestant dashboards are currently counting down. Workspaces unlock and official round timer begins at zero.
                </p>
              </div>
            </div>

            <button
              onClick={handleCancelCountdown}
              disabled={loadingAction === 'CANCEL_COUNTDOWN'}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
              <span>Cancel Countdown</span>
            </button>
          </div>
        )}

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900 text-xs shadow-2xs">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <span className="font-bold block mb-0.5">Control Action Notice</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-900 text-xs shadow-2xs">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            <div>
              <span className="font-bold block mb-0.5">Operation Succeeded</span>
              <span>{successMsg}</span>
            </div>
          </div>
        )}

        {/* SECTION A: Competition Overview & Authoritative Clock */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Live Clock & Status */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                  Server-Authoritative Clock
                </span>
                <div className="flex items-baseline gap-3">
                  <span
                    className={`text-4xl sm:text-5xl font-mono font-black tracking-wider ${
                      compState?.isPaused ? 'text-amber-600' : 'text-emerald-950'
                    }`}
                  >
                    {compState?.status.includes('ACTIVE') ? timer.formatted : '--:--:--'}
                  </span>
                  {compState?.isPaused && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                      Timer Paused
                    </span>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs font-mono font-semibold text-slate-500 uppercase block mb-1">
                  Active Tournament Phase
                </span>
                <span className="text-sm sm:text-base font-extrabold text-emerald-900 font-mono bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg inline-block">
                  {compState?.status}
                </span>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  Round: {compState?.currentRoundName || 'Standby'}
                </div>
              </div>
            </div>

            {/* Participation Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block">Total Registered</span>
                <span className="text-xl font-bold font-mono text-emerald-950">{compState?.totalTeamsCount ?? 0}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Teams</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <span className="text-[11px] font-semibold text-emerald-800 block">Current Eligible</span>
                <span className="text-xl font-bold font-mono text-emerald-900">{compState?.eligibleTeamsCount ?? 0}</span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">Teams</span>
              </div>

              <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200">
                <span className="text-[11px] font-semibold text-sky-800 block">Active In-Arena</span>
                <span className="text-xl font-bold font-mono text-sky-950">{compState?.participatingTeamsCount ?? 0}</span>
                <span className="text-[10px] text-sky-700 block mt-0.5">Teams</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                <span className="text-[11px] font-semibold text-amber-800 block">Submissions Finished</span>
                <span className="text-xl font-bold font-mono text-amber-950">{compState?.completedTeamsCount ?? 0}</span>
                <span className="text-[10px] text-amber-700 block mt-0.5">Teams</span>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Sequential Stepper Summary */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-900 font-bold flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
              <span>Progression State Machine</span>
            </h3>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {COMPETITION_STEPS.map((step, idx) => {
                const isCurrent = step.status === compState?.status;
                const isCompleted = currentStepIndex > idx;

                return (
                  <div
                    key={step.status}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                        : isCompleted
                        ? 'bg-slate-50 border-slate-200 text-slate-500'
                        : 'bg-white border-slate-100 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400">0{idx + 1}</span>
                      <span className="truncate">{step.label}</span>
                    </div>

                    {isCurrent ? (
                      <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                    ) : isCompleted ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION B: Three Independent Round Control Cards */}
        <div>
          <div className="mb-4">
            <h2 className="text-base font-bold text-emerald-950">Independent Competition Arenas</h2>
            <p className="text-xs text-slate-500">
              Each round operates independently with dedicated server countdown, progression gates, and administrative triggers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CARD 1: Round 1 — MCQ Arena */}
            <div
              className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                compState?.status === 'ROUND_1_ACTIVE'
                  ? 'bg-white border-emerald-400 shadow-md ring-2 ring-emerald-500/10'
                  : 'bg-white border-slate-200/90 shadow-2xs'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
                    R1
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                      compState?.status === 'ROUND_1_ACTIVE'
                        ? compState?.isPaused
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isR1Completed
                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                        : 'bg-slate-50 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {compState?.status === 'ROUND_1_ACTIVE'
                      ? compState?.isPaused
                        ? 'PAUSED'
                        : 'ACTIVE'
                      : isR1Completed
                      ? 'COMPLETED'
                      : 'NOT STARTED'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-emerald-950">Round 1: MCQ Arena</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    15 conceptual multiple choice questions. Individual team terminals.
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-800">
                      <span className="flex items-center gap-1 font-bold">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" /> {r1Summary?.durationMinutes ?? 30} Minutes
                      </span>
                      <span>•</span>
                      <span className="font-bold">30 Marks</span>
                    </div>
                    <button
                      onClick={() => handleOpenDurationModal(1)}
                      className="px-2 py-0.5 rounded-lg hover:bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Configure Round 1 Duration"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                {/* Round 1 Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100 font-mono">
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">Eligible</span>
                    <span className="font-bold text-slate-800">{r1Summary?.eligibleCount ?? compState?.totalTeamsCount ?? 0}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">Completed</span>
                    <span className="font-bold text-slate-800">{r1Summary?.completedCount ?? 0}</span>
                  </div>
                </div>

                {isR1Completed && (
                  <div className="p-2.5 rounded-xl bg-violet-50/70 border border-violet-200 text-xs text-violet-900 flex items-center justify-between">
                    <span className="font-medium">Shortlist for R2:</span>
                    <span className="font-mono font-bold text-violet-800">
                      {r2ShortlistCount > 0 ? `${r2ShortlistCount} Teams Finalized` : 'Pending Selection'}
                    </span>
                  </div>
                )}
              </div>

              {/* Card 1 Actions */}
              <div className="pt-6 border-t border-slate-100 space-y-2">
                {compState?.status === 'STANDBY' && (
                  <div className="space-y-2">
                    {compState?.announcedRoundNumber === 1 ? (
                      <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-mono flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Megaphone className="w-3.5 h-3.5 text-sky-600" /> Round 1 Announced
                        </span>
                        <span className="text-[10px] text-sky-600">Contestants Notified</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAnnounceRound(1)}
                        disabled={loadingAction === 'ANNOUNCE_1'}
                        className="w-full py-2 px-3 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Megaphone className="w-3.5 h-3.5 text-sky-600" />
                        <span>Announce Upcoming Round 1</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenCountdownModal(1)}
                      disabled={!!loadingAction || compState?.countdown?.active}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Round 1</span>
                    </button>
                  </div>
                )}

                {compState?.status === 'ROUND_1_ACTIVE' && (
                  <div className="space-y-2">
                    {compState.isPaused ? (
                      <button
                        onClick={() => executeControl('RESUME_ROUND')}
                        disabled={!!loadingAction}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Resume Timer</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => executeControl('PAUSE_ROUND')}
                        disabled={!!loadingAction}
                        className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause Round 1</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (window.confirm('Conclude Round 1 now? All unsent participant answers will be automatically captured and submitted.')) {
                          executeControl('END_ROUND');
                        }
                      }}
                      disabled={!!loadingAction}
                      className="w-full py-2 px-3 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>End Round 1</span>
                    </button>
                  </div>
                )}

                {isR1Completed && (
                  <button
                    onClick={() => handleOpenShortlisting(2)}
                    className="w-full py-2.5 px-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{r2ShortlistCount > 0 ? 'Edit Round 2 Shortlist' : 'Shortlist Teams for Round 2'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* CARD 2: Round 2 — Bug Hunt Arena */}
            <div
              className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                compState?.status === 'ROUND_2_ACTIVE'
                  ? 'bg-white border-emerald-400 shadow-md ring-2 ring-emerald-500/10'
                  : 'bg-white border-slate-200/90 shadow-2xs'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-800 font-bold">
                    R2
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                      compState?.status === 'ROUND_2_ACTIVE'
                        ? compState?.isPaused
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isR2Completed
                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                        : 'bg-slate-50 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {compState?.status === 'ROUND_2_ACTIVE'
                      ? compState?.isPaused
                        ? 'PAUSED'
                        : 'ACTIVE'
                      : isR2Completed
                      ? 'COMPLETED'
                      : 'NOT STARTED'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-emerald-950">Round 2: Bug Hunt Arena</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Diagnose logic flaws, edge cases & test suites in relay IDE.
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-800">
                      <span className="flex items-center gap-1 font-bold">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" /> {r2Summary?.durationMinutes ?? 40} Minutes
                      </span>
                      <span>•</span>
                      <span className="font-bold">100 Marks</span>
                    </div>
                    <button
                      onClick={() => handleOpenDurationModal(2)}
                      className="px-2 py-0.5 rounded-lg hover:bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Configure Round 2 Duration"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                {/* Progression Lock Notification */}
                {!isR1Completed ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Locked — Complete Round 1 first.</span>
                  </div>
                ) : !isR2ShortlistFinalized ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Action Required — Finalize Round 1 shortlist to unlock.</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                    <span className="font-medium">Qualified Teams:</span>
                    <span className="font-mono font-bold text-emerald-800">{r2ShortlistCount} Teams</span>
                  </div>
                )}

                {/* Round 2 Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100 font-mono">
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">Eligible</span>
                    <span className="font-bold text-slate-800">{r2ShortlistCount}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">Completed</span>
                    <span className="font-bold text-slate-800">{r2Summary?.completedCount ?? 0}</span>
                  </div>
                </div>

                {isR2Completed && (
                  <div className="p-2.5 rounded-xl bg-violet-50/70 border border-violet-200 text-xs text-violet-900 flex items-center justify-between">
                    <span className="font-medium">Shortlist for R3:</span>
                    <span className="font-mono font-bold text-violet-800">
                      {r3ShortlistCount > 0 ? `${r3ShortlistCount} Finalists Finalized` : 'Pending Selection'}
                    </span>
                  </div>
                )}
              </div>

              {/* Card 2 Actions */}
              <div className="pt-6 border-t border-slate-100 space-y-2">
                {compState?.status === 'ROUND_1_EVALUATION' && (
                  <div className="space-y-2">
                    {compState?.announcedRoundNumber === 2 ? (
                      <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-mono flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Megaphone className="w-3.5 h-3.5 text-sky-600" /> Round 2 Announced
                        </span>
                        <span className="text-[10px] text-sky-600">Qualified Teams Notified</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAnnounceRound(2)}
                        disabled={!isR2ShortlistFinalized || loadingAction === 'ANNOUNCE_2'}
                        className="w-full py-2 px-3 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Megaphone className="w-3.5 h-3.5 text-sky-600" />
                        <span>Announce Upcoming Round 2</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenCountdownModal(2)}
                      disabled={!isR2ShortlistFinalized || !!loadingAction || compState?.countdown?.active}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Round 2: Bug Hunt</span>
                    </button>
                  </div>
                )}

                {compState?.status === 'ROUND_2_ACTIVE' && (
                  <div className="space-y-2">
                    {compState.isPaused ? (
                      <button
                        onClick={() => executeControl('RESUME_ROUND')}
                        disabled={!!loadingAction}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Resume Timer</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => executeControl('PAUSE_ROUND')}
                        disabled={!!loadingAction}
                        className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause Round 2</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (window.confirm('Conclude Round 2 now? All unsent participant code drafts will be automatically captured and submitted.')) {
                          executeControl('END_ROUND');
                        }
                      }}
                      disabled={!!loadingAction}
                      className="w-full py-2 px-3 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>End Round 2</span>
                    </button>
                  </div>
                )}

                {isR2Completed && (
                  <button
                    onClick={() => handleOpenShortlisting(3)}
                    className="w-full py-2.5 px-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{r3ShortlistCount > 0 ? 'Edit Finalist Shortlist' : 'Shortlist Finalists for Round 3'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* CARD 3: Round 3 — Final Boss Coding */}
            <div
              className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                compState?.status === 'ROUND_3_ACTIVE'
                  ? 'bg-white border-emerald-400 shadow-md ring-2 ring-emerald-500/10'
                  : 'bg-white border-slate-200/90 shadow-2xs'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 font-bold">
                    R3
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                      compState?.status === 'ROUND_3_ACTIVE'
                        ? compState?.isPaused
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isR3Completed
                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                        : 'bg-slate-50 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {compState?.status === 'ROUND_3_ACTIVE'
                      ? compState?.isPaused
                        ? 'PAUSED'
                        : 'ACTIVE'
                      : isR3Completed
                      ? 'COMPLETED'
                      : 'NOT STARTED'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-emerald-950">Round 3: Final Boss</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    3 progressive algorithmic cases: 20 + 25 + 45 (+10 code quality).
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-800">
                      <span className="flex items-center gap-1 font-bold">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" /> {r3Summary?.durationMinutes ?? 60} Minutes
                      </span>
                      <span>•</span>
                      <span className="font-bold">100 Marks</span>
                    </div>
                    <button
                      onClick={() => handleOpenDurationModal(3)}
                      className="px-2 py-0.5 rounded-lg hover:bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Configure Round 3 Duration"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                {/* Progression Lock Notification */}
                {!isR2Completed ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Locked — Complete Round 2 first.</span>
                  </div>
                ) : !isR3ShortlistFinalized ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Action Required — Finalize Round 2 shortlist to unlock.</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                    <span className="font-medium">Finalist Teams:</span>
                    <span className="font-mono font-bold text-emerald-800">{r3ShortlistCount} Teams</span>
                  </div>
                )}

                {/* Round 3 Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100 font-mono">
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">Finalists</span>
                    <span className="font-bold text-slate-800">{r3ShortlistCount}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">Completed</span>
                    <span className="font-bold text-slate-800">{r3Summary?.completedCount ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Card 3 Actions */}
              <div className="pt-6 border-t border-slate-100 space-y-2">
                {compState?.status === 'ROUND_2_EVALUATION' && (
                  <div className="space-y-2">
                    {compState?.announcedRoundNumber === 3 ? (
                      <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-mono flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Megaphone className="w-3.5 h-3.5 text-sky-600" /> Round 3 Announced
                        </span>
                        <span className="text-[10px] text-sky-600">Finalists Notified</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAnnounceRound(3)}
                        disabled={!isR3ShortlistFinalized || loadingAction === 'ANNOUNCE_3'}
                        className="w-full py-2 px-3 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Megaphone className="w-3.5 h-3.5 text-sky-600" />
                        <span>Announce Upcoming Round 3</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenCountdownModal(3)}
                      disabled={!isR3ShortlistFinalized || !!loadingAction || compState?.countdown?.active}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Round 3: Final Boss</span>
                    </button>
                  </div>
                )}

                {compState?.status === 'ROUND_3_ACTIVE' && (
                  <div className="space-y-2">
                    {compState.isPaused ? (
                      <button
                        onClick={() => executeControl('RESUME_ROUND')}
                        disabled={!!loadingAction}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Resume Timer</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => executeControl('PAUSE_ROUND')}
                        disabled={!!loadingAction}
                        className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause Round 3</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (window.confirm('Conclude Round 3 now? All unsent participant code drafts will be automatically captured and submitted.')) {
                          executeControl('END_ROUND');
                        }
                      }}
                      disabled={!!loadingAction}
                      className="w-full py-2 px-3 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>End Round 3</span>
                    </button>
                  </div>
                )}

                {compState?.status === 'FINAL_EVALUATION' && (
                  <button
                    onClick={() => {
                      if (window.confirm('Officially conclude the competition and publish winner placements?')) {
                        executeControl('COMPLETE_COMPETITION');
                      }
                    }}
                    disabled={!!loadingAction}
                    className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                    <span>Complete Competition & Publish</span>
                  </button>
                )}

                {compState?.status === 'COMPLETED' && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center font-bold text-xs text-emerald-800 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Tournament Successfully Concluded</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION D: Server Audit Trail & Transition Log */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-950 font-bold">
                Server Audit Trail & Transition Log
              </h3>
              <p className="text-xs text-slate-500">Live sequential audit trail of administrative state transitions.</p>
            </div>
            <button
              onClick={() => refetchLogs()}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
              title="Refresh logs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {activityLogs && activityLogs.length > 0 ? (
              activityLogs.map((log) => (
                <div key={log.id} className="py-2.5 text-xs flex items-center justify-between gap-4 font-mono">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                      {log.action}
                    </span>
                    <span className="font-sans text-xs text-slate-800">{log.description}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">
                No competition events recorded yet.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* SECTION C: Administrator-Controlled Team Shortlisting Interface Modal */}
      {showShortlistModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[92vh]">
            {shortlistStep === 'SELECT' ? (
              <>
                {/* Modal Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-600" />
                      <span>
                        Shortlist Teams for Round {targetRound}: {targetRound === 2 ? 'Bug Hunt Arena' : 'Final Boss Coding'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      <strong>Administrator Selection Mode:</strong> Check the boxes next to the teams you wish to qualify. Unselected teams will be marked ineligible for Round {targetRound}.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowShortlistModal(false)}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                {/* Filter & Search Toolbar */}
                <div className="py-3.5 space-y-3 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search by team or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white transition"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={statusFilter}
                        onChange={(e: any) => setStatusFilter(e.target.value)}
                        className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 bg-white"
                      >
                        <option value="ALL">All Submissions</option>
                        <option value="SUBMITTED">Submitted</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="NOT_STARTED">Not Started</option>
                      </select>

                      <select
                        value={sortBy}
                        onChange={(e: any) => setSortBy(e.target.value)}
                        className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 bg-white"
                      >
                        <option value="RANK">Sort: Highest Score</option>
                        <option value="SCORE_ASC">Sort: Lowest Score</option>
                        <option value="NAME_ASC">Sort: Team Name (A-Z)</option>
                      </select>
                    </div>
                  </div>

                  {/* Quick Select Buttons & Counters */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">Quick Helpers:</span>
                      <button
                        onClick={() => handleSelectAllFiltered(filteredCandidates.map((t) => t.teamId))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs transition"
                      >
                        Select All Filtered
                      </button>
                      <button
                        onClick={() => handleDeselectAllFiltered(filteredCandidates.map((t) => t.teamId))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs transition"
                      >
                        Deselect All
                      </button>
                      {targetRound === 2 ? (
                        <button
                          onClick={() => handleAutoSelectTop(0.5)}
                          className="px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition"
                        >
                          Top 50% by Score
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAutoSelectTop(6)}
                          className="px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition"
                        >
                          Top 6 Finalists
                        </button>
                      )}
                    </div>

                    <div className="font-mono font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                      {selectedTeamIds.size} of {candidateTeams.length} Teams Selected
                    </div>
                  </div>
                </div>

                {/* Candidate Teams Table */}
                <div className="flex-1 overflow-y-auto py-2">
                  {shortlistLoading ? (
                    <div className="py-16 text-center text-xs text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                      <span>Loading candidate teams...</span>
                    </div>
                  ) : filteredCandidates.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-400">
                      No candidate teams matched the filter.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="text-[10px] uppercase font-mono text-slate-500 border-b border-slate-200 sticky top-0 bg-white shadow-2xs">
                        <tr>
                          <th className="py-2.5 px-3">Qualify</th>
                          <th className="py-2.5 px-3">Rank & Code</th>
                          <th className="py-2.5 px-3">Team & Institution</th>
                          <th className="py-2.5 px-3">Contestants</th>
                          <th className="py-2.5 px-3">Submission</th>
                          <th className="py-2.5 px-3 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCandidates.map((team) => {
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
                              className={`cursor-pointer transition ${
                                isSelected ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-3 px-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // handled by row click
                                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-emerald-900">
                                #{team.rank} {team.teamCode}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900">{team.teamName}</div>
                                <div className="text-[10px] text-slate-500">{team.institution || '—'}</div>
                              </td>
                              <td className="py-3 px-3 text-[11px] text-slate-600">
                                {team.participants.map((p) => p.fullName).join(', ') || '—'}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                    team.participationStatus === 'SUBMITTED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : team.participationStatus === 'IN_PROGRESS'
                                      ? 'bg-sky-100 text-sky-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {team.participationStatus}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-800 text-sm">
                                {team.score} pts
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {selectedTeamIds.size} teams selected for Round {targetRound}.
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowShortlistModal(false)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() => setShortlistStep('CONFIRM')}
                      disabled={shortlistLoading || selectedTeamIds.size === 0}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Review & Finalize Shortlist ({selectedTeamIds.size})</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Confirmation Step */
              <div className="flex flex-col h-full space-y-4">
                <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span>Review & Confirm Round {targetRound} Shortlist</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Verify qualified team selections below before committing progression.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowShortlistModal(false)}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="text-[10px] font-mono uppercase text-emerald-700 font-bold">Qualifying Teams</div>
                    <div className="text-2xl font-black text-emerald-900 mt-0.5">{selectedTeamIds.size}</div>
                    <div className="text-[10px] text-emerald-600 mt-0.5">Will be marked ELIGIBLE</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                    <div className="text-[10px] font-mono uppercase text-rose-700 font-bold">Eliminated Teams</div>
                    <div className="text-2xl font-black text-rose-900 mt-0.5">{candidateTeams.length - selectedTeamIds.size}</div>
                    <div className="text-[10px] text-rose-600 mt-0.5">Will be marked INELIGIBLE</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-mono uppercase text-slate-600 font-bold">Total Candidates</div>
                    <div className="text-2xl font-black text-slate-900 mt-0.5">{candidateTeams.length}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Evaluated from prior round</div>
                  </div>
                </div>

                {/* Qualified Teams Review List */}
                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                    Qualified Teams ({selectedTeamIds.size}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {candidateTeams
                      .filter((t) => selectedTeamIds.has(t.teamId))
                      .sort((a, b) => b.score - a.score)
                      .map((team, idx) => (
                        <div
                          key={team.teamId}
                          className="p-2.5 rounded-lg bg-white border border-emerald-200 shadow-2xs flex items-center justify-between text-xs"
                        >
                          <div className="truncate pr-2">
                            <div className="font-bold text-slate-900 truncate">
                              <span className="text-emerald-700 font-mono font-bold mr-1">#{idx + 1}</span>
                              {team.teamName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {team.teamCode} • {team.institution || 'No Institution'}
                            </div>
                          </div>
                          <div className="text-right font-mono font-bold text-emerald-800 shrink-0">
                            {team.score} pts
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                  <strong>Notice:</strong> Confirming will mark {selectedTeamIds.size} teams as ELIGIBLE for Round {targetRound} and update competition state. This modal will automatically close and refresh the control dashboard.
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <button
                    onClick={() => setShortlistStep('SELECT')}
                    disabled={shortlistLoading}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    ← Back to Selection
                  </button>

                  <button
                    onClick={handleCommitShortlist}
                    disabled={shortlistLoading || selectedTeamIds.size === 0}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{shortlistLoading ? 'Finalizing Progression...' : `Confirm & Unlock Round ${targetRound}`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Duration Configuration */}
      {durationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Configure Round {durationTargetRound} Duration</span>
              </h3>
              <button
                onClick={() => setDurationModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Default competition duration: <strong>{durationTargetRound === 1 ? '30' : durationTargetRound === 2 ? '40' : '60'} minutes</strong>.
              Enter the duration in minutes for Round {durationTargetRound}.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={durationInputMinutes}
                  onChange={(e) => setDurationInputMinutes(Math.max(1, Math.min(240, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Acceptable range: 1 to 240 minutes.
                </span>
              </div>

              {compState?.status === `ROUND_${durationTargetRound}_ACTIVE` && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Live Round Adjustment Warning</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Round {durationTargetRound} is currently LIVE. Changing duration will dynamically extend or shorten the live round deadline for all active contestants.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-950 pt-1">
                    <input
                      type="checkbox"
                      checked={durationConfirmLive}
                      onChange={(e) => setDurationConfirmLive(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>I confirm adjusting the running timer</span>
                  </label>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setDurationModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDuration}
                disabled={durationSaving || (compState?.status === `ROUND_${durationTargetRound}_ACTIVE` && !durationConfirmLive)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {durationSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Save Duration</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Synchronized Countdown Launch */}
      {countdownModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-600 fill-current" />
                <span>Launch Round {countdownTargetRound} Countdown</span>
              </h3>
              <button
                onClick={() => setCountdownModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              When started, all eligible contestant dashboards display a server-synchronized countdown (5 $\to$ 4 $\to$ 3 $\to$ 2 $\to$ 1 $\to$ GO!).
              At zero, the round becomes LIVE, workspaces unlock, and the official {compState?.rounds?.find(r => r.roundNumber === countdownTargetRound)?.durationMinutes ?? (countdownTargetRound === 1 ? 30 : countdownTargetRound === 2 ? 40 : 60)}-minute timer begins.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Countdown Duration
              </label>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setCountdownDurationSecs(5)}
                  className={`p-3 rounded-xl border text-center transition font-mono ${
                    countdownDurationSecs === 5
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-lg font-black font-mono">5s</div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">Recommended</div>
                </button>
                <button
                  type="button"
                  onClick={() => setCountdownDurationSecs(10)}
                  className={`p-3 rounded-xl border text-center transition font-mono ${
                    countdownDurationSecs === 10
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-lg font-black font-mono">10s</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Extended</div>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setCountdownModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunchCountdown}
                disabled={countdownLaunching}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {countdownLaunching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Launch Synchronized Countdown</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: State Reset */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Reset Tournament State Machine</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Resets competition progression back to <strong>STANDBY</strong>. Select reset scope:
            </p>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70">
                <input
                  type="radio"
                  name="resetType"
                  value="DEMO_ONLY"
                  checked={resetType === 'DEMO_ONLY'}
                  onChange={() => setResetType('DEMO_ONLY')}
                  className="text-emerald-600"
                />
                <div>
                  <span className="font-bold text-slate-800 block">Reset Demo Teams Only</span>
                  <span className="text-slate-500 text-[11px]">
                    Deletes simulated demo teams while preserving genuine registered teams.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70">
                <input
                  type="radio"
                  name="resetType"
                  value="FULL_RESET"
                  checked={resetType === 'FULL_RESET'}
                  onChange={() => setResetType('FULL_RESET')}
                  className="text-rose-600"
                />
                <div>
                  <span className="font-bold text-rose-700 block">Full Progress Reset</span>
                  <span className="text-slate-500 text-[11px]">
                    Resets round progress and eligibility for all teams back to STANDBY.
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  executeControl('RESET_COMPETITION', { resetType });
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs"
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