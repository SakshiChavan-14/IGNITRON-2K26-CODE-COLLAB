import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { RegisterTeamResponse } from '@ignitron/shared';
import { GoldenSnowfall } from '../components/GoldenSnowfall';
import {
  Users,
  GraduationCap,
  User,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  // Form State
  const [teamName, setTeamName] = useState('');
  const [institution, setInstitution] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Participant 1 State
  const [p1Name, setP1Name] = useState('');
  const [p1Email, setP1Email] = useState('');
  const [p1Phone, setP1Phone] = useState('');
  const [p1StudentId, setP1StudentId] = useState('');

  // Participant 2 State
  const [p2Name, setP2Name] = useState('');
  const [p2Email, setP2Email] = useState('');
  const [p2Phone, setP2Phone] = useState('');
  const [p2StudentId, setP2StudentId] = useState('');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredData, setRegisteredData] = useState<RegisterTeamResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!teamName.trim()) {
      setError('Team name is required.');
      return;
    }
    if (!institution.trim()) {
      setError('College/Institution name is required.');
      return;
    }
    if (!p1Name.trim() || !p1Email.trim()) {
      setError('Participant 1 full name and email are required.');
      return;
    }
    if (!p2Name.trim() || !p2Email.trim()) {
      setError('Participant 2 full name and email are required.');
      return;
    }
    if (p1Email.trim().toLowerCase() === p2Email.trim().toLowerCase()) {
      setError('Participant 1 and Participant 2 must have distinct email addresses.');
      return;
    }
    if (password.length < 8) {
      setError('Team password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await authService.registerTeam({
        teamName: teamName.trim(),
        institution: institution.trim(),
        password,
        participants: [
          {
            fullName: p1Name.trim(),
            email: p1Email.trim(),
            phone: p1Phone.trim() || undefined,
            studentId: p1StudentId.trim() || undefined,
          },
          {
            fullName: p2Name.trim(),
            email: p2Email.trim(),
            phone: p2Phone.trim() || undefined,
            studentId: p2StudentId.trim() || undefined,
          },
        ],
      });

      setRegisteredData(res);
    } catch (err: any) {
      setError(
        err?.message ||
          'Failed to complete team registration. Please check your inputs and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (!registeredData?.teamCode) return;
    navigator.clipboard.writeText(registeredData.teamCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (registeredData) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)] bg-[#010905] overflow-hidden flex items-center justify-center p-4">
        {/* Dynamic Golden Snowfall Background */}
        <GoldenSnowfall />

        {/* Ambient Lighting Gradients */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-30 blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(245, 158, 11, 0.45) 0%, transparent 80%)',
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] opacity-40 blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.4) 0%, transparent 75%)',
            }}
          />
        </div>

        {/* Dark Emerald Glass Success Card */}
        <div className="relative z-10 w-full max-w-lg bg-[#03180f]/94 backdrop-blur-xl border border-emerald-500/30 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.65),0_0_35px_rgba(16,185,129,0.15)] p-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto mb-5 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]">
            Registration Successful!
          </h2>
          <p className="text-sm text-emerald-200/80 mt-2">
            Your team is officially registered for <span className="font-semibold text-emerald-300">IGNITRON 2K26 Code Relay</span>.
          </p>

          <div className="my-6 p-5 rounded-xl bg-[#011108]/80 border border-emerald-500/30 text-left space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Official Team Code
                </span>
                <div className="text-2xl font-black font-mono tracking-widest text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)] mt-0.5">
                  {registeredData.teamCode}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-2 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-emerald-900/60 text-xs text-emerald-200/70 space-y-1">
              <div><strong className="text-emerald-100">Team Name:</strong> {registeredData.teamName}</div>
              <div><strong className="text-emerald-100">College:</strong> {registeredData.institution}</div>
              <div>
                <strong className="text-emerald-100">Contestants:</strong>{' '}
                {registeredData.participants.map((p) => p.fullName).join(' & ')}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs text-left mb-6">
            <strong>Important:</strong> Save your <strong>Team Code</strong> and registered password. Both contestants will need this Team Code to access the arena on competition day.
          </div>

          <button
            onClick={() => navigate('/login', { state: { prefilledCode: registeredData.teamCode } })}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm transition-all shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:shadow-[0_0_35px_rgba(16,185,129,0.7)] flex items-center justify-center gap-2"
          >
            <span>Proceed to Team Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#010905] overflow-hidden py-10 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Dynamic Golden Snowfall Background */}
      <GoldenSnowfall />

      {/* Atmospheric Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-30 blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(245, 158, 11, 0.45) 0%, transparent 80%)',
          }}
        />
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-35 blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.35) 0%, transparent 75%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Official Team Entry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_0_25px_rgba(16,185,129,0.7)]">
            Register Your Team
          </h1>
          <p className="text-sm text-emerald-100/80 mt-2">
            IGNITRON 2K26 Code Relay requires exactly two contestants per team. Fill in your team and participant details below.
          </p>
        </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-sm flex items-start gap-3 shadow-md backdrop-blur-md">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Dark Emerald Glass Registration Form */}
      <form onSubmit={handleSubmit} className="bg-[#03180f]/94 backdrop-blur-xl border border-emerald-500/30 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.65),0_0_35px_rgba(16,185,129,0.12)] p-6 sm:p-8 space-y-8">
        {/* Section 1: Team & College Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-emerald-900/60">
            <GraduationCap className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wide drop-shadow-xs">
              1. Team & Institution Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
                Team Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. ByteBandits"
                className="w-full px-3.5 py-2.5 rounded-lg border border-emerald-500/30 bg-[#011108]/90 text-slate-100 placeholder-emerald-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-colors shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
                College / University Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. MIT College of Engineering"
                className="w-full px-3.5 py-2.5 rounded-lg border border-emerald-500/30 bg-[#011108]/90 text-slate-100 placeholder-emerald-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-colors shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Participant 1 (Lead Contestant) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-emerald-900/60">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wide drop-shadow-xs">
              2. Participant 1 (Lead Relay Contestant)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2.5 rounded-lg border border-emerald-500/30 bg-[#011108]/90 text-slate-100 placeholder-emerald-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-colors shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
                Email Address (Personal or College) <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                value={p1Email}
                onChange={(e) => setP1Email(e.target.value)}
                placeholder="e.g. rahul@gmail.com or rahul@mit.edu"
                className="w-full px-3.5 py-2.5 rounded-lg border border-emerald-500/30 bg-[#011108]/90 text-slate-100 placeholder-emerald-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-colors shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={p1Phone}
                onChange={(e) => setP1Phone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2.5 rounded-lg border border-emerald-500/30 bg-[#011108]/90 text-slate-100 placeholder-emerald-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-colors shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
                Student ID / Roll No. (Optional)
              </label>
              <input
                type="text"
                value={p1StudentId}
                onChange={(e) => setP1StudentId(e.target.value)}
                placeholder="e.g. CS2026-042"
                className="w-full px-3.5 py-2.5 rounded-lg border border-emerald-500/30 bg-[#011108]/90 text-slate-100 placeholder-emerald-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-colors shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Participant 2 (Teammate Contestant) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-emerald-900/60">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wide drop-shadow-xs">
              3. Participant 2 (Teammate Relay Contestant)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                placeholder="e.g. Priya Patel"
                className="w-full px-3.5 py-2.5 rounded-lg border border-emerald-500/30 bg-[#011108]/90 text-slate-100 placeholder-emerald-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-colors shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
                Email Address (Personal or College) <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                value={p2Email}
                onChange={(e) => setP2Email(e.target.value)}
                placeholder="e.g. priya@yahoo.com or priya@mit.edu"
                className="w-full px-3.5 py-2.5 rounded-lg border border-emerald-500/30 bg-[#011108]/90 text-slate-100 placeholder-emerald-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-colors shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={p2Phone}
                onChange={(e) => setP2Phone(e.target.value)}
                placeholder="+91 9876543211"
                className="w-full px-3.5 py-2.5 rounded-lg border border-emerald-500/30 bg-[#011108]/90 text-slate-100 placeholder-emerald-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-colors shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
                Student ID / Roll No. (Optional)
              </label>
              <input
                type="text"
                value={p2StudentId}
                onChange={(e) => setP2StudentId(e.target.value)}
                placeholder="e.g. CS2026-088"
                className="w-full px-3.5 py-2.5 rounded-lg border border-emerald-500/30 bg-[#011108]/90 text-slate-100 placeholder-emerald-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-colors shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Team Password Credentials */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-emerald-900/60">
            <Lock className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wide drop-shadow-xs">
              4. Team Credentials
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
                Team Password (min 8 characters) <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-emerald-500/30 bg-[#011108]/90 text-slate-100 placeholder-emerald-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-colors shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-emerald-500/30 bg-[#011108]/90 text-slate-100 placeholder-emerald-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-colors shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-emerald-900/60">
          <div className="text-xs text-emerald-200/60">
            Already registered?{' '}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all">
              Log into Team Arena
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm transition-all shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:shadow-[0_0_35px_rgba(16,185,129,0.7)] flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-105 active:scale-95"
          >
            {submitting ? (
              <span>Registering Team...</span>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
    </div>
  );
};
