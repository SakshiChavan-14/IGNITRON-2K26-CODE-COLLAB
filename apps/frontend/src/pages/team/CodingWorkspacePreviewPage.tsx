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
  FileText,
  Sparkles,
  Layers,
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
  const isRoundActive =
    compState?.currentRoundNumber === roundNumber &&
    (roundNumber === 2
      ? compState?.status === 'ROUND_2_ACTIVE'
      : compState?.status === 'ROUND_3_ACTIVE');
  const configuredDuration =
    compState?.rounds?.find((r) => r.roundNumber === roundNumber)?.durationMinutes ??
    (roundNumber === 2 ? 40 : 60);

  const timer = useServerTimer(
    isRoundActive ? compState?.deadlineAt : null,
    isCompetitionPaused,
    isRoundActive ? compState?.remainingDurationSeconds : configuredDuration * 60,
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
        {/* Left Column: Problem Statement (5 columns, independent scroll) */}
        <div className="lg:col-span-5 border-r border-slate-800 flex flex-col h-full bg-slate-950 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Case Switcher for Round 3 Final Boss Coding */}
          {roundNumber === 3 && (
            <div className="space-y-2 pb-4 border-b border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-slate-300 font-bold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Final Boss Relay Cases:</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                  {submittedCases.length} of 3 Cases Submitted
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[1, 2, 3].map((cNum) => {
                  const isCaseDone = submittedCases.includes(cNum);
                  const isCurrent = activeCase === cNum;
                  return (
                    <button
                      key={cNum}
                      type="button"
                      onClick={() => handleSelectCase(cNum)}
                      className={`p-2.5 rounded-xl text-left transition border cursor-pointer relative overflow-hidden ${
                        isCurrent
                          ? 'bg-emerald-900/60 text-white border-emerald-400 shadow-sm ring-1 ring-emerald-400/30'
                          : isCaseDone
                          ? 'bg-slate-900 text-emerald-300 border-emerald-700/60 hover:bg-slate-800/90'
                          : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono font-bold text-xs text-white">Case {cNum}</span>
                        {isCaseDone ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-700/60">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Done</span>
                          </span>
                        ) : isCurrent ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-emerald-300 bg-emerald-800/70 px-1.5 py-0.2 rounded">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono font-bold text-amber-400/90">
                        {cNum === 1 ? '20 Pts' : cNum === 2 ? '25 Pts' : '45 Pts'}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Each case maintains an independent draft and separate submission. Switching cases preserves your code safely.
              </p>
            </div>
          )}

          {/* Problem Header Section */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                {roundNumber === 2 ? 'Problem R2-B1' : `Problem R3-C0${activeCase}`}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                {roundNumber === 2 ? 'Bug Hunt Arena' : `Case ${activeCase} of 3`}
              </span>
              <span className="text-xs font-mono font-extrabold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/30 ml-auto">
                {currentQuestion?.marks || (roundNumber === 2 ? 100 : activeCase === 1 ? 20 : activeCase === 2 ? 25 : 45)} Points
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight pt-1">
              {currentQuestion?.title || (roundNumber === 2 ? 'Bug Hunt: Distributed Token Bucket Rate Limiter' : 'Relay Coding Challenge')}
            </h1>

            <div className="flex items-center gap-3 text-xs font-mono text-slate-400 pt-1">
              <span className="text-slate-300">Time Limit: <strong className="text-emerald-400">2.0s</strong></span>
              <span>&bull;</span>
              <span className="text-slate-300">Memory Limit: <strong className="text-emerald-400">256 MB</strong></span>
              <span>&bull;</span>
              <span className="text-slate-300">Standard I/O</span>
            </div>
          </div>

          {/* Problem Overview & Instructions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold font-mono text-slate-300 uppercase tracking-wide">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Problem Description & Specification</span>
            </div>

            <div className="text-sm text-slate-200 space-y-3 leading-relaxed whitespace-pre-wrap font-sans bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
              {currentQuestion?.description || (
                <p>
                  Analyze the starter code on the right. Fix logic flaws, boundary errors, and edge cases according to the tournament specification.
                </p>
              )}
            </div>
          </div>

          {/* Evaluation Criteria & Rubric Breakdown */}
          {currentQuestion?.rubric && (
            <div className="space-y-2.5 p-4 bg-slate-900/70 border border-slate-800 rounded-xl">
              <span className="text-xs uppercase font-bold text-emerald-400 flex items-center gap-1.5 tracking-wider font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Official Evaluation Rubric:</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-300 pt-1">
                {Object.entries(currentQuestion.rubric).map(([k, v]) => (
                  <div key={k} className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 flex justify-between items-center">
                    <span className="capitalize text-slate-300">{k.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="font-extrabold text-emerald-400">{v} Pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Test Cases with Copy & Quick-Run */}
          {currentQuestion?.sampleTestCases && currentQuestion.sampleTestCases.length > 0 && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sample Test Cases ({currentQuestion.sampleTestCases.length})</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">Run in console below</span>
              </div>

              {currentQuestion.sampleTestCases.map((tc, idx) => (
                <div key={idx} className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-[11px] text-emerald-400 uppercase font-bold">Sample Case {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRunCode(tc.stdin)}
                      disabled={isCompetitionPaused || isRunning}
                      className="px-2 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Test Sample {idx + 1}</span>
                    </button>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Standard Input:</span>
                    <pre className="text-slate-200 bg-slate-950 p-2 rounded-md border border-slate-850 mt-0.5 overflow-x-auto whitespace-pre-wrap">{tc.stdin}</pre>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Expected Output:</span>
                    <pre className="text-emerald-400 bg-slate-950 p-2 rounded-md border border-slate-850 mt-0.5 overflow-x-auto whitespace-pre-wrap">{tc.expectedOutput}</pre>
                  </div>

                  {tc.explanation && (
                    <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/60">
                      <strong>Explanation:</strong> {tc.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: CodeMirror 6 Editor & Execution Panel (7 columns) */}
        <div className="lg:col-span-7 flex flex-col h-full bg-slate-950 overflow-hidden">
          {/* Editor Header Bar */}
          <div className="h-12 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <select
                  value={language}
                  disabled={isCurrentCaseSubmitted || isCompetitionPaused}
                  onChange={(e) => handleLanguageChange(e.target.value as any)}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-750 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-60 cursor-pointer"
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
                  <span className="flex items-center gap-1 text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-lg border border-sky-500/25 text-[11px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Submitted (Read-Only)</span>
                  </span>
                ) : saveStatus === 'saving' ? (
                  <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/25 text-[11px]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Autosaving draft...</span>
                  </span>
                ) : saveStatus === 'saved' ? (
                  <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/25 text-[11px]">
                    <Check className="w-3 h-3" />
                    <span>Draft Synced</span>
                  </span>
                ) : saveStatus === 'failed' ? (
                  <span
                    className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/25 text-[11px]"
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
                type="button"
                onClick={() => handleRunCode()}
                disabled={isRunning || isCompetitionPaused}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
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
                type="button"
                onClick={() => setConfirmSubmitOpen(true)}
                disabled={isSubmitting || isCurrentCaseSubmitted || isCompetitionPaused}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
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
          <div className="flex-1 overflow-hidden relative min-h-[280px]">
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
          <div className="h-52 border-t border-slate-800 flex flex-col bg-slate-900/60 shrink-0">
            <div className="h-9 px-4 border-b border-slate-800 flex items-center justify-between text-xs font-mono bg-slate-950/40">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('sample')}
                  className={`py-2 border-b-2 font-bold transition cursor-pointer ${
                    activeTab === 'sample' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Sample Tests
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={`py-2 border-b-2 font-bold transition cursor-pointer ${
                    activeTab === 'custom' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Custom Stdin
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('output')}
                  className={`py-2 border-b-2 font-bold transition cursor-pointer ${
                    activeTab === 'output' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Execution Output
                </button>
              </div>

              {executionResult && (
                <div className="flex items-center gap-2 text-[11px]">
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    executionResult.status.id === 3
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {executionResult.status.description}
                  </span>
                  {executionResult.executionTimeSeconds && (
                    <span className="text-slate-400 font-mono">
                      {Math.round(executionResult.executionTimeSeconds * 1000)} ms
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-slate-300 bg-slate-950/80">
              {activeTab === 'sample' && (
                <div className="space-y-2">
                  {currentQuestion?.sampleTestCases && currentQuestion.sampleTestCases.length > 0 ? (
                    currentQuestion.sampleTestCases.map((tc, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                        <div className="truncate">
                          <span className="font-bold text-slate-200 block text-xs">Sample {idx + 1} Input</span>
                          <span className="text-[11px] text-slate-400 font-mono truncate block">
                            {tc.stdin || '(Empty input)'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRunCode(tc.stdin)}
                          disabled={isCompetitionPaused || isRunning}
                          className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Run Sample {idx + 1}</span>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-200 block">Default Sample Test</span>
                        <span className="text-[11px] text-slate-500 font-mono">CAPACITY=10 REFILL=2 CONSUME=5</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRunCode('CAPACITY=10 REFILL=2 CONSUME=5')}
                        disabled={isCompetitionPaused || isRunning}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 disabled:opacity-50 cursor-pointer"
                      >
                        Run Default
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'custom' && (
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Enter custom standard input (stdin) payload here..."
                  disabled={isCompetitionPaused}
                  className="w-full h-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-slate-200 resize-none focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                />
              )}

              {activeTab === 'output' && (
                <div className="space-y-2">
                  {isRunning && (
                    <div className="flex items-center gap-2 text-slate-400 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Executing in secure isolated sandbox environment...</span>
                    </div>
                  )}

                  {runError && (
                    <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs">
                      <strong>Execution Error:</strong> {runError}
                    </div>
                  )}

                  {executionResult && !isRunning && (
                    <div className="space-y-2">
                      {executionResult.stdout && (
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Standard Output (stdout):</span>
                          <pre className="text-emerald-300 font-mono whitespace-pre-wrap text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800 overflow-x-auto">
                            {executionResult.stdout}
                          </pre>
                        </div>
                      )}
                      {executionResult.stderr && (
                        <div>
                          <span className="text-[10px] text-rose-400 uppercase font-bold block mb-1">Standard Error (stderr):</span>
                          <pre className="text-rose-300 font-mono whitespace-pre-wrap text-xs bg-rose-950/30 p-2.5 rounded-lg border border-rose-800/40 overflow-x-auto">
                            {executionResult.stderr}
                          </pre>
                        </div>
                      )}
                      {executionResult.compileOutput && (
                        <div>
                          <span className="text-[10px] text-amber-400 uppercase font-bold block mb-1">Compiler Output:</span>
                          <pre className="text-amber-300 font-mono whitespace-pre-wrap text-xs bg-amber-950/30 p-2.5 rounded-lg border border-amber-800/40 overflow-x-auto">
                            {executionResult.compileOutput}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {!isRunning && !executionResult && !runError && (
                    <div className="text-center py-6 text-slate-500">
                      Click "Run Code" above or test a sample case to execute against standard input.
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
