import React, { useState } from 'react';
import {
  Code2,
  Play,
  Send,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const CodingWorkspacePreviewPage: React.FC = () => {
  const [language, setLanguage] = useState('cpp');
  const [activeTab, setActiveTab] = useState<'sample' | 'custom' | 'output'>('sample');

  const starterCodes: Record<string, string> = {
    cpp: `// IGNITRON 2K26 — Code Relay Contestant Workspace
// Challenge: C-301 Distributed Relay Cache Optimizer
#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n, k;
    if (!(cin >> n >> k)) return 0;

    vector<long long> cache_latencies(n);
    for (int i = 0; i < n; ++i) {
        cin >> cache_latencies[i];
    }

    // TODO: Implement optimal partition relay algorithm
    cout << "RELAY_OPTIMIZED" << "\\n";

    return 0;
}`,
    python: `# IGNITRON 2K26 — Code Relay Contestant Workspace
# Challenge: C-301 Distributed Relay Cache Optimizer
import sys

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n, k = int(lines[0]), int(lines[1])
    latencies = [int(x) for x in lines[2:2+n]]

    # TODO: Implement optimal partition relay algorithm
    print("RELAY_OPTIMIZED")

if __name__ == '__main__':
    main()`,
    java: `// IGNITRON 2K26 — Code Relay Contestant Workspace
// Challenge: C-301 Distributed Relay Cache Optimizer
import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine() == null ? "" : br.readLine());
        if (!st.hasMoreTokens()) return;

        int n = Integer.parseInt(st.nextToken());
        int k = Integer.parseInt(st.nextToken());

        // TODO: Implement optimal partition relay algorithm
        System.out.println("RELAY_OPTIMIZED");
    }
}`,
  };

  const [code, setCode] = useState(starterCodes['cpp']);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setCode(starterCodes[newLang] || starterCodes['cpp']);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.1rem)] bg-slate-950 text-slate-100 overflow-hidden">
      {/* Scope Disclaimer Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>WORKSPACE PREVIEW:</strong> Coding Engine, Judge0 integration & test case runner will be activated in upcoming development phases.
          </span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
          UI Mockup Only
        </span>
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
              <span>Time Limit: 1.0s</span>
              <span>•</span>
              <span>Memory Limit: 256MB</span>
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
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Output</span>
                <div>RELAY_OPTIMIZED</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Code Editor & Execution Panel (7 columns) */}
        <div className="lg:col-span-7 flex flex-col h-full bg-slate-950">
          {/* Editor Header Bar */}
          <div className="h-12 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-3">
              <Code2 className="w-4 h-4 text-sky-400" />
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="cpp">C++ 17 (GCC 12)</option>
                <option value="python">Python 3.11</option>
                <option value="java">Java 17 (OpenJDK)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCode(starterCodes[language])}
                title="Reset to template"
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Code Editor Mock Area */}
          <div className="flex-1 relative flex overflow-hidden font-mono text-xs">
            {/* Line numbers gutter */}
            <div className="w-12 bg-slate-950 border-r border-slate-800/80 py-4 text-right pr-3 select-none text-slate-600 font-mono text-[11px] leading-relaxed">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Editor Textarea */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 bg-slate-950 text-slate-200 p-4 focus:outline-none resize-none font-mono text-xs leading-relaxed selection:bg-sky-500/30 overflow-y-auto"
            />
          </div>

          {/* Bottom Test & Action Panel */}
          <div className="h-52 border-t border-slate-800 bg-slate-900/80 flex flex-col">
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
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    activeTab === 'output' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Execution Output
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert('Judge0 CE execution engine will be activated in upcoming development phases.')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Run Sample Tests</span>
                </button>

                <button
                  onClick={() => alert('Code Relay official submission will be activated in upcoming development phases.')}
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
                    <span>Sample Test 1: (N=5, K=2)</span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Sample Verified
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span>Sample Test 2: (N=10, K=4)</span>
                    <span className="text-[10px] text-slate-500 uppercase">
                      Ready to Run
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'custom' && (
                <textarea
                  placeholder="Enter custom input lines here..."
                  className="w-full h-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-none font-mono"
                />
              )}

              {activeTab === 'output' && (
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-slate-400">
                  <span className="text-slate-500 block text-[11px] mb-1">Console Standard Output:</span>
                  <div className="text-emerald-400 font-bold">RELAY_OPTIMIZED</div>
                  <div className="text-[10px] text-slate-500 mt-2">Execution time: 42ms • Memory: 8.2MB</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
