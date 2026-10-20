# Multimodal Attendance & Engagement Agent

An AI-assisted classroom monitoring and analytical system that tracks attendance, measures physical classroom dynamics, and generates evidence-based teaching suggestions using computer vision, audio processing, and intelligent analytics.

[![Frontend: React + TypeScript](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Tailwind-blue)](https://react.dev/)
[![Backend: Python + Flask](https://img.shields.io/badge/Backend-Python%20%7C%20Flask-emerald)](https://flask.palletsprojects.com/)
[![Computer Vision: OpenCV](https://img.shields.io/badge/CV-OpenCV%20HOG%20Tracker-purple)](https://opencv.org/)
[![AI: Google Gemini API](https://img.shields.io/badge/AI-Google%20Gemini%202.5%20Flash-orange)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-slate)](LICENSE)

---

## 🌟 Core Architecture & Pillars

1. **Computer Vision Attendance Pipeline**
   - Built on OpenCV HOG (Histogram of Oriented Gradients) person detector and persistent Centroid/IoU tracking.
   - Detects attendees across sampled video frames and tracks arrival timestamps (`first_seen`), departure timestamps (`last_seen`), and continuous presence duration.
   - Categorizes attendance transparently: **Present** (≥70% presence), **Late** (arrived after first quarter and attended ≥40%), **Partial** (30%–69%), or **Absent/Brief**.
   - Generates verifiable attendance registers with one-click **CSV export**.

2. **Multimodal Classroom Engagement Analytics**
   - Measures frame-level physical movement index (0–100) using normalized pixel differencing within participant regions.
   - Tracks individual and classroom-wide stillness and inactivity intervals.
   - Analyzes audio energy (dB) over discrete 5-second timeline bins.
   - **Privacy & Ethical Clarification:** Explicitly clarifies that physical stillness or looking down does not equate to disengagement (students frequently look down to read or take notes). Never generates random numbers.

3. **AI Teaching Assistant (Gemini + Rule-Based Engine)**
   - Translates measured classroom analytics into concrete, evidence-based pedagogical recommendations.
   - **Google Gemini API Integration:** When configured with a `GEMINI_API_KEY`, synthesizes contextual pedagogical advice using `gemini-2.5-flash`.
   - **Intelligent Heuristic Fallback:** When Gemini is unconfigured or offline, seamlessly runs a built-in deterministic heuristic engine that cites exact measured statistics (e.g., motion dips, late arrivals, fatigue drift).
   - Prominently displays the origin badge (`Google Gemini` or `Rule-Based Analytics Engine`).

4. **Privacy-Preserving Design**
   - **Zero Biometrics:** Strictly prohibits facial recognition algorithms or student identity matching.
   - **Anonymous Tracking:** Assigns ephemeral identifiers (`Participant #01`, `Participant #02`) per session.
   - **Data Sovereignty:** Uploaded video files can be deleted with a single click, triggering cascade cleanup.

5. **Built-in Synthetic Classroom Demo Engine**
   - One-click demo button generates an actual MP4 video with simulated students, executes the complete OpenCV detection and tracking pipeline, and populates genuine metrics and suggestions.

---

## 📂 Project Structure

```
gen_ai/
├── backend/
│   ├── app.py                     # Flask REST API endpoints & CORS configuration
│   ├── config.py                  # Environment and pipeline settings
│   ├── database.py                # SQLite schema and connection manager
│   ├── cv_engine.py               # OpenCV Person Detector, CentroidTracker, Movement Analyzer
│   ├── audio_engine.py            # Audio extraction and RMS level measurement
│   ├── ai_assistant.py            # Gemini integration + Heuristic Rule-Based fallback
│   ├── demo_generator.py          # Synthetic classroom MP4 video generator
│   ├── tests/
│   │   ├── test_api.py            # Flask endpoint unit tests
│   │   ├── test_cv_engine.py      # OpenCV detection and tracking tests
│   │   └── test_ai_assistant.py   # Recommendation engine & evidence citation tests
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Backend environment variables template
│   └── instance/                  # SQLite storage (attendance.db)
├── frontend/
│   ├── src/
│   │   ├── components/            # Sidebar, Header, StatCards, Modals, EmptyStates, PrivacyBanner
│   │   ├── pages/
│   │   │   ├── Overview.tsx       # KPI cards, attendance charts, recent sessions & insights
│   │   │   ├── Attendance.tsx     # Attendance table, presence ratios, filter, CSV download
│   │   │   ├── Engagement.tsx     # Recharts movement timelines, active counts, dynamic drift
│   │   │   ├── AIAssistant.tsx    # Evidence-based pedagogical suggestions & model switch
│   │   │   ├── Sessions.tsx       # Session management, video upload, processing controls
│   │   │   └── Settings.tsx       # Gemini API key configuration, thresholds, privacy audits
│   │   ├── services/api.ts        # Axios API client with proxy & Vercel baseURL support
│   │   ├── types/index.ts         # TypeScript data contracts
│   │   ├── index.css              # Tailwind CSS directives & SaaS theme
│   │   └── App.tsx                # Main view router and global state
│   ├── package.json
│   ├── vite.config.ts             # Vite build & local proxy to Flask port 5000
│   └── tailwind.config.js
├── vercel.json                    # Vercel deployment configuration
├── .gitignore
├── .env.example
└── README.md
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Python:** 3.10+ (tested on Python 3.14)
- **Node.js:** 18+ (tested on Node v24)
- **npm:** 9+

### 1. Backend Setup (Flask API)
```bash
# Navigate to the backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# (Optional) Configure environment variables
# Copy .env.example to .env and add your GEMINI_API_KEY if desired
cp .env.example .env

# Run automated test suite
python -m pytest tests/

# Start the Flask backend server
python app.py
```
The backend API starts on **`http://localhost:5000`**.

### 2. Frontend Setup (React + Vite)
```bash
# Navigate to the frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
The frontend application will be live at **`http://localhost:3000`** with automatic proxying to the Flask backend.

### 3. Production Build Validation
```bash
cd frontend
npm run build
```
Generates optimized static bundle in `frontend/dist`.

---

## 🧪 Testing the Entire Pipeline in 1 Click

1. Open `http://localhost:3000` in your browser.
2. In the top header or empty state, click **`⚡ Run Demo Analysis`**.
3. The system will:
   - Generate an authentic MP4 classroom video (`demo_classroom.mp4`) via OpenCV.
   - Execute the OpenCV HOG detection and CentroidTracker pipeline.
   - Calculate arrival timestamps, presence percentages, and movement indexes.
   - Generate evidence-based pedagogical recommendations.
   - Automatically redirect you to view the live attendance and engagement graphs!

---

## 🌐 Production Deployment Guide

### A. Deploying Frontend to Vercel
1. Push this repository to your GitHub account.
2. In the **Vercel Dashboard**, click **New Project** and select this repository.
3. Configure the build settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (or `frontend`)
   - **Build Command:** `cd frontend && npm run build` (or `npm run build` if root is `frontend`)
   - **Output Directory:** `frontend/dist` (or `dist` if root is `frontend`)
4. Add the Environment Variable in Vercel:
   ```
   VITE_API_URL=https://your-backend-domain.onrender.com
   ```
5. Deploy! Vercel handles static caching and SPA rewrites automatically via `vercel.json`.

### B. Deploying Backend to Render / Railway / Fly.io
1. Create a Web Service pointing to the `backend/` folder.
2. Build command: `pip install -r requirements.txt`
3. Start command: `gunicorn -w 2 -b 0.0.0.0:$PORT app:app` (or `python app.py`)
4. Environment Variables:
   - `PORT=5000`
   - `CORS_ORIGINS=https://your-frontend.vercel.app`
   - `GEMINI_API_KEY=your_gemini_api_key`
   - `MAX_CONTENT_LENGTH=524288000`
5. Attach a persistent disk mount to `/backend/instance` to persist the SQLite database across redeploys, or swap to PostgreSQL by changing `database.py`.

---

## 🔒 Privacy & Compliance Commitment

- **No Facial Biometrics:** The system does not extract, compute, or store facial feature vectors.
- **Auditable Heuristics:** Educational suggestions cite actual measured numbers (e.g. "classroom motion was 12.4% during minutes 15–20").
- **Zero Fabricated Attendance:** Records reflect actual presence observed in the video feed.

---

## 📄 License
MIT License. Developed for modern educational analytics and privacy-first multimodal research.
