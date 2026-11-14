import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  useTeamCompetitionStatus,
  useServerTimer,
  useCompetitionState,
  useSynchronizedCountdown,
} from '../../hooks/useCompetition';
import { announcementService } from '../../services/announcement.service';
import { competitionService } from '../../services/competition.service';
import {
  AnnouncementItem,
  LeaderboardResponseDto,
  CompetitionRoundCardItem,
} from '@ignitron/shared';
import {
  Users,
  Building,
  Radio,
  Clock,
  Award,
  Lock,
  Megaphone,
  Trophy,
  CheckCircle2,
  XCircle,
  FileCode,
  ArrowRight,
  X,
} from 'lucide-react';

export const TeamDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: teamStatus } = useTeamCompetitionStatus(!!user);
  const { data: compState } = useCompetitionState();
  const countdown = useSynchronizedCountdown(compState?.countdown);

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

  const [leaderboard, setLeaderboard] = useState<LeaderboardResponseDto | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  const storageKey = `ignitron_dismissed_announcements_${user?.id || 'team'}`;
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleDismissAnnouncement = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save dismissed announcement to localStorage', e);
    }
  };

  const timer = useServerTimer(
    teamStatus?.deadlineAt,
    teamStatus?.isPaused || false,
    teamStatus?.remainingDurationSeconds,
  );

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setLoadingAnnouncements(true);
        const data = await announcementService.getPublishedAnnouncements();
        setAnnouncements(data);
      } catch (err) {
        console.error('Failed to load published announcements', err);
      } finally {
        setLoadingAnnouncements(false);
      }
    };

    const loadLeaderboard = async () => {
      try {
        setLoadingLeaderboard(true);
        const data = await competitionService.getLeaderboard();
        setLeaderboard(data);
      } catch (err) {
        console.error('Failed to load published leaderboard', err);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    loadAnnouncements();
    loadLeaderboard();

    // Real-time polling for new broadcast announcements
    const interval = setInterval(loadAnnouncements, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!user || user.type !== 'TEAM') {
    return null;
  }

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'LOW':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  const getEffectiveParticipantStatus = (card: CompetitionRoundCardItem): string => {
    if (card.status && card.status !== 'UPCOMING') {
      return card.status;
    }
    // Fallback if older payload or UPCOMING
    if (card.teamEligibility === 'INELIGIBLE') return 'NOT_QUALIFIED';
    if (card.participationStatus === 'SUBMITTED') return 'SUBMITTED';
    return 'LOCKED';
  };

  const getRoundStatusBadge = (card: CompetitionRoundCardItem) => {
    const status = getEffectiveParticipantStatus(card);

    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'AVAILABLE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-teal-50 text-teal-800 border border-teal-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            Available
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-50 text-blue-800 border border-blue-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            Submitted
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-slate-500" />
            Completed
          </span>
        );
      case 'NOT_QUALIFIED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-500" />
            Not Qualified
          </span>
        );
      case 'LOCKED':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            Locked
          </span>
        );
    }
  };

  // 3 fallback round cards if backend hasn't generated them yet
  const defaultRoundCards: CompetitionRoundCardItem[] = [
    {
      roundNumber: 1,
      name: 'Round 1: MCQ Arena',
      description: 'Rapid-fire screening covering CS fundamentals, DSA, and systems knowledge.',
      durationMinutes: 30,
      maximumMarks: 30,
      status: 'UPCOMING',
      teamEligibility: 'ELIGIBLE',
      participationStatus: 'NOT_STARTED',
      isCurrent: false,
    },
    {
      roundNumber: 2,
      name: 'Round 2: Bug Hunt Arena',
      description: 'Analyze faulty codebases, pinpoint runtime flaws, and submit clean bug fixes.',
      durationMinutes: 40,
      maximumMarks: 100,
      status: 'UPCOMING',
      teamEligibility: 'PENDING',
      participationStatus: 'NOT_STARTED',
      isCurrent: false,
    },
    {
      roundNumber: 3,
      name: 'Round 3: Final Boss Coding',
      description: 'Tackle advanced competitive programming challenges in the full CodeMirror workspace.',
      durationMinutes: 60,
      maximumMarks: 100,
      status: 'UPCOMING',
      teamEligibility: 'PENDING',
      participationStatus: 'NOT_STARTED',
      isCurrent: false,
    },
  ];

  const baseRoundCards =
    teamStatus?.roundCards && teamStatus.roundCards.length > 0
      ? teamStatus.roundCards
      : defaultRoundCards;

  const roundCards = baseRoundCards.map((card) => {
    const serverRound = compState?.rounds?.find((r) => r.roundNumber === card.roundNumber);
    return {
      ...card,
      durationMinutes: serverRound?.durationMinutes ?? card.durationMinutes,
    };
  });

  const participants = teamStatus?.participants || [];
  const participantA = participants[0];
  const participantB = participants[1];

  // Pre-round announcement check
  const announcedRoundNum = compState?.announcedRoundNumber;
  const announcedRoundCard = announcedRoundNum
    ? roundCards.find((r) => r.roundNumber === announcedRoundNum)
    : null;
  const isTeamEligibleForAnnounced =
    announcedRoundNum === 1 || announcedRoundCard?.teamEligibility === 'ELIGIBLE';

  // Synchronized countdown check
  const isCountdownActive = Boolean(compState?.countdown?.active);
  const countdownRoundNum = compState?.countdown?.roundNumber ?? 1;
  const isCountdownEligible =
    countdownRoundNum === 1 ||
    roundCards.find((r) => r.roundNumber === countdownRoundNum)?.teamEligibility === 'ELIGIBLE';

  // Dismissible Popups (Change 5)
  const activeUnreadAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.id),
  );
  const currentPopupAnnouncement = activeUnreadAnnouncements[0] || null;

  return (
    <div className="min-h-screen bg-[#f8faf9] pb-16">
      {/* Synchronized Countdown High-Priority Overlay */}
      {isCountdownActive && isCountdownEligible && (
        <div className="fixed inset-0 z-50 bg-[#010905]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
          <div className="max-w-md w-full flex flex-col items-center space-y-6">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold uppercase tracking-wider">
              Synchronized Launch Sequence
            </span>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Round {countdownRoundNum}: {roundCards.find((r) => r.roundNumber === countdownRoundNum)?.name}
            </h2>

            {/* Giant Pulsing Countdown Number */}
            <div className="w-36 h-36 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/50 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.3)]">
              <span className="font-mono text-7xl font-black text-emerald-400 animate-pulse">
                {countdown.secondsRemaining > 0 ? countdown.secondsRemaining : 'GO!'}
              </span>
            </div>

            <p className="text-xs text-emerald-200/70 max-w-xs leading-relaxed">
              Workspaces will unlock automatically when the counter hits zero. Please do not close or navigate away from this window.
            </p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Pre-Round Preparation Alert Banner */}
        {announcedRoundNum && isTeamEligibleForAnnounced && !isCountdownActive && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-emerald-900/60 to-teal-950/80 border-2 border-emerald-500/60 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                <Megaphone className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="font-black text-base text-white flex items-center gap-2">
                  <span>GET READY! Round {announcedRoundNum} is About to Begin</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-mono text-[10px] uppercase font-bold border border-emerald-400/40">
                    Pre-Round Notice
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  The administrator has signaled preparation for <strong>{announcedRoundCard?.name}</strong> ({announcedRoundCard?.durationMinutes} minutes). Ensure both relay participants are present.
                </p>
              </div>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-900/70 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold whitespace-nowrap">
              Standby for Countdown
            </div>
          </div>
        )}
        {/* Official Tournament Winner Banner */}
        {(leaderboard as any)?.winnerTeam && (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-emerald-500/15 border-2 border-amber-400 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5 animate-in fade-in">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white shadow-md shrink-0">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    Official Champion of IGNITRON 2K26
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Declared {new Date((leaderboard as any).winnerTeam.declaredAt).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                  <span>{(leaderboard as any).winnerTeam.teamName}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                    {(leaderboard as any).winnerTeam.teamCode}
                  </span>
                </h2>
                <div className="text-xs text-slate-600 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{(leaderboard as any).winnerTeam.institution || 'Verified College'}</span>
                  </span>
                  {(leaderboard as any).winnerTeam.participants && (
                    <span className="text-slate-500">
                      &bull; Team: {(leaderboard as any).winnerTeam.participants.join(', ')}
                    </span>
                  )}
                </div>
                {(leaderboard as any).winnerTeam.notes && (
                  <p className="text-xs text-amber-900 italic mt-1 bg-amber-50/80 p-2 rounded-xl border border-amber-200/80">
                    "{(leaderboard as any).winnerTeam.notes}"
                  </p>
                )}
              </div>
            </div>

            <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-amber-200">
              <span className="text-[10px] uppercase font-mono tracking-wider text-amber-900 font-bold">
                Grand Cumulative Score
              </span>
              <span className="text-3xl font-black font-mono text-emerald-900">
                {(leaderboard as any).winnerTeam.totalScore} <span className="text-sm font-bold text-emerald-700">pts</span>
              </span>
            </div>
          </div>
        )}

        {/* Section E: Live Tournament State & Concurrency Banner */}
        {teamStatus && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                  Official Tournament Status
                </span>
                <h2 className="text-lg font-bold text-emerald-950">
                  {teamStatus.competitionStatus === 'STANDBY'
                    ? 'Standby Mode — Awaiting Round 1 Commencement'
                    : teamStatus.competitionStatus.includes('ACTIVE')
                    ? `Live: ${teamStatus.currentRound?.name || 'Round in Progress'}`
                    : teamStatus.competitionStatus.includes('EVALUATION')
                    ? 'Round Evaluation & Shortlisting Underway'
                    : 'Competition Concluded'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Single-terminal relay concurrency active. Exactly one participant terminal can operate simultaneously.
                </p>
              </div>
            </div>

            {teamStatus.competitionStatus.includes('ACTIVE') && (
              <div className="flex items-center gap-4 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/80">
                <div className="font-mono text-right">
                  <span className="text-[10px] uppercase text-emerald-800 font-bold block">
                    Server Countdown
                  </span>
                  <span className="text-xl font-black text-emerald-950">
                    {timer.formatted}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section A: Team Information Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-emerald-950">
                Team Profile & Contestants
              </h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
              Verified Roster
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Participant A Card */}
            <div className={`p-5 rounded-2xl border transition-all ${
              user.activeParticipant.id === participantA?.id
                ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-500/20 shadow-2xs'
                : 'bg-slate-50/70 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-wider">
                  Participant A
                </span>
                {user.activeParticipant.id === participantA?.id ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Currently Authenticated
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">
                    Relay Partner
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="text-base font-bold text-emerald-950">
                  {participantA?.fullName || user.activeParticipant.fullName}
                </div>
                <div className="text-xs text-slate-600 font-mono">
                  {participantA?.email || user.activeParticipant.email}
                </div>
                {participantA?.phone && (
                  <div className="text-[11px] text-slate-500 font-mono">
                    Phone: {participantA.phone}
                  </div>
                )}
                {participantA?.studentId && (
                  <div className="text-[11px] text-slate-500 font-mono">
                    ID / Roll: {participantA.studentId}
                  </div>
                )}
              </div>
            </div>

            {/* Participant B Card */}
            <div className={`p-5 rounded-2xl border transition-all ${
              participantB && user.activeParticipant.id === participantB.id
                ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-500/20 shadow-2xs'
                : 'bg-slate-50/70 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-wider">
                  Participant B
                </span>
                {participantB && user.activeParticipant.id === participantB.id ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Currently Authenticated
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">
                    Relay Partner
                  </span>
                )}
              </div>

              {participantB ? (
                <div className="space-y-1.5">
                  <div className="text-base font-bold text-emerald-950">
                    {participantB.fullName}
                  </div>
                  <div className="text-xs text-slate-600 font-mono">
                    {participantB.email}
                  </div>
                  {participantB.phone && (
                    <div className="text-[11px] text-slate-500 font-mono">
                      Phone: {participantB.phone}
                    </div>
                  )}
                  {participantB.studentId && (
                    <div className="text-[11px] text-slate-500 font-mono">
                      ID / Roll: {participantB.studentId}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-mono py-4">
                  Registered teammate details stored in tournament database.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section B: Competition Status & 3 Round Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-emerald-950">
                Official Tournament Arenas
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              3 Sequential Elimination Stages
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roundCards.map((card) => {
              const effStatus = getEffectiveParticipantStatus(card);
              const canEnter =
                (effStatus === 'AVAILABLE' || effStatus === 'ACTIVE') &&
                !teamStatus?.isPaused;
              const canViewReview = effStatus === 'SUBMITTED' || effStatus === 'COMPLETED';

              return (
                <div
                  key={card.roundNumber}
                  className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                    effStatus === 'ACTIVE'
                      ? 'bg-white border-emerald-400 ring-2 ring-emerald-500/20 shadow-md'
                      : effStatus === 'AVAILABLE'
                      ? 'bg-white border-teal-300 ring-1 ring-teal-400/20 shadow-xs'
                      : effStatus === 'SUBMITTED'
                      ? 'bg-blue-50/20 border-blue-200 shadow-xs'
                      : effStatus === 'COMPLETED'
                      ? 'bg-white border-slate-200 shadow-xs'
                      : effStatus === 'NOT_QUALIFIED'
                      ? 'bg-rose-50/40 border-rose-200 shadow-xs'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-wider">
                        Stage 0{card.roundNumber}
                      </span>
                      {getRoundStatusBadge(card)}
                    </div>

                    <h3 className="text-lg font-bold text-emerald-950">
                      {card.name}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {card.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-mono text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{card.durationMinutes} Minutes</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        <span>{card.maximumMarks} Marks</span>
                      </div>
                    </div>

                    {card.isScorePublished && card.score !== null && card.score !== undefined && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-mono font-bold">
                        Published Round Score: {card.score} pts
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    {canEnter ? (
                      <button
                        onClick={() =>
                          navigate(
                            card.roundNumber === 1
                              ? '/team/arena/mcq'
                              : `/team/workspace?round=${card.roundNumber}`,
                          )
                        }
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                      >
                        <FileCode className="w-4 h-4" />
                        <span>
                          {effStatus === 'ACTIVE'
                            ? 'Resume Arena'
                            : card.roundNumber === 1
                            ? 'Enter MCQ Arena'
                            : 'Launch Arena Workspace'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : canViewReview ? (
                      <button
                        onClick={() =>
                          navigate(
                            card.roundNumber === 1
                              ? '/team/arena/mcq'
                              : `/team/workspace?round=${card.roundNumber}`,
                          )
                        }
                        className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 text-center transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {effStatus === 'SUBMITTED'
                            ? 'Submitted — View Work'
                            : 'Concluded — View Arena'}
                        </span>
                      </button>
                    ) : (
                      <div className="w-full py-2 px-3 rounded-xl bg-slate-100 text-slate-400 font-semibold text-xs flex items-center justify-center gap-2 text-center select-none">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {effStatus === 'NOT_QUALIFIED'
                            ? 'Locked — Not Qualified'
                            : 'Inactive — Locked by Admin'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2-Column: Section C: Published Announcements & Section D: Published Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section C: Announcements */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                  <Megaphone className="w-4 h-4 text-emerald-600" />
                  <span>Official Announcements ({announcements.length})</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Verified Broadcasts
                </span>
              </div>

              {loadingAnnouncements ? (
                <div className="p-8 text-center text-xs font-mono text-slate-400">
                  Checking for live announcements...
                </div>
              ) : announcements.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">No active announcements broadcast.</p>
                  <p className="text-[11px] text-slate-400">Admin briefings will appear here in real time.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {announcements.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-slate-50/70 transition-colors space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${getPriorityBadge(
                            item.priority,
                          )}`}
                        >
                          {item.priority}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-emerald-950">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {item.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section D: Leaderboard */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                  <Trophy className="w-4 h-4 text-emerald-600" />
                  <span>Competition Leaderboard</span>
                </div>
                {leaderboard?.isPublished ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Published
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                    Confidential
                  </span>
                )}
              </div>

              {loadingLeaderboard ? (
                <div className="p-8 text-center text-xs font-mono text-slate-400">
                  Retrieving official standings...
                </div>
              ) : !leaderboard || !leaderboard.isPublished ? (
                /* Leaderboard NOT published - strictly hide scores & show informative placeholder */
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">
                      Leaderboard Will Be Released by Administrators
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      Official scores and tournament rankings remain confidential during live evaluation. Results will be published once verified by the panel.
                    </p>
                  </div>
                </div>
              ) : leaderboard.entries.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Trophy className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">No leaderboard entries published yet.</p>
                </div>
              ) : (
                /* Leaderboard published - display ranked list */
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {leaderboard.entries.map((entry) => {
                    const isMyTeam = entry.teamCode === user.teamCode;
                    return (
                      <div
                        key={entry.teamCode || entry.teamName}
                        className={`p-3.5 flex items-center justify-between text-xs transition-colors ${
                          isMyTeam ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
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
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                              <span>{entry.teamName}</span>
                              {isMyTeam && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                                  Your Team
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {entry.institution || 'Verified College'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono font-black text-sm text-emerald-700">
                          {entry.score} pts
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Dismissible Announcement Popup (Change 5) */}
      {currentPopupAnnouncement && (
        <aside
          role="alert"
          aria-live="assertive"
          className="fixed bottom-6 right-6 z-50 max-w-md w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div
            className={`rounded-2xl p-5 shadow-2xl border backdrop-blur-md text-left relative ${
              currentPopupAnnouncement.priority === 'URGENT'
                ? 'bg-rose-950/95 border-rose-500/80 text-white shadow-rose-900/30 ring-2 ring-rose-500/40'
                : currentPopupAnnouncement.priority === 'HIGH'
                ? 'bg-amber-950/95 border-amber-500/80 text-white shadow-amber-900/30 ring-2 ring-amber-500/40'
                : 'bg-emerald-950/95 border-emerald-500/80 text-white shadow-emerald-900/30'
            }`}
          >
            {/* Header: Priority + Category + Dismiss (X) */}
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentPopupAnnouncement.priority === 'URGENT'
                      ? 'bg-rose-400 animate-ping'
                      : currentPopupAnnouncement.priority === 'HIGH'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-emerald-400'
                  }`}
                />
                <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/10 border border-white/20">
                  {currentPopupAnnouncement.priority} ANNOUNCEMENT
                </span>
                {activeUnreadAnnouncements.length > 1 && (
                  <span className="text-[10px] font-mono text-white/70">
                    (1 of {activeUnreadAnnouncements.length})
                  </span>
                )}
              </div>

              <button
                onClick={() => handleDismissAnnouncement(currentPopupAnnouncement.id)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Dismiss announcement"
                title="Dismiss announcement"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Message */}
            <div className="space-y-1.5 pr-4">
              <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>{currentPopupAnnouncement.title}</span>
              </h4>
              <p className="text-xs text-white/90 leading-relaxed whitespace-pre-line line-clamp-4">
                {currentPopupAnnouncement.message}
              </p>
            </div>

            {/* Footer: Timestamp & Dismiss Action */}
            <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/10 text-[11px]">
              <span className="text-white/60 font-mono">
                {new Date(currentPopupAnnouncement.createdAt).toLocaleTimeString()}
              </span>
              <button
                onClick={() => handleDismissAnnouncement(currentPopupAnnouncement.id)}
                className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
