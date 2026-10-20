import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Download, 
  ChevronDown, 
  Info, 
  Clock, 
  Users, 
  Volume2, 
  VolumeX, 
  TrendingDown, 
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Session, EngagementPoint } from '../types';
import { api } from '../services/api';
import { EmptyState } from '../components/EmptyState';

interface EngagementProps {
  sessions: Session[];
  selectedSession: Session | null;
  onSelectSession: (session: Session) => void;
  onOpenCreateModal: () => void;
}

export const Engagement: React.FC<EngagementProps> = ({
  sessions,
  selectedSession,
  onSelectSession,
  onOpenCreateModal,
}) => {
  const [timeline, setTimeline] = useState<EngagementPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedSession) {
      loadTimeline(selectedSession.id);
    }
  }, [selectedSession]);

  const loadTimeline = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const res = await api.getSession(sessionId);
      setTimeline(res.timeline);
    } catch (err) {
      console.error('Failed to load engagement timeline', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No Engagement Data Available"
        description="Create a classroom session and analyze a video to inspect classroom physical dynamics and timelines."
        actionText="Create Session"
        onAction={onOpenCreateModal}
      />
    );
  }

  const currentSession = selectedSession || sessions[0];

  // Derived timeline analytics
  const movementValues = timeline.map(t => t.classroom_movement_index);
  const avgMovement = movementValues.length > 0 
    ? (movementValues.reduce((a, b) => a + b, 0) / movementValues.length).toFixed(1)
    : '0';

  const peakPoint = timeline.reduce(
    (max, p) => p.classroom_movement_index > (max?.classroom_movement_index || 0) ? p : max,
    timeline[0]
  );

  const lowestPoint = timeline.reduce(
    (min, p) => p.classroom_movement_index < (min?.classroom_movement_index ?? 999) ? p : min,
    timeline[0]
  );

  const halfway = Math.floor(timeline.length / 2);
  const firstHalfAvg = halfway > 0 
    ? (timeline.slice(0, halfway).reduce((a, b) => a + b.classroom_movement_index, 0) / halfway).toFixed(1)
    : '0';
  const secondHalfAvg = halfway > 0 
    ? (timeline.slice(halfway).reduce((a, b) => a + b.classroom_movement_index, 0) / (timeline.length - halfway)).toFixed(1)
    : '0';
  const drift = (parseFloat(secondHalfAvg) - parseFloat(firstHalfAvg)).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Session Selector & Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
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
          href={api.getReportExportUrl(currentSession.id)}
          download
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-xs"
        >
          <Download className="w-4 h-4 text-blue-600" />
          <span>Export Timeline CSV</span>
        </a>
      </div>

      {/* Critical Pedagogical Interpretation Notice */}
      <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">
            Methodology & Ethical Boundary Clarification
          </div>
          <p className="leading-relaxed text-amber-800">
            Physical stillness or periods of low pixel movement <strong>must not be conflated with cognitive disengagement</strong>. 
            Students frequently exhibit minimal motion while reading complex material, taking detailed notes, or listening intently. 
            All values below represent <em>observable physical activity indicators</em> rather than arbitrary attention scores.
          </p>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-subtle">
          <div className="text-[11px] font-semibold text-slate-600 uppercase">Average Motion Index</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{avgMovement} / 100</div>
          <div className="text-[11px] text-slate-600 mt-0.5">Mean pixel displacement</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-subtle">
          <div className="text-[11px] font-semibold text-slate-600 uppercase">Peak Physical Activity</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{peakPoint?.time_label || '00:00'}</div>
          <div className="text-[11px] text-slate-600 mt-0.5">{peakPoint?.classroom_movement_index || 0} index score</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-subtle">
          <div className="text-[11px] font-semibold text-slate-600 uppercase">Stillness Interval</div>
          <div className="text-2xl font-bold text-slate-700 mt-1">{lowestPoint?.time_label || '00:00'}</div>
          <div className="text-[11px] text-slate-600 mt-0.5">{lowestPoint?.classroom_movement_index || 0} index score</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-subtle">
          <div className="text-[11px] font-semibold text-slate-600 uppercase">Temporal Drift (H1 vs H2)</div>
          <div className={`text-2xl font-bold mt-1 flex items-center gap-1 ${parseFloat(drift) >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {parseFloat(drift) >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            <span>{drift > '0' ? `+${drift}` : drift} pts</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5">Change in later half</div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : timeline.length > 0 ? (
        <div className="space-y-6">
          {/* Chart 1: Classroom Movement Index Timeline */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-subtle">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Measured Classroom Movement Index Over Time</h3>
                <p className="text-[11px] text-slate-600">Normalized pixel difference across sampled video frames (0 - 100)</p>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 rounded-lg self-start sm:self-auto">
                Measured OpenCV Data
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="movementGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time_label" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                    formatter={(val: any) => [`${val} / 100`, 'Movement Index']}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="classroom_movement_index" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#movementGradient)" 
                    name="Classroom Movement"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Active Attendees & Estimated Engagement Composite */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Attendees Bar Chart */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-subtle">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900">Active Participants in Frame</h3>
                <p className="text-[11px] text-slate-600">Count of verified person bounding boxes detected concurrently</p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time_label" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                      formatter={(val: any) => [`${val} Attendees`, 'Active Count']}
                    />
                    <Bar dataKey="active_participants_count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Active Persons" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Composite Estimated Indicator Line */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-subtle">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900">Estimated Engagement Dynamic</h3>
                <p className="text-[11px] text-slate-600">Transparent heuristic indicator combining active presence (60%) & motion (40%)</p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time_label" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                      formatter={(val: any) => [`${val} / 100`, 'Estimated Indicator']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="estimated_engagement_indicator" 
                      stroke="#10b981" 
                      strokeWidth={2.5}
                      dot={false}
                      name="Estimated Dynamic"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Timeline Analytical Log Table */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-subtle">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Timeline Observation Log</h3>
            <p className="text-[11px] text-slate-600 mb-4">Detailed measurements per 5-second interval</p>

            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2 px-3">Interval</th>
                    <th className="py-2 px-3">Active People</th>
                    <th className="py-2 px-3">Movement Index</th>
                    <th className="py-2 px-3">Audio Energy</th>
                    <th className="py-2 px-3">Composite Dynamic</th>
                    <th className="py-2 px-3">Vision Observations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timeline.map((point) => (
                    <tr key={point.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        {point.time_label}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-800">
                        {point.active_participants_count}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-blue-600 font-semibold">
                        {point.classroom_movement_index}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {point.audio_energy_db > 0 ? `${point.audio_energy_db} dB` : 'Silent / No Audio'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-emerald-700">
                        {point.estimated_engagement_indicator}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {point.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center text-xs text-slate-600 p-8 bg-white rounded-xl border border-slate-200">
          No timeline data recorded for this session. Please upload a video and run the OpenCV analysis.
        </div>
      )}
    </div>
  );
};
