import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  useTeamCompetitionStatus,
  useServerTimer,
} from '../../hooks/useCompetition';
import {
  ShieldCheck,
  UserCheck,
  Award,
  Clock,
  Radio,
  FileCode,
  XCircle,
} from 'lucide-react';

export const TeamDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { data: teamStatus } = useTeamCompetitionStatus(!!user);

  const timer = useServerTimer(
    teamStatus?.deadlineAt,
    teamStatus?.isPaused || false,
    teamStatus?.remainingDurationSeconds,
  );

  if (!user || user.type !== 'TEAM') {
    return null;
  }

  const renderStatusBanner = () => {
    if (!teamStatus) return null;
    const status = teamStatus.competitionStatus;

    if (status === 'STANDBY') {
      return (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
          <Clock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">Competition in Standby</span>
            <span>The tournament has not officially commenced. Verify team details and review the official rules while waiting for Round 1.</span>
          </div>
        </div>
      );
    }

    if (status.includes('ACTIVE')) {
      if (teamStatus.isEligible) {
        return (
          <div className="p-5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-emerald-300">
            <div className="flex items-start gap-3">
              <Radio className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-bold text-white text-sm block">
                  Active Arena: {teamStatus.currentRound?.name}
                </span>
                <span className="text-emerald-200">
                  Your team is ELIGIBLE. The official server countdown is running.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="font-mono text-right">
                <span className="text-[10px] uppercase text-emerald-400 block font-semibold">Remaining</span>
                <span className="text-xl font-bold text-white">{timer.formatted}</span>
              </div>

              <Link
                to="/workspace-preview"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <FileCode className="w-4 h-4" />
                <span>Launch Workspace Preview</span>
              </Link>
            </div>
          </div>
        );
      } else {
        return (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-3 text-xs text-rose-300">
            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-200 text-sm block mb-0.5">
                Round Progression Status: Not Eligible
              </span>
              <span>Your team has not qualified for {teamStatus.currentRound?.name || 'this round'}. Thank you for your participation and sportsmanship.</span>
            </div>
          </div>
        );
      }
    }

    if (status.includes('EVALUATION')) {
      return (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 flex items-start gap-3 text-xs text-amber-300">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">Round Evaluation & Shortlisting in Progress</span>
            <span>The current round has concluded. The evaluation panel is tallying results and conducting shortlisting for the next round.</span>
          </div>
        </div>
      );
    }

    if (status === 'COMPLETED') {
      return (
        <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800/60 flex items-start gap-3 text-xs text-sky-300">
          <Award className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">Competition Concluded</span>
            <span>All official rounds of IGNITRON 2K26 Code Relay have completed. Final results and award ceremonies have concluded.</span>
          </div>
        </div>
      );
    }

    return null;
  };

  const rounds = [
    {
      num: 1,
      title: 'MCQ Arena',
      desc: 'Rapid-fire algorithmic and systems knowledge assessment',
      duration: '30 mins',
      marks: '30 pts',
    },
    {
      num: 2,
      title: 'Bug Hunt Arena',
      desc: 'Identify and repair bugs in flawed production codebases',
      duration: '40 mins',
      marks: '100 pts',
    },
    {
      num: 3,
      title: 'Final Boss Coding',
      desc: 'High-complexity competitive algorithmic challenge',
      duration: '60 mins',
      marks: '100 pts',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Team Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-sky-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-sky-500/10 text-sky-400 border border-sky-500/30">
                Official Contestant Team
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Session Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>{user.teamName}</span>
              <span className="text-lg font-mono text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-lg border border-sky-500/20">
                {user.teamCode}
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {user.institution || 'University Affiliation Verified'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Active Relay Participant
              </div>
              <div className="text-sm font-semibold text-white">
                {user.activeParticipant.fullName}
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                {user.activeParticipant.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Competition Status Banner */}
      {renderStatusBanner()}

      {/* Strict Concurrency Policy Reminder Alert */}
      <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-800/50 flex items-start gap-3 text-xs text-sky-200">
        <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-sky-300 block">
            Single-Participant Relay Concurrency Active
          </span>
          <p className="text-slate-300 leading-relaxed">
            Competition rules enforce exactly one active participant terminal per team. Your teammate cannot log in while you are actively authenticated. Remember to click <strong>Log Out</strong> before handoffs.
          </p>
        </div>
      </div>

      {/* Competition Rounds Progression Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Official Competition Rounds & Eligibility</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Server Authoritative
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rounds.map((round) => {
            const history = teamStatus?.roundHistory.find(
              (h) => h.roundNumber === round.num,
            );
            const isCurrent = teamStatus?.currentRound?.roundNumber === round.num;

            return (
              <div
                key={round.num}
                className={`p-5 rounded-xl border flex flex-col justify-between transition-colors ${
                  isCurrent
                    ? 'bg-sky-500/10 border-sky-500/40 shadow-lg shadow-sky-500/10'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-sky-400">
                      ROUND 0{round.num}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
                      history?.eligibilityStatus === 'ELIGIBLE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : history?.eligibilityStatus === 'INELIGIBLE'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : isCurrent && teamStatus?.isEligible
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {history?.eligibilityStatus || (isCurrent && teamStatus?.isEligible ? 'ELIGIBLE' : 'PENDING')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    {round.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {round.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {round.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500/70" />
                    {round.marks}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
