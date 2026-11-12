import React, { useEffect, useState } from 'react';
import { AdminNav } from '../../components/AdminNav';
import { announcementService } from '../../services/announcement.service';
import { AnnouncementItem, AnnouncementPriority } from '@ignitron/shared';
import {
  Megaphone,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';

export const AnnouncementManagementPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('NORMAL');
  const [isPublished, setIsPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await announcementService.getAllAnnouncements();
      setAnnouncements(data);
    } catch (err: any) {
      console.error('Failed to load announcements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle('');
    setMessage('');
    setPriority('NORMAL');
    setIsPublished(true);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: AnnouncementItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setMessage(item.message);
    setPriority(item.priority);
    setIsPublished(item.isPublished);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setErrorMsg('Title and message are required.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      if (editingId) {
        await announcementService.updateAnnouncement(editingId, {
          title,
          message,
          priority,
          isPublished,
        });
      } else {
        await announcementService.createAnnouncement({
          title,
          message,
          priority,
          isPublished,
        });
      }
      setModalOpen(false);
      await fetchAnnouncements();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      await announcementService.togglePublish(id, !currentStatus);
      await fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to update publication status');
    }
  };

  const handleDelete = async (id: string, titleStr: string) => {
    if (!window.confirm(`Delete announcement "${titleStr}"?`)) return;
    try {
      await announcementService.deleteAnnouncement(id);
      await fetchAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to delete announcement');
    }
  };

  const getPriorityBadge = (p: AnnouncementPriority) => {
    switch (p) {
      case 'URGENT':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'LOW':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] pb-12">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-950 flex items-center gap-3">
              <span>Announcement Center</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                Official Broadcasts
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Broadcast critical tournament briefings, schedule updates, and urgent alerts to contestants.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnnouncements}
              disabled={loading}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Announcement</span>
            </button>
          </div>
        </div>

        {/* Announcements List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-emerald-600" />
              <span>All Announcements ({announcements.length})</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Only published entries are visible to contestants
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs font-mono text-slate-400">
              Loading broadcast messages...
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">No announcements broadcast yet.</p>
              <button
                onClick={handleOpenCreate}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
              >
                Create First Announcement
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="p-6 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${getPriorityBadge(
                          item.priority,
                        )}`}
                      >
                        {item.priority}
                      </span>
                      {item.isPublished ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Published
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                          <EyeOff className="w-3 h-3" />
                          Draft / Hidden
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-emerald-950">{item.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {item.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                    <button
                      onClick={() => handleTogglePublish(item.id, item.isPublished)}
                      title={item.isPublished ? 'Unpublish' : 'Publish'}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors ${
                        item.isPublished
                          ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {item.isPublished ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Unpublish</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Publish</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      title="Edit Announcement"
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      title="Delete Announcement"
                      className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Create / Edit Announcement */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-emerald-600" />
                  <span>{editingId ? 'Edit Announcement' : 'New Tournament Broadcast'}</span>
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Round 1 Commences in 10 Minutes"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                    >
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent (Red Alert)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Publication Visibility
                    </label>
                    <select
                      value={isPublished ? 'true' : 'false'}
                      onChange={(e) => setIsPublished(e.target.value === 'true')}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                    >
                      <option value="true">Published (Visible to teams)</option>
                      <option value="false">Draft (Admin hidden)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Message Body
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Provide detailed instructions, rules updates, or timeline alerts..."
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Broadcast Announcement'}
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
