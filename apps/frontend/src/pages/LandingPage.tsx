import React from 'react';
import { Link } from 'react-router-dom';
import { useCompetitionState } from '../hooks/useCompetition';
import {
  Terminal,
  ShieldCheck,
  Users,
  Clock,
  Award,
  ArrowRight,
  Radio,
  FileCode,
  BookOpen,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { data: compState } = useCompetitionState();

  const getStatusBadge = () => {
    if (!compState) return null;
    const status = compState.status;

    if (status.includes('ACTIVE')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/20">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>LIVE: {compState.currentRoundName || status}</span>
        </span>
      );
    }
    if (status.includes('EVALUATION')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Evaluation in Progress</span>
        </span>
      );
    }
    if (status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/30">
          <Award className="w-3.5 h-3.5 text-sky-400" />
          <span>Competition Concluded</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
        <span className="w-2 h-2 rounded-full bg-slate-500" />
        <span>STANDBY — Pre-Event Phase</span>
      </span>
    );
  };

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pb-16 text-center max-w-5xl mx-auto px-4">
        <div className="flex justify-center mb-6">{getStatusBadge()}</div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
          IGNITRON <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500">2K26</span>
          <span className="block text-2xl sm:text-4xl font-extrabold text-slate-300 font-mono tracking-widest mt-2 uppercase">
            Code Relay
          </span>
        </h1>

        <p className="mt-6 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          The university-tier competitive programming championship where algorithmic mastery meets relay teamwork. Two contestants, one active terminal, and three escalating battle arenas.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/login"
            className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-sky-500/25 flex items-center gap-2 hover:scale-[1.02]"
          >
            <span>Enter Team Arena</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/workspace-preview"
            className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm transition-colors flex items-center gap-2"
          >
            <FileCode className="w-4 h-4 text-violet-400" />
            <span>Workspace Preview</span>
          </Link>

          <Link
            to="/rules"
            className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold text-sm transition-colors flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span>Official Rules</span>
          </Link>
        </div>
      </section>

      {/* Core Engineering Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Code Relay Format</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Exactly 2 contestants per team. Teammates swap control between rounds, testing synchronized design and debugging.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Single-Terminal Lock</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strict server-side session mutex ensures only one participant terminal is active per team at any moment.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Server-Authoritative Timer</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No browser clock reliance. All deadlines, pauses, and submissions are strictly validated on the MySQL backend.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Local Campus Network</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Designed for offline tournament integrity on the university local intranet with zero cloud dependencies.
            </p>
          </div>
        </div>
      </section>

      {/* The 3 Official Competition Arenas */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            The Three Tournament Arenas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Progressive elimination shortlisting the top universities to the final championship showdown.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Round 1 */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest">
                  Arena 01
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-sky-950/40 text-sky-300 border border-sky-800/60">
                  All Teams Eligible
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">MCQ Arena</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rapid-fire algorithmic, data structure, and system fundamentals assessment testing foundational theoretical mastery.
              </p>

              <div className="mt-6 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-mono text-slate-200">30 Minutes</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-500">Maximum Marks</span>
                  <span className="font-mono text-amber-400">30 Points</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-500">Progression</span>
                  <span className="font-semibold text-emerald-400">Top 50% Shortlisted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Round 2 */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-violet-400 uppercase tracking-widest">
                  Arena 02
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-violet-950/40 text-violet-300 border border-violet-800/60">
                  Qualified Semifinalists
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Bug Hunt Arena</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Identify, isolate, and repair critical logical bugs and security vulnerabilities hidden within real-world codebases.
              </p>

              <div className="mt-6 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-mono text-slate-200">40 Minutes</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-500">Maximum Marks</span>
                  <span className="font-mono text-amber-400">100 Points</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-500">Progression</span>
                  <span className="font-semibold text-emerald-400">Top 5–8 Finalists</span>
                </div>
              </div>
            </div>
          </div>

          {/* Round 3 */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                  Arena 03
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-950/40 text-amber-300 border border-amber-800/60">
                  Grand Finals
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Final Boss Coding</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                High-complexity team relay challenge: teammates solve interconnected algorithmic challenges against rigorous test matrices.
              </p>

              <div className="mt-6 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-mono text-slate-200">60 Minutes</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-500">Maximum Marks</span>
                  <span className="font-mono text-amber-400">100 Points</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-500">Outcome</span>
                  <span className="font-bold text-amber-400">IGNITRON Champion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Professor Demo Guide Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold block mb-1">
                Faculty & Evaluator Guide
              </span>
              <h2 className="text-xl font-bold text-white">
                How to Evaluate the IGNITRON Platform
              </h2>
            </div>
            <Link
              to="/admin/competition"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>Launch Competition Engine</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
              <span className="font-bold text-sky-400 block">1. Seed Demo Roster</span>
              Use the admin button to generate 20 demonstration teams with populated candidate rosters and credentials.
            </div>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
              <span className="font-bold text-emerald-400 block">2. Control Progression</span>
              Start Round 1, observe server countdown, test pausing, conclude round, and use the shortlisting drawer to advance top teams.
            </div>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
              <span className="font-bold text-violet-400 block">3. Workspace Preview</span>
              Explore the non-functional preview of the upcoming IDE coding interface with problem statements and test suites.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
