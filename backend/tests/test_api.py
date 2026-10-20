import os
import sys
import json
import pytest
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app import app
from database import init_db

@pytest.fixture
def client():
    app.config['TESTING'] = True
    init_db()
    with app.test_client() as client:
        yield client

def test_api_status(client):
    response = client.get('/api/status')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "online"
    assert "opencv_version" in data
    assert "ai_engine" in data

def test_create_and_list_session(client):
    new_session = {
        "title": "Automated Test Session",
        "course_code": "TEST-101",
        "instructor_name": "Test Instructor",
        "scheduled_duration_minutes": 45
    }
    create_res = client.post('/api/sessions', json=new_session)
    assert create_res.status_code == 201
    created_data = json.loads(create_res.data)
    assert "session_id" in created_data
    session_id = created_data["session_id"]

    list_res = client.get('/api/sessions')
    assert list_res.status_code == 200
    list_data = json.loads(list_res.data)
    matching = [s for s in list_data["sessions"] if s["id"] == session_id]
    assert len(matching) == 1
    assert matching[0]["title"] == "Automated Test Session"

    # Clean up test session
    del_res = client.delete(f'/api/sessions/{session_id}')
    assert del_res.status_code == 200

def test_dashboard_empty_or_populated(client):
    response = client.get('/api/dashboard')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "metrics" in data
    assert "system_status" in data
