import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';
import {
  TeamListItem,
  TeamCredentials,
  CreateTeamDto,
} from '@ignitron/shared';
import {
  Users,
  Search,
  Plus,
  Radio,
  Lock,
  UserX,
  UserCheck,
  RotateCcw,
  Copy,
  Check,
  X,
  Download,
  AlertCircle,
  ShieldAlert,
  Calendar,
  Clock,
} from 'lucide-react';

export const TeamManagementPage: React.FC = () => {
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<TeamCredentials | null>(null);
  const [copied, setCopied] = useState(false);

  // Create team form state
  const [newTeam, setNewTeam] = useState<CreateTeamDto>({
    teamCode: '',
    teamName: '',
    institution: '',
    participants: [
      { fullName: '', email: '', phone: '', studentId: '' },
      { fullName: '', email: '', phone: '', studentId: '' },
    ],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const data = await adminService.getTeams(search, statusFilter);
      setTeams(data);
    } catch (err) {
      console.error('Failed to fetch teams', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [search, statusFilter]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    try {
      const res = await adminService.createTeam(newTeam);
      setShowCreateModal(false);
      setCreatedCredentials(res.credentials);
      // Reset form
      setNewTeam({
        teamCode: '',
        teamName: '',
        institution: '',
        participants: [
          { fullName: '', email: '', phone: '', studentId: '' },
          { fullName: '', email: '', phone: '', studentId: '' },
        ],
      });
      fetchTeams();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create team.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleResetPassword = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Reset password for team "${teamName}"? This will terminate any active session.`)) {
      return;
    }
    try {
      const creds = await adminService.resetPassword(teamId);
      setCreatedCredentials(creds);
      fetchTeams();
    } catch (err: any) {
      alert(err?.message || 'Failed to reset password');
    }
  };

  const handleRevokeSession = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Revoke active participant session for team "${teamName}"?`)) {
      return;
    }
    try {
      await adminService.revokeSession(teamId);
      fetchTeams();
    } catch (err: any) {
      alert(err?.message || 'Failed to revoke session');
    }
  };

  const handleToggleStatus = async (teamId: string, currentStatus: boolean) => {
    try {
      await adminService.toggleTeamStatus(teamId, !currentStatus);
      fetchTeams();
    } catch (err: any) {
      alert(err?.message || 'Failed to toggle status');
    }
  };

  const handleExportCsv = () => {
    if (teams.length === 0) return;
    const headers = [
      'Team Code',
      'Team Name',
      'Institution',
      'Status',
      'Is Active',
      'Registered Date',
      'Last Login Date',
      'Active Session Participant',
      'Participant 1 Name',
      'Participant 1 Email',
      'Participant 1 Phone',
      'Participant 1 Student ID',
      'Participant 2 Name',
      'Participant 2 Email',
      'Participant 2 Phone',
      'Participant 2 Student ID',
    ];

    const escapeCsv = (val?: string | null) => {
      if (!val) return '""';
      return `"${val.replace(/"/g, '""')}"`;
    };

    const rows = teams.map((t) => [
      escapeCsv(t.teamCode),
      escapeCsv(t.teamName),
      escapeCsv(t.institution),
      escapeCsv(t.status),
      t.isActive ? 'Active' : 'Inactive',
      escapeCsv(t.createdAt ? new Date(t.createdAt).toLocaleString() : ''),
      escapeCsv(t.lastLoginAt ? new Date(t.lastLoginAt).toLocaleString() : 'Never'),
      escapeCsv(t.activeSession?.participantName || 'None (Idle)'),
      escapeCsv(t.participants[0]?.fullName),
      escapeCsv(t.participants[0]?.email),
      escapeCsv(t.participants[0]?.phone),
      escapeCsv(t.participants[0]?.studentId),
      escapeCsv(t.participants[1]?.fullName),
      escapeCsv(t.participants[1]?.email),
      escapeCsv(t.participants[1]?.phone),
      escapeCsv(t.participants[1]?.studentId),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ignitron_registered_teams_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] pb-16 pt-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-emerald-950 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>Team Roster Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            View registered teams, participant rosters, login history, and session concurrency controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={teams.length === 0}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Roster CSV</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Team Entry</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by team code, team name, institution, or contestant email..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISQUALIFIED">DISQUALIFIED</option>
            <option value="WITHDRAWN">WITHDRAWN</option>
          </select>
        </div>
      </div>

      {/* Teams Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Team & Institution</th>
                <th className="py-3 px-4">Contestants (Exactly 2)</th>
                <th className="py-3 px-4">Registration & Login</th>
                <th className="py-3 px-4">Active Terminal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading team roster...
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No teams found matching search criteria.
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr key={team.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Team Code */}
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                      {team.teamCode}
                    </td>

                    {/* Team Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{team.teamName}</div>
                      <div className="text-[11px] text-slate-500">{team.institution || '—'}</div>
                    </td>

                    {/* Participants */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {team.participants.map((p, idx) => (
                          <div key={p.id} className="text-[11px] flex items-center gap-1.5">
                            <span className="font-mono text-slate-400 font-bold">P{idx + 1}:</span>
                            <span className="font-semibold text-slate-800">{p.fullName}</span>
                            <span className="text-slate-500 font-mono">({p.email})</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Registration & Last Login */}
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] space-y-0.5">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Reg: {new Date(team.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Login: {team.lastLoginAt ? new Date(team.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Live Session */}
                    <td className="py-3.5 px-4">
                      {team.activeSession ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono font-semibold">
                          <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                          <span>{team.activeSession.participantName}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">Idle</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                          team.isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {team.isActive ? team.status : 'DISABLED'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Revoke Session if active */}
                        {team.activeSession && (
                          <button
                            onClick={() => handleRevokeSession(team.id, team.teamName)}
                            title="Revoke active participant session"
                            className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 transition-colors"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Reset Password */}
                        <button
                          onClick={() => handleResetPassword(team.id, team.teamName)}
                          title="Generate new temporary password"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle active status */}
                        <button
                          onClick={() => handleToggleStatus(team.id, team.isActive)}
                          title={team.isActive ? 'Deactivate team' : 'Activate team'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            team.isActive
                              ? 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-slate-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {team.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Reveal Temporary Credentials */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Generated Team Credentials</span>
              </div>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4 leading-relaxed">
              <strong>Notice:</strong> This temporary password is only displayed once and is never stored in plain text. Share it securely with the designated team.
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Team Name</span>
                <span className="text-slate-900 font-bold">{createdCredentials.teamName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Team Code</span>
                <span className="text-emerald-800 font-bold text-sm">{createdCredentials.teamCode}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Temporary Password</span>
                <span className="text-rose-600 font-black text-sm">{createdCredentials.temporaryPassword}</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Team: ${createdCredentials.teamName}\nCode: ${createdCredentials.teamCode}\nPassword: ${createdCredentials.temporaryPassword}`,
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manual Team Entry */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>Manual Team Entry</span>
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Team Name *</label>
                  <input
                    type="text"
                    required
                    value={newTeam.teamName}
                    onChange={(e) => setNewTeam({ ...newTeam, teamName: e.target.value })}
                    placeholder="e.g. AlgoWarriors"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Institution</label>
                  <input
                    type="text"
                    value={newTeam.institution || ''}
                    onChange={(e) => setNewTeam({ ...newTeam, institution: e.target.value })}
                    placeholder="e.g. University"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Contestant 1 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-emerald-900 block">Contestant 1 (Lead Relay)</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={newTeam.participants[0].fullName}
                    onChange={(e) => {
                      const p = [...newTeam.participants];
                      p[0].fullName = e.target.value;
                      setNewTeam({ ...newTeam, participants: p as any });
                    }}
                    placeholder="Full Name *"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-slate-800"
                  />
                  <input
                    type="email"
                    required
                    value={newTeam.participants[0].email}
                    onChange={(e) => {
                      const p = [...newTeam.participants];
                      p[0].email = e.target.value;
                      setNewTeam({ ...newTeam, participants: p as any });
                    }}
                    placeholder="Email Address *"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-slate-800"
                  />
                </div>
              </div>

              {/* Contestant 2 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-emerald-900 block">Contestant 2 (Teammate Relay)</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={newTeam.participants[1].fullName}
                    onChange={(e) => {
                      const p = [...newTeam.participants];
                      p[1].fullName = e.target.value;
                      setNewTeam({ ...newTeam, participants: p as any });
                    }}
                    placeholder="Full Name *"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-slate-800"
                  />
                  <input
                    type="email"
                    required
                    value={newTeam.participants[1].email}
                    onChange={(e) => {
                      const p = [...newTeam.participants];
                      p[1].email = e.target.value;
                      setNewTeam({ ...newTeam, participants: p as any });
                    }}
                    placeholder="Email Address *"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
                >
                  {formSubmitting ? 'Creating Team...' : 'Create & Generate Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
