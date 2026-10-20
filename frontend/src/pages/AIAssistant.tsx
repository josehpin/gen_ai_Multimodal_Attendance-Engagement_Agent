import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  ChevronDown, 
  CheckCircle2, 
  HelpCircle, 
  BookOpen, 
  Flame, 
  Activity, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { Session, Recommendation } from '../types';
import { api } from '../services/api';
import { EmptyState } from '../components/EmptyState';

interface AIAssistantProps {
  sessions: Session[];
  selectedSession: Session | null;
  onSelectSession: (session: Session) => void;
  onOpenCreateModal: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  sessions,
  selectedSession,
  onSelectSession,
  onOpenCreateModal,
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [engineSource, setEngineSource] = useState<string>('RULE_BASED');
  const [modelName, setModelName] = useState<string>('Intelligent Heuristic Engine');

  useEffect(() => {
    if (selectedSession) {
      loadRecommendations(selectedSession.id);
    }
  }, [selectedSession]);

  const loadRecommendations = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const res = await api.getSession(sessionId);
      setRecommendations(res.recommendations);
      if (res.recommendations.length > 0) {
        setEngineSource(res.recommendations[0].source);
        setModelName(res.recommendations[0].model_name);
      }
    } catch (err) {
      console.error('Failed to load recommendations', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (forceEngine: 'auto' | 'gemini' | 'rule_based' = 'auto') => {
    if (!currentSession) return;
    setIsGenerating(true);
    try {
      const res = await api.generateRecommendations(currentSession.id, forceEngine);
      setRecommendations(res.recommendations);
      setEngineSource(res.source);
      setModelName(res.model_name);
    } catch (err) {
      console.error('Failed to generate recommendations', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No Classroom Session Selected"
        description="Create a classroom session and process a video to generate evidence-backed teaching suggestions."
        actionText="Create Session"
        onAction={onOpenCreateModal}
      />
    );
  }

  const currentSession = selectedSession || sessions[0];

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'INTERACTIVITY':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PACING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ATTENTION':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'SESSION_DESIGN':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Selector & Generation Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
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

        {/* Generate / Refresh Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleGenerate('rule_based')}
            disabled={isGenerating}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            title="Generate using built-in deterministic heuristic engine"
          >
            Offline Rule Engine
          </button>

          <button
            onClick={() => handleGenerate('auto')}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing Analytics...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Regenerate Suggestions</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Engine Source Transparency Badge */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
        engineSource === 'GEMINI'
          ? 'bg-blue-50/70 border-blue-200 text-blue-950'
          : 'bg-slate-50 border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            engineSource === 'GEMINI' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white'
          }`}>
            {engineSource === 'GEMINI' ? <Sparkles className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-xs font-bold flex items-center gap-2">
              <span>Recommendation Engine:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                engineSource === 'GEMINI' ? 'bg-blue-200 text-blue-900' : 'bg-slate-200 text-slate-800'
              }`}>
                {engineSource === 'GEMINI' ? 'Google Gemini 2.5 Flash' : 'Intelligent Heuristic Engine (Offline)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {engineSource === 'GEMINI'
                ? 'Synthesized via Gemini API using measured attendance & temporal motion analytics.'
                : 'Generated using deterministic pedagogical heuristics based on verified OpenCV tracking metrics.'}
            </p>
          </div>
        </div>

        <div className="text-xs font-medium text-slate-600 self-end sm:self-auto">
          {recommendations.length} Active Suggestions
        </div>
      </div>

      {/* Recommendations Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : recommendations.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-6 bg-white rounded-2xl border border-slate-200 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Card Top: Category and Source */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider border ${getCategoryColor(rec.category)}`}>
                    {rec.category}
                  </span>
                  <span className="text-[10px] text-slate-600 font-medium">
                    {rec.source === 'GEMINI' ? 'Gemini AI' : 'Rule-Based Engine'}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-2">
                  {rec.title}
                </h3>

                {/* Pedagogical Description */}
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {rec.description}
                </p>

                {/* Measured Evidence Citation */}
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                  <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-blue-600" />
                    <span>Measured Observational Evidence</span>
                  </div>
                  <p className="font-medium leading-relaxed">
                    {rec.evidence}
                  </p>
                </div>
              </div>

              {/* Actionable Step for Educator */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Recommended Action</span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  {rec.suggested_action}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">No Recommendations Generated Yet</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto mb-4">
            Click below to analyze the session's OpenCV attendance and engagement metrics to generate suggestions.
          </p>
          <button
            onClick={() => handleGenerate('auto')}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm shadow-blue-600/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Teaching Insights</span>
          </button>
        </div>
      )}
    </div>
  );
};
