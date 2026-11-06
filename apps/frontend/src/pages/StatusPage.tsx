import React from 'react';
import { useHealth } from '../hooks/useHealth';
import { StatusBadge, StatusVariant } from '../components/StatusBadge';

export const StatusPage: React.FC = () => {
  const {
    data,
    readiness,
    backendStatus,
    apiStatus,
    databaseStatus,
    latencyMs,
    lastChecked,
    refetch,
    isRefetching,
    error,
  } = useHealth(4000);

  const getBackendBadgeVariant = (): StatusVariant => {
    if (backendStatus === 'CONNECTED') return 'success';
    if (backendStatus === 'CONNECTING') return 'warning';
    return 'danger';
  };

  const getApiBadgeVariant = (): StatusVariant => {
    if (apiStatus === 'HEALTHY') return 'success';
    if (apiStatus === 'CHECKING') return 'warning';
    return 'danger';
  };

  return (
    <div className="space-y-8 my-auto">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          IGNITRON <span className="text-orange-500">2K26</span>
        </h1>
        <p className="text-lg font-mono tracking-widest text-orange-400 font-semibold uppercase">
          CODE RELAY
        </p>
        <p className="text-sm text-slate-400 max-w-lg mx-auto pt-1">
          Technical Architecture Verification & System Foundation Monitor
        </p>
      </div>

      {/* Primary Status Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Frontend Status */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Frontend Service
            </span>
            <div className="text-xl font-bold tracking-tight text-white">
              FRONTEND STATUS: <span className="text-emerald-400">ONLINE</span>
            </div>
            <p className="text-xs text-slate-500 pt-1">
              Vite + React (TypeScript) • Single-Page App
            </p>
          </div>
          <div className="pt-4 flex items-center justify-between border-t border-slate-800/80 mt-4">
            <span className="text-xs font-mono text-slate-400">Runtime:</span>
            <StatusBadge label="Running" variant="success" pulse={true} />
          </div>
        </div>

        {/* Backend Status */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Backend Service
            </span>
            <div className="text-xl font-bold tracking-tight text-white">
              BACKEND STATUS:{' '}
              {backendStatus === 'CONNECTED' ? (
                <span className="text-emerald-400">CONNECTED</span>
              ) : backendStatus === 'CONNECTING' ? (
                <span className="text-amber-400">CONNECTING...</span>
              ) : (
                <span className="text-rose-400">DISCONNECTED</span>
              )}
            </div>
            <p className="text-xs text-slate-500 pt-1">
              NestJS Modular Monolith • Port 4000
            </p>
          </div>
          <div className="pt-4 flex items-center justify-between border-t border-slate-800/80 mt-4">
            <span className="text-xs font-mono text-slate-400">
              {backendStatus === 'CONNECTED' && latencyMs !== null
                ? `Latency: ${latencyMs}ms`
                : backendStatus === 'CONNECTING'
                ? 'Probing...'
                : 'Connection Failed'}
            </span>
            <StatusBadge
              label={
                backendStatus === 'CONNECTED'
                  ? 'Connected'
                  : backendStatus === 'CONNECTING'
                  ? 'Checking connection'
                  : 'Disconnected'
              }
              variant={getBackendBadgeVariant()}
              pulse={backendStatus === 'CONNECTED'}
            />
          </div>
        </div>

        {/* API Status */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              REST API Endpoint
            </span>
            <div className="text-xl font-bold tracking-tight text-white">
              API STATUS:{' '}
              {apiStatus === 'HEALTHY' ? (
                <span className="text-emerald-400">HEALTHY</span>
              ) : apiStatus === 'CHECKING' ? (
                <span className="text-amber-400">CHECKING...</span>
              ) : (
                <span className="text-rose-400">UNHEALTHY</span>
              )}
            </div>
            <p className="text-xs text-slate-500 pt-1 font-mono">
              Endpoint: /api/health
            </p>
          </div>
          <div className="pt-4 flex items-center justify-between border-t border-slate-800/80 mt-4">
            <span className="text-xs font-mono text-slate-400">Proxy Target:</span>
            <StatusBadge
              label={apiStatus}
              variant={getApiBadgeVariant()}
            />
          </div>
        </div>
      </div>

      {/* Diagnostics & Architecture Information */}
      <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white">System Diagnostics</h2>
            <p className="text-xs text-slate-400 font-mono">
              Last probe:{' '}
              {lastChecked ? lastChecked.toLocaleTimeString() : 'Awaiting initial probe...'}
            </p>
          </div>
          <button
            onClick={refetch}
            disabled={isRefetching}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-50 text-slate-200 text-xs font-mono rounded-lg transition-colors border border-slate-700 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <span className={isRefetching ? 'animate-spin' : ''}>🔄</span>
            {isRefetching ? 'Testing Connection...' : 'Poll API Now'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block uppercase tracking-wider mb-1">
              Environment
            </span>
            <span className="text-orange-400 font-semibold">
              {data?.environment || import.meta.env.MODE || 'development'}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block uppercase tracking-wider mb-1">
              API Base Strategy
            </span>
            <span className="text-slate-200">
              Relative Proxy (/api)
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block uppercase tracking-wider mb-1">
              Server Uptime
            </span>
            <span className="text-slate-200">
              {data?.uptimeSeconds !== undefined ? `${data.uptimeSeconds}s` : 'Offline'}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block uppercase tracking-wider mb-1">
              Database (MySQL)
            </span>
            <span
              className={
                databaseStatus === 'CONNECTED'
                  ? 'text-emerald-400 font-semibold'
                  : databaseStatus === 'CHECKING'
                  ? 'text-amber-400 font-semibold'
                  : 'text-rose-400 font-semibold'
              }
            >
              {databaseStatus}
            </span>
          </div>
        </div>

        {/* Live Payload Preview */}
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-2">
            API Health Response Payload:
          </span>
          <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs overflow-x-auto text-slate-300">
            {backendStatus === 'CONNECTED' && data ? (
              JSON.stringify({ health: data, readiness: readiness || 'Probing readiness...' }, null, 2)
            ) : backendStatus === 'CONNECTING' ? (
              '// Connecting to backend /api/health...'
            ) : (
              `// ERROR: Backend unreachable via /api/health proxy\n// ${
                error instanceof Error ? error.message : 'Connection refused'
              }\n// Please ensure NestJS backend is running on port 4000.`
            )}
          </pre>
        </div>
      </div>
    </div>
  );
};

