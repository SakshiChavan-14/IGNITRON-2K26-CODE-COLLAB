import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { TeamParticipantOption } from '@ignitron/shared';
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
    }
  };

  const handleLookup = async (codeToLookup?: string) => {
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-emerald-950/5 p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-emerald-950">
            Team Competition Access
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter your Team Code and select the active relay participant
          </p>
        </div>

        {/* Informative Guidance Banner */}
        <div className="mb-5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold block text-emerald-900 mb-0.5">Login Notice</span>
            <span>
              Login requires your assigned <strong>Team Code</strong> (e.g. <code className="bg-emerald-100/90 px-1 py-0.5 rounded font-mono font-bold text-emerald-800">IGN-XXXX</code>), not participant email addresses.
            </span>
          </div>
        </div>

        {loginError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Authentication Error</span>
              <span>{loginError}</span>
            </div>
          </div>
        )}

        {lookupError && (
          <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>{lookupError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Team Code */}
          <div>
            <label htmlFor="teamCode" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Assigned Team Code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                  onBlur={() => handleLookup()}
                  placeholder="e.g. IGN-4A1B"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors shadow-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => handleLookup()}
                disabled={lookingUp || !teamCode.trim()}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {lookingUp ? (
                  <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    <span>Find</span>
                  </>
                )}
              </button>
            </div>
            {emailWarning && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>{emailWarning}</span>
              </div>
            )}
          </div>

          {/* Team Name Confirmation */}
          {teamName && (
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between text-xs text-emerald-950">
              <span className="font-medium text-emerald-800">Team:</span>
              <span className="font-bold text-emerald-950">{teamName}</span>
            </div>
          )}

          {/* Step 2: Active Participant Selection (A or B) */}
          {participants.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Active Relay Participant (A or B)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600">
                  <UserCheck className="w-4 h-4" />
                </div>
                <select
                  value={selectedParticipantId}
                  onChange={(e) => setSelectedParticipantId(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors appearance-none shadow-xs"
                >
                  {participants.map((p, idx) => (
                    <option key={p.id} value={p.id}>
                      Participant {idx === 0 ? 'A' : 'B'}: {p.fullName} ({p.email})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Competition rule: Exactly one participant holds the terminal lock at any time.
              </p>
            </div>
          )}

          {/* Step 3: Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Team Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors shadow-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Enter Team Arena</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center text-xs text-slate-500 gap-1.5">
          <span>New contestant team?</span>
          <Link
            to="/register"
            className="text-emerald-700 hover:text-emerald-600 font-bold flex items-center gap-1 underline underline-offset-2"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register your team here</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
