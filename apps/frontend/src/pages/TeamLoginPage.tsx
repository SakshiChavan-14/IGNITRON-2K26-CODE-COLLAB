import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { TeamParticipantOption } from '@ignitron/shared';
import { GoldenSnowfall } from '../components/GoldenSnowfall';
import {
  Users,
  Lock,
  Hash,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Search,
  UserPlus,
  Info,
} from 'lucide-react';

export const TeamLoginPage: React.FC = () => {
  const location = useLocation();
  const prefilledCode = (location.state as any)?.prefilledCode || '';

  const [teamCode, setTeamCode] = useState(prefilledCode);
  const [password, setPassword] = useState('');
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [teamName, setTeamName] = useState<string | null>(null);
  const [participants, setParticipants] = useState<TeamParticipantOption[]>([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { loginTeam } = useAuth();
  const navigate = useNavigate();

  const from = (location.state as any)?.from?.pathname || '/team/dashboard';

  const handleTeamCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTeamCode(val);
    setTeamName(null);
    setParticipants([]);
    setLookupError(null);

    if (val.includes('@')) {
      setEmailWarning(
        'You entered an email address. Login requires your assigned Team Code (e.g. IGN-XXXX), not a participant email.',
      );
    } else {
      setEmailWarning(null);
      const clean = val.trim().toUpperCase();
      if (clean.length === 8 && clean.startsWith('IGN-')) {
        handleLookup(clean);
      }
    }
  };

  const handleLookup = async (codeToLookup?: string) => {
    if (lookingUp) return;
    const rawCode = codeToLookup !== undefined ? codeToLookup : teamCode;
    const trimmed = rawCode.trim();
    if (!trimmed) return;

    if (trimmed.includes('@')) {
      setLookupError('Login requires your assigned Team Code (e.g. IGN-XXXX), not a participant email address.');
      setTeamName(null);
      setParticipants([]);
      return;
    }

    const normalizedCode = trimmed.toUpperCase();
    setLookupError(null);
    setLoginError(null);
    setLookingUp(true);

    try {
      const res = await authService.lookupTeam(normalizedCode);
      setTeamName(res.teamName);
      setParticipants(res.participants);
      if (res.participants.length > 0) {
        setSelectedParticipantId(res.participants[0].id);
      }
    } catch (err: any) {
      setLookupError(err?.message || 'Could not find a team matching this code.');
      setTeamName(null);
      setParticipants([]);
    } finally {
      setLookingUp(false);
    }
  };

  useEffect(() => {
    if (prefilledCode) {
      handleLookup(prefilledCode);
    }
  }, [prefilledCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = teamCode.trim();
    if (!trimmedCode) {
      setLoginError('Team Code is required.');
      return;
    }

    if (trimmedCode.includes('@')) {
      setLoginError('Login requires your assigned Team Code (e.g. IGN-XXXX), not a participant email address.');
      return;
    }

    // If team has not been looked up yet, perform lookup first
    if (!teamName || participants.length === 0) {
      await handleLookup(trimmedCode);
      return;
    }

    if (!selectedParticipantId) {
      setLoginError('Please select which participant (A or B) is logging in.');
      return;
    }

    setLoginError(null);
    setSubmitting(true);

    try {
      await loginTeam({
        teamCode: trimmedCode.toUpperCase(),
        password,
        participantId: selectedParticipantId,
      });
      navigate(from, { replace: true });
    } catch (err: any) {
      setLoginError(
        err?.message ||
          'Login failed. Please verify your team code and password. If a teammate is active, they must log out first.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#010905] overflow-hidden flex items-center justify-center p-4 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Dynamic Golden Snowfall Background */}
      <GoldenSnowfall />

      {/* Atmospheric Ambient Lighting Gradients */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-30 blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(245, 158, 11, 0.45) 0%, transparent 80%)',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] opacity-35 blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.4) 0%, transparent 75%)',
          }}
        />
      </div>

      {/* Dark Emerald Glass Form Card */}
      <div className="relative z-10 w-full max-w-md bg-[#03180f]/94 backdrop-blur-xl border border-emerald-500/30 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.65),0_0_35px_rgba(16,185,129,0.12)] p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <Users className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">
            Team Competition Access
          </h1>
          <p className="text-xs text-emerald-200/70 mt-1">
            Enter your Team Code and select the active relay participant
          </p>
        </div>

        {/* Informative Guidance Banner */}
        <div className="mb-5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5 shadow-xs">
          <Info className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold block text-emerald-300 mb-0.5">Login Notice</span>
            <span>
              Login requires your assigned <strong>Team Code</strong> (e.g. <code className="bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 px-1 py-0.5 rounded font-mono font-bold">IGN-XXXX</code>), not participant email addresses.
            </span>
          </div>
        </div>

        {loginError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2.5 shadow-md">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5 text-rose-300">Authentication Error</span>
              <span>{loginError}</span>
            </div>
          </div>
        )}

        {lookupError && (
          <div className="mb-5 p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5 shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>{lookupError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Team Code */}
          <div>
            <label htmlFor="teamCode" className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
              Assigned Team Code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400/60">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  id="teamCode"
                  name="ignitron_team_code"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  required
                  value={teamCode}
                  onChange={handleTeamCodeChange}
                  onBlur={() => {
                    if (teamCode.trim().length >= 4 && !teamName && !lookingUp) {
                      handleLookup();
                    }
                  }}
                  placeholder="e.g. IGN-4A1B"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#011108]/90 border border-emerald-500/30 rounded-xl text-sm font-mono text-slate-100 placeholder-emerald-200/40 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition-colors shadow-inner"
                />
              </div>
              <button
                type="button"
                onClick={() => handleLookup()}
                disabled={lookingUp || !teamCode.trim()}
                className="px-3.5 py-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-500/40 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {lookingUp ? (
                  <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Find</span>
                  </>
                )}
              </button>
            </div>
            {emailWarning && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>{emailWarning}</span>
              </div>
            )}
          </div>

          {/* Team Name Confirmation */}
          {teamName && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200">
              <span className="font-medium text-emerald-400">Team:</span>
              <span className="font-bold text-white drop-shadow-xs">{teamName}</span>
            </div>
          )}

          {/* Step 2: Active Participant Selection (A or B) */}
          {participants.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
                Active Relay Participant (A or B)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <select
                  value={selectedParticipantId}
                  onChange={(e) => setSelectedParticipantId(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-[#011108]/90 border border-emerald-500/30 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition-colors appearance-none shadow-inner"
                >
                  {participants.map((p, idx) => (
                    <option key={p.id} value={p.id} className="bg-[#02180e] text-slate-100">
                      Participant {idx === 0 ? 'A' : 'B'}: {p.fullName} ({p.email})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-emerald-200/60 mt-1">
                Competition rule: Exactly one participant holds the terminal lock at any time.
              </p>
            </div>
          )}

          {/* Step 3: Password */}
          <div>
            <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
              Team Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400/60">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-[#011108]/90 border border-emerald-500/30 rounded-xl text-sm text-slate-100 placeholder-emerald-200/40 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition-colors shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:shadow-[0_0_35px_rgba(16,185,129,0.7)] flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Enter Team Arena</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-emerald-900/60 flex items-center justify-center text-xs text-emerald-200/60 gap-1.5">
          <span>New contestant team?</span>
          <Link
            to="/register"
            className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 underline underline-offset-2 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register your team here</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
