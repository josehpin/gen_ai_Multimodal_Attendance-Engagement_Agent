import os
import io
import csv
import uuid
import time
import threading
from pathlib import Path
from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from werkzeug.utils import secure_filename

import cv2
from config import Config
from database import get_db_connection, init_db
from cv_engine import process_video_session
from demo_generator import create_demo_classroom_video
from ai_assistant import generate_recommendations, get_session_analytics_summary

# Initialize Flask App
Config.init_app()
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH

# Enable CORS for all routes and origins
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Initialize database schema on startup
with app.app_context():
    init_db()


def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS


# -------------------------------------------------------------
# SYSTEM & HEALTH ENDPOINTS
# -------------------------------------------------------------
@app.route('/api/status', methods=['GET'])
def get_status():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM sessions")
        session_count = cursor.fetchone()["count"]
        cursor.execute("SELECT COUNT(*) as count FROM participants")
        participant_count = cursor.fetchone()["count"]
        conn.close()
        db_ok = True
    except Exception as e:
        db_ok = False
        session_count = 0
        participant_count = 0

    has_gemini = bool(Config.GEMINI_API_KEY and len(Config.GEMINI_API_KEY) > 10)

    return jsonify({
        "status": "online",
        "service": "Multimodal Attendance & Engagement Agent API",
        "version": "1.0.0",
        "opencv_version": cv2.__version__,
        "database_connected": db_ok,
        "total_sessions": session_count,
        "total_participants": participant_count,
        "ai_engine": {
            "gemini_configured": has_gemini,
            "configured_model": Config.GEMINI_MODEL if has_gemini else "None (Rule-Based Fallback Active)",
            "fallback_active": not has_gemini,
            "fallback_engine": "Intelligent Heuristic / Rule-Based Engine"
        },
        "privacy_mode": "Strict Anonymous IDs (No Facial Recognition)"
    })


@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Total sessions
    cursor.execute("SELECT COUNT(*) as total FROM sessions")
    total_sessions = cursor.fetchone()["total"]

    # Completed sessions
    cursor.execute("SELECT COUNT(*) as completed FROM sessions WHERE status = 'COMPLETED'")
    completed_sessions = cursor.fetchone()["completed"]

    # Total unique tracked participants
    cursor.execute("SELECT COUNT(*) as total FROM participants")
    total_participants = cursor.fetchone()["total"]

    # Attendance statistics
    cursor.execute("""
        SELECT 
            AVG(presence_percentage) as avg_presence,
            SUM(CASE WHEN attendance_status = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
            SUM(CASE WHEN attendance_status = 'LATE' THEN 1 ELSE 0 END) as late_count,
            SUM(CASE WHEN attendance_status = 'PARTIAL' THEN 1 ELSE 0 END) as partial_count,
            SUM(CASE WHEN attendance_status = 'ABSENT' THEN 1 ELSE 0 END) as absent_count
        FROM participants
    """)
    att_row = cursor.fetchone()
    avg_presence = round(att_row["avg_presence"] or 0.0, 1)

    # Average engagement indicator
    cursor.execute("SELECT AVG(estimated_engagement_indicator) as avg_eng FROM engagement_timeline")
    eng_row = cursor.fetchone()
    avg_engagement = round(eng_row["avg_eng"] or 0.0, 1)

    # Recent 5 sessions
    cursor.execute("""
        SELECT s.*, 
               (SELECT COUNT(*) FROM participants WHERE session_id = s.id) as participant_count,
               (SELECT COUNT(*) FROM recommendations WHERE session_id = s.id) as recommendation_count
        FROM sessions s
        ORDER BY created_at DESC
        LIMIT 5
    """)
    recent_sessions = [dict(row) for row in cursor.fetchall()]

    # Recent 4 recommendations across sessions
    cursor.execute("""
        SELECT r.*, s.title as session_title
        FROM recommendations r
        JOIN sessions s ON r.session_id = s.id
        ORDER BY r.created_at DESC
        LIMIT 4
    """)
    recent_recs = [dict(row) for row in cursor.fetchall()]

    conn.close()

    has_data = total_sessions > 0

    return jsonify({
        "has_data": has_data,
        "metrics": {
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "total_participants": total_participants,
            "avg_presence_percentage": avg_presence,
            "avg_engagement_indicator": avg_engagement,
            "attendance_breakdown": {
                "present": att_row["present_count"] or 0,
                "late": att_row["late_count"] or 0,
                "partial": att_row["partial_count"] or 0,
                "absent": att_row["absent_count"] or 0
            }
        },
        "recent_sessions": recent_sessions,
        "recent_recommendations": recent_recs,
        "system_status": {
            "cv_pipeline": "OpenCV HOG & Centroid Tracker Ready",
            "audio_analyzer": "RMS Energy Detector Ready",
            "gemini_api": "Configured & Active" if bool(Config.GEMINI_API_KEY) else "Unconfigured (Using Rule-Based Fallback)",
            "privacy_standard": "Compliant (Anonymous Track IDs, No Biometrics)"
        }
    })


# -------------------------------------------------------------
# SESSION CRUD ENDPOINTS
# -------------------------------------------------------------
@app.route('/api/sessions', methods=['GET'])
def list_sessions():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.*, 
               (SELECT COUNT(*) FROM participants WHERE session_id = s.id) as participant_count,
               (SELECT COUNT(*) FROM recommendations WHERE session_id = s.id) as recommendation_count,
               (SELECT AVG(presence_percentage) FROM participants WHERE session_id = s.id) as avg_presence
        FROM sessions s
        ORDER BY created_at DESC
    """)
    sessions = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({"sessions": sessions})


@app.route('/api/sessions', methods=['POST'])
def create_session():
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({"error": "Session title is required"}), 400

    session_id = str(uuid.uuid4())
    course_code = data.get('course_code', '').strip()
    instructor_name = data.get('instructor_name', '').strip()
    session_date = data.get('session_date', time.strftime('%Y-%m-%d')).strip()
    scheduled_duration = int(data.get('scheduled_duration_minutes', 60))
    now_str = time.strftime('%Y-%m-%d %H:%M:%S')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO sessions (
            id, title, course_code, instructor_name, session_date,
            scheduled_duration_minutes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'CREATED', ?)
    """, (session_id, title, course_code, instructor_name, session_date, scheduled_duration, now_str))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Session created successfully",
        "session_id": session_id
    }), 201


@app.route('/api/sessions/<session_id>', methods=['GET'])
def get_session_details(session_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    session = cursor.fetchone()
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    cursor.execute("SELECT * FROM participants WHERE session_id = ? ORDER BY track_id ASC", (session_id,))
    participants = [dict(row) for row in cursor.fetchall()]

    cursor.execute("SELECT * FROM engagement_timeline WHERE session_id = ? ORDER BY timestamp_seconds ASC", (session_id,))
    timeline = [dict(row) for row in cursor.fetchall()]

    cursor.execute("SELECT * FROM recommendations WHERE session_id = ? ORDER BY id ASC", (session_id,))
    recommendations = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return jsonify({
        "session": dict(session),
        "participants": participants,
        "timeline": timeline,
        "recommendations": recommendations
    })


@app.route('/api/sessions/<session_id>', methods=['DELETE'])
def delete_session(session_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT video_filename FROM sessions WHERE id = ?", (session_id,))
    session = cursor.fetchone()
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    # Remove stored video file to uphold privacy rules
    video_filename = session["video_filename"]
    if video_filename:
        file_path = Config.UPLOAD_FOLDER / video_filename
        if file_path.exists():
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Warning: could not delete video file: {e}")

    # Delete session (cascades automatically via sqlite foreign keys)
    cursor.execute("DELETE FROM participants WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM engagement_timeline WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM recommendations WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Session and associated media deleted successfully"})


# -------------------------------------------------------------
# VIDEO UPLOAD & PROCESSING
# -------------------------------------------------------------
@app.route('/api/sessions/<session_id>/upload', methods=['POST'])
def upload_video(session_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM sessions WHERE id = ?", (session_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    if 'video' not in request.files:
        conn.close()
        return jsonify({"error": "No video file provided in request"}), 400

    file = request.files['video']
    if file.filename == '':
        conn.close()
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        conn.close()
        return jsonify({"error": f"Invalid file format. Allowed types: {', '.join(Config.ALLOWED_EXTENSIONS)}"}), 400

    filename = secure_filename(f"{session_id}_{file.filename}")
    save_path = Config.UPLOAD_FOLDER / filename
    file.save(str(save_path))

    cursor.execute("UPDATE sessions SET video_filename = ?, status = 'QUEUED' WHERE id = ?", (filename, session_id))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Video uploaded successfully. Ready to process.",
        "filename": filename
    })


@app.route('/api/sessions/<session_id>/process', methods=['POST'])
def process_session(session_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    session = cursor.fetchone()
    conn.close()

    if not session:
        return jsonify({"error": "Session not found"}), 404

    if not session["video_filename"]:
        return jsonify({"error": "No video uploaded for this session"}), 400

    video_path = str(Config.UPLOAD_FOLDER / session["video_filename"])

    # Launch processing in a background worker thread so the client doesn't time out
    def worker():
        result = process_video_session(session_id, video_path)
        if result["success"]:
            # Automatically generate initial recommendations once vision finishes
            generate_recommendations(session_id)

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()

    return jsonify({
        "success": True,
        "message": "OpenCV processing pipeline initiated",
        "session_id": session_id,
        "status": "PROCESSING"
    })


# -------------------------------------------------------------
# ONE-CLICK REAL DEMO PIPELINE
# -------------------------------------------------------------
@app.route('/api/sessions/demo', methods=['POST'])
def create_demo_session():
    """
    Creates an end-to-end authentic demo session:
    1. Generates an actual MP4 video with moving classroom figures.
    2. Executes the OpenCV vision pipeline to detect and track attendees.
    3. Calculates real movement indexes and timeline bins.
    4. Generates evidence-based pedagogical recommendations.
    """
    session_id = str(uuid.uuid4())
    now_str = time.strftime('%Y-%m-%d %H:%M:%S')
    today_str = time.strftime('%Y-%m-%d')
    
    video_filename = f"demo_classroom_{session_id[:8]}.mp4"
    video_path = str(Config.UPLOAD_FOLDER / video_filename)

    # 1. Create DB record
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO sessions (
            id, title, course_code, instructor_name, session_date,
            scheduled_duration_minutes, video_filename, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PROCESSING', ?)
    """, (
        session_id,
        "Demonstration Lecture: Computer Vision in Higher Education",
        "CS-402",
        "Prof. A. Henderson",
        today_str,
        45,
        video_filename,
        now_str
    ))
    conn.commit()
    conn.close()

    try:
        # 2. Synthesize actual MP4 file
        create_demo_classroom_video(video_path, duration_sec=14, fps=20)

        # 3. Process video with OpenCV pipeline
        cv_result = process_video_session(session_id, video_path)
        if not cv_result["success"]:
            return jsonify({"error": f"OpenCV pipeline failed: {cv_result.get('error')}"}), 500

        # 4. Generate AI / Rule-based recommendations
        rec_result = generate_recommendations(session_id)

        return jsonify({
            "success": True,
            "message": "Demo session generated and processed successfully",
            "session_id": session_id,
            "participants_detected": cv_result.get("participants_count", 0),
            "recommendations_count": rec_result.get("count", 0),
            "ai_source": rec_result.get("source")
        }), 201

    except Exception as e:
        return jsonify({"error": f"Demo generation failed: {str(e)}"}), 500


# -------------------------------------------------------------
# AI RECOMMENDATION GENERATION
# -------------------------------------------------------------
@app.route('/api/sessions/<session_id>/recommendations/generate', methods=['POST'])
def trigger_recommendations(session_id: str):
    data = request.get_json() or {}
    force_engine = data.get('force_engine', 'auto')

    try:
        result = generate_recommendations(session_id, force_engine=force_engine)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# -------------------------------------------------------------
# CSV EXPORT ENDPOINTS
# -------------------------------------------------------------
@app.route('/api/sessions/<session_id>/attendance/export', methods=['GET'])
def export_attendance_csv(session_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    session = cursor.fetchone()
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    cursor.execute("SELECT * FROM participants WHERE session_id = ? ORDER BY track_id ASC", (session_id,))
    participants = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header metadata
    writer.writerow(["# Multimodal Attendance Record"])
    writer.writerow(["# Session Title", session["title"]])
    writer.writerow(["# Course Code", session["course_code"]])
    writer.writerow(["# Date", session["session_date"]])
    writer.writerow(["# Video Duration (s)", session["video_duration_seconds"]])
    writer.writerow(["# Privacy Note", "Anonymous Identifiers Only. No Biometrics or Facial Recognition Used."])
    writer.writerow([])

    # Table columns
    writer.writerow([
        "Participant ID",
        "Anonymous Label",
        "First Seen (s)",
        "Last Seen (s)",
        "Total Presence (s)",
        "Presence %",
        "Attendance Status",
        "Avg Movement Index (0-100)",
        "Max Inactivity (s)"
    ])

    for p in participants:
        writer.writerow([
            p["track_id"],
            p["anonymous_label"],
            p["first_seen_seconds"],
            p["last_seen_seconds"],
            p["total_presence_seconds"],
            f"{p['presence_percentage']}%",
            p["attendance_status"],
            p["avg_movement_score"],
            p["inactivity_duration_seconds"]
        ])

    csv_data = output.getvalue()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename=attendance_{session_id[:8]}.csv"}
    )


@app.route('/api/sessions/<session_id>/report/export', methods=['GET'])
def export_full_report_csv(session_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    session = cursor.fetchone()
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    cursor.execute("SELECT * FROM engagement_timeline WHERE session_id = ? ORDER BY timestamp_seconds ASC", (session_id,))
    timeline = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["# Multimodal Engagement Timeline Report"])
    writer.writerow(["# Session Title", session["title"]])
    writer.writerow(["# Course Code", session["course_code"]])
    writer.writerow(["# Date", session["session_date"]])
    writer.writerow([])

    writer.writerow([
        "Timestamp (s)",
        "Time Label",
        "Active Participants",
        "Classroom Movement Index (0-100)",
        "Audio Energy (dB/norm)",
        "Estimated Engagement Indicator (0-100)",
        "Analytical Observations"
    ])

    for t in timeline:
        writer.writerow([
            t["timestamp_seconds"],
            t["time_label"],
            t["active_participants_count"],
            t["classroom_movement_index"],
            t["audio_energy_db"],
            t["estimated_engagement_indicator"],
            t["notes"]
        ])

    csv_data = output.getvalue()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename=engagement_report_{session_id[:8]}.csv"}
    )


# -------------------------------------------------------------
# SETTINGS ENDPOINTS
# -------------------------------------------------------------
@app.route('/api/settings', methods=['GET'])
def get_settings():
    has_key = bool(Config.GEMINI_API_KEY)
    masked_key = ""
    if has_key:
        masked_key = Config.GEMINI_API_KEY[:4] + "..." + Config.GEMINI_API_KEY[-4:] if len(Config.GEMINI_API_KEY) > 8 else "***"

    return jsonify({
        "gemini_configured": has_key,
        "gemini_api_key_masked": masked_key,
        "gemini_model": Config.GEMINI_MODEL,
        "sample_rate_seconds": Config.SAMPLE_RATE_SECONDS,
        "movement_threshold": Config.MOVEMENT_THRESHOLD,
        "attendance_present_ratio": Config.ATTENDANCE_PRESENT_RATIO,
        "attendance_late_ratio": Config.ATTENDANCE_LATE_RATIO,
        "privacy": {
            "anonymous_ids_enforced": True,
            "facial_recognition_disabled": True,
            "auto_delete_media_on_session_delete": True
        }
    })


@app.route('/api/settings', methods=['POST'])
def update_settings():
    data = request.get_json() or {}
    
    if 'gemini_api_key' in data:
        new_key = data['gemini_api_key'].strip()
        Config.GEMINI_API_KEY = new_key
        # Persist to local .env
        env_file = Config.BASE_DIR / '.env'
        with open(env_file, 'a+', encoding='utf-8') as f:
            f.write(f"\nGEMINI_API_KEY={new_key}\n")

    if 'gemini_model' in data:
        Config.GEMINI_MODEL = data['gemini_model'].strip()

    return jsonify({
        "success": True,
        "message": "Settings updated successfully",
        "gemini_configured": bool(Config.GEMINI_API_KEY)
    })


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"Starting Multimodal Attendance & Engagement Agent API on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
