import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { RegisterTeamResponse } from '@ignitron/shared';
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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white border border-emerald-200/80 rounded-2xl shadow-xl shadow-emerald-950/5 p-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-5 shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-emerald-950">
            Registration Successful!
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Your team is officially registered for <span className="font-semibold text-emerald-900">IGNITRON 2K26 Code Relay</span>.
          </p>

          <div className="my-6 p-5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-left space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-800 font-semibold">
                  Official Team Code
                </span>
                <div className="text-2xl font-black font-mono tracking-widest text-emerald-950 mt-0.5">
                  {registeredData.teamCode}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-2 rounded-lg bg-white hover:bg-emerald-100/50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-emerald-200/60 text-xs text-slate-600 space-y-1">
              <div><strong className="text-slate-800">Team Name:</strong> {registeredData.teamName}</div>
              <div><strong className="text-slate-800">College:</strong> {registeredData.institution}</div>
              <div>
                <strong className="text-slate-800">Contestants:</strong>{' '}
                {registeredData.participants.map((p) => p.fullName).join(' & ')}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left mb-6">
            <strong>Important:</strong> Save your <strong>Team Code</strong> and registered password. Both contestants will need this Team Code to access the arena on competition day.
          </div>

          <button
            onClick={() => navigate('/login', { state: { prefilledCode: registeredData.teamCode } })}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            <span>Proceed to Team Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-200/80 mb-3">
          <Users className="w-3.5 h-3.5 text-emerald-600" />
          <span>Official Team Entry</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-950">
          Register Your Team
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          IGNITRON 2K26 Code Relay requires exactly two contestants per team. Fill in your team and participant details below.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 sm:p-8 space-y-8">
        {/* Section 1: Team & College Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-emerald-950 uppercase tracking-wide">
              1. Team & Institution Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Team Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. ByteBandits"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                College / University Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. MIT College of Engineering"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Participant 1 (Lead Contestant) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-emerald-950 uppercase tracking-wide">
              2. Participant 1 (Lead Relay Contestant)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address (Personal or College) <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={p1Email}
                onChange={(e) => setP1Email(e.target.value)}
                placeholder="e.g. rahul@gmail.com or rahul@mit.edu"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={p1Phone}
                onChange={(e) => setP1Phone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Student ID / Roll No. (Optional)
              </label>
              <input
                type="text"
                value={p1StudentId}
                onChange={(e) => setP1StudentId(e.target.value)}
                placeholder="e.g. CS2026-042"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Participant 2 (Teammate Contestant) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-emerald-950 uppercase tracking-wide">
              3. Participant 2 (Teammate Relay Contestant)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                placeholder="e.g. Priya Patel"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address (Personal or College) <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={p2Email}
                onChange={(e) => setP2Email(e.target.value)}
                placeholder="e.g. priya@yahoo.com or priya@mit.edu"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={p2Phone}
                onChange={(e) => setP2Phone(e.target.value)}
                placeholder="+91 9876543211"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Student ID / Roll No. (Optional)
              </label>
              <input
                type="text"
                value={p2StudentId}
                onChange={(e) => setP2StudentId(e.target.value)}
                placeholder="e.g. CS2026-088"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Team Password Credentials */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Lock className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-emerald-950 uppercase tracking-wide">
              4. Team Credentials
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Team Password (min 8 characters) <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="text-emerald-700 hover:text-emerald-600 font-semibold underline underline-offset-2">
              Log into Team Arena
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
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
  );
};
