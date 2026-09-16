# VOICEGUARD — AI-Powered Voice Impersonation Detection

Enterprise cybersecurity dashboard and multi-model inference engine for acoustic deepfake and voice cloning detection.

## Quickstart

### 1. Start the Backend API (FastAPI)
From the repository root in PowerShell:
```powershell
.\.venv\Scripts\Activate.ps1
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Or run directly without activating:
```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --app-dir backend
```

* API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
* Health Endpoint: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 2. Start the Frontend Dashboard (React + Vite)
In a separate terminal window:
```powershell
cd frontend
npm run dev
```

* Dashboard UI: [http://localhost:5173](http://localhost:5173)

---

For architecture details, color tokens, and component breakdown, see [PROJECT_GUIDE.md](file:///d:/VOICEGUARD-REBUILD/docs/PROJECT_GUIDE.md).
