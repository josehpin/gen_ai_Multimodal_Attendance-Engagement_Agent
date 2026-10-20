import sqlite3
import os
from pathlib import Path
from config import Config

def get_db_connection():
    Config.init_app()
    conn = sqlite3.connect(str(Config.DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    Config.init_app()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        course_code TEXT,
        instructor_name TEXT,
        session_date TEXT NOT NULL,
        scheduled_duration_minutes INTEGER DEFAULT 60,
        video_filename TEXT,
        video_duration_seconds REAL DEFAULT 0,
        fps REAL DEFAULT 0,
        total_frames INTEGER DEFAULT 0,
        status TEXT DEFAULT 'CREATED', -- 'CREATED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'
        processing_progress INTEGER DEFAULT 0,
        processing_error TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT
    );
    """)
    
    # 2. Participants table (Strictly Anonymous IDs)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        track_id INTEGER NOT NULL,
        anonymous_label TEXT NOT NULL, -- e.g. "Participant #01"
        first_seen_seconds REAL DEFAULT 0,
        last_seen_seconds REAL DEFAULT 0,
        total_presence_seconds REAL DEFAULT 0,
        presence_percentage REAL DEFAULT 0,
        attendance_status TEXT DEFAULT 'ABSENT', -- 'PRESENT', 'LATE', 'PARTIAL', 'ABSENT'
        avg_movement_score REAL DEFAULT 0,
        inactivity_duration_seconds REAL DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_participants_session ON participants (session_id);")
    
    # 3. Engagement Timeline table (Time bins e.g. every 5s or 10s)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS engagement_timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        timestamp_seconds REAL NOT NULL,
        time_label TEXT NOT NULL, -- e.g. "02:15"
        active_participants_count INTEGER DEFAULT 0,
        classroom_movement_index REAL DEFAULT 0, -- measured movement score (0-100)
        audio_energy_db REAL DEFAULT 0, -- measured audio RMS level (0-100)
        estimated_engagement_indicator REAL DEFAULT 0, -- composite heuristic indicator (0-100)
        notes TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_timeline_session ON engagement_timeline (session_id);")

    # 4. Teaching Recommendations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        category TEXT NOT NULL, -- 'PACING', 'INTERACTIVITY', 'ATTENTION', 'SESSION_DESIGN'
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        evidence TEXT NOT NULL, -- Exact measured data points cited
        suggested_action TEXT NOT NULL,
        source TEXT NOT NULL, -- 'GEMINI' or 'RULE_BASED'
        model_name TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_recs_session ON recommendations (session_id);")
    
    # 5. System Settings key-value table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully at:", Config.DATABASE_PATH)
