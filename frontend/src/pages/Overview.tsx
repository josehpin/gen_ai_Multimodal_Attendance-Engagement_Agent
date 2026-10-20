import React from 'react';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  Activity, 
  Sparkles, 
  ShieldCheck, 
  ArrowUpRight, 
  Clock, 
  Cpu, 
  AlertCircle,
  Zap,
  Layers
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import { DashboardData, Session } from '../types';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { PrivacyBanner } from '../components/PrivacyBanner';
import { NavPage } from '../components/Sidebar';

interface OverviewProps {
  data: DashboardData | null;
  isLoading: boolean;
  onNavigate: (page: NavPage) => void;
  onSelectSession: (session: Session) => void;
  onOpenCreateModal: () => void;
  onRunDemo: () => void;
}

export const Overview: React.FC<OverviewProps> = ({
  data,
  isLoading,
  onNavigate,
  onSelectSession,
  onOpenCreateModal,
  onRunDemo,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-600 font-medium">Loading classroom dashboard analytics...</p>
      </div>
    );
  }

  if (!data || !data.has_data) {
    return (
      <div>
        <PrivacyBanner />
        <EmptyState
          title="No Classroom Sessions Recorded"
          description="Your monitoring database is currently clean and empty. Create your first session or launch the instant demo to experience the OpenCV tracking and AI teaching suggestions."
          actionText="Create First Session"
          onAction={onOpenCreateModal}
          secondaryText="Run Instant Demo Analysis"
          onSecondary={onRunDemo}
        />
      </div>
    );
  }

  const { metrics, recent_sessions, recent_recommendations, system_status } = data;

  // Chart data for attendance distribution
  const attendanceChartData = [
    { name: 'Present', value: metrics.attendance_breakdown.present, color: '#16a34a' },
    { name: 'Late', value: metrics.attendance_breakdown.late, color: '#eab308' },
    { name: 'Partial', value: metrics.attendance_breakdown.partial, color: '#3b82f6' },
    { name: 'Absent', value: metrics.attendance_breakdown.absent, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <PrivacyBanner />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Classroom Sessions"
          value={metrics.total_sessions}
          subtitle={`${metrics.completed_sessions} completed processing`}
          icon={<Calendar className="w-5 h-5" />}
          highlight
        />

        <StatCard
          title="Tracked Participants"
          value={metrics.total_participants}
          subtitle="Anonymous multi-person detections"
          icon={<Users className="w-5 h-5" />}
        />

        <StatCard
          title="Average Attendance"
          value={`${metrics.avg_presence_percentage}%`}
          subtitle="Proportion of session attended"
          icon={<CheckCircle className="w-5 h-5" />}
          trend={{
            value: metrics.avg_presence_percentage >= 70 ? 'Optimal' : 'Needs Review',
            isPositive: metrics.avg_presence_percentage >= 70,
          }}
        />

        <StatCard
          title="Engagement Indicator"
          value={`${metrics.avg_engagement_indicator} / 100`}
          subtitle="Observed physical dynamics"
          icon={<Activity className="w-5 h-5" />}
        />
      </div>

      {/* System Status Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-600 uppercase">Vision Pipeline</div>
            <div className="text-xs font-bold text-slate-800">{system_status.cv_pipeline}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-600 uppercase">AI Teaching Engine</div>
            <div className="text-xs font-bold text-slate-800">{system_status.gemini_api}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-600 uppercase">Audio Engine</div>
            <div className="text-xs font-bold text-slate-800">{system_status.audio_analyzer}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-600 uppercase">Privacy Guard</div>
            <div className="text-xs font-bold text-slate-800">Biometrics Disabled</div>
          </div>
        </div>
      </div>

      {/* Middle Section: Attendance Breakdown & Recent AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Breakdown Chart */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-subtle flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Attendance Distribution</h3>
              <p className="text-[11px] text-slate-600">Breakdown of measured student arrival & presence</p>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Details</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 w-full">
            {attendanceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {attendanceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(val) => <span className="text-xs text-slate-600">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-600">
                No participant records to display.
              </div>
            )}
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50">
              <span className="text-emerald-700 font-medium">Present (≥70%)</span>
              <span className="font-bold text-emerald-900">{metrics.attendance_breakdown.present}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50">
              <span className="text-amber-700 font-medium">Late Arrival</span>
              <span className="font-bold text-amber-900">{metrics.attendance_breakdown.late}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50">
              <span className="text-blue-700 font-medium">Partial</span>
              <span className="font-bold text-blue-900">{metrics.attendance_breakdown.partial}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-600 font-medium">Brief/Absent</span>
              <span className="font-bold text-slate-800">{metrics.attendance_breakdown.absent}</span>
            </div>
          </div>
        </div>

        {/* Latest AI Suggestions */}
        <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200 shadow-subtle flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Teaching Assistant Insights</h3>
                <p className="text-[11px] text-slate-600">Evidence-based pedagogical recommendations</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('ai-assistant')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
            {recent_recommendations.length > 0 ? (
              recent_recommendations.map((rec) => (
                <div 
                  key={rec.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900">{rec.title}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider">
                      {rec.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                    {rec.description}
                  </p>
                  <div className="p-2 bg-white rounded-lg border border-slate-200/60 text-[11px] text-blue-900 font-medium flex items-start gap-1.5">
                    <span className="font-bold text-blue-700 shrink-0">Evidence:</span>
                    <span>{rec.evidence}</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-600 flex items-center justify-between">
                    <span>Source: {rec.model_name}</span>
                    {rec.session_title && <span>Class: {rec.session_title}</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-slate-600">
                <Sparkles className="w-8 h-8 text-slate-300 mb-2" />
                <p>No recommendations generated yet. Process a classroom video to extract suggestions.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Classroom Sessions</h3>
            <p className="text-[11px] text-slate-600">Latest recorded lectures and monitoring runs</p>
          </div>
          <button
            onClick={() => onNavigate('sessions')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Manage All Sessions</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Session Title</th>
                <th className="py-2.5 px-3">Course</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Participants</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent_sessions.map((sess) => (
                <tr key={sess.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900 max-w-xs truncate">
                    {sess.title}
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                    {sess.course_code || 'General'}
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {sess.session_date}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">
                    {sess.participant_count || 0} attendees
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {sess.video_duration_seconds > 0 
                      ? `${Math.round(sess.video_duration_seconds)}s` 
                      : `${sess.scheduled_duration_minutes} min`}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      sess.status === 'COMPLETED' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : sess.status === 'PROCESSING' 
                          ? 'bg-blue-100 text-blue-800 animate-pulse' 
                          : sess.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                    }`}>
                      {sess.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        onSelectSession(sess);
                        onNavigate('attendance');
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
