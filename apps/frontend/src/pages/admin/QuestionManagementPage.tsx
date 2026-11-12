import React, { useState, useEffect } from 'react';
import { AdminNav } from '../../components/AdminNav';
import { questionAndArenaService } from '../../services/question-and-arena.service';
import { QuestionDto, QuestionType, CreateQuestionDto } from '@ignitron/shared';
import {
  HelpCircle,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  RefreshCw,
  BookOpen,
  Layers,
  Clock,
  Sparkles,
  AlertCircle,
  X,
  Code,
  Save,
} from 'lucide-react';

export const QuestionManagementPage: React.FC = () => {
  const [activeRound, setActiveRound] = useState<number>(1);
  const [questions, setQuestions] = useState<QuestionDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionDto | null>(null);

  // Form fields
  const [formRound, setFormRound] = useState<number>(1);
  const [formType, setFormType] = useState<QuestionType>('MCQ');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formCaseNumber, setFormCaseNumber] = useState<number>(1);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formMarks, setFormMarks] = useState<number>(2);
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', '']);
  const [formCorrectOption, setFormCorrectOption] = useState<number>(0);
  const [formExplanation, setFormExplanation] = useState<string>('');
  const [formStarterCode, setFormStarterCode] = useState<string>('');
  const [formLanguage, setFormLanguage] = useState<string>('typescript');

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const data = await questionAndArenaService.listAdminQuestions(activeRound);
      setQuestions(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to load questions.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [activeRound]);

  const handleSeedQuestions = async () => {
    if (!confirm('Populate the default official question bank for IGNITRON 2K26? (15 MCQs for Round 1, Bug Hunt problem for Round 2, and 3 Cases for Round 3).')) {
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await questionAndArenaService.seedQuestions();
      setFeedback({ type: 'success', message: res.message });
      await fetchQuestions();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to seed question bank.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setFormRound(activeRound);
    setFormType(activeRound === 1 ? 'MCQ' : activeRound === 2 ? 'BUG_HUNT' : 'CODING_CASE');
    setFormOrder(questions.length + 1);
    setFormCaseNumber(activeRound === 3 ? Math.min(3, questions.length + 1) : 1);
    setFormTitle('');
    setFormDescription('');
    setFormMarks(activeRound === 1 ? 2 : activeRound === 2 ? 100 : 25);
    setFormOptions(['Option A', 'Option B', 'Option C', 'Option D']);
    setFormCorrectOption(0);
    setFormExplanation('');
    setFormStarterCode('');
    setFormLanguage('typescript');
    setModalOpen(true);
  };

  const handleOpenEdit = (q: QuestionDto) => {
    setEditingQuestion(q);
    setFormRound(q.roundNumber || activeRound);
    setFormType(q.type);
    setFormOrder(q.orderNumber);
    setFormCaseNumber(q.caseNumber || 1);
    setFormTitle(q.title);
    setFormDescription(q.description);
    setFormMarks(q.marks);
    setFormOptions(q.options && q.options.length ? [...q.options] : ['', '', '', '']);
    setFormCorrectOption(q.correctOption ?? 0);
    setFormExplanation(q.explanation || '');
    setFormStarterCode(q.starterCode || '');
    setFormLanguage(q.language || 'typescript');
    setModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) {
      setFeedback({ type: 'error', message: 'Title and description are required.' });
      return;
    }

    setActionLoading(true);
    setFeedback(null);

    try {
      const payload: CreateQuestionDto = {
        roundNumber: formRound,
        type: formType,
        orderNumber: Number(formOrder),
        caseNumber: formRound === 3 ? Number(formCaseNumber) : null,
        title: formTitle.trim(),
        description: formDescription.trim(),
        marks: Number(formMarks),
        options: formType === 'MCQ' ? formOptions.filter((o) => o.trim().length > 0) : null,
        correctOption: formType === 'MCQ' ? Number(formCorrectOption) : null,
        explanation: formExplanation.trim() || null,
        starterCode: formType !== 'MCQ' ? formStarterCode : null,
        language: formType !== 'MCQ' ? formLanguage : null,
      };

      if (editingQuestion) {
        await questionAndArenaService.updateQuestion(editingQuestion.id, payload);
        setFeedback({ type: 'success', message: 'Question updated successfully.' });
      } else {
        await questionAndArenaService.createQuestion(payload);
        setFeedback({ type: 'success', message: 'Question created successfully.' });
      }

      setModalOpen(false);
      await fetchQuestions();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to save question.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }
    setActionLoading(true);
    try {
      await questionAndArenaService.deleteQuestion(id);
      setFeedback({ type: 'success', message: 'Question deleted.' });
      await fetchQuestions();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to delete question.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] pb-16">
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-950 flex items-center gap-3">
              <span>Question Management</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                Official Bank
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Curate and configure problem statements, multiple-choice options, faulty codebases, and multi-case boss challenges.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSeedQuestions}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition shadow-xs disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Seed Official Bank</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Question</span>
            </button>
          </div>
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

        {/* Round Switcher Tabs */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveRound(1)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
              activeRound === 1
                ? 'border-emerald-600 text-emerald-900 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Round 1: MCQ Arena (15 Questions × 2 Marks = 30)</span>
          </button>
          <button
            onClick={() => setActiveRound(2)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
              activeRound === 2
                ? 'border-emerald-600 text-emerald-900 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Round 2: Bug Hunt Arena (100 Marks)</span>
          </button>
          <button
            onClick={() => setActiveRound(3)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
              activeRound === 3
                ? 'border-emerald-600 text-emerald-900 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Round 3: Final Boss (3 Cases: 20 + 25 + 45 + 10)</span>
          </button>
        </div>

        {/* Content Table / List */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-xs">Loading competition questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-4">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="max-w-sm mx-auto">
              <h3 className="text-sm font-bold text-slate-800">No questions found for Round {activeRound}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Click "Seed Official Bank" above to populate the official 15 MCQs, bug hunt codebase, and boss challenges automatically.
              </p>
            </div>
            <button
              onClick={handleSeedQuestions}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Seed Official Bank Now</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Showing {questions.length} questions for Round {activeRound}</span>
              <span className="font-mono font-medium">
                Total Marks: {questions.reduce((sum, q) => sum + q.marks, 0)}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                          #{q.orderNumber}
                        </span>
                        {q.caseNumber && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                            Case {q.caseNumber}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 text-slate-700">
                          {q.marks} Marks
                        </span>
                        {q.type !== 'MCQ' && q.language && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-purple-100 text-purple-800">
                            {q.language}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-emerald-950">{q.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                        {q.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(q)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 transition"
                        title="Edit question"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-700 hover:border-red-300 transition"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* MCQ Options Display */}
                  {q.type === 'MCQ' && q.options && (
                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg border flex items-center gap-2 ${
                            idx === q.correctOption
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                              : 'bg-slate-50/60 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0 bg-white">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="truncate">{opt}</span>
                          {idx === q.correctOption && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Starter code snippet preview */}
                  {q.starterCode && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5" />
                        <span>Starter Code Template:</span>
                      </div>
                      <pre className="text-[11px] font-mono bg-slate-900 text-slate-200 p-2.5 rounded-lg overflow-x-auto max-h-28">
                        {q.starterCode.slice(0, 300)}...
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-emerald-950">
                {editingQuestion ? 'Edit Question' : 'Create New Competition Question'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Round</label>
                  <select
                    value={formRound}
                    onChange={(e) => {
                      const r = Number(e.target.value);
                      setFormRound(r);
                      setFormType(r === 1 ? 'MCQ' : r === 2 ? 'BUG_HUNT' : 'CODING_CASE');
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value={1}>Round 1 (MCQ)</option>
                    <option value={2}>Round 2 (Bug Hunt)</option>
                    <option value={3}>Round 3 (Final Boss)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Order #</label>
                  <input
                    type="number"
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    min={1}
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Marks</label>
                  <input
                    type="number"
                    value={formMarks}
                    onChange={(e) => setFormMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    step="0.5"
                    min={1}
                    required
                  />
                </div>
              </div>

              {formRound === 3 && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Case Number (1, 2, or 3)</label>
                  <select
                    value={formCaseNumber}
                    onChange={(e) => setFormCaseNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value={1}>Case 1 (Trie Autocomplete - 20 Marks)</option>
                    <option value={2}>Case 2 (Relay Scheduler - 25 Marks)</option>
                    <option value={3}>Case 3 (Boss Flow Router - 45 Marks)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Question Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Asymptotic Complexity of Binary Heap"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Problem Statement / Prompt</label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detailed problem statement or question description (supports Markdown)..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  required
                />
              </div>

              {/* MCQ Options */}
              {formType === 'MCQ' && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-800">Multiple Choice Options (4 Choices)</div>
                  <div className="space-y-2">
                    {formOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctOptionRadio"
                          checked={formCorrectOption === idx}
                          onChange={() => setFormCorrectOption(idx)}
                          className="text-emerald-600 focus:ring-emerald-500"
                          title="Mark as correct answer"
                        />
                        <span className="font-bold text-slate-500 w-4">{String.fromCharCode(65 + idx)}:</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...formOptions];
                            newOpts[idx] = e.target.value;
                            setFormOptions(newOpts);
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-md text-xs"
                          required
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 italic mt-1">
                    Select the radio button next to the option that is the strictly correct answer.
                  </p>
                </div>
              )}

              {/* Coding Starter Code */}
              {formType !== 'MCQ' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Starter Code Template</label>
                    <select
                      value={formLanguage}
                      onChange={(e) => setFormLanguage(e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded-md text-xs"
                    >
                      <option value="typescript">TypeScript</option>
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                    </select>
                  </div>
                  <textarea
                    rows={6}
                    value={formStarterCode}
                    onChange={(e) => setFormStarterCode(e.target.value)}
                    placeholder="// Starter boilerplate code..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-slate-900 text-slate-200"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Admin Explanation / Notes</label>
                <textarea
                  rows={2}
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Explanation of correct solution (visible to admins only)..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingQuestion ? 'Update Question' : 'Save Question'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
