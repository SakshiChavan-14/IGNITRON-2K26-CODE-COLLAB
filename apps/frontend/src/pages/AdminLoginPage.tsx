import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoldenSnowfall } from '../components/GoldenSnowfall';
import { Shield, Lock, Mail, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/admin/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginAdmin({ email, password });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your administrator credentials.');
    } finally {
      setLoading(false);
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
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <Shield className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">
            Administrator Gateway
          </h1>
          <p className="text-xs text-emerald-200/70 mt-1">
            Competition management, team orchestration & live monitoring
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2.5 shadow-md">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-400/60">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ignitron.local"
                className="w-full pl-9 pr-3 py-2.5 bg-[#011108]/90 border border-emerald-500/30 rounded-xl text-sm text-slate-100 placeholder-emerald-200/40 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25 transition-colors shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-200/90 mb-1.5">
              Security Key / Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-400/60">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-[#011108]/90 border border-emerald-500/30 rounded-xl text-sm text-slate-100 placeholder-emerald-200/40 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25 transition-colors shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:shadow-[0_0_35px_rgba(16,185,129,0.7)] flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Access Administrator Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-emerald-900/60 flex items-center justify-center">
          <Link
            to="/login"
            className="text-xs text-emerald-200/60 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Team Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
