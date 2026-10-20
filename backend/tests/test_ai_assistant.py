import sys
import pytest
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from ai_assistant import generate_rule_based_recommendations

def test_rule_based_recommendations_with_evidence():
    sample_analytics = {
        "session_id": "test-session",
        "title": "Mathematics 101",
        "course_code": "MATH-101",
        "duration_seconds": 3600.0,
        "total_participants": 24,
        "attendance": {
            "present": 20,
            "late": 3,
            "partial": 1,
            "absent": 0,
            "avg_presence_percentage": 84.5
        },
        "movement": {
            "avg_participant_movement": 14.2,
            "max_inactivity_seconds": 22.0,
            "avg_timeline_movement": 12.8,
            "min_timeline_movement": 3.1,
            "low_activity_intervals": ["14:00", "14:30"]
        },
        "trend": {
            "first_half_indicator": 78.0,
            "second_half_indicator": 64.0,
            "indicator_delta": -14.0
        }
    }

    recs = generate_rule_based_recommendations(sample_analytics)
    assert len(recs) >= 3

    categories = [r["category"] for r in recs]
    assert "INTERACTIVITY" in categories
    assert "PACING" in categories
    assert "SESSION_DESIGN" in categories

    # Verify that every recommendation explicitly cites evidence numbers
    for r in recs:
        assert len(r["evidence"]) > 10
        assert "suggested_action" in r
        assert len(r["suggested_action"]) > 10
