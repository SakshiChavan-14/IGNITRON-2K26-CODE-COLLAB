import React from 'react';
import { AdminNav } from '../../components/AdminNav';
import { FileCheck2, Cpu, CheckCircle2, History } from 'lucide-react';

export const SubmissionsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f8faf9] pb-12">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-950 flex items-center gap-3">
            <span>Submissions & Results</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
              Evaluation Engine
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time contestant code execution telemetry, automated grading logs, and manual evaluation controls.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
            <FileCheck2 className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-emerald-950">
              Automated Code & Quiz Evaluation Hub
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Monitor candidate solutions across rounds, execute secure sandboxed test suites via Judge0 CE, and review granular test output logs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4 text-left">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Round 1 Scoring</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Instant MCQ scoring with negative marking rules and completion timestamp tie-breaking.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1">
                <History className="w-4 h-4 text-emerald-600" />
                <span>Diff Verification</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Automated patch validation and regression analysis for candidate bug repairs.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1">
                <Cpu className="w-4 h-4 text-emerald-600" />
                <span>Sandbox Grader</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Containerized execution against public and hidden test fixtures with timing and memory metrics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
