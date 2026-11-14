import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { questionAndArenaService } from '../../services/question-and-arena.service';
import { useCompetitionState, useServerTimer } from '../../hooks/useCompetition';
import {
  SanitizedQuestionDto,
  McqSubmissionResultDto,
} from '@ignitron/shared';
import {
  Clock,
  CheckCircle2,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  RefreshCw,
  Check,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Trophy,
  AlertCircle,
  Eye,
  PauseCircle,
  Lock,
} from 'lucide-react';

export const McqArenaPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: compState } = useCompetitionState();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Arena State
  const [questions, setQuestions] = useState<SanitizedQuestionDto[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<
    Record<string, { selectedOption: number | null; isFlagged: boolean }>
  >({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<McqSubmissionResultDto | null>(null);
  const [reviewMode, setReviewMode] = useState<boolean>(false);

  // Configured duration from server or default 30m
  const r1ConfiguredDuration =
    compState?.rounds?.find((r) => r.roundNumber === 1)?.durationMinutes ?? 30;
  const [initialRemainingSeconds, setInitialRemainingSeconds] = useState<number>(
    r1ConfiguredDuration * 60,
  );
  const [initialPaused, setInitialPaused] = useState<boolean>(false);

  // Autosave indicator
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Submit Modal
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Active competition timer
  const isR1Active = compState?.status === 'ROUND_1_ACTIVE';
  const effectiveIsPaused = compState?.isPaused ?? initialPaused;
  const timer = useServerTimer(
    isR1Active ? compState?.deadlineAt : null,
    effectiveIsPaused,
    isR1Active
      ? compState?.remainingDurationSeconds ?? initialRemainingSeconds
      : r1ConfiguredDuration * 60,
  );

  // Fetch initial arena state
  const loadArenaState = async () => {
    setLoading(true);
    setError(null);
    try {
      const state = await questionAndArenaService.getMcqArenaState();
      setQuestions(state.questions);
      setAnswers(state.answers || {});
      setInitialRemainingSeconds(state.remainingSeconds);
      setInitialPaused(state.isPaused);
      setIsSubmitted(state.isSubmitted);

      if (state.isSubmitted) {
        const res = await questionAndArenaService.submitMcqRound();
        setSubmissionResult(res);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize MCQ Arena.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArenaState();
  }, []);

  // Automatically refresh arena state when Round 1 becomes active
  useEffect(() => {
    if (isR1Active && !isSubmitted) {
      loadArenaState();
    }
  }, [isR1Active]);

  // Timer Expiration Auto-Submit
  useEffect(() => {
    if (timer.isExpired && !isSubmitted && !loading && questions.length > 0) {
      handleFinalSubmit(true);
    }
  }, [timer.isExpired, isSubmitted, loading, questions.length]);

  // Handle Option Selection
  const handleSelectOption = async (optionIndex: number) => {
    if (isSubmitted || effectiveIsPaused || reviewMode) return;
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const currentAnswer = answers[currentQ.id] || { selectedOption: null, isFlagged: false };
    const updated = {
      ...currentAnswer,
      selectedOption: optionIndex,
    };

    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: updated,
    }));

    setSavingStatus('saving');
    try {
      await questionAndArenaService.saveMcqAnswer({
        questionId: currentQ.id,
        selectedOption: optionIndex,
        isFlagged: updated.isFlagged,
      });
      setSavingStatus('saved');
    } catch (err) {
      setSavingStatus('error');
    }
  };

  // Handle Flag Toggle
  const handleToggleFlag = async () => {
    if (isSubmitted || effectiveIsPaused || reviewMode) return;
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const currentAnswer = answers[currentQ.id] || { selectedOption: null, isFlagged: false };
    const updated = {
      ...currentAnswer,
      isFlagged: !currentAnswer.isFlagged,
    };

    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: updated,
    }));

    setSavingStatus('saving');
    try {
      await questionAndArenaService.saveMcqAnswer({
        questionId: currentQ.id,
        selectedOption: updated.selectedOption,
        isFlagged: updated.isFlagged,
      });
      setSavingStatus('saved');
    } catch (err) {
      setSavingStatus('error');
    }
  };

  // Final Submission
  const handleFinalSubmit = async (autoSubmit = false) => {
    if (isSubmitted || submitting) return;
    setSubmitting(true);
    try {
      const res = await questionAndArenaService.submitMcqRound({ autoSubmit });
      setSubmissionResult(res);
      setIsSubmitted(true);
      setConfirmSubmitOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit answers.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.values(answers).filter((a) => a.selectedOption !== null).length;
  const flaggedCount = Object.values(answers).filter((a) => a.isFlagged).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-sm font-bold text-emerald-950">Preparing Round 1 MCQ Arena...</p>
        </div>
      </div>
    );
  }

  // Pre-Round Waiting Screen / Ineligible Access Screen (Strict Security Guarding)
  if ((!isR1Active && !isSubmitted) || (error && !isSubmitted)) {
    const isLockedPreRound =
      !error ||
      error.toLowerCase().includes('will become available') ||
      error.toLowerCase().includes('countdown') ||
      error.toLowerCase().includes('not currently active');

    const isRoundConcluded =
      compState?.status === 'COMPLETED' ||
      (Boolean(compState?.currentRoundNumber) && (compState?.currentRoundNumber ?? 0) > 1);

    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-5">
          <div
            className={`w-16 h-16 rounded-2xl ${
              isLockedPreRound
                ? 'bg-amber-50 border border-amber-300 text-amber-600'
                : 'bg-rose-50 border border-rose-300 text-rose-600'
            } flex items-center justify-center mx-auto`}
          >
            {isLockedPreRound ? <Lock className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-slate-900">
              {isRoundConcluded
                ? 'Round 1 Concluded'
                : isLockedPreRound
                ? 'Round 1 MCQ Arena Locked'
                : 'Arena Access Restricted'}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isRoundConcluded
                ? 'Round 1 has concluded. Submissions and question access are now closed.'
                : error
                ? error
                : 'The competition arena will become available when Round 1 begins. Please wait for the tournament administrator to start the round.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/team/dashboard')}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>Return to Team Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Submitted Completion Screen (Only shown when not reviewing)
  if (isSubmitted && submissionResult && !reviewMode) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-3xl border border-emerald-300 flex items-center justify-center mx-auto text-emerald-700 shadow-xs">
            <Trophy className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-emerald-950">Round 1 Completed!</h1>
            <p className="text-xs text-slate-500">
              Your team's multiple-choice answers have been submitted and automatically evaluated.
            </p>
          </div>

          {/* Prominent Post-Submission Waiting Notification */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-left text-xs text-emerald-950 flex items-start gap-3 shadow-2xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-emerald-900">Submission Received Successfully!</span>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Your answers have been recorded. The administrators will now evaluate the round and announce shortlisted teams on the dashboard and announcements.
              </p>
            </div>
          </div>

          {/* Score Card */}
          <div className="bg-gradient-to-b from-emerald-50 to-white rounded-2xl border border-emerald-200 p-6 space-y-3">
            <div className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-wider">
              Official Round 1 Score
            </div>
            <div className="text-4xl font-black font-mono text-emerald-950">
              {submissionResult.score.toFixed(1)} <span className="text-lg font-bold text-emerald-700">/ 30</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-100">
              <div className="p-2 rounded-lg bg-white border border-emerald-100">
                <span className="text-slate-500 block text-[10px]">Correct Answers</span>
                <span className="font-bold text-emerald-900 font-mono">
                  {submissionResult.correctCount} / {submissionResult.totalQuestions}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-emerald-100">
                <span className="text-slate-500 block text-[10px]">Attempted</span>
                <span className="font-bold text-slate-900 font-mono">
                  {submissionResult.answeredCount} / {submissionResult.totalQuestions}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-left text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Shortlisting Threshold:</strong> The top 50% scoring teams will qualify to enter Round 2 (Bug Hunt Arena). Check the official leaderboard for updates.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setReviewMode(true)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-300"
            >
              <Eye className="w-4 h-4 text-slate-600" />
              <span>Review Submitted Answers</span>
            </button>

            <button
              onClick={() => navigate('/team/dashboard')}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition flex items-center justify-center gap-2"
            >
              <span>Return to Team Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col">
      {/* If in Review Mode, render compact non-header review toolbar directly under RootLayout Navbar */}
      {reviewMode ? (
        <div className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 sm:px-6 py-2.5 shadow-xs sticky top-16 z-20">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setReviewMode(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 shadow-2xs transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Scorecard</span>
              </button>
              <div className="h-4 w-px bg-slate-700 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 font-extrabold uppercase">
                  R1
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-100">
                  Round 1: Submitted Answers Review
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/40 text-[10px] font-mono text-amber-300 font-bold uppercase">
                  Read-Only Mode
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 font-mono text-xs font-bold">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Score: {submissionResult?.score.toFixed(1)} / 30 pts</span>
              </div>
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-[11px]">
                <Eye className="w-3 h-3 text-slate-400" />
                <span>Responses Locked</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Top Arena Compact Toolbar & Server Timer Bar during active round (NO duplicate header) */
        <div className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-16 z-20 px-4 sm:px-6 py-2.5 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            {/* Left: Dashboard return link, Round Badge & Name, and Autosave status */}
            <div className="flex items-center gap-2.5">
              <Link
                to="/team/dashboard"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition"
                title="Return to Team Dashboard"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-extrabold uppercase">
                  R1
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-100">
                  Round 1: MCQ Arena
                </span>
              </div>

              {/* Autosave Status Indicator */}
              {!isSubmitted && (
                <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 ml-2 pl-2 border-l border-slate-800">
                  {savingStatus === 'saving' ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Answers synced</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Center: Authoritative Server Timer */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950/90 border border-slate-700/80 font-mono shadow-inner">
              <Clock
                className={`w-3.5 h-3.5 ${
                  timer.secondsLeft < 300 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                }`}
              />
              <span className="text-[11px] text-slate-400 hidden sm:inline">Time Remaining:</span>
              <span
                className={`text-xs sm:text-sm font-black ${
                  timer.secondsLeft < 300 ? 'text-red-400' : 'text-emerald-300'
                }`}
              >
                {timer.formatted}
              </span>
            </div>

            {/* Right: Question attempted progress and Submit action */}
            <div className="flex items-center gap-2.5">
              <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/60">
                <span>Attempted:</span>
                <strong className="text-emerald-300">
                  {answeredCount} / {questions.length}
                </strong>
              </div>

              <button
                onClick={() => setConfirmSubmitOpen(true)}
                disabled={isSubmitted || effectiveIsPaused}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Round 1</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paused Banner */}
      {effectiveIsPaused && !isSubmitted && (
        <div className="bg-amber-500 text-white px-4 py-2.5 text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-xs">
          <PauseCircle className="w-4 h-4 animate-pulse" />
          <span>Tournament paused by Administrator. Timer and submissions are temporarily held.</span>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 w-full">
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Question Navigator Sidebar (4 cols) */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono">
                Question Navigator
              </h2>
              <span className="text-xs font-mono font-bold text-emerald-800">
                {answeredCount} / {questions.length} Answered
              </span>
            </div>

            {/* Grid of 15 questions */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isAnswered = ans && ans.selectedOption !== null;
                const isFlagged = ans && ans.isFlagged;
                const isCurrent = idx === currentIndex;

                let btnStyle = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
                if (isAnswered && isFlagged) {
                  btnStyle = 'bg-amber-500 text-white border-amber-600 ring-2 ring-emerald-400';
                } else if (isAnswered) {
                  btnStyle = 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700';
                } else if (isFlagged) {
                  btnStyle = 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl font-mono text-xs font-bold border transition flex items-center justify-center relative ${btnStyle} ${
                      isCurrent ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-[10px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-600 shrink-0" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500 shrink-0" />
                <span>Flagged</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-200 shrink-0" />
                <span>Unanswered</span>
              </div>
            </div>
          </div>

          {/* Quick Round Guidelines Card */}
          <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200/80 p-4 text-xs space-y-2 text-emerald-950">
            <div className="font-bold flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-emerald-700" />
              <span>Scoring Rules</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1">
              <li>Exactly 15 questions × 2 marks each = 30 total marks.</li>
              <li>No negative marking for incorrect choices.</li>
              <li>Answers are automatically saved to the cloud on selection.</li>
            </ul>
          </div>
        </aside>

        {/* Right: Active Question Card (8 cols) */}
        <section className="lg:col-span-8 flex flex-col">
          {currentQuestion ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {/* Question Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-600 bg-slate-100">
                      +{currentQuestion.marks} Marks
                    </span>
                  </div>

                  {!reviewMode && !isSubmitted && (
                    <button
                      onClick={handleToggleFlag}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                        answers[currentQuestion.id]?.isFlagged
                          ? 'border-amber-400 bg-amber-50 text-amber-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>{answers[currentQuestion.id]?.isFlagged ? 'Flagged for Review' : 'Flag Question'}</span>
                    </button>
                  )}
                </div>

                {/* Question Title & Prompt */}
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-bold text-emerald-950">
                    {currentQuestion.title}
                  </h3>
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {currentQuestion.description}
                  </div>
                </div>

                {/* 4 Radio Options */}
                <div className="space-y-3 pt-3">
                  {currentQuestion.options?.map((optionText, optIdx) => {
                    const isSelected = answers[currentQuestion.id]?.selectedOption === optIdx;

                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelectOption(optIdx)}
                        className={`p-4 rounded-xl border transition flex items-center gap-3.5 ${
                          reviewMode || isSubmitted || effectiveIsPaused
                            ? 'cursor-default'
                            : 'cursor-pointer hover:border-slate-300 hover:bg-slate-50/50'
                        } ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/80 shadow-xs'
                            : 'border-slate-200'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs font-mono shrink-0 transition ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </div>

                        <span className={`text-xs sm:text-sm flex-1 ${isSelected ? 'font-bold text-emerald-950' : 'text-slate-800'}`}>
                          {optionText}
                        </span>

                        {isSelected && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {reviewMode && (
                              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 hidden sm:inline">
                                Your Selection
                              </span>
                            )}
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="text-xs text-slate-400 font-mono">
                  {currentIndex + 1} / {questions.length}
                </div>

                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : reviewMode || isSubmitted ? (
                  <button
                    onClick={() => setReviewMode(false)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                  >
                    <span>Back to Score Card</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmSubmitOpen(true)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                  >
                    <span>Review & Submit</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">No questions available.</div>
          )}
        </section>
      </main>

      {/* CONFIRMATION MODAL - Strictly guarded: Never show in review mode or once submitted */}
      {confirmSubmitOpen && !isSubmitted && !reviewMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">Submit Round 1 MCQ Arena?</h3>
                <p className="text-xs text-slate-500">
                  Please review your attempt summary before final submission.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Questions:</span>
                <span className="font-bold text-slate-900">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700 font-bold">Answered:</span>
                <span className="font-bold text-emerald-700">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-700">Flagged for Review:</span>
                <span className="font-bold text-amber-700">{flaggedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Unanswered:</span>
                <span className="font-bold text-slate-500">{unansweredCount}</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                You still have <strong>{unansweredCount} unanswered questions</strong>. Once submitted, answers cannot be edited.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmSubmitOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Keep Answering
              </button>
              <button
                onClick={() => handleFinalSubmit(false)}
                disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{submitting ? 'Submitting...' : 'Confirm Submission'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
