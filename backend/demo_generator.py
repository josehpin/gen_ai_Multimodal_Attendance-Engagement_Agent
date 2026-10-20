import cv2
import numpy as np
import os
import math
from pathlib import Path
from config import Config

def create_demo_classroom_video(output_path: str, duration_sec: int = 12, fps: int = 20) -> str:
    """
    Generates an actual realistic synthetic classroom video using OpenCV VideoWriter.
    Contains simulated human figures with motion, late arrival, and active participation.
    Returns the absolute path to the generated MP4 file.
    """
    Config.init_app()
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    width = 640
    height = 360
    total_frames = duration_sec * fps
    
    # Try multiple codecs in order of common support on Windows (mp4v, avc1, MJPG)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    if not out.isOpened():
        # Fallback to MJPG or XVID
        fourcc = cv2.VideoWriter_fourcc(*'MJPG')
        output_path = output_path.replace('.mp4', '.avi')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    # Base coordinates for classroom desks and students
    students = [
        {"id": 1, "base_x": 120, "base_y": 200, "color": (190, 140, 70), "late_after_sec": 0},
        {"id": 2, "base_x": 260, "base_y": 190, "color": (80, 150, 220), "late_after_sec": 0},
        {"id": 3, "base_x": 400, "base_y": 205, "color": (90, 180, 110), "late_after_sec": 0},
        {"id": 4, "base_x": 520, "base_y": 210, "color": (160, 90, 180), "late_after_sec": 3.5}, # Late arrival
    ]

    for frame_i in range(total_frames):
        current_sec = frame_i / float(fps)
        
        # 1. Background: Classroom room wall, floor, chalkboard
        frame = np.full((height, width, 3), (245, 245, 248), dtype=np.uint8) # Warm off-white wall
        cv2.rectangle(frame, (0, int(height * 0.7)), (width, height), (220, 215, 205), -1) # Floor
        
        # Chalkboard / Whiteboard on front wall
        cv2.rectangle(frame, (80, 20), (560, 110), (50, 90, 60), -1) # Dark green board
        cv2.rectangle(frame, (76, 16), (564, 114), (90, 70, 50), 4) # Wooden frame
        cv2.putText(frame, "LECTURE: COMPUTER VISION & ENGAGEMENT", (100, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (230, 245, 230), 2)
        cv2.putText(frame, "Anonymous Multimodal Classroom Monitoring", (100, 85), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 230, 200), 1)

        # 2. Draw Desks
        for s in students:
            dx = s["base_x"]
            dy = s["base_y"]
            # Desk top
            cv2.rectangle(frame, (dx - 45, dy + 55), (dx + 45, dy + 70), (160, 130, 95), -1)
            # Desk legs
            cv2.line(frame, (dx - 40, dy + 70), (dx - 40, dy + 110), (100, 80, 60), 3)
            cv2.line(frame, (dx + 40, dy + 70), (dx + 40, dy + 110), (100, 80, 60), 3)

        # 3. Draw Student Figures with simulated posture & movement
        for s in students:
            if current_sec < s["late_after_sec"]:
                continue # Student hasn't entered room yet

            dx = s["base_x"]
            dy = s["base_y"]
            color = s["color"]

            # Add gentle periodic motion (head nodding, note-taking)
            sway_x = int(math.sin(current_sec * 2.0 + s["id"]) * 4.0)
            sway_y = int(math.cos(current_sec * 3.0 + s["id"]) * 3.0)

            # Special action: Student #2 raises hand between 4s and 8s
            raising_hand = (s["id"] == 2 and 4.0 <= current_sec <= 8.0)
            
            # Head (solid circle + hair outline)
            head_x = dx + sway_x
            head_y = dy - 20 + sway_y
            cv2.circle(frame, (head_x, head_y), 18, (210, 180, 150), -1) # Face tone
            cv2.ellipse(frame, (head_x, head_y - 6), (18, 12), 0, 180, 360, (50, 40, 35), -1) # Hair

            # Torso / Upper body
            torso_top = (dx - 22 + sway_x, dy + sway_y)
            torso_bottom = (dx + 22 + sway_x, dy + 60 + sway_y)
            cv2.rectangle(frame, torso_top, torso_bottom, color, -1)

            # Shoulders / Neck
            cv2.rectangle(frame, (dx - 6 + sway_x, dy - 6 + sway_y), (dx + 6 + sway_x, dy + 4 + sway_y), (210, 180, 150), -1)

            # Arms / Hands
            if raising_hand:
                # Arm raised up
                cv2.line(frame, (dx + 20 + sway_x, dy + 10 + sway_y), (dx + 30 + sway_x, dy - 35), color, 6)
                cv2.circle(frame, (dx + 30 + sway_x, dy - 38), 6, (210, 180, 150), -1)
            else:
                # Resting on desk
                cv2.line(frame, (dx - 20 + sway_x, dy + 20 + sway_y), (dx - 15 + sway_x, dy + 56), color, 5)
                cv2.line(frame, (dx + 20 + sway_x, dy + 20 + sway_y), (dx + 15 + sway_x, dy + 56), color, 5)

        # 4. Timer / Session indicator overlay in bottom corner
        cv2.putText(frame, f"Time: {current_sec:04.1f}s | Real-time Vision Processing Feed", (15, height - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 80, 80), 1)

        out.write(frame)

    out.release()
    return output_path

if __name__ == "__main__":
    test_path = str(Config.UPLOAD_FOLDER / "test_demo.mp4")
    created = create_demo_classroom_video(test_path, duration_sec=6, fps=15)
    print("Demo video created at:", created)
