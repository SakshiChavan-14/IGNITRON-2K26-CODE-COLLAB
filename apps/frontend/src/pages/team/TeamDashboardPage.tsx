import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  UserCheck,
  Award,
  Clock,
  Terminal,
} from 'lucide-react';

export const TeamDashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (!user || user.type !== 'TEAM') {
    return null;
  }

  const rounds = [
    {
      num: 1,
      title: 'MCQ Arena',
      desc: 'Rapid-fire algorithmic and systems knowledge assessment',
      duration: '30 mins',
      marks: '30 pts',
      status: 'UPCOMING',
    },
    {
      num: 2,
      title: 'Bug Hunt Arena',
      desc: 'Identify and repair bugs in flawed production codebases',
      duration: '45 mins',
      marks: '50 pts',
      status: 'UPCOMING',
    },
    {
      num: 3,
      title: 'Final Boss Coding',
      desc: 'High-complexity competitive algorithmic challenge',
      duration: '90 mins',
      marks: '100 pts',
      status: 'UPCOMING',
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

      {/* Strict Concurrency Policy Reminder Alert */}
      <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-800/50 flex items-start gap-3 text-xs text-sky-200">
        <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-sky-300 block">
            Single-Participant Relay Concurrency Active
          </span>
          <p className="text-slate-300 leading-relaxed">
            Competition rules enforce exactly one active participant terminal per team. Your teammate cannot log in while you are actively authenticated. Remember to log out before handoffs.
          </p>
        </div>
      </div>

      {/* Competition Rounds Progression Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Official Competition Rounds</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Phase 03 Setup Verified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rounds.map((round) => (
            <div
              key={round.num}
              className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-sky-400">
                    ROUND 0{round.num}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                    {round.status}
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
          ))}
        </div>
      </div>

      {/* Relay Instructions */}
      <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-sky-400" />
          <span>Competition Handshake Instructions</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="font-semibold text-slate-200 block mb-1">1. Relay Protocol</span>
            Round 1 requires individual MCQ attempts. Round 2 & 3 support code relay handoffs between teammates.
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="font-semibold text-slate-200 block mb-1">2. Local Network Only</span>
            All evaluations run on the local tournament server. No external internet is permitted during rounds.
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="font-semibold text-slate-200 block mb-1">3. Tab Switch Monitoring</span>
            Browser integrity and session heartbeats are continuously recorded for fairness audits.
          </div>
        </div>
      </div>
    </div>
  );
};
