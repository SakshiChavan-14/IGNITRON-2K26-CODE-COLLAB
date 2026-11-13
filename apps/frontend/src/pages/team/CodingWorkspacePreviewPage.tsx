import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Code2,
  Play,
  Send,
  AlertTriangle,
  Loader2,
  Terminal,
  Check,
  ChevronLeft,
  Clock,
  PauseCircle,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Lock,
} from 'lucide-react';
import CodeMirror, { EditorView, keymap } from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { indentWithTab } from '@codemirror/commands';

import { executionService } from '../../services/execution.service';
import { questionAndArenaService } from '../../services/question-and-arena.service';
import { useCompetitionState, useServerTimer } from '../../hooks/useCompetition';
import {
  CodeExecutionResultDto,
  SanitizedQuestionDto,
} from '@ignitron/shared';

// Custom dark theme extension matching IGNITRON slate-950 UI styling
const customDarkTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: '#020617', // slate-950
    fontSize: '12.5px',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    lineHeight: '1.6',
  },
  '.cm-gutters': {
    backgroundColor: '#020617',
    color: '#475569', // slate-600
    borderRight: '1px solid #1e293b', // slate-800
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(51, 65, 85, 0.25)', // slate-700/25
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(51, 65, 85, 0.35)',
    color: '#94a3b8', // slate-400
  },
  '.cm-selectionMatch': {
    backgroundColor: 'rgba(56, 189, 248, 0.2)', // sky-400/20
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#38bdf8', // sky-400
  },
});

interface CaseDraftCache {
  code: string;
  language: string;
  version: number;
  isLoaded: boolean;
  isSubmitted: boolean;
  submissionId?: string | null;
  submittedAt?: string | null;
}

export const CodingWorkspacePreviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const roundNumber = searchParams.get('round') ? parseInt(searchParams.get('round')!, 10) : 2;
  const [activeCase, setActiveCase] = useState<number>(1);

  // Authoritative Competition State & Timer
  const { data: compState } = useCompetitionState();
  const isCompetitionPaused = Boolean(compState?.isPaused);
  const timer = useServerTimer(
    compState?.deadlineAt,
    isCompetitionPaused,
    compState?.remainingDurationSeconds,
  );

  const [questions, setQuestions] = useState<SanitizedQuestionDto[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<SanitizedQuestionDto | null>(null);

  const [language, setLanguage] = useState<'cpp' | 'python' | 'java' | 'javascript' | 'typescript'>('typescript');
  const [code, setCode] = useState('');

  // Per-Case isolated state caching (prevents case overwrites during switching)
  const [caseDrafts, setCaseDrafts] = useState<Record<number, CaseDraftCache>>({});
  const [submittedCases, setSubmittedCases] = useState<number[]>([]);
  const [isRoundSubmitted, setIsRoundSubmitted] = useState<boolean>(false);
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'sample' | 'custom' | 'output'>('sample');
  const [customInput, setCustomInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<CodeExecutionResultDto | null>(null);

  // Autosave State & Refs
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const versionRef = useRef<number>(0);
  const lastSavedCodeRef = useRef<string>('');
  const lastSavedLangRef = useRef<string>('');
  const isInitialLoadedRef = useRef<boolean>(false);

  // Submission State
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Check if current case/round is submitted
  const isCurrentCaseSubmitted =
    roundNumber === 2 ? isRoundSubmitted : submittedCases.includes(activeCase);

  // 1. Load round questions
  useEffect(() => {
    let isMounted = true;
    questionAndArenaService
      .getQuestionsForRound(roundNumber)
      .then((qs) => {
        if (!isMounted) return;
        setQuestions(qs);
        if (roundNumber === 3) {
          const matched = qs.find((q) => q.caseNumber === activeCase) || qs[0];
          setCurrentQuestion(matched || null);
        } else {
          setCurrentQuestion(qs[0] || null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err?.status === 403 || err?.message?.includes('not qualified')) {
          setAccessDeniedError(err.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [roundNumber]);

  // Update currentQuestion when activeCase changes in Round 3
  useEffect(() => {
    if (roundNumber === 3 && questions.length > 0) {
      const matched = questions.find((q) => q.caseNumber === activeCase) || questions[0];
      setCurrentQuestion(matched || null);
    }
  }, [activeCase, questions, roundNumber]);

  // 2. Load draft for specific case
  const loadCaseDraft = useCallback(
    async (caseNum: number) => {
      isInitialLoadedRef.current = false;
      setSaveStatus('idle');

      try {
        const draft = await questionAndArenaService.getWorkspaceDraft(roundNumber, caseNum);
        setCode(draft.sourceCode);
        setLanguage((draft.language as any) || 'typescript');
        versionRef.current = draft.version;
        lastSavedCodeRef.current = draft.sourceCode;
        lastSavedLangRef.current = draft.language;

        if (roundNumber === 2 && (draft as any).isSubmitted) {
          setIsRoundSubmitted(true);
        }
        if ((draft as any).submittedCases) {
          setSubmittedCases((draft as any).submittedCases);
        }

        setCaseDrafts((prev) => ({
          ...prev,
          [caseNum]: {
            code: draft.sourceCode,
            language: draft.language,
            version: draft.version,
            isLoaded: true,
            isSubmitted: Boolean((draft as any).isSubmitted),
            submissionId: (draft as any).submissionId,
            submittedAt: (draft as any).submittedAt,
          },
        }));

        isInitialLoadedRef.current = true;
        setSaveStatus('saved');
      } catch (err: any) {
        if (err?.status === 403 || err?.message?.includes('not qualified')) {
          setAccessDeniedError(err.message);
        } else {
          console.warn('Could not load draft from backend:', err?.message);
        }
        isInitialLoadedRef.current = true;
      }
    },
    [roundNumber],
  );

  useEffect(() => {
    loadCaseDraft(activeCase);
  }, [roundNumber, activeCase, loadCaseDraft]);

  // 3. Debounced Autosave: Save to backend after 800ms of inactivity
  useEffect(() => {
    if (!isInitialLoadedRef.current) return;
    if (isCompetitionPaused || isCurrentCaseSubmitted) return;

    if (code === lastSavedCodeRef.current && language === lastSavedLangRef.current) {
      return;
    }

    setSaveStatus('saving');
    setSaveError(null);

    const timer = setTimeout(async () => {
      try {
        const updated = await questionAndArenaService.saveWorkspaceDraft({
          sourceCode: code,
          language,
          roundNumber,
          caseNumber: activeCase,
        });

        versionRef.current = updated.version;
        lastSavedCodeRef.current = code;
        lastSavedLangRef.current = language;

        setCaseDrafts((prev) => ({
          ...prev,
          [activeCase]: {
            ...(prev[activeCase] || { isLoaded: true, isSubmitted: false }),
            code,
            language,
            version: updated.version,
          },
        }));

        setSaveStatus('saved');
      } catch (err: any) {
        setSaveStatus('failed');
        setSaveError(err?.message || 'Autosave failed');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [code, language, roundNumber, activeCase, isCompetitionPaused, isCurrentCaseSubmitted]);

  // Safe Case Switching with Flush
  const handleSelectCase = async (targetCase: number) => {
    if (targetCase === activeCase) return;

    // 1. Immediately cache current case's edits
    setCaseDrafts((prev) => ({
      ...prev,
      [activeCase]: {
        ...(prev[activeCase] || { version: versionRef.current, isLoaded: true, isSubmitted: false }),
        code,
        language,
      },
    }));

    // 2. If unsaved changes exist for current case, flush to backend immediately
    if (code !== lastSavedCodeRef.current && !isCurrentCaseSubmitted && !isCompetitionPaused) {
      questionAndArenaService
        .saveWorkspaceDraft({
          sourceCode: code,
          language,
          roundNumber,
          caseNumber: activeCase,
        })
        .catch((err) => console.warn('Case switch draft flush failed:', err.message));
    }

    // 3. Switch active case
    setActiveCase(targetCase);

    // 4. If target case already cached, mount immediately
    if (caseDrafts[targetCase]?.isLoaded) {
      const cached = caseDrafts[targetCase];
      setCode(cached.code);
      setLanguage(cached.language as any);
      lastSavedCodeRef.current = cached.code;
      lastSavedLangRef.current = cached.language;
      versionRef.current = cached.version;
      setSaveStatus('saved');
      isInitialLoadedRef.current = true;
    }
  };

  // 4. Configure CodeMirror extensions based on active language
  const extensions = useMemo(() => {
    const langExtension = (() => {
      switch (language) {
        case 'cpp':
          return cpp();
        case 'java':
          return java();
        case 'python':
          return python();
        case 'javascript':
        case 'typescript':
        default:
          return javascript();
      }
    })();

    return [
      langExtension,
      oneDark,
      customDarkTheme,
      keymap.of([indentWithTab]),
    ];
  }, [language]);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
  }, []);

  const handleLanguageChange = (newLang: any) => {
    setLanguage(newLang);
  };

  const handleRunCode = async (sampleStdin?: string) => {
    if (isCompetitionPaused) return;
    setIsRunning(true);
    setRunError(null);
    setActiveTab('output');

    const stdinToUse =
      sampleStdin !== undefined
        ? sampleStdin
        : activeTab === 'custom'
          ? customInput
          : currentQuestion?.sampleTestCases?.[0]?.stdin || 'CAPACITY=10 REFILL=2 CONSUME=5';

    try {
      const res = await executionService.runCode({
        languageKey: language as any,
        sourceCode: code,
        stdin: stdinToUse,
        isTestRun: true,
      });
      setExecutionResult(res);
    } catch (err: any) {
      setRunError(err?.message || 'Local execution failed. Submissions are safely evaluated by tournament judges.');
    } finally {
      setIsRunning(false);
    }
  };

  // Final Code Submission
  const handleSubmitSolution = async () => {
    if (isCompetitionPaused || isCurrentCaseSubmitted) return;
    setIsSubmitting(true);
    setSubmitFeedback(null);
    try {
      const res = await questionAndArenaService.submitWorkspaceCode({
        roundNumber,
        caseNumber: activeCase,
        sourceCode: code,
        language,
      });

      if (roundNumber === 2) {
        setIsRoundSubmitted(true);
      } else if (roundNumber === 3) {
        setSubmittedCases((prev) => Array.from(new Set([...prev, activeCase])));
      }

      setCaseDrafts((prev) => ({
        ...prev,
        [activeCase]: {
          ...(prev[activeCase] || { code, language, version: 1, isLoaded: true }),
          isSubmitted: true,
          submissionId: res.submissionId,
          submittedAt: res.submittedAt,
        },
      }));

      setSubmitFeedback({
        type: 'success',
        message: 'Submission Received Successfully! Your answers have been recorded. The administrators will now evaluate the round.',
      });
      setConfirmSubmitOpen(false);
    } catch (err: any) {
      setSubmitFeedback({
        type: 'error',
        message: err?.message || 'Failed to submit solution.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Access Denied / Locked Screen (Security Guarding)
  if (accessDeniedError) {
    const isLockedPreRound = accessDeniedError.toLowerCase().includes('will become available');

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
        <div
          className={`max-w-md w-full bg-slate-900 border ${
            isLockedPreRound ? 'border-amber-500/30' : 'border-red-500/30'
          } rounded-3xl p-8 text-center space-y-5 shadow-2xl`}
        >
          <div
            className={`w-16 h-16 rounded-2xl ${
              isLockedPreRound
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            } flex items-center justify-center mx-auto`}
          >
            {isLockedPreRound ? <Lock className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">
              {isLockedPreRound ? `Round ${roundNumber} Arena Locked` : 'Arena Access Restricted'}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isLockedPreRound
                ? 'The competition arena will become available when your round begins. Please wait for the administrator to activate this round.'
                : accessDeniedError}
            </p>
          </div>
          <button
            onClick={() => navigate('/team/dashboard')}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2"
          >
            <span>Return to Team Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4.1rem)] bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Banner */}
      <div className="bg-emerald-950/40 border-b border-emerald-900/50 px-4 py-2 flex items-center justify-between text-xs text-emerald-300">
        <div className="flex items-center gap-3">
          <Link
            to="/team/dashboard"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>
                {roundNumber === 2 ? 'ROUND 2: BUG HUNT ARENA' : 'ROUND 3: FINAL BOSS RELAY'}
              </strong>
              {' '}&bull; Collaborative CodeMirror 6 Active
            </span>
          </div>
        </div>

        {/* Center Countdown Timer */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-700 font-mono text-xs">
          <Clock
            className={`w-3.5 h-3.5 ${
              timer.secondsLeft < 300 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
            }`}
          />
          <span className="text-[11px] text-slate-400 hidden sm:inline">Time Remaining:</span>
          <span
            className={`font-black ${
              timer.secondsLeft < 300 ? 'text-red-400' : 'text-emerald-300'
            }`}
          >
            {timer.formatted}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {submitFeedback && (
            <span
              className={`text-[11px] px-2 py-0.5 rounded border ${
                submitFeedback.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border-red-500/30'
              }`}
            >
              {submitFeedback.message}
            </span>
          )}
          <span className="text-[10px] font-mono uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
            Round {roundNumber}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/30">
            Relay Synced
          </span>
        </div>
      </div>

      {/* Paused Tournament Notice */}
      {isCompetitionPaused && (
        <div className="bg-amber-600/90 text-white px-4 py-2 text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-xs">
          <PauseCircle className="w-4 h-4 animate-pulse" />
          <span>Tournament paused by Administrator. Editing, test runs, and submissions are temporarily frozen.</span>
        </div>
      )}

      {/* Post-Submission Waiting Notification Banner */}
      {isCurrentCaseSubmitted && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-emerald-300">Submission Received Successfully!</span>
              <span className="text-emerald-400/90 ml-1.5 hidden sm:inline">
                Your answers have been recorded. The administrators will now evaluate the round and announce shortlisted teams on the dashboard and announcements.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            Read-Only Mode
          </span>
        </div>
      )}

      {/* Main Workspace Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column: Problem Statement (5 columns) */}
        <div className="lg:col-span-5 border-r border-slate-800 flex flex-col h-full bg-slate-950 overflow-y-auto p-6 space-y-5">
          {/* Case Switcher for Round 3 */}
          {roundNumber === 3 && (
            <div className="space-y-1.5 pb-2 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                  Select Problem Case:
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  {submittedCases.length} / 3 Cases Submitted
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((cNum) => {
                  const isCaseDone = submittedCases.includes(cNum);
                  return (
                    <button
                      key={cNum}
                      onClick={() => handleSelectCase(cNum)}
                      className={`py-2 px-2 rounded-lg text-xs font-bold font-mono transition border text-center ${
                        activeCase === cNum
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                          : isCaseDone
                          ? 'bg-slate-900/90 text-emerald-400 border-emerald-800/60 hover:bg-slate-800'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Case {cNum}</span>
                        {isCaseDone && <CheckCircle2 className="w-3 h-3 text-emerald-300 shrink-0" />}
                      </div>
                      <span className="block text-[10px] font-normal opacity-80">
                        {cNum === 1 ? '20 Pts' : cNum === 2 ? '25 Pts' : '45 Pts'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Problem Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                {roundNumber === 2 ? 'Problem R2-B1' : `Problem R3-C0${activeCase}`}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400">
                {roundNumber === 2 ? 'Bug Hunt' : `Case ${activeCase} of 3`}
              </span>
              <span className="text-[11px] font-mono text-amber-400 font-semibold ml-auto">
                {currentQuestion?.marks || (roundNumber === 2 ? 100 : activeCase === 1 ? 20 : activeCase === 2 ? 25 : 45)} Points
              </span>
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {currentQuestion?.title || (roundNumber === 2 ? 'Bug Hunt: Distributed Token Bucket Rate Limiter' : 'Relay Coding Challenge')}
            </h1>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mt-2">
              <span>Time Limit: 2.0s</span>
              <span>&bull;</span>
              <span>Memory Limit: 256MB</span>
            </div>
          </div>

          {/* Problem Prompt / Description */}
          <div className="text-xs text-slate-300 space-y-3 leading-relaxed whitespace-pre-wrap font-sans">
            {currentQuestion?.description || (
              <p>
                Analyze the starter code on the right. Fix logic flaws, boundary errors, and edge cases according to the tournament specification.
              </p>
            )}
          </div>

          {/* Rubric Breakdown */}
          {currentQuestion?.rubric && (
            <div className="space-y-2 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider font-mono">
                Official Evaluation Rubric:
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                {Object.entries(currentQuestion.rubric).map(([k, v]) => (
                  <div key={k} className="p-1.5 rounded bg-slate-950/80 border border-slate-800 flex justify-between">
                    <span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="font-bold text-emerald-400">{v} Pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Cases */}
          {currentQuestion?.sampleTestCases && currentQuestion.sampleTestCases.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Sample Test Cases
              </h3>
              {currentQuestion.sampleTestCases.map((tc, idx) => (
                <div key={idx} className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Sample {idx + 1}</span>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Input:</span>
                    <pre className="text-slate-200">{tc.stdin}</pre>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Expected Output:</span>
                    <pre className="text-emerald-400">{tc.expectedOutput}</pre>
                  </div>
                  {tc.explanation && (
                    <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800">
                      {tc.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: CodeMirror 6 Editor & Execution Panel (7 columns) */}
        <div className="lg:col-span-7 flex flex-col h-full bg-slate-950">
          {/* Editor Header Bar */}
          <div className="h-12 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <select
                  value={language}
                  disabled={isCurrentCaseSubmitted || isCompetitionPaused}
                  onChange={(e) => handleLanguageChange(e.target.value as any)}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                >
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                  <option value="javascript">JavaScript</option>
                </select>
              </div>

              {/* Autosave Sync Status Pill */}
              <div className="flex items-center gap-1.5 text-xs font-mono">
                {isCurrentCaseSubmitted ? (
                  <span className="flex items-center gap-1 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 text-[11px]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Submitted (Read-Only)</span>
                  </span>
                ) : saveStatus === 'saving' ? (
                  <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </span>
                ) : saveStatus === 'saved' ? (
                  <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                    <Check className="w-3 h-3" />
                    <span>Team Draft Synced</span>
                  </span>
                ) : saveStatus === 'failed' ? (
                  <span
                    className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-[11px]"
                    title={saveError || 'Save failed'}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Save Failed</span>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRunCode()}
                disabled={isRunning || isCompetitionPaused}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                    <span>Run Code</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setConfirmSubmitOpen(true)}
                disabled={isSubmitting || isCurrentCaseSubmitted || isCompetitionPaused}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isCurrentCaseSubmitted
                    ? roundNumber === 3
                      ? `Case ${activeCase} Submitted`
                      : 'Solution Submitted'
                    : roundNumber === 3
                    ? `Submit Case ${activeCase}`
                    : 'Submit Solution'}
                </span>
              </button>
            </div>
          </div>

          {/* CodeMirror 6 Editor Container */}
          <div className="flex-1 overflow-hidden relative">
            <CodeMirror
              value={code}
              height="100%"
              extensions={extensions}
              onChange={handleCodeChange}
              theme={oneDark}
              editable={!isCurrentCaseSubmitted && !isCompetitionPaused}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                foldGutter: true,
              }}
            />
          </div>

          {/* Bottom Execution Panel */}
          <div className="h-48 border-t border-slate-800 flex flex-col bg-slate-900/40">
            <div className="h-9 px-4 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab('sample')}
                  className={`py-2 border-b-2 font-bold ${
                    activeTab === 'sample' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400'
                  }`}
                >
                  Sample Tests
                </button>
                <button
                  onClick={() => setActiveTab('custom')}
                  className={`py-2 border-b-2 font-bold ${
                    activeTab === 'custom' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400'
                  }`}
                >
                  Custom Stdin
                </button>
                <button
                  onClick={() => setActiveTab('output')}
                  className={`py-2 border-b-2 font-bold ${
                    activeTab === 'output' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400'
                  }`}
                >
                  Execution Output
                </button>
              </div>
            </div>

            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-slate-300">
              {activeTab === 'sample' && (
                <div className="space-y-2">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200 block">Sample 1 Test</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {currentQuestion?.sampleTestCases?.[0]?.stdin || 'CAPACITY=10 REFILL=2 CONSUME=5'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRunCode(currentQuestion?.sampleTestCases?.[0]?.stdin)}
                      disabled={isCompetitionPaused}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 disabled:opacity-50"
                    >
                      Run Case 1
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'custom' && (
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Enter custom stdin payload..."
                  disabled={isCompetitionPaused}
                  className="w-full h-full p-2 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-slate-200 resize-none focus:outline-none disabled:opacity-50"
                />
              )}

              {activeTab === 'output' && (
                <div className="space-y-2">
                  {isRunning && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Executing in sandbox...</span>
                    </div>
                  )}

                  {runError && (
                    <div className="p-2.5 bg-amber-950/30 border border-amber-800/40 rounded text-amber-300 text-xs">
                      {runError}
                    </div>
                  )}

                  {executionResult && !isRunning && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded">
                        <span className="font-bold text-emerald-400">
                          {executionResult.status.description}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {executionResult.executionTimeSeconds ? `${Math.round(executionResult.executionTimeSeconds * 1000)} ms` : ''}
                        </span>
                      </div>
                      {executionResult.stdout && (
                        <pre className="text-emerald-400 font-mono whitespace-pre-wrap text-xs bg-slate-950 p-2 rounded">
                          {executionResult.stdout}
                        </pre>
                      )}
                    </div>
                  )}

                  {!isRunning && !executionResult && !runError && (
                    <div className="text-center p-4 text-slate-500">
                      Click "Run Code" to compile and run against test input.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SUBMISSION CONFIRMATION MODAL */}
      {confirmSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full border border-slate-800 shadow-2xl p-6 space-y-4 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Submit Round {roundNumber} Solution?
                </h3>
                <p className="text-xs text-slate-400">
                  {roundNumber === 3 ? `Confirm submission for Case ${activeCase}.` : 'Confirm bug fix submission.'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Problem:</span>
                <span className="font-bold text-white">{currentQuestion?.title || 'Relay Challenge'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Language:</span>
                <span className="text-emerald-400 uppercase font-bold">{language}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Source Length:</span>
                <span className="text-slate-300">{code.length} characters</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmSubmitOpen(false)}
                className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300 font-bold text-xs hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitSolution}
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isSubmitting ? 'Submitting...' : 'Confirm Submission'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
