import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Key, 
  Cpu, 
  ShieldCheck, 
  Sliders, 
  Save, 
  CheckCircle2, 
  ExternalLink,
  Info,
  Server
} from 'lucide-react';
import { SystemSettings } from '../types';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
      if (data.gemini_model) {
        setSelectedModel(data.gemini_model);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSaveSuccess(false);

    try {
      const payload: { gemini_api_key?: string; gemini_model?: string } = {
        gemini_model: selectedModel,
      };
      if (apiKey.trim()) {
        payload.gemini_api_key = apiKey.trim();
      }

      await api.updateSettings(payload);
      setSaveSuccess(true);
      setApiKey('');
      await loadSettings();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Failed to update settings on backend.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Top Banner */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">System & AI Settings</h2>
            <p className="text-[11px] text-slate-600">Configure AI inference, vision thresholds, and deployment parameters</p>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Google Gemini Configuration Card */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Google Gemini API Configuration</h3>
                <p className="text-[11px] text-slate-600">Powers advanced pedagogical teaching analysis</p>
              </div>
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              settings?.gemini_configured
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {settings?.gemini_configured ? 'Configured & Active' : 'Offline Rule-Based Mode'}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gemini API Key
              </label>
              <input
                type="password"
                placeholder={settings?.gemini_configured ? `Currently configured (${settings.gemini_api_key_masked})` : 'Enter AIzaSy... API Key'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-600">
                Optional: If left blank or unconfigured, the system automatically runs the built-in Intelligent Heuristic Engine without making external network calls.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                AI Model Target
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Fast & Accurate)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Pedagogical Reasoning)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vision & Tracking Configuration Card */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-subtle space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Computer Vision & Attendance Parameters</h3>
              <p className="text-[11px] text-slate-600">Configured in backend config</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-slate-600 font-semibold mb-1">Frame Sample Rate</div>
              <div className="text-base font-bold text-slate-900">1.0 sec</div>
              <div className="text-[10px] text-slate-600 mt-1">Samples 1 frame per second for optimal CPU inference</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-slate-600 font-semibold mb-1">Movement Threshold</div>
              <div className="text-base font-bold text-slate-900">5.0 Δpx</div>
              <div className="text-[10px] text-slate-600 mt-1">Pixel intensity difference to trigger motion detection</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-slate-600 font-semibold mb-1">Attendance Threshold</div>
              <div className="text-base font-bold text-slate-900">≥70% Present</div>
              <div className="text-[10px] text-slate-600 mt-1">40–69% classified as Partial/Late arrival</div>
            </div>
          </div>
        </div>

        {/* Privacy & Safeguards Card */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-subtle space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Institutional Privacy Guardrails</h3>
              <p className="text-[11px] text-slate-600">Audited compliance indicators</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span><strong>No Biometric Storage:</strong> No facial recognition or facial embedding databases exist.</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span><strong>Strict Anonymous IDs:</strong> Participants assigned ephemeral identifiers (e.g. Participant #01) per session.</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span><strong>Media Removal on Delete:</strong> Deleting a session permanently deletes uploaded video files from disk.</span>
            </div>
          </div>
        </div>

        {/* Vercel & Deployment Documentation Card */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-subtle space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Vercel & Production Deployment Guide</h3>
              <p className="text-[11px] text-slate-600">Frontend and Backend hosting architecture</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-600">
            <p className="leading-relaxed">
              <strong>Frontend (Vercel):</strong> Configure the environment variable <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-900 font-mono text-[11px]">VITE_API_URL</code> in your Vercel Project Settings to point to your deployed Python backend.
            </p>
            <p className="leading-relaxed">
              <strong>Backend (Render / Fly.io / Railway):</strong> Deploy the <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-900 font-mono text-[11px]">backend/</code> directory using Python with persistent volume for <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-900 font-mono text-[11px]">backend/instance/attendance.db</code> and set <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-900 font-mono text-[11px]">CORS_ORIGINS</code> to your Vercel domain.
            </p>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
