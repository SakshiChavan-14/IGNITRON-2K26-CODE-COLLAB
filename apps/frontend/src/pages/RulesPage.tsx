import React from 'react';
import {
  BookOpen,
  Users,
  ShieldAlert,
  Clock,
  Terminal,
  Award,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const RulesPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Page Title */}
      <div className="border-b border-slate-800 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-3">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Official Tournament Guidelines</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Competition Rules & Regulations
        </h1>
        <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
          The governing rules of IGNITRON 2K26 — Code Relay. All contestants, teams, and faculty mentors are expected to adhere strictly to these standards.
        </p>
      </div>

      {/* Section 1: Team Structure & Relay Format */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-sky-400" />
          <span>1. Team Composition & Registration</span>
        </h2>
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            • <strong>Team Size:</strong> Every team must consist of exactly <strong>two (2) registered participants</strong> representing their enrolled college or university.
          </p>
          <p>
            • <strong>Registration Policy:</strong> Team registrations are processed exclusively through the official university Unstop portal. There is <strong>no public self-registration</strong> on the platform. All accounts and access credentials are created by the organizing committee.
          </p>
          <p>
            • <strong>Eligibility:</strong> Both participants must possess a valid institutional identity card and verified email address registered in the tournament roster.
          </p>
        </div>
      </section>

      {/* Section 2: Strict Terminal Concurrency */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <span>2. Single-Terminal Concurrency Policy</span>
        </h2>
        <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-800/40 space-y-3 text-xs text-rose-200 leading-relaxed">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="font-semibold text-rose-300">
              Strict Server-Side Session Mutual Exclusion Active
            </span>
          </div>
          <p>
            • While both participants are registered on the team, <strong>only ONE participant may have an active authenticated session at any given moment</strong>.
          </p>
          <p>
            • If Participant A is actively logged in, any concurrent login attempt by Participant B will be rejected with an immediate <strong>HTTP 409 Conflict</strong>.
          </p>
          <p>
            • To execute a relay handoff, Participant A must explicitly click <strong>Log Out</strong>. This releases the session lock on the server, permitting Participant B to authenticate and resume competition work.
          </p>
        </div>
      </section>

      {/* Section 3: The Three Official Arenas */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-violet-400" />
          <span>3. Official Arenas & Progression</span>
        </h2>

        <div className="space-y-4">
          {/* Round 1 */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-sky-400">Round 1: MCQ Arena</span>
              <span className="font-mono text-slate-400">30 Minutes • 30 Maximum Marks</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Assessment of core computer science fundamentals, discrete mathematics, algorithmic complexity (Big-O analysis), memory models, and data structure mechanics.
            </p>
            <div className="text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Progression Criterion: Top 50% of participating teams advance to Round 2.</span>
            </div>
          </div>

          {/* Round 2 */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-violet-400">Round 2: Bug Hunt Arena</span>
              <span className="font-mono text-slate-400">40 Minutes • 100 Maximum Marks</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Teams receive flawed, multi-file production-style code snippets. Contestants must isolate logical defects, off-by-one errors, resource leaks, and edge-case exceptions across multiple languages.
            </p>
            <div className="text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Progression Criterion: Top 5–8 teams advance to the Grand Finals (Round 3).</span>
            </div>
          </div>

          {/* Round 3 */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-amber-400">Round 3: Final Boss Coding</span>
              <span className="font-mono text-slate-400">60 Minutes • 100 Maximum Marks</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              The championship showdown: a multi-tiered algorithmic challenge requiring deep data structure knowledge, optimal space/time efficiency, and rigorous automated test case execution.
            </p>
            <div className="text-amber-400 font-bold flex items-center gap-1.5 pt-1">
              <Award className="w-3.5 h-3.5" />
              <span>Outcome: Highest aggregate score earns the title of IGNITRON 2K26 Champion.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Timer & Environment Integrity */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          <span>4. Timing & Fair Play Integrity</span>
        </h2>
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            • <strong>Server-Authoritative Clock:</strong> All countdowns, deadlines, pause states, and submission acceptance windows are calculated strictly on the competition server. Changing local computer clocks has zero impact on timer expiration.
          </p>
          <p>
            • <strong>Local Network Isolation:</strong> All competition evaluation occurs on the local campus tournament server. External internet access, unauthorized communication tools, or external AI assistants are strictly prohibited.
          </p>
          <p>
            • <strong>Submissions:</strong> Late submissions are rejected automatically by the server when the deadline expires.
          </p>
        </div>
      </section>
    </div>
  );
};
