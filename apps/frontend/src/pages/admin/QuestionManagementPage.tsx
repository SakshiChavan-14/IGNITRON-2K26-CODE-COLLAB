import React from 'react';
import { AdminNav } from '../../components/AdminNav';
import { HelpCircle, Clock, BookOpen, Layers } from 'lucide-react';

export const QuestionManagementPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f8faf9] pb-12">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-950 flex items-center gap-3">
            <span>Question Management</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
              Round Problems
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Author and configure questions, test cases, and problem statements for Round 1 (MCQ), Round 2 (Bug Hunt), and Round 3 (Final Boss).
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-emerald-950">
              Question Authoring & Problem Repository
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Curate multiple choice question banks, faulty codebase repositories, and competitive algorithmic challenges with automated test fixtures.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4 text-left">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Round 1: MCQ</span>
              </div>
              <p className="text-[11px] text-slate-500">
                CS fundamentals, data structures, complexity & logic questions with randomized delivery.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Round 2: Bug Hunt</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Target codebases with hidden runtime bugs, edge cases, and off-by-one errors.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Round 3: Final Boss</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Multi-language competitive programming challenges with strict memory & CPU limits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
