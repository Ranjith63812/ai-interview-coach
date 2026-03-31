# 🎯 AI Interview Coach

An intelligent, full-stack AI-powered interview preparation platform that simulates real interview scenarios, analyzes your speech and body language, and delivers instant personalized feedback — all in one place.

---

## 📸 Project Overview

AI Interview Coach helps job seekers practice and improve by:
- Asking tailored interview questions based on role, difficulty, and category
- Recording your video responses through the browser webcam
- Analyzing your **speech**, **voice confidence**, and **eye contact / face presence**
- Providing AI-generated scores, strengths, improvements, and model answers
- Exporting a **PDF performance report** at the end of the session

---

## 🏗️ Architecture

The project is split into **3 independent services** that work together:

```
ai-coach/
├── frontend/          → React.js + Vite (User Interface — Port 5173)
├── backend/           → Node.js + Express (API Server — Port 5000)
├── python-service/    → Python + Flask (AI/ML Engine — Port 5001)
├── run_app.bat        → One-click launcher (Windows)
└── stop_app.bat       → One-click stopper (Windows)
```

### How they connect:
```
Browser (User)
    │
    ▼
Frontend (React) :5173
    │  — API calls —▶  Backend (Node.js) :5000
                              │  — Video upload —▶  Python Service (Flask) :5001
                              │  — AI requests —▶   Groq Cloud API (LLaMA 3.1)
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎤 Speech-to-Text | Transcribes your spoken answer using OpenAI Whisper |
| 👁️ Facial Analysis | Detects face presence & eye contact using MediaPipe FaceLandmarker |
| 🔊 Voice Scoring | Analyzes speaking rate (WPM), silence ratio, and energy using Librosa |
| 💪 Confidence Score | Composite metric from pitch variation, vocal energy, speaking rate |
| 🧠 AI Feedback | Groq LLaMA 3.1 scores your answer content (1–10) with strengths & improvements |
| 💡 Model Answer | AI generates an ideal answer to compare against yours |
| ❓ Follow-up Questions | AI suggests a realistic follow-up question the interviewer might ask |
| 📄 Resume-Based Questions | Upload your resume (PDF) and get personalized questions targeting your skills |
| 🎯 Multi-Round Interview | Practice Technical, HR, Behavioral, and Managerial rounds separately |
| 📊 Live Score Dashboard | See scores for Content, Voice, Face, and Confidence after each answer |
| 📥 PDF Report Export | Download a full performance report with all scores and feedback |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React.js | 18.2 | UI framework |
| Vite | 5.2 | Build tool & dev server |
| Tailwind CSS | 3.4 | Styling |
| html2canvas | 1.4 | Screenshot for PDF |
| jsPDF | 4.2 | PDF report generation |
| canvas-confetti | 1.9 | Celebration animations |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | LTS | Runtime |
| Express.js | 4.18 | Web framework & API |
| Multer | 1.4 | File upload handling (video, PDF) |
| pdf-parse | 2.4 | Extract text from uploaded resumes |
| Axios | 1.6 | HTTP calls to Groq API & Python service |
| dotenv | 16.4 | Environment variable management |
| cors | 2.8 | Cross-origin request handling |

### Python ML Service
| Technology | Purpose |
|---|---|
| Flask | Lightweight web framework to expose ML as an API |
| flask-cors | Cross-origin support |
| OpenAI Whisper | State-of-the-art speech-to-text transcription |
| Librosa | Audio analysis (WPM, silence, energy, pitch) |
| MediaPipe (Google) | Face landmark detection for eye contact scoring |
| OpenCV (cv2) | Video frame extraction |

### External APIs
| Service | Purpose |
|---|---|
| Groq Cloud (LLaMA 3.1-8B-Instant) | AI question generation & answer evaluation |

---

## 📋 Prerequisites

Make sure the following are installed on your system before setup:

| Requirement | Download |
|---|---|
| **Node.js** (v18 or higher) | https://nodejs.org |
| **Python** (3.9 — 3.11 recommended) | https://www.python.org/downloads/ |
| **Git** | https://git-scm.com |
| **npm** (comes with Node.js) | — |
| **pip** (comes with Python) | — |

> ⚠️ **Python 3.12+ may have compatibility issues with some ML libraries.** Python 3.10 or 3.11 is recommended.

---

## 🚀 Installation & Setup (From Scratch)

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Ranjith63812/ai-interview-coach.git
cd ai-interview-coach
```

---

### Step 2 — Set Up the Backend (Node.js)

```bash
cd backend
npm install
```

Create the environment file:

```bash
# Windows
copy .env.example .env
```

Or manually create a file named `.env` inside the `backend/` folder:

```env
GROQ_API_KEY=your_groq_api_key_here
```

> 🔑 **Get your free Groq API key at:** https://console.groq.com
> - Sign up → Go to API Keys → Create a new key → Copy and paste it above

---

### Step 3 — Set Up the Python ML Service

```bash
cd ../python-service
```

#### Create a virtual environment:
```bash
python -m venv venv
```

#### Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate

# Mac / Linux
source venv/bin/activate
```

#### Install Python dependencies:
```bash
pip install -r requirements.txt
```

> ⚠️ **Note:** Installing `openai-whisper` and `mediapipe` may take 5–10 minutes and requires ~2–3 GB of disk space.

> ⚠️ **Windows users:** If you get an error with `opencv-python`, try:
> ```bash
> pip install opencv-python-headless
> ```

---

### Step 4 — Set Up the Frontend (React)

```bash
cd ../frontend
npm install
```

---

## ▶️ Running the Application

### Option A — One-Click Launch (Windows Only) ✅ Recommended

Simply double-click **`run_app.bat`** from the root folder.

This will automatically:
1. Open the **Backend** server in a new terminal window (Port 5000)
2. Open the **Python ML service** in a new terminal window (Port 5001)
3. Open the **Frontend** dev server in a new terminal window (Port 5173)

Then open your browser and go to:
```
http://localhost:5173
```

To **stop all services**, double-click **`stop_app.bat`**.

---

### Option B — Manual Launch (All Platforms)

Open **3 separate terminal windows** and run each command:

**Terminal 1 — Backend:**
```bash
cd backend
node server.js
```

**Terminal 2 — Python Service:**
```bash
cd python-service
venv\Scripts\activate        # Windows
# OR: source venv/bin/activate  (Mac/Linux)
python app.py
```

**Terminal 3 — Frontend:**
```bash
cd frontend
npx vite
```

Then open your browser at:
```
http://localhost:5173
```

---

## 🌐 Service Ports

| Service | Port | URL |
|---|---|---|
| Frontend (React + Vite) | 5173 | http://localhost:5173 |
| Backend (Node.js + Express) | 5000 | http://localhost:5000 |
| Python ML Service (Flask) | 5001 | http://localhost:5001 |

---

## 🔑 Environment Variables

### `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | Your Groq Cloud API key for AI question generation and answer evaluation |
| `PORT` | ❌ Optional | Override the default backend port (default: 5000) |

> If `GROQ_API_KEY` is not set, the app will automatically use a built-in **fallback question bank** and skip AI feedback — so the app still works without an API key.

---

## 📁 Project File Structure

```
ai-coach/
│
├── run_app.bat                   ← One-click start all services (Windows)
├── stop_app.bat                  ← One-click stop all services (Windows)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx               ← Main application (all UI + logic)
│   │   ├── main.jsx              ← React entry point
│   │   └── index.css             ← Global styles
│   ├── index.html                ← HTML shell
│   ├── vite.config.js            ← Vite build configuration
│   ├── tailwind.config.js        ← Tailwind CSS configuration
│   └── package.json              ← Frontend dependencies
│
├── backend/
│   ├── server.js                 ← Express server (all API routes)
│   ├── .env                      ← Environment variables (not committed)
│   ├── uploads/                  ← Temporary storage for uploaded files
│   └── package.json              ← Backend dependencies
│
└── python-service/
    ├── app.py                    ← Flask API (Whisper + MediaPipe + Librosa)
    ├── requirements.txt          ← Python dependencies
    ├── face_landmarker.task      ← MediaPipe face model file
    └── venv/                     ← Python virtual environment (not committed)
```

---

## 🔌 API Endpoints

### Backend (Node.js) — Port 5000

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/questions` | Generate interview questions by role, category, difficulty |
| `POST` | `/questions-from-resume` | Upload resume PDF → get personalized questions |
| `POST` | `/analyze` | Upload recorded video → get full analysis (transcription + scores + AI feedback) |

### Python Service (Flask) — Port 5001

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/process_video` | Receives video file → returns transcription, voice score, face score, confidence score |

---

## 🧠 How the AI Analysis Works

When you record and submit an answer, this pipeline runs:

```
Your Video Recording
        │
        ▼
   Backend (Node.js)
        │
        ├──▶ Python Service
        │         ├── Whisper:    Transcribes speech to text
        │         ├── Librosa:    Calculates WPM, silence ratio, voice energy
        │         ├── MediaPipe:  Detects face in every 5th frame
        │         └── Returns:    text, voiceScore, faceScore, confidenceScore
        │
        └──▶ Groq API (LLaMA 3.1)
                  ├── Input:  Question + transcribed answer
                  └── Output: contentScore, strengths, improvements,
                              feedback, followUpQuestion, modelAnswer
```

---

## ❓ Troubleshooting

### Python service won't start
- Make sure you activated the virtual environment (`venv\Scripts\activate`)
- Ensure Python 3.9–3.11 is installed
- Try reinstalling: `pip install -r requirements.txt`

### Whisper model downloads slowly on first run
- The first run of the Python service downloads the Whisper `base` model (~140MB)
- This is normal — it only happens once

### Frontend shows "Failed to fetch" errors
- Make sure all 3 services are running (check all 3 terminal windows)
- Check that backend is on port 5000 and python service is on port 5001

### `run_app.bat` doesn't work
- Right-click the file → "Run as Administrator"
- Make sure `node`, `python`, and `npx` are in your system PATH

### No AI feedback (only fallback questions)
- Check that your `.env` file inside `backend/` exists and has a valid `GROQ_API_KEY`
- Verify the key is active at https://console.groq.com

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Ranjith**  
GitHub: [@Ranjith63812](https://github.com/Ranjith63812)

---

> 💡 **Built with passion to help candidates prepare smarter, not harder.**
