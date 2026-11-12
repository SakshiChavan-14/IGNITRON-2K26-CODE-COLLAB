import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  AlertTriangle,
  CheckCircle2,
  Code2,
  Cpu,
  Layers,
  ArrowUp,
  ShieldAlert,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const { data: compState } = useCompetitionState();
  const location = useLocation();
  const [highlightRules, setHighlightRules] = useState(false);

  // Smooth scroll to #rules when requested or when URL hash changes
  const scrollToRules = () => {
    const el = document.getElementById('rules');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setHighlightRules(true);
      setTimeout(() => setHighlightRules(false), 2500);
    }
  };

  useEffect(() => {
    if (location.hash === '#rules' || window.location.hash === '#rules') {
      const timer = setTimeout(() => {
        scrollToRules();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.hash]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

      <div className="relative z-20 space-y-20 sm:space-y-28 py-6 sm:py-10">
        {/* ================================================================= */}
        {/* SECTION A: HERO SECTION                                           */}
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

          {/* Action Buttons */}
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

            <button
              type="button"
              onClick={scrollToRules}
              className="px-6 py-3.5 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 font-semibold text-sm border border-emerald-600/40 shadow-xs hover:border-emerald-400 hover:scale-105 transition-all flex items-center gap-2 backdrop-blur-md"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Rules</span>
            </button>
          </div>

          {/* Luminous Horizon / Floor Reflection Streak */}
          <div className="w-full flex justify-center items-center relative mt-16 sm:mt-24 pointer-events-none select-none">
            <div className="h-[2px] w-full max-w-5xl bg-gradient-to-r from-transparent via-emerald-400/90 to-transparent shadow-[0_0_25px_#10b981]" />
            <div
              className="absolute w-72 sm:w-[480px] h-12 -top-5 opacity-70 blur-md pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.7) 0%, rgba(251, 191, 36, 0.4) 30%, transparent 75%)',
              }}
            />
            <div className="absolute top-0 w-full max-w-4xl h-24 bg-gradient-to-b from-emerald-500/10 via-emerald-950/30 to-transparent blur-xl pointer-events-none" />
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION B: COMPETITION OVERVIEW                                   */}
        {/* ================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-emerald-400 font-bold block">
              Architected for Integrity
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
              The Code Relay Tournament Format
            </h2>
            <p className="text-sm text-emerald-200/80 leading-relaxed">
              Unlike conventional hackathons or individual contests, IGNITRON 2K26 is built on a high-stakes, two-contender relay architecture designed to test synchronized problem solving, clear logic transfer, and high-pressure debugging.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-2xl bg-[#02130a]/75 backdrop-blur-md border border-emerald-500/20 hover:border-emerald-400/50 shadow-xl hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all space-y-3 group">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white drop-shadow-xs">Two-Contestant Teams</h3>
              <p className="text-xs text-emerald-200/70 leading-relaxed">
                Every team represents their collegiate institution with exactly two contestants. Teammates must collaborate, strategize, and coordinate execution across every tournament stage.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#02130a]/75 backdrop-blur-md border border-emerald-500/20 hover:border-emerald-400/50 shadow-xl hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all space-y-3 group">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-bold text-base text-white drop-shadow-xs">Sequential Relay Handoff</h3>
              <p className="text-xs text-emerald-200/70 leading-relaxed">
                Participants alternate control of the team workspace between phases. To hand off the baton, the active contestant must log out cleanly, passing code and context to their partner.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#02130a]/75 backdrop-blur-md border border-emerald-500/20 hover:border-emerald-400/50 shadow-xl hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all space-y-3 group">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white drop-shadow-xs">Single-Terminal Concurrency</h3>
              <p className="text-xs text-emerald-200/70 leading-relaxed">
                Database-enforced mutual exclusion prevents duplicate or simultaneous logins. Only one participant terminal can ever be active per team, ensuring absolute competitive fairness.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#02130a]/75 backdrop-blur-md border border-emerald-500/20 hover:border-emerald-400/50 shadow-xl hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all space-y-3 group">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white drop-shadow-xs">Server-Authoritative Timing</h3>
              <p className="text-xs text-emerald-200/70 leading-relaxed">
                Deadlines, round transitions, and submission cutoffs are measured by the server clock. Local system time adjustments have zero effect on round expiration or scoring validity.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION C: THE THREE COMPETITION ROUNDS                           */}
        {/* ================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-emerald-400 font-bold block">
              Tournament Progression
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
              The Three Competition Arenas
            </h2>
            <p className="text-sm text-emerald-200/75">
              Three progressively demanding arenas designed to filter, test, and crown the ultimate collegiate programming duo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Round 1 Card */}
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
                  Rapid-fire algorithmic, data structure, discrete mathematics, and system fundamentals assessment testing foundational theoretical mastery.
                </p>

                <div className="mt-6 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between py-2 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Official Duration</span>
                    <span className="text-emerald-100 font-semibold">30 Minutes</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Maximum Marks</span>
                    <span className="text-amber-400 font-bold">30 Points</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Progression</span>
                    <span className="text-emerald-400 font-bold">Top 50% Shortlisted</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Round 2 Card */}
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
                  Identify, isolate, and repair critical logical flaws, edge case bugs, memory errors, and runtime vulnerabilities hidden inside complex codebases.
                </p>

                <div className="mt-6 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between py-2 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Official Duration</span>
                    <span className="text-emerald-100 font-semibold">40 Minutes</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Maximum Marks</span>
                    <span className="text-amber-400 font-bold">100 Points</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Progression</span>
                    <span className="text-emerald-400 font-bold">Top 5–8 Finalists</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Round 3 Card */}
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
                  High-complexity team relay showdown: contestants solve deep algorithmic challenges against hidden test fixtures inside the competitive CodeMirror workspace.
                </p>

                <div className="mt-6 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between py-2 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Official Duration</span>
                    <span className="text-emerald-100 font-semibold">60 Minutes</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Maximum Marks</span>
                    <span className="text-amber-400 font-bold">100 Points</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-emerald-950/80">
                    <span className="text-emerald-200/50">Championship</span>
                    <span className="text-amber-300 font-bold">IGNITRON Trophy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION D: OFFICIAL RULES SECTION (#rules)                         */}
        {/* ================================================================= */}
        <section
          id="rules"
          className={`scroll-mt-24 sm:scroll-mt-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700`}
        >
          <div
            className={`p-6 sm:p-10 rounded-3xl transition-all duration-700 ${
              highlightRules
                ? 'ring-2 ring-emerald-400 ring-offset-4 ring-offset-[#010905] shadow-[0_0_50px_rgba(16,185,129,0.6)] bg-[#02180d]'
                : 'border border-emerald-500/25 bg-[#02130a]/85 shadow-2xl'
            }`}
          >
            {/* Rules Header */}
            <div className="border-b border-emerald-900/60 pb-6 mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 mb-3">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Official Tournament Guidelines</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Competition Rules & Regulations
              </h2>
              <p className="text-xs sm:text-sm text-emerald-200/70 mt-2 max-w-3xl leading-relaxed">
                The governing guidelines and integrity policies of IGNITRON 2K26 — Code Relay. All contestants, teams, and faculty mentors are expected to adhere strictly to these standards.
              </p>
            </div>

            <div className="space-y-8">
              {/* 1. Team Composition & Registration */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span>1. Team Composition & Registration</span>
                </h3>
                <div className="p-5 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-2.5 text-xs text-emerald-100/80 leading-relaxed">
                  <p>
                    • <strong>Team Composition:</strong> Every team must consist of exactly <strong>two (2) registered participants</strong> representing their enrolled college or university.
                  </p>
                  <p>
                    • <strong>Registration:</strong> Teams register directly via the public team registration portal. Each registration generates an official <strong>Team Code</strong> (e.g. <code className="bg-emerald-950/80 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">IGN-XXXX</code>) and stores encrypted credentials in the database.
                  </p>
                  <p>
                    • <strong>Valid Email Addresses:</strong> Both personal and college-domain email addresses are valid and accepted for participant records.
                  </p>
                  <p>
                    • <strong>Institutional Eligibility:</strong> Both contestants must hold a valid college/university identification card and be present during all rounds for tournament validation.
                  </p>
                </div>
              </div>

              {/* 2. Single-Terminal Concurrency Policy */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <span>2. Single-Terminal Concurrency Policy</span>
                </h3>
                <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2.5 text-xs text-amber-100/90 leading-relaxed">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Strict Server-Side Session Mutual Exclusion Active</span>
                  </div>
                  <p>
                    • While both participants are registered on the team, <strong>only ONE participant may have an active authenticated session at any given moment</strong>.
                  </p>
                  <p>
                    • If Participant A is actively logged in, any concurrent login attempt by Participant B will be rejected with an immediate <strong>HTTP 409 Conflict</strong>.
                  </p>
                  <p>
                    • To execute a relay handoff, Participant A must explicitly click <strong>Log Out</strong>. This releases the server mutex lock, allowing Participant B to authenticate and resume the contest.
                  </p>
                  <p>
                    • Administrators possess real-time session revocation capability to reset locked sessions in the event of hardware failures.
                  </p>
                </div>
              </div>

              {/* 3. Official Arenas & Progression */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-teal-400" />
                  <span>3. Official Arenas & Progression Criteria</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2 text-xs">
                    <span className="font-bold text-emerald-300 block">Round 1: MCQ Arena</span>
                    <p className="text-emerald-200/70 leading-relaxed">
                      30 Questions • 30 Minutes • 30 Points. Testing algorithmic fundamentals, Big-O complexity, and data structures.
                    </p>
                    <span className="text-emerald-400 font-bold block pt-1">
                      Criterion: Top 50% advance to Round 2.
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2 text-xs">
                    <span className="font-bold text-emerald-300 block">Round 2: Bug Hunt Arena</span>
                    <p className="text-emerald-200/70 leading-relaxed">
                      Multi-file bug isolation • 40 Minutes • 100 Points. Locating syntax, logic, memory, and runtime defects.
                    </p>
                    <span className="text-emerald-400 font-bold block pt-1">
                      Criterion: Top 5–8 teams advance to Round 3.
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2 text-xs">
                    <span className="font-bold text-amber-300 block">Round 3: Final Boss Coding</span>
                    <p className="text-emerald-200/70 leading-relaxed">
                      Algorithmic relay showdown • 60 Minutes • 100 Points. Rigorous automated test fixture validation.
                    </p>
                    <span className="text-amber-400 font-bold block pt-1">
                      Criterion: Highest aggregate score wins Trophy.
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Timing & Fair Play Integrity */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  <span>4. Timing & Fair Play Integrity</span>
                </h3>
                <div className="p-5 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-2.5 text-xs text-emerald-100/80 leading-relaxed">
                  <p>
                    • <strong>Server-Authoritative Clock:</strong> All countdowns, deadlines, pause states, and submission acceptance windows are calculated strictly on the competition server. Changing local computer clocks has zero impact on timer expiration.
                  </p>
                  <p>
                    • <strong>Campus Network Isolation:</strong> All competition evaluation occurs on the local campus tournament server. External internet access, unauthorized communication tools, and external generative AI assistants are strictly prohibited.
                  </p>
                  <p>
                    • <strong>Automated Cutoffs:</strong> Submissions attempted after deadline expiration are rejected automatically by the backend system.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION E: ADDITIONAL COMPETITION INFORMATION                     */}
        {/* ================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-emerald-400 font-bold block">
              Specifications & Guidelines
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
              Tournament Technical Specifications
            </h2>
            <p className="text-sm text-emerald-200/75">
              Comprehensive guidelines for languages, automated harnesses, and contest day setup.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Supported Languages */}
            <div className="p-6 rounded-2xl bg-[#02130a]/75 backdrop-blur-md border border-emerald-500/20 shadow-xl space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">Supported Languages</h3>
              <ul className="space-y-2 text-xs text-emerald-200/70 font-mono">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>C++ (GCC 11+ / C++17 Standard)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Java (OpenJDK 17 / 21 LTS)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Python (CPython 3.11 runtime)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>JavaScript / TypeScript (Node.js LTS)</span>
                </li>
              </ul>
              <p className="text-[11px] text-emerald-200/50 pt-2 border-t border-emerald-950/80">
                Standard libraries are available across all runtimes. External network package fetching is disabled.
              </p>
            </div>

            {/* Card 2: Automated Evaluation */}
            <div className="p-6 rounded-2xl bg-[#02130a]/75 backdrop-blur-md border border-emerald-500/20 shadow-xl space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">Automated Test Harness</h3>
              <ul className="space-y-2 text-xs text-emerald-200/70">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Sandboxed Sandbox:</strong> Isolated test runs protect memory, CPU limits, and system resources.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Hidden Fixtures:</strong> Submissions are checked against public and hidden edge-case test vectors.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Deterministic Scoring:</strong> Execution time and memory thresholds break equal-score ties.</span>
                </li>
              </ul>
              <p className="text-[11px] text-emerald-200/50 pt-2 border-t border-emerald-950/80">
                Real-time feedback shows passed test counts and execution errors instantly.
              </p>
            </div>

            {/* Card 3: Eligibility & Participation */}
            <div className="p-6 rounded-2xl bg-[#02130a]/75 backdrop-blur-md border border-emerald-500/20 shadow-xl space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">Contest Day Checklist</h3>
              <ul className="space-y-2 text-xs text-emerald-200/70">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Registration Check:</strong> Bring assigned Team Code and password provided at registration.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Identity Cards:</strong> Both contestants must show original physical student identification.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Pre-Round Briefing:</strong> Teams must report to assigned terminal labs 30 minutes before start.</span>
                </li>
              </ul>
              <p className="text-[11px] text-emerald-200/50 pt-2 border-t border-emerald-950/80">
                No external USB drives, storage media, or personal laptops permitted in arena labs.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* FACULTY / EVALUATOR DEMO GUIDE (PRESERVED)                        */}
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

        {/* ================================================================= */}
        {/* SECTION F: CONSOLIDATED PUBLIC FOOTER                             */}
        {/* ================================================================= */}
        <footer className="border-t border-emerald-900/60 pt-12 pb-8 bg-[#010804] text-slate-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Brand and Description */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                    <span>IGNITRON</span>
                    <span className="text-emerald-400">2K26</span>
                  </div>
                  <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
                    Code Relay Championship
                  </div>
                </div>
              </div>

              {/* Navigation Quick Links */}
              <nav className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold font-mono text-emerald-200/80">
                <button
                  type="button"
                  onClick={scrollToTop}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Top</span>
                </button>
                <button
                  type="button"
                  onClick={scrollToRules}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Rules
                </button>
                <Link to="/register" className="hover:text-emerald-400 transition-colors">
                  Register Team
                </Link>
                <Link to="/login" className="hover:text-emerald-400 transition-colors">
                  Team Login
                </Link>
                <Link to="/admin/login" className="hover:text-emerald-400 transition-colors">
                  Admin Console
                </Link>
              </nav>
            </div>

            <div className="pt-6 border-t border-emerald-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-200/50">
              <p>
                © 2026 IGNITRON — Code Relay Tournament Platform. Built for University Competitive Programming.
              </p>
              <p className="font-mono text-[11px]">
                Engineered with React 18 • NestJS • Prisma • MySQL
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
