import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Download, 
  Search, 
  Filter, 
  Clock, 
  ShieldCheck, 
  Users, 
  AlertCircle,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { Session, Participant } from '../types';
import { api } from '../services/api';
import { EmptyState } from '../components/EmptyState';

interface AttendanceProps {
  sessions: Session[];
  selectedSession: Session | null;
  onSelectSession: (session: Session) => void;
  onOpenCreateModal: () => void;
}

export const Attendance: React.FC<AttendanceProps> = ({
  sessions,
  selectedSession,
  onSelectSession,
  onOpenCreateModal,
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'PARTIAL' | 'ABSENT'>('ALL');

  useEffect(() => {
    if (selectedSession) {
      loadParticipants(selectedSession.id);
    }
  }, [selectedSession]);

  const loadParticipants = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const res = await api.getSession(sessionId);
      setParticipants(res.participants);
    } catch (err) {
      console.error('Failed to load participants', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${remainingSec.toString().padStart(2, '0')}`;
  };

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No Classroom Attendance Available"
        description="To track attendance using OpenCV person tracking, create a classroom session and process a video."
        actionText="Create Session"
        onAction={onOpenCreateModal}
      />
    );
  }

  const currentSession = selectedSession || sessions[0];

  // Filtering
  const filteredParticipants = participants.filter((p) => {
    const matchesSearch = p.anonymous_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.track_id.toString().includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || p.attendance_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const presentCount = participants.filter(p => p.attendance_status === 'PRESENT').length;
  const lateCount = participants.filter(p => p.attendance_status === 'LATE').length;
  const partialCount = participants.filter(p => p.attendance_status === 'PARTIAL').length;
  const avgPresence = participants.length > 0 
    ? Math.round(participants.reduce((acc, p) => acc + p.presence_percentage, 0) / participants.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Session Selector & Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              Selected Session
            </div>
            <div className="relative inline-block mt-0.5">
              <select
                value={currentSession?.id || ''}
                onChange={(e) => {
                  const s = sessions.find(sess => sess.id === e.target.value);
                  if (s) onSelectSession(s);
                }}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.course_code || 'General'}) - {s.session_date}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-600 absolute right-2.5 top-2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* CSV Export Action */}
        <a
          href={api.getAttendanceExportUrl(currentSession.id)}
          download
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-xs"
        >
          <Download className="w-4 h-4 text-blue-600" />
          <span>Export Attendance CSV</span>
        </a>
      </div>

      {/* Metric Cards for this session */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-subtle">
          <div className="text-[11px] font-semibold text-slate-600 uppercase">Total Participants</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{participants.length}</div>
          <div className="text-[11px] text-slate-600 mt-0.5">Anonymous tracks detected</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-subtle">
          <div className="text-[11px] font-semibold text-slate-600 uppercase">Avg Presence</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{avgPresence}%</div>
          <div className="text-[11px] text-slate-600 mt-0.5">Recorded in camera frame</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-subtle">
          <div className="text-[11px] font-semibold text-slate-600 uppercase">On-Time / Present</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{presentCount}</div>
          <div className="text-[11px] text-slate-600 mt-0.5">≥70% session duration</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-subtle">
          <div className="text-[11px] font-semibold text-slate-600 uppercase">Late Arrivals</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{lateCount}</div>
          <div className="text-[11px] text-slate-600 mt-0.5">Arrived after first 25%</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-subtle space-y-4">
        {/* Table Filter & Search Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-600 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search participant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'PRESENT', 'LATE', 'PARTIAL', 'ABSENT'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredParticipants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Anonymous ID</th>
                  <th className="py-3 px-3">First Seen</th>
                  <th className="py-3 px-3">Last Seen</th>
                  <th className="py-3 px-3">Total Presence</th>
                  <th className="py-3 px-3">Presence Ratio</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Movement Index</th>
                  <th className="py-3 px-3">Inactivity Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParticipants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{p.anonymous_label}</div>
                      <div className="text-[10px] text-slate-600 font-mono">Track #{p.track_id}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-mono">
                      {formatSeconds(p.first_seen_seconds)}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-mono">
                      {formatSeconds(p.last_seen_seconds)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 font-mono">
                      {formatSeconds(p.total_presence_seconds)}
                    </td>
                    <td className="py-3 px-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              p.presence_percentage >= 70 
                                ? 'bg-emerald-500' 
                                : p.presence_percentage >= 40 
                                  ? 'bg-amber-500' 
                                  : 'bg-rose-400'
                            }`}
                            style={{ width: `${Math.min(100, p.presence_percentage)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 font-mono shrink-0">
                          {p.presence_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.attendance_status === 'PRESENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.attendance_status === 'LATE'
                            ? 'bg-amber-100 text-amber-800'
                            : p.attendance_status === 'PARTIAL'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                      }`}>
                        {p.attendance_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-800 font-mono">
                      {p.avg_movement_score}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {p.inactivity_duration_seconds}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-600">
            {participants.length === 0 ? (
              <p>No participant records found for this session. Make sure video processing has completed.</p>
            ) : (
              <p>No participants match your current search or status filter.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
