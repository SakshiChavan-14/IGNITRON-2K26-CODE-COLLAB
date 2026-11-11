import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  UserPlus,
  LogIn,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const { data: compState } = useCompetitionState();

  const getStatusBadge = () => {
    if (!compState) return null;
    const status = compState.status;

    if (status.includes('ACTIVE')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
          <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>LIVE: {compState.currentRoundName || status}</span>
        </span>
      );
    }
    if (status.includes('EVALUATION')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Evaluation in Progress</span>
        </span>
      );
    }
    if (status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase bg-sky-100 text-sky-800 border border-sky-300">
          <Award className="w-3.5 h-3.5 text-sky-600" />
          <span>Competition Concluded</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>STANDBY — Registration & Preparation</span>
      </span>
    );
  };

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pb-16 text-center max-w-5xl mx-auto px-4">
        <div className="flex justify-center mb-6">{getStatusBadge()}</div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-emerald-950 leading-tight">
          IGNITRON <span className="text-emerald-600">2K26</span>
          <span className="block text-2xl sm:text-4xl font-extrabold text-slate-700 font-mono tracking-widest mt-2 uppercase">
            Code Relay Tournament
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          The official university-tier competitive programming championship. Two contestants per team, one active terminal, and three progressive relay arenas.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {!user && (
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/25 flex items-center gap-2 hover:scale-[1.02]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Your Team</span>
            </Link>
          )}

          {user?.type === 'TEAM' ? (
            <>
              <Link
                to="/team/dashboard"
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/25 flex items-center gap-2 hover:scale-[1.02]"
              >
                <Users className="w-4 h-4" />
                <span>Go to Team Arena</span>
              </Link>
              <Link
                to="/team/workspace"
                className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-sm transition-colors flex items-center gap-2 shadow-xs"
              >
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span>Coding Workspace</span>
              </Link>
            </>
          ) : user?.type === 'ADMIN' ? (
            <Link
              to="/admin/dashboard"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/25 flex items-center gap-2 hover:scale-[1.02]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Dashboard</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-sm transition-colors flex items-center gap-2 shadow-xs"
            >
              <LogIn className="w-4 h-4 text-emerald-600" />
              <span>Enter Team Arena</span>
            </Link>
          )}

          <Link
            to="/rules"
            className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-sm transition-colors flex items-center gap-2 shadow-xs"
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Rules</span>
          </Link>
        </div>
      </section>

      {/* Core Engineering Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-emerald-950">Code Relay Format</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Exactly 2 contestants per team. Teammates swap control between rounds, testing synchronized design and debugging.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-emerald-950">Single-Terminal Lock</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Strict database-backed session mutex ensures only one participant terminal is active per team at any moment.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-emerald-950">Server-Authoritative Timer</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Zero client clock manipulation. All deadlines, pauses, and submissions are strictly validated on the backend.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-emerald-950">Local Campus Network</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Engineered for tournament integrity on the university local intranet with zero cloud dependencies.
            </p>
          </div>
        </div>
      </section>

      {/* The 3 Official Competition Arenas */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-emerald-950">
            The Three Tournament Arenas
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Progressive elimination shortlisting the top universities to the final championship showdown.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Round 1 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-widest">
                  Arena 01
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  All Teams Eligible
                </span>
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-2">MCQ Arena</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rapid-fire algorithmic, data structure, and system fundamentals assessment testing foundational theoretical mastery.
              </p>

              <div className="mt-6 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-mono text-slate-800 font-semibold">30 Minutes</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Maximum Marks</span>
                  <span className="font-mono text-amber-700 font-semibold">30 Points</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Progression</span>
                  <span className="font-semibold text-emerald-700">Top 50% Shortlisted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Round 2 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-widest">
                  Arena 02
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Qualified Semifinalists
                </span>
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-2">Bug Hunt Arena</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Identify, isolate, and repair critical logical bugs and security vulnerabilities hidden within real-world codebases.
              </p>

              <div className="mt-6 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-mono text-slate-800 font-semibold">40 Minutes</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Maximum Marks</span>
                  <span className="font-mono text-amber-700 font-semibold">100 Points</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Progression</span>
                  <span className="font-semibold text-emerald-700">Top 5–8 Finalists</span>
                </div>
              </div>
            </div>
          </div>

          {/* Round 3 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-widest">
                  Arena 03
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-100 text-amber-800 border border-amber-200">
                  Grand Finals
                </span>
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-2">Final Boss Coding</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                High-complexity team relay challenge: teammates solve interconnected algorithmic challenges against rigorous test matrices.
              </p>

              <div className="mt-6 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-mono text-slate-800 font-semibold">60 Minutes</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Maximum Marks</span>
                  <span className="font-mono text-amber-700 font-semibold">100 Points</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Outcome</span>
                  <span className="font-bold text-amber-700">IGNITRON Champion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Professor Demo Guide Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 font-bold block mb-1">
                Faculty & Evaluator Guide
              </span>
              <h2 className="text-xl font-bold text-emerald-950">
                Evaluating the IGNITRON Platform
              </h2>
            </div>
            <Link
              to="/admin/competition"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
            >
              <span>Launch Competition Engine</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-emerald-900 block">1. Seed Demo Roster</span>
              Use the admin button to generate 20 demonstration teams with populated candidate rosters and credentials.
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-emerald-900 block">2. Control Progression</span>
              Start Round 1, observe server countdown, test pausing, conclude round, and use the shortlisting drawer to advance top teams.
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-emerald-900 block">3. Workspace Preview</span>
              Explore the IDE coding interface with problem statements, CodeMirror 6 editor, and test run triggers.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
