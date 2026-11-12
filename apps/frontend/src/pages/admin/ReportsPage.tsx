import React from 'react';
import { AdminNav } from '../../components/AdminNav';
import { FileSpreadsheet, Download, ShieldCheck, Award } from 'lucide-react';
import { adminService } from '../../services/admin.service';

export const ReportsPage: React.FC = () => {
  const [downloading, setDownloading] = React.useState(false);

  const handleExportRoster = async () => {
    try {
      setDownloading(true);
      const csv = await adminService.exportTeamsCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `ignitron_teams_roster_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export roster', err);
      alert('Failed to export team roster. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] pb-12">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-950 flex items-center gap-3">
            <span>Reports & Exports</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
              Audit Data
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Generate and export tournament reports, team credentials, competition audit logs, and final certificates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Official Team Roster CSV */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-emerald-950 mb-1">
                Full Team Roster Export
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Download verified roster of all registered teams, college affiliations, contestant names, emails, contact details, and account status in CSV format.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={handleExportRoster}
                disabled={downloading}
                className="w-full px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'Generating...' : 'Export Team Roster (CSV)'}</span>
              </button>
            </div>
          </div>

          {/* Audit Logs Report */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-emerald-950 mb-1">
                Security & Session Audit Logs
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Comprehensive activity trail of admin state transitions, participant logins, IP addresses, session handoffs, and credential updates.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="text-xs font-mono text-slate-400 text-center py-2 bg-slate-50 rounded-xl border border-slate-200">
                Logged in MySQL `ActivityLog`
              </div>
            </div>
          </div>

          {/* Tournament Standings & Certificates */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-emerald-950 mb-1">
                Final Standings & Certificates
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Official tournament summary certificate data, cumulative marks across rounds, and final winner verification for podium teams.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="text-xs font-mono text-slate-400 text-center py-2 bg-slate-50 rounded-xl border border-slate-200">
                Available at Tournament Conclusion
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
