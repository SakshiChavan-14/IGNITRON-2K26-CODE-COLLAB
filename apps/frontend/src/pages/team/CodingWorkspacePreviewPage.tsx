import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Code2,
  Play,
  Send,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Loader2,
  Terminal,
  Check,
} from 'lucide-react';
import CodeMirror, { EditorView, keymap } from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { indentWithTab } from '@codemirror/commands';

import { executionService } from '../../services/execution.service';
import { workspaceService } from '../../services/workspace.service';
import {
  CodeExecutionResultDto,
  SupportedLanguageItem,
  OFFICIAL_JUDGE0_LANGUAGES,
  DEFAULT_STARTER_CODES,
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

export const CodingWorkspacePreviewPage: React.FC = () => {
  const [language, setLanguage] = useState<'cpp' | 'python' | 'java' | 'javascript'>('cpp');
  const [activeTab, setActiveTab] = useState<'sample' | 'custom' | 'output'>('sample');
  const [customInput, setCustomInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<CodeExecutionResultDto | null>(null);
  const [languages, setLanguages] = useState<SupportedLanguageItem[]>(OFFICIAL_JUDGE0_LANGUAGES);

  // Autosave State & Refs
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const versionRef = useRef<number>(0);
  const lastSavedCodeRef = useRef<string>('');
  const lastSavedLangRef = useRef<string>('');
  const isInitialLoadedRef = useRef<boolean>(false);

  const [code, setCode] = useState(DEFAULT_STARTER_CODES['cpp']);

  // 1. Initial Load: Fetch saved team draft and restore editor state
  useEffect(() => {
    let isMounted = true;

    // Load available languages
    executionService
      .getSupportedLanguages()
      .then((langs) => {
        if (isMounted && langs && langs.length > 0) setLanguages(langs);
      })
      .catch(() => {});

    // Load saved team draft for Round 3
    workspaceService
      .getDraft(3)
      .then((draft) => {
        if (!isMounted) return;
        setCode(draft.sourceCode);
        setLanguage(draft.language as any);
        versionRef.current = draft.version;
        lastSavedCodeRef.current = draft.sourceCode;
        lastSavedLangRef.current = draft.language;
        isInitialLoadedRef.current = true;
        setSaveStatus('saved');
      })
      .catch((err) => {
        if (!isMounted) return;
        isInitialLoadedRef.current = true;
        console.warn('Could not load draft from backend (will use local template):', err.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Debounced Autosave: Save to backend after 800ms of inactivity
  useEffect(() => {
    if (!isInitialLoadedRef.current) return;

    // Avoid unnecessary duplicate requests
    if (
      code === lastSavedCodeRef.current &&
      language === lastSavedLangRef.current
    ) {
      return;
    }

    setSaveStatus('saving');
    setSaveError(null);

    const timer = setTimeout(async () => {
      try {
        const updated = await workspaceService.saveDraft({
          sourceCode: code,
          language,
          roundNumber: 3,
          expectedVersion: versionRef.current,
        });

        versionRef.current = updated.version;
        lastSavedCodeRef.current = updated.sourceCode;
        lastSavedLangRef.current = updated.language;
        setSaveStatus('saved');
      } catch (err: any) {
        setSaveStatus('failed');
        setSaveError(err?.message || 'Autosave failed');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [code, language]);

  // 3. Configure CodeMirror extensions based on active language
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
          return javascript();
        default:
          return cpp();
      }
    })();

    return [
      langExtension,
      oneDark,
      customDarkTheme,
      keymap.of([indentWithTab]),
    ];
  }, [language]);

  // Code change handler with stable reference
  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
  }, []);

  const handleLanguageChange = (newLang: 'cpp' | 'python' | 'java' | 'javascript') => {
    setLanguage(newLang);
    // If current code is identical to previous starter, switch to new starter
    if (code === DEFAULT_STARTER_CODES[language]) {
      setCode(DEFAULT_STARTER_CODES[newLang] || DEFAULT_STARTER_CODES['cpp']);
    }
  };

  const handleRunCode = async (sampleStdin?: string) => {
    setIsRunning(true);
    setRunError(null);
    setActiveTab('output');

    const stdinToUse =
      sampleStdin !== undefined
        ? sampleStdin
        : activeTab === 'custom'
          ? customInput
          : '5 2\n1 3 2 4 9';

    try {
      const res = await executionService.runCode({
        languageKey: language,
        sourceCode: code,
        stdin: stdinToUse,
        isTestRun: true,
      });
      setExecutionResult(res);
    } catch (err: any) {
      setRunError(err?.message || 'Code execution failed. Please verify terminal session.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.1rem)] bg-slate-950 text-slate-100 overflow-hidden">
      {/* Execution Status Banner */}
      <div className="bg-sky-500/10 border-b border-sky-500/20 px-4 py-2 flex items-center justify-between text-xs text-sky-300">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            <strong>CODEMIRROR 6 ACTIVE:</strong> Real-time syntax highlighting, bracket matching, indentation & persistent cloud drafts.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/30 font-semibold">
            Round 3 Active Buffer
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
            Relay Synced
          </span>
        </div>
      </div>

      {/* Main Workspace Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column: Problem Statement (5 columns) */}
        <div className="lg:col-span-5 border-r border-slate-800 flex flex-col h-full bg-slate-950 overflow-y-auto p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                Problem C-301
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400">
                Round 3 Arena
              </span>
              <span className="text-[11px] font-mono text-amber-400 font-semibold ml-auto">
                100 Points
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Distributed Relay Cache Optimizer
            </h1>
            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 mt-2">
              <span>Time Limit: 2.0s</span>
              <span>•</span>
              <span>Memory Limit: 128MB</span>
            </div>
          </div>

          <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
            <p>
              In a university cluster running decentralized competition nodes, $N$ computing pods process data streams across $K$ high-speed relay channels. Each pod $i$ incurs a synchronization latency $L_i$.
            </p>
            <p>
              To maintain system equilibrium during the code relay handoff, you must partition the $N$ pods into contiguous clusters such that the maximum cluster variance is minimized across all $K$ relay streams.
            </p>
          </div>

          {/* Input Format */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Input Format
            </h3>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
              <div>• First line contains two integers: $N$ (number of pods) and $K$ (relay channels).</div>
              <div>• Second line contains $N$ space-separated integers $L_1, L_2, \dots, L_N$.</div>
            </div>
          </div>

          {/* Constraints */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Constraints
            </h3>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
              <div>• $1 \le K \le N \le 200,000$</div>
              <div>• $0 \le L_i \le 10^9$</div>
            </div>
          </div>

          {/* Sample Cases */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Sample Case 01
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Input</span>
                <div>5 2<br />1 3 2 4 9</div>
              </div>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Expected Output</span>
                <div>RELAY_OPTIMIZED (N=5, K=2)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: CodeMirror 6 Editor & Execution Panel (7 columns) */}
        <div className="lg:col-span-7 flex flex-col h-full bg-slate-950">
          {/* Editor Header Bar */}
          <div className="h-12 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" />
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value as any)}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  {languages.map((l) => (
                    <option key={l.key} value={l.key}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Autosave Sync Status Pill */}
              <div className="flex items-center gap-1.5 text-xs font-mono">
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                    <Check className="w-3 h-3" />
                    <span>Team Draft Synced</span>
                  </span>
                )}
                {saveStatus === 'failed' && (
                  <span
                    className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-[11px]"
                    title={saveError || 'Save failed'}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Save Failed</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCode(DEFAULT_STARTER_CODES[language])}
                title="Reset to official template"
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CodeMirror 6 Integrated Editor Container */}
          <div className="flex-1 relative flex overflow-hidden font-mono text-xs bg-slate-950">
            <CodeMirror
              value={code}
              height="100%"
              extensions={extensions}
              onChange={handleCodeChange}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightSpecialChars: true,
                history: true,
                foldGutter: true,
                drawSelection: true,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                syntaxHighlighting: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                rectangularSelection: true,
                crosshairCursor: true,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                closeBracketsKeymap: true,
                defaultKeymap: true,
                searchKeymap: true,
                historyKeymap: true,
                foldKeymap: true,
                completionKeymap: true,
                lintKeymap: true,
              }}
              className="h-full w-full overflow-hidden"
            />
          </div>

          {/* Bottom Execution & Action Panel */}
          <div className="h-64 border-t border-slate-800 bg-slate-900/80 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 h-10">
              <div className="flex items-center gap-2 text-xs font-medium">
                <button
                  onClick={() => setActiveTab('sample')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    activeTab === 'sample' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sample Tests (2)
                </button>
                <button
                  onClick={() => setActiveTab('custom')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    activeTab === 'custom' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Custom Input
                </button>
                <button
                  onClick={() => setActiveTab('output')}
                  className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                    activeTab === 'output' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Execution Output</span>
                  {executionResult && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        executionResult.status.isSuccess ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRunCode()}
                  disabled={isRunning}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Run Sample Code</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() =>
                    alert(
                      'Official multi-stage Code Relay submission with automated judge scoring will be activated in upcoming development phases.',
                    )
                  }
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-sky-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Solution</span>
                </button>
              </div>
            </div>

            {/* Test tab body */}
            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-slate-300">
              {activeTab === 'sample' && (
                <div className="space-y-2">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200 block">Sample 1: Basic Relay Test</span>
                      <span className="text-[11px] text-slate-500 font-mono">Input: 5 2 \n 1 3 2 4 9</span>
                    </div>
                    <button
                      onClick={() => handleRunCode('5 2\n1 3 2 4 9')}
                      disabled={isRunning}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded border border-slate-700 font-medium"
                    >
                      Run Case 1
                    </button>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200 block">Sample 2: Multi-Stream Test</span>
                      <span className="text-[11px] text-slate-500 font-mono">Input: 10 4 \n 12 4 19 2 8 3 10 22 5 1</span>
                    </div>
                    <button
                      onClick={() => handleRunCode('10 4\n12 4 19 2 8 3 10 22 5 1')}
                      disabled={isRunning}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded border border-slate-700 font-medium"
                    >
                      Run Case 2
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'custom' && (
                <div className="flex flex-col h-full space-y-2">
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter custom stdin lines here..."
                    className="flex-1 w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-none font-mono"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleRunCode(customInput)}
                      disabled={isRunning}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
                    >
                      Execute with Custom Input
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'output' && (
                <div className="space-y-3">
                  {runError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded text-rose-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-rose-200 font-semibold mb-0.5">Execution Rejected</strong>
                        <span>{runError}</span>
                      </div>
                    </div>
                  )}

                  {isRunning && (
                    <div className="flex items-center justify-center p-8 gap-3 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                      <span>Sending payload to Judge0 CE isolate sandbox...</span>
                    </div>
                  )}

                  {executionResult && !isRunning && (
                    <div className="space-y-3">
                      {/* Status header */}
                      <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded">
                        <div className="flex items-center gap-2">
                          {executionResult.status.isSuccess ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          )}
                          <span
                            className={`font-bold ${
                              executionResult.status.isSuccess ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {executionResult.status.description}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-slate-400">
                          {executionResult.executionTimeSeconds !== null && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {Math.round(executionResult.executionTimeSeconds * 1000)} ms
                            </span>
                          )}
                          {executionResult.memoryUsageKb !== null && (
                            <span className="flex items-center gap-1">
                              <Cpu className="w-3.5 h-3.5 text-slate-500" />
                              {(executionResult.memoryUsageKb / 1024).toFixed(1)} MB
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Compiler Output (if compilation error) */}
                      {executionResult.compileOutput && (
                        <div className="p-3 bg-rose-950/20 border border-rose-800/40 rounded space-y-1">
                          <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider block">
                            Compilation Diagnostics:
                          </span>
                          <pre className="text-rose-300 font-mono whitespace-pre-wrap text-xs overflow-x-auto">
                            {executionResult.compileOutput}
                          </pre>
                        </div>
                      )}

                      {/* Standard Error */}
                      {executionResult.stderr && (
                        <div className="p-3 bg-rose-950/20 border border-rose-800/40 rounded space-y-1">
                          <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider block">
                            Standard Error (stderr):
                          </span>
                          <pre className="text-rose-300 font-mono whitespace-pre-wrap text-xs overflow-x-auto">
                            {executionResult.stderr}
                          </pre>
                        </div>
                      )}

                      {/* Standard Output */}
                      {executionResult.stdout && (
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                            Standard Output (stdout):
                          </span>
                          <pre className="text-emerald-400 font-mono whitespace-pre-wrap text-xs overflow-x-auto">
                            {executionResult.stdout}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {!isRunning && !executionResult && !runError && (
                    <div className="text-center p-8 text-slate-500">
                      <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>Click "Run Sample Code" to compile and execute in the sandboxed isolate container.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
