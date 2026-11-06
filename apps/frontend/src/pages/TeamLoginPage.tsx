import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
} from 'lucide-react';

export const TeamLoginPage: React.FC = () => {
  const [teamCode, setTeamCode] = useState('');
  const [password, setPassword] = useState('');
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [teamName, setTeamName] = useState<string | null>(null);
  const [participants, setParticipants] = useState<TeamParticipantOption[]>([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { loginTeam } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/team/dashboard';

  const handleLookup = async () => {
    if (!teamCode.trim()) return;
    setLookupError(null);
    setLoginError(null);
    setLookingUp(true);

    try {
      const res = await authService.lookupTeam(teamCode.trim());
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipantId) {
      setLoginError('Please select which participant is logging in.');
      return;
    }

    setLoginError(null);
    setSubmitting(true);

    try {
      await loginTeam({
        teamCode: teamCode.trim().toUpperCase(),
        password,
        participantId: selectedParticipantId,
      });
      navigate(from, { replace: true });
    } catch (err: any) {
      setLoginError(
        err?.message ||
          'Login failed. Please check your team credentials and ensure no active concurrent session exists.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-xl shadow-2xl p-6 sm:p-8 backdrop-blur-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3 shadow-lg shadow-sky-500/10">
            <Users className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Team Competition Access
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            IGNITRON 2K26 Code Relay Portal
          </p>
        </div>

        {loginError && (
          <div className="mb-6 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Session Error</span>
              <span>{loginError}</span>
            </div>
          </div>
        )}

        {lookupError && (
          <div className="mb-6 p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 flex items-start gap-2.5 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{lookupError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Team Code */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Assigned Team Code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={teamCode}
                  onChange={(e) => {
                    setTeamCode(e.target.value.toUpperCase());
                    setTeamName(null);
                    setParticipants([]);
                  }}
                  onBlur={handleLookup}
                  placeholder="e.g. IGN-4A1B"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-slate-200 placeholder-slate-600 uppercase focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={handleLookup}
                disabled={lookingUp || !teamCode.trim()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {lookingUp ? (
                  <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Find</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Team Name Confirmation */}
          {teamName && (
            <div className="p-2.5 rounded-lg bg-sky-950/30 border border-sky-800/50 flex items-center justify-between text-xs text-sky-300">
              <span className="font-medium text-slate-400">Identified Team:</span>
              <span className="font-semibold text-sky-400">{teamName}</span>
            </div>
          )}

          {/* Step 2: Active Participant Selection */}
          {participants.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Active Relay Participant (1 active session permitted)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <select
                  value={selectedParticipantId}
                  onChange={(e) => setSelectedParticipantId(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors appearance-none"
                >
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} {p.studentId ? `(${p.studentId})` : ''} — {p.email}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                University competition rules strictly permit only one active participant per team at any time.
              </p>
            </div>
          )}

          {/* Step 3: Password */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Team Access Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Enter Code Relay Arena</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
          <span className="text-[11px] text-slate-500 font-mono">
            Registration managed exclusively via official University Unstop roster
          </span>
        </div>
      </div>
    </div>
  );
};

