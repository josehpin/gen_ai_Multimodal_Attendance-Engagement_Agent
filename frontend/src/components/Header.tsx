import React from 'react';
import { Menu, Plus, Zap, RefreshCw, Cpu, CheckCircle2 } from 'lucide-react';
import { NavPage } from './Sidebar';

interface HeaderProps {
  currentPage: NavPage;
  onOpenMobile: () => void;
  onOpenCreateModal: () => void;
  onRunDemo: () => void;
  isDemoLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onOpenMobile,
  onOpenCreateModal,
  onRunDemo,
  isDemoLoading = false,
}) => {
  const pageTitles: Record<NavPage, { title: string; subtitle: string }> = {
    overview: {
      title: 'Classroom Monitoring Dashboard',
      subtitle: 'Real-time overview of attendance rates, physical engagement indicators, and AI recommendations.',
    },
    attendance: {
      title: 'Multimodal Attendance Tracking',
      subtitle: 'Verifiable presence, arrival timestamps, and duration analysis using OpenCV person tracking.',
    },
    engagement: {
      title: 'Engagement & Activity Analytics',
      subtitle: 'Measured physical motion, audio levels, and continuous classroom dynamic timelines.',
    },
    'ai-assistant': {
      title: 'AI Teaching Assistant',
      subtitle: 'Evidence-based pedagogical suggestions powered by Google Gemini and Heuristic Analytics.',
    },
    sessions: {
      title: 'Classroom Sessions Management',
      subtitle: 'Create sessions, upload lecture videos, monitor processing pipelines, and export records.',
    },
    settings: {
      title: 'System Settings & AI Configuration',
      subtitle: 'Manage Google Gemini API keys, vision sensitivity thresholds, and privacy guardrails.',
    },
  };

  const { title, subtitle } = pageTitles[currentPage] || { title: 'Dashboard', subtitle: '' };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Mobile hamburger & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobile}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 max-w-xl hidden sm:block">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2.5">
          {/* Quick Demo Button */}
          <button
            onClick={onRunDemo}
            disabled={isDemoLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-xs disabled:opacity-50"
            title="Generate a synthetic classroom video and process it with real OpenCV & AI analytics"
          >
            {isDemoLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                <span>Run Demo Analysis</span>
              </>
            )}
          </button>

          {/* New Session Button */}
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Session</span>
          </button>
        </div>
      </div>
    </header>
  );
};
