import os
import json
import time
from typing import Dict, List, Any, Optional
from database import get_db_connection
from config import Config

def get_session_analytics_summary(session_id: str) -> Dict[str, Any]:
    """
    Extracts actual measured metrics from the database for a session.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Session info
    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    session = cursor.fetchone()
    if not session:
        conn.close()
        raise ValueError(f"Session '{session_id}' not found.")

    # Participants info
    cursor.execute("SELECT * FROM participants WHERE session_id = ?", (session_id,))
    participants = [dict(p) for p in cursor.fetchall()]

    # Timeline info
    cursor.execute("SELECT * FROM engagement_timeline WHERE session_id = ? ORDER BY timestamp_seconds ASC", (session_id,))
    timeline = [dict(t) for t in cursor.fetchall()]

    conn.close()

    total_participants = len(participants)
    present_count = sum(1 for p in participants if p["attendance_status"] == "PRESENT")
    late_count = sum(1 for p in participants if p["attendance_status"] == "LATE")
    partial_count = sum(1 for p in participants if p["attendance_status"] == "PARTIAL")
    absent_count = sum(1 for p in participants if p["attendance_status"] == "ABSENT")

    avg_presence_pct = round(sum(p["presence_percentage"] for p in participants) / max(1, total_participants), 1)
    avg_movement = round(sum(p["avg_movement_score"] for p in participants) / max(1, total_participants), 2)
    max_inactivity = round(max((p["inactivity_duration_seconds"] for p in participants), default=0.0), 1)

    # Timeline analytics
    movement_scores = [t["classroom_movement_index"] for t in timeline]
    avg_timeline_movement = round(sum(movement_scores) / max(1, len(movement_scores)), 2)
    min_timeline_movement = min(movement_scores, default=0.0)

    # Detect lowest activity period
    low_activity_periods = []
    for t in timeline:
        if t["classroom_movement_index"] < Config.MOVEMENT_THRESHOLD:
            low_activity_periods.append(t["time_label"])

    # Halfway comparison for fatigue/pacing drift
    halfway = len(timeline) // 2
    first_half_avg = round(sum(t["estimated_engagement_indicator"] for t in timeline[:halfway]) / max(1, halfway), 1) if halfway > 0 else 0.0
    second_half_avg = round(sum(t["estimated_engagement_indicator"] for t in timeline[halfway:]) / max(1, len(timeline) - halfway), 1) if halfway > 0 else 0.0

    return {
        "session_id": session_id,
        "title": session["title"],
        "course_code": session["course_code"] or "General",
        "duration_seconds": session["video_duration_seconds"],
        "total_participants": total_participants,
        "attendance": {
            "present": present_count,
            "late": late_count,
            "partial": partial_count,
            "absent": absent_count,
            "avg_presence_percentage": avg_presence_pct
        },
        "movement": {
            "avg_participant_movement": avg_movement,
            "max_inactivity_seconds": max_inactivity,
            "avg_timeline_movement": avg_timeline_movement,
            "min_timeline_movement": min_timeline_movement,
            "low_activity_intervals": low_activity_periods[:5]  # first few low points
        },
        "trend": {
            "first_half_indicator": first_half_avg,
            "second_half_indicator": second_half_avg,
            "indicator_delta": round(second_half_avg - first_half_avg, 1)
        }
    }


def generate_rule_based_recommendations(analytics: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Intelligent heuristic / rule-based pedagogical suggestion engine.
    Uses strictly measured data to produce evidence-backed recommendations.
    """
    recs = []
    
    # Rule 1: Prolonged inactivity / Motion Dips
    low_intervals = analytics["movement"]["low_activity_intervals"]
    max_inact = analytics["movement"]["max_inactivity_seconds"]
    if low_intervals or max_inact > 15.0:
        interval_cite = f"around {', '.join(low_intervals[:3])}" if low_intervals else f"up to {max_inact}s duration"
        recs.append({
            "category": "INTERACTIVITY",
            "title": "Introduce Formative Interactive Checks",
            "description": "Periods of reduced physical motion were detected. While this frequently indicates focused reading or note-taking, introducing quick polls, think-pair-share, or interactive questions can ensure active cognitive processing.",
            "evidence": f"Measured classroom motion dropped below threshold ({interval_cite}); maximum participant motionless interval was {max_inact}s.",
            "suggested_action": "Pause every 10–15 minutes for a 60-second peer discussion or digital pulse question."
        })
    else:
        recs.append({
            "category": "INTERACTIVITY",
            "title": "Maintain Balanced Interactive Dynamic",
            "description": "Steady physical activity was maintained throughout the measured session, reflecting consistent student alertness.",
            "evidence": f"Classroom movement remained stable with average movement index of {analytics['movement']['avg_timeline_movement']}.",
            "suggested_action": "Continue current balance of direct explanation and student responsiveness."
        })

    # Rule 2: Pacing & Late Arrivals
    late_count = analytics["attendance"]["late"]
    total = analytics["total_participants"]
    if late_count > 0:
        pct_late = round((late_count / max(1, total)) * 100, 1)
        recs.append({
            "category": "PACING",
            "title": "Structure Session Launch with Context Buffers",
            "description": "A subset of participants was first detected well into the session. Structuring the initial 5 minutes with low-stakes warm-up reviews avoids students missing core pedagogical definitions.",
            "evidence": f"{late_count} out of {total} participants ({pct_late}%) arrived after the initial 25% of the observed session.",
            "suggested_action": "Open sessions with an asynchronous warm-up problem or visual summary slide before presenting primary concepts."
        })
    else:
        recs.append({
            "category": "PACING",
            "title": "Pacing & Prompt Start Well Synchronized",
            "description": "All tracked participants were present from early in the session, maximizing available instructional time.",
            "evidence": f"Prompt arrival rate was 100% across all {total} tracked attendees.",
            "suggested_action": "Maintain clear opening agendas to preserve this prompt engagement."
        })

    # Rule 3: Session Duration & Energy Trajectory
    delta = analytics["trend"]["indicator_delta"]
    first_half = analytics["trend"]["first_half_indicator"]
    second_half = analytics["trend"]["second_half_indicator"]
    if delta < -8.0:
        recs.append({
            "category": "SESSION_DESIGN",
            "title": "Mitigate Late-Session Cognitive Fatigue",
            "description": "The composite engagement indicator trended downward between the first and second halves of the session, indicating potential cognitive fatigue.",
            "evidence": f"Estimated engagement indicator declined from {first_half} in the first half to {second_half} in the second half (delta: {delta} pts).",
            "suggested_action": "Place complex derivations in the first half and transition to applied exercises or collaborative problem-solving in the latter half."
        })
    else:
        recs.append({
            "category": "SESSION_DESIGN",
            "title": "Sustained Energy Distribution",
            "description": "Classroom engagement indicators remained consistent or improved across the duration of the lecture.",
            "evidence": f"Engagement indicator shifted smoothly from {first_half} (1st half) to {second_half} (2nd half).",
            "suggested_action": "Preserve the current instructional sequencing for subsequent modules."
        })

    # Rule 4: Overall Attendance Retention
    present_pct = analytics["attendance"]["avg_presence_percentage"]
    recs.append({
        "category": "ATTENTION",
        "title": "Review Student Presence Retention",
        "description": "Student presence duration directly affects conceptual continuity and end-of-unit performance.",
        "evidence": f"Average recorded student presence was {present_pct}% across {total} anonymous participants.",
        "suggested_action": "For participants with partial attendance, consider publishing brief lecture topic outlines or timestamped learning objectives."
    })

    return recs


def generate_gemini_recommendations(analytics: Dict[str, Any], api_key: str) -> Optional[List[Dict[str, str]]]:
    """
    Invokes Google Gemini API with actual measured session metrics.
    Uses the new official google-genai SDK or falls back to requests.
    """
    if not api_key:
        return None

    prompt = f"""
You are an expert pedagogical data analyst and teaching assistant.
Analyze the following REAL classroom session analytics from an AI multimodal monitoring system:

SESSION DETAILS:
- Title: "{analytics['title']}"
- Course Code: "{analytics['course_code']}"
- Duration: {analytics['duration_seconds']} seconds
- Total Anonymous Participants: {analytics['total_participants']}

MEASURED ATTENDANCE:
- Present: {analytics['attendance']['present']}
- Late: {analytics['attendance']['late']}
- Partial: {analytics['attendance']['partial']}
- Absent: {analytics['attendance']['absent']}
- Average Presence Percentage: {analytics['attendance']['avg_presence_percentage']}%

MEASURED MOVEMENT & ACTIVITY (Physical pixel motion & duration):
- Average Participant Movement Score: {analytics['movement']['avg_participant_movement']} (0-100)
- Average Classroom Timeline Movement: {analytics['movement']['avg_timeline_movement']} (0-100)
- Longest Inactivity Period: {analytics['movement']['max_inactivity_seconds']}s
- Low-activity timestamps: {', '.join(analytics['movement']['low_activity_intervals']) if analytics['movement']['low_activity_intervals'] else 'None detected'}

TEMPORAL DRIFT:
- First-half composite indicator: {analytics['trend']['first_half_indicator']}
- Second-half composite indicator: {analytics['trend']['second_half_indicator']}
- Indicator Delta: {analytics['trend']['indicator_delta']} points

INSTRUCTIONS:
Provide 3 to 4 practical, evidence-based pedagogical recommendations.
CRITICAL RULES:
1. Every recommendation MUST cite specific numbers from the measured data above in the "evidence" field.
2. Clearly distinguish measured data (movement, time intervals, attendance percentages) from interpretations. Do not assume looking down means disengaged (could be writing notes).
3. Output MUST be a valid JSON array of objects with these exact keys:
   - "category": one of ["PACING", "INTERACTIVITY", "ATTENTION", "SESSION_DESIGN"]
   - "title": a clear actionable title
   - "description": pedagogical explanation
   - "evidence": explicit citation of the measured numbers
   - "suggested_action": concrete actionable step for the instructor

Return ONLY the JSON array, with no other text, markdown formatting, or preamble.
"""

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=Config.GEMINI_MODEL,
            contents=prompt,
        )
        content_text = response.text.strip()
        
        # Clean potential markdown fences ```json ... ```
        if content_text.startswith("```"):
            lines = content_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            content_text = "\n".join(lines).strip()

        data = json.loads(content_text)
        if isinstance(data, list) and len(data) > 0:
            return data
    except Exception as e:
        print(f"Gemini API call failed: {e}. Falling back to Rule-Based engine.")
        return None

    return None


def generate_recommendations(session_id: str, force_engine: str = "auto") -> Dict[str, Any]:
    """
    Generates and saves evidence-based recommendations for a classroom session.
    Checks for Gemini API key, falling back transparently to the Rule-Based engine.
    """
    analytics = get_session_analytics_summary(session_id)
    now_str = time.strftime('%Y-%m-%d %H:%M:%S')

    api_key = Config.GEMINI_API_KEY
    recs = None
    source = "RULE_BASED"
    model_name = "Intelligent Heuristic Engine (Offline Rule-Based)"

    if force_engine != "rule_based" and api_key:
        gemini_result = generate_gemini_recommendations(analytics, api_key)
        if gemini_result:
            recs = gemini_result
            source = "GEMINI"
            model_name = f"Google Gemini ({Config.GEMINI_MODEL})"

    if recs is None:
        recs = generate_rule_based_recommendations(analytics)
        source = "RULE_BASED"
        model_name = "Intelligent Heuristic Engine (Offline Rule-Based)"

    # Persist in recommendations table
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM recommendations WHERE session_id = ?", (session_id,))
    
    for r in recs:
        cursor.execute("""
            INSERT INTO recommendations (
                session_id, category, title, description, evidence,
                suggested_action, source, model_name, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session_id,
            r.get("category", "PACING"),
            r.get("title", "Observation"),
            r.get("description", ""),
            r.get("evidence", "Derived from session metrics."),
            r.get("suggested_action", ""),
            source,
            model_name,
            now_str
        ))
    
    conn.commit()
    conn.close()

    return {
        "success": True,
        "session_id": session_id,
        "source": source,
        "model_name": model_name,
        "count": len(recs),
        "recommendations": recs,
        "analytics_summary": analytics
    }
