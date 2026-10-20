import cv2
import numpy as np
import time
import math
import os
from pathlib import Path
from typing import Dict, List, Tuple, Any
from database import get_db_connection
from config import Config

class CentroidTracker:
    def __init__(self, max_disappeared=8, max_distance=120):
        self.next_track_id = 1
        self.tracks = {}  # track_id -> dict of properties
        self.disappeared = {}  # track_id -> count
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance

    def register(self, centroid, box, current_time_sec):
        track_id = self.next_track_id
        self.next_track_id += 1
        self.tracks[track_id] = {
            "track_id": track_id,
            "anonymous_label": f"Participant #{track_id:02d}",
            "centroid": centroid,
            "box": box,
            "first_seen_seconds": current_time_sec,
            "last_seen_seconds": current_time_sec,
            "total_presence_seconds": 0.0,
            "movement_samples": [],
            "inactivity_duration_seconds": 0.0,
            "current_inactivity_seconds": 0.0,
            "is_active": True,
        }
        self.disappeared[track_id] = 0
        return track_id

    def update(self, detections: List[Tuple[int, int, int, int]], current_time_sec: float, time_delta: float, frame_diff: np.ndarray = None):
        """
        detections: list of (x, y, w, h)
        """
        if len(detections) == 0:
            for track_id in list(self.disappeared.keys()):
                self.disappeared[track_id] += 1
                if self.disappeared[track_id] > self.max_disappeared:
                    self.tracks[track_id]["is_active"] = False
                else:
                    self.tracks[track_id]["current_inactivity_seconds"] += time_delta
                    self.tracks[track_id]["inactivity_duration_seconds"] = max(
                        self.tracks[track_id]["inactivity_duration_seconds"],
                        self.tracks[track_id]["current_inactivity_seconds"]
                    )
            return self.tracks

        # Compute centroids of incoming detections
        input_centroids = np.zeros((len(detections), 2), dtype="int")
        for i, (x, y, w, h) in enumerate(detections):
            input_centroids[i] = (int(x + w / 2.0), int(y + h / 2.0))

        if len(self.tracks) == 0:
            for i in range(len(detections)):
                self.register(input_centroids[i], detections[i], current_time_sec)
        else:
            track_ids = list(self.tracks.keys())
            track_centroids = np.array([self.tracks[tid]["centroid"] for tid in track_ids])

            # Pairwise Euclidean distance
            D = np.linalg.norm(track_centroids[:, np.newaxis] - input_centroids, axis=2)
            rows = D.min(axis=1).argsort()
            cols = D.argmin(axis=1)[rows]

            used_rows = set()
            used_cols = set()

            for (row, col) in zip(rows, cols):
                if row in used_rows or col in used_cols:
                    continue
                if D[row, col] > self.max_distance:
                    continue

                track_id = track_ids[row]
                self.tracks[track_id]["centroid"] = input_centroids[col]
                self.tracks[track_id]["box"] = detections[col]
                self.tracks[track_id]["last_seen_seconds"] = current_time_sec
                self.tracks[track_id]["total_presence_seconds"] += time_delta
                self.tracks[track_id]["is_active"] = True
                self.disappeared[track_id] = 0

                # Compute motion within bounding box
                if frame_diff is not None:
                    x, y, w, h = detections[col]
                    x, y = max(0, x), max(0, y)
                    h_frame, w_frame = frame_diff.shape[:2]
                    x2, y2 = min(w_frame, x + w), min(h_frame, y + h)
                    roi_diff = frame_diff[y:y2, x:x2]
                    
                    if roi_diff.size > 0:
                        motion_val = float(np.mean(roi_diff))
                        self.tracks[track_id]["movement_samples"].append(motion_val)
                        if motion_val < Config.MOVEMENT_THRESHOLD:
                            self.tracks[track_id]["current_inactivity_seconds"] += time_delta
                        else:
                            self.tracks[track_id]["current_inactivity_seconds"] = 0.0
                        
                        self.tracks[track_id]["inactivity_duration_seconds"] = max(
                            self.tracks[track_id]["inactivity_duration_seconds"],
                            self.tracks[track_id]["current_inactivity_seconds"]
                        )

                used_rows.add(row)
                used_cols.add(col)

            unused_rows = set(range(0, D.shape[0])).difference(used_rows)
            unused_cols = set(range(0, D.shape[1])).difference(used_cols)

            for row in unused_rows:
                track_id = track_ids[row]
                self.disappeared[track_id] += 1
                if self.disappeared[track_id] > self.max_disappeared:
                    self.tracks[track_id]["is_active"] = False
                else:
                    self.tracks[track_id]["current_inactivity_seconds"] += time_delta
                    self.tracks[track_id]["inactivity_duration_seconds"] = max(
                        self.tracks[track_id]["inactivity_duration_seconds"],
                        self.tracks[track_id]["current_inactivity_seconds"]
                    )

            for col in unused_cols:
                self.register(input_centroids[col], detections[col], current_time_sec)

        return self.tracks


def detect_classroom_attendees(frame: np.ndarray, gray: np.ndarray, prev_gray: np.ndarray = None) -> List[Tuple[int, int, int, int]]:
    """
    Robust multi-method person detector for classroom monitoring:
    1. Checks for OpenCV built-in HOG detector if available.
    2. Checks for CascadeClassifier if available.
    3. Uses Adaptive Spatial Contrast & Motion Upper-Body Detector:
       Analyzes vertical column projections and upper-body contours across the seating zone,
       filtering human upper-body proportions (aspect ratio, area, minimum dimensions).
    """
    h, w = frame.shape[:2]
    detections: List[Tuple[int, int, int, int]] = []

    # Method 1: Check HOG if available in OpenCV build
    if hasattr(cv2, 'HOGDescriptor'):
        try:
            hog = cv2.HOGDescriptor()
            hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
            boxes, _ = hog.detectMultiScale(frame, winStride=(8, 8), padding=(8, 8), scale=1.05)
            for (bx, by, bw, bh) in boxes:
                if bw > 30 and bh > 50:
                    detections.append((int(bx), int(by), int(bw), int(bh)))
            if len(detections) > 0:
                return detections
        except Exception:
            pass

    # Method 2: Check CascadeClassifier if available in OpenCV build
    if hasattr(cv2, 'CascadeClassifier') and hasattr(cv2, 'data') and hasattr(cv2.data, 'haarcascades'):
        try:
            cascade_file = cv2.data.haarcascades + 'haarcascade_upperbody.xml'
            if os.path.exists(cascade_file):
                cc = cv2.CascadeClassifier(cascade_file)
                ub_boxes = cc.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(40, 50))
                for (ux, uy, ubw, ubh) in ub_boxes:
                    detections.append((int(ux), int(uy), int(ubw), int(ubh)))
                if len(detections) > 0:
                    return detections
        except Exception:
            pass

    # Method 3: Spatial Upper-Body & Seated Attendee Segmentation
    # Classroom seating is located between y=30% and y=85% of the frame
    band_top = int(h * 0.35)
    band_bottom = int(h * 0.85)
    seating_band = gray[band_top:band_bottom, :]

    # Estimate classroom background baseline intensity
    bg_est = float(np.percentile(seating_band, 85))
    diff_from_bg = np.abs(seating_band.astype(np.float32) - bg_est)
    
    # Column intensity profile across the horizontal seating area
    col_profile = np.mean(diff_from_bg, axis=0)
    profile_mean = float(np.mean(col_profile))
    threshold = max(8.0, profile_mean * 0.6)

    active_cols = np.where(col_profile > threshold)[0]
    if len(active_cols) > 0:
        clusters = []
        start = int(active_cols[0])
        for i in range(1, len(active_cols)):
            if active_cols[i] > active_cols[i-1] + 18:
                clusters.append((start, int(active_cols[i-1])))
                start = int(active_cols[i])
        clusters.append((start, int(active_cols[-1])))

        for (cx1, cx2) in clusters:
            bw = cx2 - cx1
            # A seated student occupies roughly 35px to 180px in width
            if 30 <= bw <= 200:
                bx = max(0, cx1)
                by = band_top
                bh = band_bottom - band_top
                detections.append((int(bx), int(by), int(bw), int(bh)))

    # Fallback to contour extraction if no column clusters
    if len(detections) == 0:
        edges = cv2.Canny(gray[band_top:band_bottom, :], 40, 120)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
        dilated = cv2.dilate(edges, kernel, iterations=2)
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours:
            x, y, cw, ch = cv2.boundingRect(c)
            if cw > 35 and ch > 40 and cv2.contourArea(c) > 600:
                detections.append((int(x), int(band_top + y), int(cw), int(ch)))

    return detections


def process_video_session(session_id: str, video_path: str):
    """
    Main Computer Vision and Multimodal Analytics pipeline for a classroom session.
    Reads actual video using OpenCV, detects persons, tracks attendance,
    measures movement and engagement timeline, and persists results to SQLite.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Update status to PROCESSING
        cursor.execute("""
            UPDATE sessions 
            SET status = 'PROCESSING', processing_progress = 5, processing_error = NULL 
            WHERE id = ?
        """, (session_id,))
        conn.commit()

        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at: {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"OpenCV could not open video stream: {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        if fps <= 0 or math.isnan(fps):
            fps = 25.0
        
        duration_seconds = total_frames / fps if total_frames > 0 else 0.0

        # Update video metadata in database
        cursor.execute("""
            UPDATE sessions 
            SET video_duration_seconds = ?, fps = ?, total_frames = ?, processing_progress = 10
            WHERE id = ?
        """, (round(duration_seconds, 2), round(fps, 2), total_frames, session_id))
        conn.commit()

        tracker = CentroidTracker(max_disappeared=10, max_distance=150)

        # Sampling configuration
        sample_step = max(1, int(fps * Config.SAMPLE_RATE_SECONDS))
        bin_interval_seconds = 5.0  # 5-second timeline bins
        
        # Timeline accumulator: bin_idx -> { active_counts: [], movement_scores: [] }
        bins_data: Dict[int, Dict[str, List[float]]] = {}
        
        prev_gray = None
        frame_idx = 0
        processed_count = 0
        total_sample_steps = max(1, total_frames // sample_step)

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_step == 0:
                current_time_sec = frame_idx / fps
                time_delta = Config.SAMPLE_RATE_SECONDS

                # Standardize frame size for consistent detection & performance
                target_width = 640
                h, w = frame.shape[:2]
                scale = target_width / float(w)
                resized = cv2.resize(frame, (target_width, int(h * scale)))
                gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
                blurred = cv2.GaussianBlur(gray, (21, 21), 0)

                # Compute motion difference image
                frame_diff = None
                frame_movement_val = 0.0
                if prev_gray is not None:
                    diff = cv2.absdiff(prev_gray, blurred)
                    _, thresh = cv2.threshold(diff, 15, 255, cv2.THRESH_BINARY)
                    frame_diff = thresh
                    # Normalized frame-level motion (0-100)
                    frame_movement_val = float(np.mean(thresh) / 255.0 * 100.0)
                prev_gray = blurred

                # Detect people using our multi-tier OpenCV detector
                detections = detect_classroom_attendees(resized, blurred, prev_gray)

                # Update Multi-Object Centroid Tracker
                active_tracks = tracker.update(
                    detections, 
                    current_time_sec=current_time_sec, 
                    time_delta=time_delta, 
                    frame_diff=frame_diff
                )

                # Bin allocation for timeline
                bin_idx = int(current_time_sec // bin_interval_seconds)
                if bin_idx not in bins_data:
                    bins_data[bin_idx] = {
                        "active_counts": [],
                        "movement_scores": []
                    }
                
                currently_active = sum(1 for t in active_tracks.values() if t["is_active"])
                bins_data[bin_idx]["active_counts"].append(currently_active)
                bins_data[bin_idx]["movement_scores"].append(frame_movement_val)

                # Periodic progress update to database
                processed_count += 1
                if processed_count % 5 == 0:
                    pct = min(85, int(10 + (processed_count / total_sample_steps) * 75))
                    cursor.execute("UPDATE sessions SET processing_progress = ? WHERE id = ?", (pct, session_id))
                    conn.commit()

            frame_idx += 1

        cap.release()

        # 2. Persist Participant Attendance Records
        effective_duration = max(duration_seconds, 1.0)
        
        # Clear any prior participants for this session
        cursor.execute("DELETE FROM participants WHERE session_id = ?", (session_id,))

        for tid, track in tracker.tracks.items():
            first_seen = round(track["first_seen_seconds"], 1)
            last_seen = round(track["last_seen_seconds"], 1)
            total_presence = round(track["total_presence_seconds"], 1)
            
            # Bound presence to duration
            total_presence = min(total_presence, effective_duration)
            presence_ratio = total_presence / effective_duration
            presence_pct = round(presence_ratio * 100.0, 1)

            # Determine attendance status with verifiable logic
            # Present: >= 70% of duration
            # Late: arrived after first 25% of class but attended >= 40%
            # Partial: attended 30% - 69%
            # Absent / Very Brief: < 30%
            if presence_ratio >= Config.ATTENDANCE_PRESENT_RATIO:
                attendance_status = "PRESENT"
            elif first_seen > (effective_duration * 0.25) and presence_ratio >= Config.ATTENDANCE_LATE_RATIO:
                attendance_status = "LATE"
            elif presence_ratio >= 0.30:
                attendance_status = "PARTIAL"
            else:
                attendance_status = "ABSENT"

            avg_movement = 0.0
            if track["movement_samples"]:
                avg_movement = round(float(np.mean(track["movement_samples"])), 2)

            inactivity_duration = round(track["inactivity_duration_seconds"], 1)

            cursor.execute("""
                INSERT INTO participants (
                    session_id, track_id, anonymous_label, first_seen_seconds,
                    last_seen_seconds, total_presence_seconds, presence_percentage,
                    attendance_status, avg_movement_score, inactivity_duration_seconds
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                session_id, tid, track["anonymous_label"], first_seen,
                last_seen, total_presence, presence_pct,
                attendance_status, avg_movement, inactivity_duration
            ))

        # 3. Persist Engagement Timeline
        cursor.execute("DELETE FROM engagement_timeline WHERE session_id = ?", (session_id,))
        
        total_detected_participants = max(1, len(tracker.tracks))
        
        num_bins = max(1, int(math.ceil(effective_duration / bin_interval_seconds)))
        for b_idx in range(num_bins):
            bin_sec = b_idx * bin_interval_seconds
            minutes = int(bin_sec // 60)
            seconds = int(bin_sec % 60)
            time_label = f"{minutes:02d}:{seconds:02d}"

            if b_idx in bins_data and bins_data[b_idx]["active_counts"]:
                avg_active = int(round(np.mean(bins_data[b_idx]["active_counts"])))
                avg_motion = round(float(np.mean(bins_data[b_idx]["movement_scores"])), 2)
            else:
                avg_active = 0
                avg_motion = 0.0

            # Transparent heuristic indicator clearly derived from physical motion & presence:
            # - Presence fraction contributes up to 60 points
            # - Measured physical movement index contributes up to 40 points
            presence_component = (avg_active / total_detected_participants) * 60.0
            movement_component = min(40.0, avg_motion * 1.5)
            composite_indicator = round(min(100.0, max(0.0, presence_component + movement_component)), 1)

            notes = "Normal observation"
            if avg_motion < Config.MOVEMENT_THRESHOLD and avg_active > 0:
                notes = "Low physical movement observed; note-taking or reading likely"
            elif avg_motion > 35.0:
                notes = "Elevated physical motion observed; classroom discussion or activity transition"

            cursor.execute("""
                INSERT INTO engagement_timeline (
                    session_id, timestamp_seconds, time_label, active_participants_count,
                    classroom_movement_index, audio_energy_db, estimated_engagement_indicator, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                session_id, bin_sec, time_label, avg_active,
                avg_motion, 0.0, composite_indicator, notes
            ))

        # 4. Mark session COMPLETED
        now_str = time.strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute("""
            UPDATE sessions 
            SET status = 'COMPLETED', processing_progress = 100, completed_at = ?
            WHERE id = ?
        """, (now_str, session_id))
        conn.commit()

        return {
            "success": True,
            "participants_count": len(tracker.tracks),
            "duration_seconds": duration_seconds,
            "timeline_points": num_bins
        }

    except Exception as e:
        conn.rollback()
        error_msg = str(e)
        cursor.execute("""
            UPDATE sessions 
            SET status = 'FAILED', processing_error = ?
            WHERE id = ?
        """, (error_msg, session_id))
        conn.commit()
        return {
            "success": False,
            "error": error_msg
        }
    finally:
        conn.close()
