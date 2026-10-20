import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  UploadCloud, 
  Play, 
  Trash2, 
  Eye, 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Zap,
  Search
} from 'lucide-react';
import { Session } from '../types';
import { api } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import { NavPage } from '../components/Sidebar';

interface SessionsProps {
  sessions: Session[];
  onSelectSession: (session: Session) => void;
  onNavigate: (page: NavPage) => void;
  onOpenCreateModal: () => void;
  onOpenUploadModal: (session: Session) => void;
  onRunDemo: () => void;
  onRefresh: () => void;
  isDemoLoading?: boolean;
}

export const Sessions: React.FC<SessionsProps> = ({
  sessions,
  onSelectSession,
  onNavigate,
  onOpenCreateModal,
  onOpenUploadModal,
  onRunDemo,
  onRefresh,
  isDemoLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredSessions = sessions.filter((s) => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.course_code && s.course_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.instructor_name && s.instructor_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDelete = async (sessionId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? All attendance, timeline records, and media will be permanently deleted.`)) {
      return;
    }

    try {
      await api.deleteSession(sessionId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete session', err);
      alert('Could not delete session. Check backend connectivity.');
    }
  };

  const handleProcess = async (sessionId: string) => {
    setProcessingId(sessionId);
    try {
      await api.processSession(sessionId);
      onRefresh();
    } catch (err) {
      console.error('Failed to start processing', err);
      alert('Failed to start video processing. Check server status.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-subtle">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-600 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search sessions by title, course, or instructor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={onRunDemo}
            disabled={isDemoLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-xs disabled:opacity-50"
          >
            {isDemoLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-blue-600" />
            )}
            <span>Generate Demo</span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <EmptyState
          title="No Sessions Recorded"
          description="Create your first session or launch the instant demo to experience the computer vision tracking and AI teaching suggestions."
          actionText="Create Session"
          onAction={onOpenCreateModal}
          secondaryText="Run Instant Demo Analysis"
          onSecondary={onRunDemo}
        />
      ) : filteredSessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="p-6 bg-white rounded-2xl border border-slate-200 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
            >
              <div>
                {/* Status & Course Pill */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-800 font-mono">
                    {session.course_code || 'General'}
                  </span>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    session.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : session.status === 'PROCESSING'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : session.status === 'QUEUED'
                          ? 'bg-amber-100 text-amber-800'
                          : session.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                  }`}>
                    {session.status === 'PROCESSING' && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span>{session.status}</span>
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 tracking-tight mb-2">
                  {session.title}
                </h3>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-4">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                    <span className="truncate">{session.instructor_name || 'Faculty Member'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    <span>{session.session_date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                    <span>
                      {session.video_duration_seconds > 0 
                        ? `${Math.round(session.video_duration_seconds)}s actual` 
                        : `${session.scheduled_duration_minutes} min scheduled`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-600" />
                    <span>{session.participant_count ?? 0} Attendees detected</span>
                  </div>
                </div>

                {/* Processing Progress Bar (if running) */}
                {session.status === 'PROCESSING' && (
                  <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 mb-4 space-y-1.5">
                    <div className="flex justify-between text-[11px] font-semibold text-blue-900">
                      <span>OpenCV Processing Video...</span>
                      <span>{session.processing_progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-300" 
                        style={{ width: `${session.processing_progress}%` }} 
                      />
                    </div>
                  </div>
                )}

                {/* Error message (if failed) */}
                {session.status === 'FAILED' && session.processing_error && (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 mb-4 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{session.processing_error}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleDelete(session.id, session.title)}
                  className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  {!session.video_filename && (
                    <button
                      onClick={() => onOpenUploadModal(session)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Video</span>
                    </button>
                  )}

                  {session.video_filename && session.status !== 'PROCESSING' && session.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleProcess(session.id)}
                      disabled={processingId === session.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Process Video</span>
                    </button>
                  )}

                  {session.status === 'COMPLETED' && (
                    <button
                      onClick={() => {
                        onSelectSession(session);
                        onNavigate('attendance');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Analytics</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-xs text-slate-600 bg-white rounded-xl border border-slate-200">
          No sessions match your search query "{searchQuery}".
        </div>
      )}
    </div>
  );
};
