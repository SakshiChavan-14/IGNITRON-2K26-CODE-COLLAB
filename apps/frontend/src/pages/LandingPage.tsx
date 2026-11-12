import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompetitionState } from '../hooks/useCompetition';
import { GoldenSnowfall } from '../components/GoldenSnowfall';
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
    if (!compState) {
      return (
        <span className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-amber-300 bg-black/60 border border-amber-400/90 shadow-[0_0_20px_rgba(251,191,36,0.35)] backdrop-blur-md">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>STANDBY — REGISTRATION ACTIVE</span>
        </span>
      );
    }

    const status = compState.status;

    if (status.includes('ACTIVE')) {
      return (
        <span className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-emerald-300 bg-black/60 border border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.45)] backdrop-blur-md">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>LIVE: {compState.currentRoundName || status}</span>
        </span>
      );
    }
    if (status.includes('EVALUATION')) {
      return (
        <span className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-amber-300 bg-black/60 border border-amber-400/90 shadow-[0_0_20px_rgba(251,191,36,0.4)] backdrop-blur-md">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>EVALUATION IN PROGRESS</span>
        </span>
      );
    }
    if (status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-sky-300 bg-black/60 border border-sky-400/90 shadow-[0_0_20px_rgba(56,189,248,0.4)] backdrop-blur-md">
          <Award className="w-3.5 h-3.5 text-sky-400" />
          <span>COMPETITION CONCLUDED</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-amber-300 bg-black/60 border border-amber-400/90 shadow-[0_0_20px_rgba(251,191,36,0.35)] backdrop-blur-md">
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        <span>EVALUATION IN PROGRESS</span>
      </span>
    );
  };

  return (
    <div className="relative min-h-screen bg-[#010905] text-slate-100 overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Dynamic Golden Snowfall Canvas (Particles, Vertical Light Trails & Bokeh Discs) */}
      <GoldenSnowfall />

      {/* Atmospheric Background Lighting & Gradients */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top Center Golden Ambient Glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[350px] opacity-30 blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(245, 158, 11, 0.45) 0%, rgba(217, 119, 6, 0.15) 50%, transparent 80%)',
          }}
        />

        {/* Top Left Golden Shimmer */}
        <div
          className="absolute -top-16 left-0 w-[450px] h-[400px] opacity-25 blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 15% 10%, rgba(251, 191, 36, 0.4) 0%, transparent 70%)',
          }}
        />

        {/* Top Right Golden Shimmer */}
        <div
          className="absolute -top-16 right-0 w-[450px] h-[400px] opacity-25 blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 85% 10%, rgba(251, 191, 36, 0.4) 0%, transparent 70%)',
          }}
        />

        {/* Center Emerald Glow (Directly behind Title) */}
        <div
          className="absolute top-44 sm:top-56 left-1/2 -translate-x-1/2 w-[650px] sm:w-[900px] h-[450px] opacity-45 blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.5) 0%, rgba(5, 150, 105, 0.2) 45%, transparent 75%)',
          }}
        />

        {/* Deep Vignette Gradient */}
        <div className="absolute inset-0 bg-radial from-transparent via-[#010a05]/60 to-[#010804] pointer-events-none" />
      </div>

      <div className="relative z-20 space-y-20 sm:space-y-24 py-6 sm:py-10">
        {/* ================================================================= */}
        {/* HERO SECTION — Matching Attached Visual Reference                  */}
        {/* ================================================================= */}
        <section className="relative pt-6 sm:pt-12 pb-16 sm:pb-24 text-center max-w-5xl mx-auto px-4 sm:px-6">
          {/* Luminous Status Badge */}
          <div className="flex justify-center mb-8 sm:mb-10 animate-fade-in">
            {getStatusBadge()}
          </div>

          {/* Glowing Emerald Main Title */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black italic tracking-wide text-white drop-shadow-[0_0_40px_rgba(16,185,129,0.95)]">
            IGNITRON 2K26
          </h1>

          {/* Subtitle with Glowing Horizontal Neon Accent Streaks */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 mt-3 sm:mt-4">
            <span
              className="h-[2px] w-12 sm:w-28 bg-gradient-to-r from-transparent via-emerald-400 to-emerald-400 shadow-[0_0_12px_#10b981]"
              aria-hidden="true"
            />
            <span className="text-emerald-400 font-mono tracking-[0.3em] sm:tracking-[0.45em] text-xs sm:text-base font-extrabold uppercase drop-shadow-[0_0_15px_rgba(16,185,129,0.85)]">
              CODE RELAY TOURNAMENT
            </span>
            <span
              className="h-[2px] w-12 sm:w-28 bg-gradient-to-l from-transparent via-emerald-400 to-emerald-400 shadow-[0_0_12px_#10b981]"
              aria-hidden="true"
            />
          </div>

          {/* Description */}
          <p className="mt-8 text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto leading-relaxed font-normal">
            The official university-tier competitive programming championship. Two contestants per team, one active terminal, and three progressive relay arenas.
          </p>

          {/* Action Buttons — Matching Attached Reference */}
          <div className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {!user && (
              <Link
                to="/register"
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 text-slate-950 font-extrabold text-sm transition-all shadow-[0_0_35px_rgba(16,185,129,0.7)] hover:shadow-[0_0_50px_rgba(16,185,129,0.95)] border-2 border-emerald-200/90 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4 text-slate-950" />
                <span>Register Your Team</span>
              </Link>
            )}

            {user?.type === 'TEAM' ? (
              <>
                <Link
                  to="/team/dashboard"
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 text-slate-950 font-extrabold text-sm transition-all shadow-[0_0_35px_rgba(16,185,129,0.7)] hover:shadow-[0_0_50px_rgba(16,185,129,0.95)] border-2 border-emerald-200/90 hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-slate-950" />
                  <span>Go to Team Arena</span>
                </Link>
                <Link
                  to="/team/workspace"
                  className="px-7 py-3.5 rounded-2xl bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 font-bold text-sm border border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 backdrop-blur-md"
                >
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <span>Coding Workspace</span>
                </Link>
              </>
            ) : user?.type === 'ADMIN' ? (
              <Link
                to="/admin/dashboard"
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 text-slate-950 font-extrabold text-sm transition-all shadow-[0_0_35px_rgba(16,185,129,0.7)] hover:shadow-[0_0_50px_rgba(16,185,129,0.95)] border-2 border-emerald-200/90 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-slate-950" />
                <span>Admin Dashboard</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-7 py-3.5 rounded-2xl bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 font-bold text-sm border border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 backdrop-blur-md"
              >
                <LogIn className="w-4 h-4 text-emerald-400" />
                <span>Enter Team Arena</span>
              </Link>
            )}

            <Link
              to="/rules"
              className="px-6 py-3.5 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 font-semibold text-sm border border-emerald-600/40 shadow-xs hover:border-emerald-400 hover:scale-105 transition-all flex items-center gap-2 backdrop-blur-md"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Rules</span>
            </Link>
          </div>

          {/* Luminous Horizon / Floor Reflection Streak (Matching Reference Floor Reflection) */}
          <div className="w-full flex justify-center items-center relative mt-16 sm:mt-24 pointer-events-none select-none">
            {/* Horizontal laser streak */}
            <div className="h-[2px] w-full max-w-5xl bg-gradient-to-r from-transparent via-emerald-400/90 to-transparent shadow-[0_0_25px_#10b981]" />
            {/* Central lens flare burst */}
            <div
              className="absolute w-72 sm:w-[480px] h-12 -top-5 opacity-70 blur-md pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.7) 0%, rgba(251, 191, 36, 0.4) 30%, transparent 75%)',
              }}
            />
            {/* Subtle floor reflection glow */}
            <div className="absolute top-0 w-full max-w-4xl h-24 bg-gradient-to-b from-emerald-500/10 via-emerald-950/30 to-transparent blur-xl pointer-events-none" />
          </div>
        </section>

        {/* ================================================================= */}
        {/* CORE PLATFORM ARCHITECTURE HIGHLIGHTS                             */}
        {/* ================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-2xl bg-[#02130a]/75 backdrop-blur-md border border-emerald-500/20 hover:border-emerald-400/50 shadow-xl hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white drop-shadow-xs">Code Relay Format</h3>
              <p className="text-xs text-emerald-200/70 leading-relaxed">
                Exactly 2 contestants per team. Teammates swap control between rounds, testing synchronized design, logic, and collaborative debugging.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#02130a]/75 backdrop-blur-md border border-emerald-500/20 hover:border-emerald-400/50 shadow-xl hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white drop-shadow-xs">Single-Terminal Lock</h3>
              <p className="text-xs text-emerald-200/70 leading-relaxed">
                Strict database-backed session mutex ensures only one participant terminal is active per team at any moment. Handover requires clean logout.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#02130a]/75 backdrop-blur-md border border-emerald-500/20 hover:border-emerald-400/50 shadow-xl hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white drop-shadow-xs">Server-Authoritative Timer</h3>
              <p className="text-xs text-emerald-200/70 leading-relaxed">
                Zero client clock manipulation. All deadlines, pauses, and submissions are strictly synchronized and enforced by the backend clock.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#02130a]/75 backdrop-blur-md border border-emerald-500/20 hover:border-emerald-400/50 shadow-xl hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white drop-shadow-xs">Campus Network Native</h3>
              <p className="text-xs text-emerald-200/70 leading-relaxed">
                Engineered for tournament integrity on the university local intranet with zero external cloud dependencies or latency hazards.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* THE 3 TOURNAMENT ARENAS                                           */}
        {/* ================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
              Sequential Stages
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
              The Three Competition Arenas
            </h2>
            <p className="text-xs text-emerald-200/70">
              Progressive elimination shortlisting the top universities to the grand championship final.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Round 1 */}
            <div className="p-7 rounded-2xl bg-[#02130a]/80 backdrop-blur-md border border-emerald-500/25 hover:border-emerald-400/60 shadow-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                    Arena 01
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    All Teams Eligible
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                  MCQ Arena
                </h3>
                <p className="text-xs text-emerald-200/70 leading-relaxed">
                  Rapid-fire algorithmic, data structure, and system fundamentals assessment testing foundational theoretical mastery.
                </p>

                <div className="mt-6 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between py-1.5 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Duration</span>
                    <span className="text-emerald-100 font-semibold">30 Minutes</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Maximum Marks</span>
                    <span className="text-amber-400 font-bold">30 Points</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Progression</span>
                    <span className="text-emerald-400 font-bold">Top 50% Shortlisted</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Round 2 */}
            <div className="p-7 rounded-2xl bg-[#02130a]/80 backdrop-blur-md border border-emerald-500/25 hover:border-emerald-400/60 shadow-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                    Arena 02
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    Qualified Semifinalists
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                  Bug Hunt Arena
                </h3>
                <p className="text-xs text-emerald-200/70 leading-relaxed">
                  Identify, isolate, and repair critical logical flaws, edge case bugs, and runtime vulnerabilities hidden inside faulty codebases.
                </p>

                <div className="mt-6 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between py-1.5 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Duration</span>
                    <span className="text-emerald-100 font-semibold">40 Minutes</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Maximum Marks</span>
                    <span className="text-amber-400 font-bold">100 Points</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Progression</span>
                    <span className="text-emerald-400 font-bold">Top 5–8 Finalists</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Round 3 */}
            <div className="p-7 rounded-2xl bg-[#02130a]/80 backdrop-blur-md border border-emerald-500/25 hover:border-emerald-400/60 shadow-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                    Arena 03
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Grand Finals
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                  Final Boss Coding
                </h3>
                <p className="text-xs text-emerald-200/70 leading-relaxed">
                  High-complexity team relay showdown: contestants solve deep algorithmic challenges against hidden test fixtures inside the CodeMirror workspace.
                </p>

                <div className="mt-6 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between py-1.5 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Duration</span>
                    <span className="text-emerald-100 font-semibold">60 Minutes</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Maximum Marks</span>
                    <span className="text-amber-400 font-bold">100 Points</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Championship</span>
                    <span className="text-amber-300 font-bold">IGNITRON Trophy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* EVALUATOR / PROFESSOR DEMONSTRATION GUIDE                         */}
        {/* ================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 rounded-2xl bg-[#02130a]/75 backdrop-blur-md border border-emerald-500/30 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block mb-1">
                  Faculty & Evaluator Guide
                </span>
                <h2 className="text-xl font-bold text-white drop-shadow-sm">
                  Evaluating the IGNITRON Platform
                </h2>
              </div>
              <Link
                to="/admin/competition"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-md shadow-emerald-600/30 hover:scale-105"
              >
                <span>Launch Competition Engine</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/20 space-y-1.5">
                <span className="font-bold text-emerald-300 block">1. Seed Demo Roster</span>
                <p className="text-emerald-200/70 leading-relaxed">
                  Use the admin button to generate 20 demonstration teams with populated candidate rosters and credentials.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/20 space-y-1.5">
                <span className="font-bold text-emerald-300 block">2. Control Progression</span>
                <p className="text-emerald-200/70 leading-relaxed">
                  Start Round 1, observe server countdown, test pausing, conclude round, and use the shortlisting drawer to advance top teams.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/20 space-y-1.5">
                <span className="font-bold text-emerald-300 block">3. Workspace Preview</span>
                <p className="text-emerald-200/70 leading-relaxed">
                  Explore the IDE coding interface with problem statements, CodeMirror 6 editor, and test run triggers.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
