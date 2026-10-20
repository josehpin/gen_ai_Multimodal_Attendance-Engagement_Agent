import axios from 'axios';
import { Session, Participant, EngagementPoint, Recommendation, DashboardData, SystemSettings } from '../types';

const rawApiUrl = import.meta.env.VITE_API_URL || '';
// Ensure no trailing slash
const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

const client = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

export const api = {
  // System Health
  async getStatus() {
    const res = await client.get('/status');
    return res.data;
  },

  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    const res = await client.get<DashboardData>('/dashboard');
    return res.data;
  },

  // Sessions
  async getSessions(): Promise<Session[]> {
    const res = await client.get<{ sessions: Session[] }>('/sessions');
    return res.data.sessions;
  },

  async getSession(id: string): Promise<{
    session: Session;
    participants: Participant[];
    timeline: EngagementPoint[];
    recommendations: Recommendation[];
  }> {
    const res = await client.get(`/sessions/${id}`);
    return res.data;
  },

  async createSession(data: {
    title: string;
    course_code?: string;
    instructor_name?: string;
    session_date?: string;
    scheduled_duration_minutes?: number;
  }): Promise<{ success: boolean; session_id: string }> {
    const res = await client.post('/sessions', data);
    return res.data;
  },

  async deleteSession(id: string): Promise<{ success: boolean; message: string }> {
    const res = await client.delete(`/sessions/${id}`);
    return res.data;
  },

  async uploadVideo(sessionId: string, file: File, onProgress?: (pct: number) => void): Promise<{ success: boolean; filename: string }> {
    const formData = new FormData();
    formData.append('video', file);
    const res = await client.post(`/sessions/${sessionId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return res.data;
  },

  async processSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    const res = await client.post(`/sessions/${sessionId}/process`);
    return res.data;
  },

  async createDemoSession(): Promise<{
    success: boolean;
    session_id: string;
    participants_detected: number;
    recommendations_count: number;
    ai_source: string;
  }> {
    const res = await client.post('/sessions/demo');
    return res.data;
  },

  // Recommendations
  async generateRecommendations(sessionId: string, forceEngine: 'auto' | 'gemini' | 'rule_based' = 'auto') {
    const res = await client.post(`/sessions/${sessionId}/recommendations/generate`, {
      force_engine: forceEngine,
    });
    return res.data;
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    const res = await client.get<SystemSettings>('/settings');
    return res.data;
  },

  async updateSettings(data: { gemini_api_key?: string; gemini_model?: string }) {
    const res = await client.post('/settings', data);
    return res.data;
  },

  // Export URLs
  getAttendanceExportUrl(sessionId: string) {
    const base = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';
    return `${base}/sessions/${sessionId}/attendance/export`;
  },

  getReportExportUrl(sessionId: string) {
    const base = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';
    return `${base}/sessions/${sessionId}/report/export`;
  },
};
