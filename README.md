
# 🛡️ GuardianAI: Real-Time Fall Detection System

![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![TensorFlow](https://img.shields.io/badge/TensorFlow_Lite-Edge_AI-FF6F00?style=for-the-badge&logo=tensorflow)
![Flask](https://img.shields.io/badge/Flask-Backend-000000?style=for-the-badge&logo=flask)
![Firebase](https://img.shields.io/badge/Firebase-Cloud_Messaging-FFCA28?style=for-the-badge&logo=firebase)

---

## 📖 Executive Summary
**GuardianAI** is a privacy-focused, edge-computing solution designed to protect the elderly living alone. By leveraging **Computer Vision (PoseNet)** and **Async Architecture**, it transforms any standard laptop or webcam into a 24/7 intelligent safeguard.

Unlike wearable devices that need charging or can be forgotten, GuardianAI monitors the environment passively and triggers immediate alerts |(SMS/Push/Email) when a critical fall event is detected, potentially saving lives by reducing response time.

---

## 🏗️ System Architecture

GuardianAI utilizes a **Triple-Async Architecture** to ensure the video feed never freezes, even when the AI model is loading or processing heavy frames.

```mermaid
graph TD
    User[User/Camera] -->|Raw Video Feed| CamService[Camera Service Thread]
    
    subgraph "Backend (Python/Flask)"
        CamService --1. Get Frame--> AsyncBuffer[Frame Buffer]
        AsyncBuffer --2. Async Inference--> AIEngine[AI Engine (TensorFlow Lite)]
        AIEngine --3. Keypoints & Score--> Logic[Fall Logic Heuristics]
        Logic --4. Alert Trigger--> Notifier[Notification Service]
        Verifier[Flask Server] --5. Stream MJPEG--> FrontendAPI
    end
    
    subgraph "Frontend (React)"
        FrontendAPI -->|Video Stream| Dashboard[Dashboard UI]
        Dashboard -->|Socket/Status| StatusPanel[Status Panel]
    end
    
    Notifier -->|Push| Firebase[Firebase Cloud Messaging]
    Notifier -->|Msg| Telegram[Telegram Bot]
```

### Key Technical Innovations
1. **Lazy Loading AI**: The heavyweight TensorFlow model loads in a background thread *after* the camera allows the video feed to start instantly.
2. **Robust Camera Handshake**: Implements an infinite-retry state machine that handles USB disconnects gracefully without crashing the server.
3. **Privacy-First Design**: All video processing happens **locally on the device**. Only text-based alerts (and optional snapshots) leave the private network.

---

## �️ Tech Stack

### Backend (The Brain)
*   **Language**: Python 3.10+
*   **Framework**: Flask (REST API + MJPEG Streaming)
*   **Computer Vision**: OpenCV (`cv2`) for frame handling.
*   **AI Model**: TensorFlow Lite (PoseNet MobileNet v1) - Optimized for CPU inference.
*   **Libraries**: `numpy` (Math), `Pillow` (Image Proc), `threading` (Concurrency).

### Frontend (The Face)
*   **Framework**: React (Vite)
*   **Styling**: Tailwind CSS (Cyberpunk/Glassmorphism Aesthetic)
*   **State Management**: React Hooks (`useState`, `useEffect`)
*   **Build Tool**: Vite (Fast HMR)

### Connectivity
*   **alerts**: Firebase Cloud Messaging (FCM), SMTP (Email), Telegram Bot API.

---

## 📂 Project Structure

Understanding the codebase for developers and judges:

```
fall-detection-main/
├── app.py                 # 🚀 Entry Point. Starts Flask Server & Camera Thread.
├── camera_service.py      # 🧠 Core Logic. Handles Camera, AI Loading, & Drawing.
├── notifier.py            # 📨 Handles Email/SMS/FCM alert delivery.
├── requirements.txt       # 📦 Python Dependencies.
│
├── frontend/              # 🎨 React Application
│   ├── node_modules/      # 📦 Dependencies (Installed via npm)
│   ├── src/components/    # Dashboard.jsx, Sidebar.jsx (UI Components)
│   └── vite.config.js     # Proxy configuration for backend connection.
│
├── src/
│   └── pipeline/          # 🤖 AI Modules
│       ├── fall_detect.py # Heuristic Logic: Calculates angles to detect falls.
│       ├── inference.py   # Wrapper for TFLite Interpreter.
│       └── pose_engine.py # Extracts skeletal keypoints from MobileNet.
│
└── ai_models/             # 💾 Pre-trained TFLite models.
```

---

## 🚀 Installation & Setup Guide

### 1. Prerequisites
*   Python 3.10 or higher.
*   Node.js (LTS version).
*   A Webcam.

### 2. Backend Setup
Open a terminal in the root folder:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the Brain
python app.py
```
*You should see:* `Web Server Starting on Port 5000`

### 3. Frontend Setup
Open a **new** terminal in the `frontend` folder:

```bash
cd frontend

# Install Node modules
npm install

# Start the Interface
npm run dev
```
*You should see:* `Local: http://localhost:5173`

### 4. Usage
1.  Open `http://localhost:5173` in your browser.
2.  Allow Camera Access if prompted.
3.  **Wait 5 Seconds**: You will see "CONNECTING..." -> "AI LOADING..." -> "AI SYSTEM ONLINE".
4.  The system is now armed.

---

## 🧠 How It Works (The Logic)

The system doesn't just "guess" a fall. it uses geometry:

1.  **Pose Extraction**: The AI maps **17 keypoints** on the body (Shoulders, Hips, Knees, etc.).
2.  **Angle Calculation**: It calculates the angle of the "Spine Vector" (Line connecting mid-shoulder to mid-hip).
3.  **Velocity Check**: It compares the current frame to previous frames (t-1, t-2).
4.  **Fall Trigger**:
    *   **IF** Spine Angle > 60° (Horizontal)
    *   **AND** Vertical Velocity is High (Sudden drop)
    *   **THEN** Trigger `FALL DETECTED` state.
5.  **Validation**: A generic "Confidence Score" (set to 25%) filters out ghosts/noise.

---

## ✨ Credits & License

*   **Developer**: Panth Haveliwala
*   **License**: MIT License
*   **AI Model**: Google TensorFlow PoseNet (MobileNet V1)

---
*Built with ❤️ for a safer future.*

