export interface Session {
  id: string;
  title: string;
  course_code: string;
  instructor_name: string;
  session_date: string;
  scheduled_duration_minutes: number;
  video_filename: string | null;
  video_duration_seconds: number;
  fps: number;
  total_frames: number;
  status: 'CREATED' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processing_progress: number;
  processing_error: string | null;
  created_at: string;
  completed_at: string | null;
  participant_count?: number;
  recommendation_count?: number;
  avg_presence?: number;
}

export interface Participant {
  id: number;
  session_id: string;
  track_id: number;
  anonymous_label: string;
  first_seen_seconds: number;
  last_seen_seconds: number;
  total_presence_seconds: number;
  presence_percentage: number;
  attendance_status: 'PRESENT' | 'LATE' | 'PARTIAL' | 'ABSENT';
  avg_movement_score: number;
  inactivity_duration_seconds: number;
}

export interface EngagementPoint {
  id: number;
  session_id: string;
  timestamp_seconds: number;
  time_label: string;
  active_participants_count: number;
  classroom_movement_index: number;
  audio_energy_db: number;
  estimated_engagement_indicator: number;
  notes: string;
}

export interface Recommendation {
  id: number;
  session_id: string;
  category: 'PACING' | 'INTERACTIVITY' | 'ATTENTION' | 'SESSION_DESIGN';
  title: string;
  description: string;
  evidence: string;
  suggested_action: string;
  source: 'GEMINI' | 'RULE_BASED';
  model_name: string;
  created_at: string;
  session_title?: string;
}

export interface DashboardMetrics {
  total_sessions: number;
  completed_sessions: number;
  total_participants: number;
  avg_presence_percentage: number;
  avg_engagement_indicator: number;
  attendance_breakdown: {
    present: number;
    late: number;
    partial: number;
    absent: number;
  };
}

export interface DashboardData {
  has_data: boolean;
  metrics: DashboardMetrics;
  recent_sessions: Session[];
  recent_recommendations: Recommendation[];
  system_status: {
    cv_pipeline: string;
    audio_analyzer: string;
    gemini_api: string;
    privacy_standard: string;
  };
}

export interface SystemSettings {
  gemini_configured: boolean;
  gemini_api_key_masked: string;
  gemini_model: string;
  sample_rate_seconds: number;
  movement_threshold: number;
  attendance_present_ratio: number;
  attendance_late_ratio: number;
  privacy: {
    anonymous_ids_enforced: boolean;
    facial_recognition_disabled: boolean;
    auto_delete_media_on_session_delete: boolean;
  };
}
