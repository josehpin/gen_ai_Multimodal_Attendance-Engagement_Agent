import sys
import numpy as np
import pytest
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from cv_engine import CentroidTracker

def test_centroid_tracker_registration():
    tracker = CentroidTracker(max_disappeared=5, max_distance=100)
    
    # 2 person detections: (x, y, w, h)
    detections = [(100, 100, 50, 100), (300, 100, 50, 100)]
    tracks = tracker.update(detections, current_time_sec=1.0, time_delta=1.0)
    
    assert len(tracks) == 2
    assert 1 in tracks
    assert 2 in tracks
    assert tracks[1]["anonymous_label"] == "Participant #01"
    assert tracks[2]["anonymous_label"] == "Participant #02"
    assert tracks[1]["first_seen_seconds"] == 1.0

def test_centroid_tracker_movement_and_matching():
    tracker = CentroidTracker(max_disappeared=5, max_distance=100)
    
    # Frame 1: Detection at (100, 100)
    tracker.update([(100, 100, 50, 100)], current_time_sec=1.0, time_delta=1.0)
    
    # Frame 2: Person moves slightly to (105, 102)
    fake_diff = np.ones((480, 640), dtype=np.uint8) * 50
    tracks = tracker.update([(105, 102, 50, 100)], current_time_sec=2.0, time_delta=1.0, frame_diff=fake_diff)
    
    # Should still be participant 1 (not a new person)
    assert len(tracks) == 1
    assert tracks[1]["total_presence_seconds"] == 1.0
    assert tracks[1]["last_seen_seconds"] == 2.0
    assert len(tracks[1]["movement_samples"]) == 1
