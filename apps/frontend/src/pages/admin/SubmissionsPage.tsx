import React, { useState, useEffect } from 'react';
import { AdminNav } from '../../components/AdminNav';
import { questionAndArenaService } from '../../services/question-and-arena.service';
import {
  AdminSubmissionListItem,
  AdminSubmissionDetailDto,
  GradeSubmissionDto,
} from '@ignitron/shared';
import {
  FileCheck2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Check,
  X,
  Copy,
  ShieldCheck,
} from 'lucide-react';

export const SubmissionsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<AdminSubmissionListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [roundFilter, setRoundFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Grade Modal state
  const [gradingModalOpen, setGradingModalOpen] = useState<boolean>(false);
  const [selectedSubDetail, setSelectedSubDetail] = useState<AdminSubmissionDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [gradeSubmitting, setGradeSubmitting] = useState<boolean>(false);

  // Rubric fields
  const [r2BugId, setR2BugId] = useState<number>(20);
  const [r2TestCorrectness, setR2TestCorrectness] = useState<number>(50);
  const [r2EdgeCases, setR2EdgeCases] = useState<number>(20);
  const [r2CodeQuality, setR2CodeQuality] = useState<number>(10);

  const [r3CaseScore, setR3CaseScore] = useState<number>(20);
  const [r3CodeQuality, setR3CodeQuality] = useState<number>(10);
  const [evalFeedback, setEvalFeedback] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // MCQ Review Modal state
  const [mcqModalOpen, setMcqModalOpen] = useState<boolean>(false);
  const [mcqReviewData, setMcqReviewData] = useState<any>(null);
  const [mcqLoading, setMcqLoading] = useState<boolean>(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const rNum = roundFilter !== 'all' ? parseInt(roundFilter, 10) : undefined;
      const status = statusFilter !== 'all' ? statusFilter : undefined;
      const data = await questionAndArenaService.listSubmissions({
        roundNumber: rNum,
        status,
      });
      setSubmissions(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to fetch submissions.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [roundFilter, statusFilter]);

  const handleOpenGradeModal = async (sub: AdminSubmissionListItem) => {
    setDetailLoading(true);
    setGradingModalOpen(true);
    setCopiedCode(false);
    try {
      const detail = await questionAndArenaService.getSubmissionDetail(sub.id);
      setSelectedSubDetail(detail);

      // Pre-fill rubric
      if (detail.criteriaScores) {
        if (detail.roundNumber === 2) {
          setR2BugId(detail.criteriaScores.bugIdentification ?? 20);
          setR2TestCorrectness(detail.criteriaScores.testCorrectness ?? 50);
          setR2EdgeCases(detail.criteriaScores.edgeCases ?? 20);
          setR2CodeQuality(detail.criteriaScores.codeQuality ?? 10);
        } else {
          setR3CaseScore(detail.score ?? 20);
          setR3CodeQuality(detail.criteriaScores.codeQuality ?? 10);
        }
      } else {
        // Defaults based on round
        if (detail.roundNumber === 2) {
          setR2BugId(20);
          setR2TestCorrectness(50);
          setR2EdgeCases(20);
          setR2CodeQuality(10);
        } else {
          const maxCase = detail.caseNumber === 1 ? 20 : detail.caseNumber === 2 ? 25 : 45;
          setR3CaseScore(maxCase);
          setR3CodeQuality(10);
        }
      }
      setEvalFeedback(detail.feedback || '');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to load submission details.' });
      setGradingModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubDetail) return;

    setGradeSubmitting(true);
    try {
      let total = 0;
      let criteriaScores: Record<string, number> = {};

      if (selectedSubDetail.roundNumber === 2) {
        total = Number(r2BugId) + Number(r2TestCorrectness) + Number(r2EdgeCases) + Number(r2CodeQuality);
        criteriaScores = {
          bugIdentification: Number(r2BugId),
          testCorrectness: Number(r2TestCorrectness),
          edgeCases: Number(r2EdgeCases),
          codeQuality: Number(r2CodeQuality),
        };
      } else {
        total = Number(r3CaseScore) + Number(r3CodeQuality);
        criteriaScores = {
          caseScore: Number(r3CaseScore),
          codeQuality: Number(r3CodeQuality),
        };
      }

      const dto: GradeSubmissionDto = {
        totalScore: Math.min(100, Math.max(0, total)),
        criteriaScores,
        feedback: evalFeedback.trim(),
      };

      await questionAndArenaService.gradeSubmission(selectedSubDetail.id, dto);
      setFeedback({ type: 'success', message: `Submission graded successfully! Score: ${dto.totalScore}` });
      setGradingModalOpen(false);
      await fetchSubmissions();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to grade submission.' });
    } finally {
      setGradeSubmitting(false);
    }
  };

  const handleOpenMcqReview = async (teamId: string) => {
    setMcqLoading(true);
    setMcqModalOpen(true);
    try {
      const data = await questionAndArenaService.getTeamMcqReview(teamId);
      setMcqReviewData(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to load MCQ review.' });
      setMcqModalOpen(false);
    } finally {
      setMcqLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const filteredSubmissions = submissions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.teamName.toLowerCase().includes(q) ||
      s.teamCode.toLowerCase().includes(q) ||
      (s.institution && s.institution.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#f8faf9] pb-16">
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-950 flex items-center gap-3">
              <span>Submissions & Evaluation</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                Grading Hub
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Inspect candidate source code, review automated Round 1 MCQ sheets, and perform manual rubric evaluations.
            </p>
          </div>

          <button
            onClick={fetchSubmissions}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Submissions</span>
          </button>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by team name, team code, or college..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>Round:</span>
            </div>
            <select
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
            >
              <option value="all">All Rounds</option>
              <option value="1">Round 1 (MCQ)</option>
              <option value="2">Round 2 (Bug Hunt)</option>
              <option value="3">Round 3 (Final Boss)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending Evaluation</option>
              <option value="EVALUATED">Evaluated</option>
            </select>
          </div>
        </div>

        {/* Submissions Table */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-xs">Loading tournament submissions...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No submissions found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Contestant code submissions for Round 2 and Round 3 will appear here in real time for manual evaluation.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-600 font-bold">
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Round / Problem</th>
                    <th className="py-3 px-4">Language</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Submitted At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-emerald-950">{sub.teamName}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {sub.teamCode} {sub.institution ? `• ${sub.institution}` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          Round {sub.roundNumber}
                          {sub.caseNumber ? ` (Case ${sub.caseNumber})` : ''}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {sub.questionTitle || 'General Relay Submission'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {sub.language}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.submissionStatus === 'EVALUATED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {sub.submissionStatus === 'EVALUATED' ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{sub.submissionStatus}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {sub.score !== null ? (
                          <span className="text-emerald-700">{sub.score} Marks</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(sub.submittedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {sub.roundNumber === 1 ? (
                          <button
                            onClick={() => handleOpenMcqReview(sub.teamId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review MCQs</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenGradeModal(sub)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{sub.submissionStatus === 'EVALUATED' ? 'Re-Grade' : 'Grade'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* CODE EVALUATION & GRADING MODAL */}
      {gradingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-5xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                  <span>Candidate Submission Evaluation</span>
                  {selectedSubDetail && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                      Round {selectedSubDetail.roundNumber}
                      {selectedSubDetail.caseNumber ? ` • Case ${selectedSubDetail.caseNumber}` : ''}
                    </span>
                  )}
                </h2>
                {selectedSubDetail && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Team: <strong className="text-slate-800">{selectedSubDetail.teamName}</strong> ({selectedSubDetail.teamCode})
                  </p>
                )}
              </div>

              <button onClick={() => setGradingModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {detailLoading || !selectedSubDetail ? (
              <div className="py-20 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                <p className="text-xs">Loading submission source code and rubric...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                {/* Left: Code Viewer */}
                <div className="lg:col-span-7 p-4 space-y-3 bg-slate-900 text-slate-200 overflow-y-auto max-h-[60vh] lg:max-h-none">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                    <span className="font-mono">Language: {selectedSubDetail.language}</span>
                    <button
                      onClick={() => handleCopyCode(selectedSubDetail.sourceCode)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-[11px]"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copied' : 'Copy Source'}</span>
                    </button>
                  </div>

                  <pre className="font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre p-2 bg-slate-950/60 rounded-lg">
                    {selectedSubDetail.sourceCode}
                  </pre>

                  {selectedSubDetail.compileOutput && (
                    <div className="mt-4 p-3 bg-red-950/40 border border-red-900 rounded-lg text-xs font-mono text-red-200">
                      <div className="font-bold mb-1">Compiler Output:</div>
                      <pre className="whitespace-pre-wrap">{selectedSubDetail.compileOutput}</pre>
                    </div>
                  )}
                </div>

                {/* Right: Rubric Scoring Form */}
                <div className="lg:col-span-5 p-5 space-y-4 bg-white overflow-y-auto">
                  <form onSubmit={handleSubmitGrade} className="space-y-4 text-xs">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm mb-1">Evaluation & Scoring Rubric</h3>
                      <p className="text-[11px] text-slate-500">
                        Score each criterion according to competition judging guidelines.
                      </p>
                    </div>

                    {selectedSubDetail.roundNumber === 2 ? (
                      /* Round 2 Rubric (100 Marks Total) */
                      <div className="space-y-3 p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40">
                        <div>
                          <div className="flex justify-between font-bold text-slate-700 mb-1">
                            <span>1. Bug Identification & Fix</span>
                            <span className="font-mono text-emerald-800">{r2BugId} / 20</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={20}
                            value={r2BugId}
                            onChange={(e) => setR2BugId(Number(e.target.value))}
                            className="w-full accent-emerald-600"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between font-bold text-slate-700 mb-1">
                            <span>2. Test Correctness Suite</span>
                            <span className="font-mono text-emerald-800">{r2TestCorrectness} / 50</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={50}
                            value={r2TestCorrectness}
                            onChange={(e) => setR2TestCorrectness(Number(e.target.value))}
                            className="w-full accent-emerald-600"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between font-bold text-slate-700 mb-1">
                            <span>3. Edge Cases & Boundary Logic</span>
                            <span className="font-mono text-emerald-800">{r2EdgeCases} / 20</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={20}
                            value={r2EdgeCases}
                            onChange={(e) => setR2EdgeCases(Number(e.target.value))}
                            className="w-full accent-emerald-600"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between font-bold text-slate-700 mb-1">
                            <span>4. Code Cleanliness & Style</span>
                            <span className="font-mono text-emerald-800">{r2CodeQuality} / 10</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            value={r2CodeQuality}
                            onChange={(e) => setR2CodeQuality(Number(e.target.value))}
                            className="w-full accent-emerald-600"
                          />
                        </div>

                        <div className="pt-2 border-t border-emerald-200 flex justify-between items-center text-sm font-extrabold text-emerald-950">
                          <span>Total Round 2 Marks:</span>
                          <span className="text-base font-mono bg-emerald-600 text-white px-2 py-0.5 rounded-lg">
                            {Number(r2BugId) + Number(r2TestCorrectness) + Number(r2EdgeCases) + Number(r2CodeQuality)} / 100
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Round 3 Rubric */
                      <div className="space-y-3 p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40">
                        <div>
                          <div className="flex justify-between font-bold text-slate-700 mb-1">
                            <span>
                              Algorithm & Correctness (Case {selectedSubDetail.caseNumber || 1})
                            </span>
                            <span className="font-mono text-emerald-800">
                              {r3CaseScore} / {selectedSubDetail.caseNumber === 1 ? 20 : selectedSubDetail.caseNumber === 2 ? 25 : 45}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={selectedSubDetail.caseNumber === 1 ? 20 : selectedSubDetail.caseNumber === 2 ? 25 : 45}
                            value={r3CaseScore}
                            onChange={(e) => setR3CaseScore(Number(e.target.value))}
                            className="w-full accent-emerald-600"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between font-bold text-slate-700 mb-1">
                            <span>Relay Code Quality & Efficiency</span>
                            <span className="font-mono text-emerald-800">{r3CodeQuality} / 10</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            value={r3CodeQuality}
                            onChange={(e) => setR3CodeQuality(Number(e.target.value))}
                            className="w-full accent-emerald-600"
                          />
                        </div>

                        <div className="pt-2 border-t border-emerald-200 flex justify-between items-center text-sm font-extrabold text-emerald-950">
                          <span>Case Total Marks:</span>
                          <span className="text-base font-mono bg-emerald-600 text-white px-2 py-0.5 rounded-lg">
                            {Number(r3CaseScore) + Number(r3CodeQuality)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Evaluator Feedback & Comments</label>
                      <textarea
                        rows={3}
                        value={evalFeedback}
                        onChange={(e) => setEvalFeedback(e.target.value)}
                        placeholder="Constructive feedback, edge cases failed, or remarks..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setGradingModalOpen(false)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={gradeSubmitting}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>{gradeSubmitting ? 'Saving...' : 'Finalize Grade'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MCQ ANSWER SHEET REVIEW MODAL */}
      {mcqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                  <span>Round 1 MCQ Answer Sheet Review</span>
                </h2>
                {mcqReviewData?.team && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Team: <strong className="text-slate-800">{mcqReviewData.team.teamName}</strong> ({mcqReviewData.team.teamCode})
                  </p>
                )}
              </div>
              <button onClick={() => setMcqModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {mcqLoading || !mcqReviewData ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                <p className="text-xs">Loading MCQ answer sheet...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Score Summary Banner */}
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-900">Total Score:</div>
                    <div className="text-2xl font-black text-emerald-950 font-mono">
                      {mcqReviewData.score} / 30 Marks
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-bold text-emerald-800">
                      {mcqReviewData.correctCount} / {mcqReviewData.totalQuestions} Correct
                    </div>
                    <div className="text-slate-500">
                      Accuracy: {((mcqReviewData.correctCount / (mcqReviewData.totalQuestions || 1)) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* 15 Questions Breakdown */}
                <div className="space-y-3">
                  {mcqReviewData.questions.map((q: any) => (
                    <div
                      key={q.questionId}
                      className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                        q.isCorrect
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : q.selectedOption !== null
                          ? 'border-red-200 bg-red-50/30'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-slate-900">
                          Q{q.orderNumber}. {q.title}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            q.isCorrect
                              ? 'bg-emerald-100 text-emerald-800'
                              : q.selectedOption !== null
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {q.isCorrect ? '+2 Marks' : '0 Marks'}
                        </span>
                      </div>

                      <p className="text-slate-600 text-[11px] whitespace-pre-wrap">{q.description}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {q.options?.map((opt: string, idx: number) => {
                          const isTeamChoice = q.selectedOption === idx;
                          const isCorrectChoice = q.correctOption === idx;

                          let bg = 'bg-white border-slate-200 text-slate-700';
                          if (isCorrectChoice) {
                            bg = 'bg-emerald-100/70 border-emerald-300 font-bold text-emerald-950';
                          } else if (isTeamChoice && !isCorrectChoice) {
                            bg = 'bg-red-100/70 border-red-300 font-bold text-red-950 line-through';
                          }

                          return (
                            <div key={idx} className={`p-1.5 rounded-lg border text-[11px] flex items-center gap-1.5 ${bg}`}>
                              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0 bg-white">
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className="truncate">{opt}</span>
                              {isCorrectChoice && <Check className="w-3 h-3 text-emerald-700 ml-auto shrink-0" />}
                              {isTeamChoice && !isCorrectChoice && <X className="w-3 h-3 text-red-700 ml-auto shrink-0" />}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200 italic">
                          Explanation: {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
