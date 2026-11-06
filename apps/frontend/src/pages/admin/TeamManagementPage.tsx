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
      'P1 Name',
      'P1 Email',
      'P1 Student ID',
      'P2 Name',
      'P2 Email',
      'P2 Student ID',
    ];

    const rows = teams.map((t) => [
      `"${t.teamCode}"`,
      `"${t.teamName.replace(/"/g, '""')}"`,
      `"${(t.institution || '').replace(/"/g, '""')}"`,
      t.status,
      t.isActive ? 'Active' : 'Inactive',
      `"${t.participants[0]?.fullName || ''}"`,
      `"${t.participants[0]?.email || ''}"`,
      `"${t.participants[0]?.studentId || ''}"`,
      `"${t.participants[1]?.fullName || ''}"`,
      `"${t.participants[1]?.email || ''}"`,
      `"${t.participants[1]?.studentId || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ignitron_teams_roster_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-400" />
            <span>Team Roster Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered contestant teams, participant credentials, and session concurrency controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={teams.length === 0}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Roster CSV</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-sky-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team code, team name, institution, participant name or email..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-sky-500 transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISQUALIFIED">DISQUALIFIED</option>
            <option value="WITHDRAWN">WITHDRAWN</option>
          </select>
        </div>
      </div>

      {/* Teams Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Team & Institution</th>
                <th className="py-3 px-4">Participants (Exactly 2)</th>
                <th className="py-3 px-4">Active Session</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                    <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading team roster...
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No teams found matching search criteria.
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr key={team.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Team Code */}
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                      {team.teamCode}
                    </td>

                    {/* Team Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{team.teamName}</div>
                      <div className="text-[11px] text-slate-400">{team.institution || '—'}</div>
                    </td>

                    {/* Participants */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {team.participants.map((p, idx) => (
                          <div key={p.id} className="text-[11px] flex items-center gap-1.5">
                            <span className="font-mono text-slate-500">P{idx + 1}:</span>
                            <span className="font-medium text-slate-200">{p.fullName}</span>
                            <span className="text-slate-500 font-mono">({p.email})</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Live Session */}
                    <td className="py-3.5 px-4">
                      {team.activeSession ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-[11px] font-mono">
                          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                          <span>{team.activeSession.participantName}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">Idle</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                          team.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
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
                            className="p-1.5 rounded bg-rose-950/30 border border-rose-800/50 hover:bg-rose-900/40 text-rose-400 transition-colors"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Reset Password */}
                        <button
                          onClick={() => handleResetPassword(team.id, team.teamName)}
                          title="Generate new temporary password"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle active status */}
                        <button
                          onClick={() => handleToggleStatus(team.id, team.isActive)}
                          title={team.isActive ? 'Deactivate team' : 'Activate team'}
                          className={`p-1.5 rounded transition-colors ${
                            team.isActive
                              ? 'bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400'
                              : 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-400'
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Lock className="w-4 h-4" />
                <span>Generated Team Credentials</span>
              </div>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-amber-300/90 bg-amber-950/30 border border-amber-800/50 p-2.5 rounded-lg mb-4 leading-relaxed">
              <strong>Notice:</strong> This temporary password is only displayed once and is never stored in plain text. Share it securely with the designated team.
            </p>

            <div className="space-y-3 bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Team Name</span>
                <span className="text-white font-semibold">{createdCredentials.teamName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Team Code</span>
                <span className="text-sky-400 font-bold text-sm">{createdCredentials.teamCode}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Temporary Password</span>
                <span className="text-amber-400 font-bold text-sm">{createdCredentials.temporaryPassword}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  const text = `IGNITRON 2K26 Credentials\nTeam: ${createdCredentials.teamName}\nCode: ${createdCredentials.teamCode}\nPassword: ${createdCredentials.temporaryPassword}`;
                  navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Credentials'}</span>
              </button>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="py-2 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Single Team */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-400" />
                <span>Create Competition Team</span>
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTeam.teamName}
                  onChange={(e) => setNewTeam({ ...newTeam, teamName: e.target.value })}
                  placeholder="e.g. Binary Beasts"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Team Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={newTeam.teamCode}
                    onChange={(e) => setNewTeam({ ...newTeam, teamCode: e.target.value.toUpperCase() })}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 uppercase font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Institution / University
                  </label>
                  <input
                    type="text"
                    value={newTeam.institution}
                    onChange={(e) => setNewTeam({ ...newTeam, institution: e.target.value })}
                    placeholder="e.g. National Institute of Tech"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Participant 1 */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <span className="font-semibold text-sky-400 block">Participant 1 (Team Leader)</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Full Name *"
                    value={newTeam.participants[0].fullName}
                    onChange={(e) => {
                      const updated = [...newTeam.participants];
                      updated[0].fullName = e.target.value;
                      setNewTeam({ ...newTeam, participants: updated as any });
                    }}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email Address *"
                    value={newTeam.participants[0].email}
                    onChange={(e) => {
                      const updated = [...newTeam.participants];
                      updated[0].email = e.target.value;
                      setNewTeam({ ...newTeam, participants: updated as any });
                    }}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Student ID / Roll No"
                    value={newTeam.participants[0].studentId}
                    onChange={(e) => {
                      const updated = [...newTeam.participants];
                      updated[0].studentId = e.target.value;
                      setNewTeam({ ...newTeam, participants: updated as any });
                    }}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={newTeam.participants[0].phone}
                    onChange={(e) => {
                      const updated = [...newTeam.participants];
                      updated[0].phone = e.target.value;
                      setNewTeam({ ...newTeam, participants: updated as any });
                    }}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  />
                </div>
              </div>

              {/* Participant 2 */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <span className="font-semibold text-violet-400 block">Participant 2 (Teammate)</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Full Name *"
                    value={newTeam.participants[1].fullName}
                    onChange={(e) => {
                      const updated = [...newTeam.participants];
                      updated[1].fullName = e.target.value;
                      setNewTeam({ ...newTeam, participants: updated as any });
                    }}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email Address *"
                    value={newTeam.participants[1].email}
                    onChange={(e) => {
                      const updated = [...newTeam.participants];
                      updated[1].email = e.target.value;
                      setNewTeam({ ...newTeam, participants: updated as any });
                    }}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Student ID / Roll No"
                    value={newTeam.participants[1].studentId}
                    onChange={(e) => {
                      const updated = [...newTeam.participants];
                      updated[1].studentId = e.target.value;
                      setNewTeam({ ...newTeam, participants: updated as any });
                    }}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={newTeam.participants[1].phone}
                    onChange={(e) => {
                      const updated = [...newTeam.participants];
                      updated[1].phone = e.target.value;
                      setNewTeam({ ...newTeam, participants: updated as any });
                    }}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  {formSubmitting ? 'Creating Team...' : 'Create Team & Generate Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

