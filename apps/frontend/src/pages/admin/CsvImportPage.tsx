import React, { useState } from 'react';
import { adminService } from '../../services/admin.service';
import {
  CsvImportPreviewResponse,
  CsvImportConfirmResult,
  CsvColumnMapping,
} from '@ignitron/shared';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  ArrowRight,
  RefreshCw,
  FileCheck,
} from 'lucide-react';

export const CsvImportPage: React.FC = () => {
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvImportPreviewResponse | null>(null);
  const [mapping] = useState<Partial<CsvColumnMapping>>({});
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CsvImportConfirmResult | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setPreview(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
    };
    reader.onerror = () => {
      setError('Failed to read the selected file.');
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    if (!csvContent.trim()) {
      setError('Please select or upload a CSV file first.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await adminService.previewCsv(csvContent, mapping as any);
      setPreview(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to process CSV file.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!preview) return;

    const validRows = preview.rows
      .filter((r) => r.isValid && r.mappedData)
      .map((r) => r.mappedData!);

    if (validRows.length === 0) {
      setError('No valid rows available to import.');
      return;
    }

    setError(null);
    setImporting(true);

    try {
      const res = await adminService.confirmCsvImport(validRows);
      setResult(res);
      setPreview(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to confirm bulk import.');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadCredentialsCsv = () => {
    if (!result || result.generatedCredentials.length === 0) return;

    const headers = ['Team ID', 'Team Code', 'Team Name', 'Temporary Password', 'Generated At'];
    const rows = result.generatedCredentials.map((c) => [
      `"${c.teamId}"`,
      `"${c.teamCode}"`,
      `"${c.teamName.replace(/"/g, '""')}"`,
      `"${c.temporaryPassword}"`,
      `"${c.generatedAt}"`,
    ]);

    const csvData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ignitron_imported_credentials_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-violet-400" />
          <span>Unstop CSV Bulk Ingestion</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Import registered teams from Unstop, validate schema integrity, and generate competition credentials in a single transaction.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Ingestion Error</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Result Screen after successful import */}
      {result ? (
        <div className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Successfully Imported {result.importedCount} Teams!
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              All teams, participant records, and secure temporary credentials have been transactionally committed to the MySQL database.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 flex items-start gap-3 text-xs text-amber-300/90 max-w-2xl mx-auto">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-semibold block mb-0.5">One-Time Export Warning</span>
              Temporary passwords are encrypted in the database. Download and securely store this credentials CSV now to distribute to teams before the competition.
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={handleDownloadCredentialsCsv}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Download Credentials CSV ({result.generatedCredentials.length})</span>
            </button>
            <button
              onClick={() => {
                setResult(null);
                setCsvContent('');
                setFileName(null);
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              Import Another File
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Step 1: Upload CSV file */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-sky-400" />
              <span>Step 1: Select CSV File</span>
            </h2>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-colors">
                <Upload className="w-4 h-4" />
                <span>{fileName ? 'Choose Different File' : 'Browse CSV File'}</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {fileName && (
                <div className="flex items-center gap-2 text-xs text-sky-400 font-mono">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>{fileName}</span>
                  <span className="text-slate-500">
                    ({Math.round(csvContent.length / 1024)} KB)
                  </span>
                </div>
              )}
            </div>

            {csvContent && (
              <div className="pt-2">
                <button
                  onClick={handlePreview}
                  disabled={loading}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm shadow-sky-500/20 disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  <span>Analyze & Validate CSV Data</span>
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Validation Preview */}
          {preview && (
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>Step 2: Review Ingestion Preview</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Verify row validations before confirming database commit.
                  </p>
                </div>

                <button
                  onClick={handleConfirmImport}
                  disabled={importing || preview.validCount === 0}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {importing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>
                    Confirm & Ingest {preview.validCount} Valid Teams
                  </span>
                </button>
              </div>

              {/* Validation Summary Stat Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Total Rows</div>
                  <div className="text-xl font-bold text-white mt-1">{preview.totalRows}</div>
                </div>
                <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-800/40">
                  <div className="text-[10px] font-mono text-emerald-400 uppercase">Valid Records</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">{preview.validCount}</div>
                </div>
                <div className="p-3 bg-rose-950/20 rounded-xl border border-rose-800/40">
                  <div className="text-[10px] font-mono text-rose-400 uppercase">Invalid Records</div>
                  <div className="text-xl font-bold text-rose-400 mt-1">{preview.invalidCount}</div>
                </div>
                <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-800/40">
                  <div className="text-[10px] font-mono text-amber-400 uppercase">Duplicate Codes</div>
                  <div className="text-xl font-bold text-amber-400 mt-1">{preview.duplicateCodesCount}</div>
                </div>
                <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-800/40">
                  <div className="text-[10px] font-mono text-amber-400 uppercase">Duplicate Emails</div>
                  <div className="text-xl font-bold text-amber-400 mt-1">{preview.duplicateEmailsCount}</div>
                </div>
              </div>

              {/* Detailed Rows Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Team Name</th>
                        <th className="py-2.5 px-3">Participant 1</th>
                        <th className="py-2.5 px-3">Participant 2</th>
                        <th className="py-2.5 px-3">Validation Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {preview.rows.map((row) => (
                        <tr
                          key={row.rowIndex}
                          className={row.isValid ? 'hover:bg-slate-900/30' : 'bg-rose-950/10 hover:bg-rose-950/20'}
                        >
                          <td className="py-2.5 px-3 font-mono text-slate-500">#{row.rowIndex}</td>
                          <td className="py-2.5 px-3">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                Invalid
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white">
                            {row.mappedData?.teamName || row.rawRow['Team Name'] || row.rawRow['team_name'] || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            {row.mappedData?.participant1 ? (
                              <div>
                                <span className="text-slate-200 block">{row.mappedData.participant1.fullName}</span>
                                <span className="text-[10px] font-mono text-slate-500">{row.mappedData.participant1.email}</span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {row.mappedData?.participant2 ? (
                              <div>
                                <span className="text-slate-200 block">{row.mappedData.participant2.fullName}</span>
                                <span className="text-[10px] font-mono text-slate-500">{row.mappedData.participant2.email}</span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {row.isValid ? (
                              <span className="text-[11px] text-emerald-400/80">Ready to ingest</span>
                            ) : (
                              <div className="space-y-0.5">
                                {row.errors.map((err, idx) => (
                                  <div key={idx} className="text-[11px] text-rose-400 flex items-center gap-1">
                                    <span>•</span>
                                    <span>{err}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
