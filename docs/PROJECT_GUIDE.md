# VOICEGUARD Project & Architecture Guide

## Overview
**VOICEGUARD** is an AI-powered enterprise audio deepfake and voice impersonation detection platform. It combines multiple acoustic feature extractors, raw-waveform neural networks, and self-supervised speech representations into a unified threat intelligence dashboard.

---

## Running the Application

### 1. Backend (FastAPI + PyTorch)
From the project root directory:

**Windows PowerShell:**
```powershell
# Activate the virtual environment and start FastAPI
.\.venv\Scripts\Activate.ps1
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Or run directly with the virtual environment Python:
```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --app-dir backend
```

* Backend API runs at: `http://localhost:8000`
* Interactive API Documentation (Swagger UI): `http://localhost:8000/docs`
* Health check: `http://localhost:8000/api/health`

### 2. Frontend (React + TypeScript + Vite)
In a separate terminal window:

**Windows PowerShell:**
```powershell
cd frontend
npm run dev
```

* Frontend dashboard runs at: `http://localhost:5173`
* Vite automatically proxies `/api/*` requests to `http://localhost:8000`.

---

## Color Palette & Visual Theme
The dashboard adheres to the cybersecurity visual system:
* **Primary Navy:** `#253C6D` — Main card surfaces and header backgrounds
* **Secondary Navy:** `#30497D` — Nested metric panels, model chips, button backgrounds
* **Slate Blue:** `#455B8A` — Structural borders, dividing lines, subtle text
* **Orange Accent:** `#F2842F` — Primary calls to action, brand highlights, active states
* **Dark Navy Base:** `#10192b` — Overall canvas background with radial mesh gradients
* **Threat Indicators:**
  * Low Risk / Authentic: `#22c55e` (Emerald)
  * Medium Risk / Anomalous: `#f59e0b` (Amber)
  * High Risk / Synthetic Impersonation: `#ef4444` (Ruby/Rose)
  * Unknown / Insufficient: `#94a3b8` (Slate)

---

## Frontend Architecture & Component Hierarchy

```
frontend/src/
├── api/
│   └── client.ts                 # Typed API client (health, models, inference)
├── components/
│   ├── Header.tsx                # Branding, shield icon, subtitle, system HUD status
│   ├── AudioUploader.tsx         # Drag & drop, browse, playback preview, duration & size
│   ├── ModelSelector.tsx         # 5-model fleet grid, Select All / Clear controls
│   ├── ModelCard.tsx             # Ready/Loading/Blocked/Error badges, specs, honest notes
│   ├── EvaluationControls.tsx    # "Run Selected" (orange CTA), "Auto / Ensemble", reset
│   ├── InferenceProgress.tsx     # Cyber neural scanning progress bar & active model tags
│   ├── RiskAnalyzer.tsx          # Threat intelligence gauge, risk score, telemetry, consensus
│   ├── ModelResults.tsx          # Per-model logit score bars, timings, labels, warnings
│   └── ErrorAlert.tsx            # High-visibility dismissible notification banner
├── App.tsx                       # Centered 12-column responsive layout container
├── index.css                     # Global theme tokens, typography, scrollbars, cards
└── App.css                       # Audio wave animations and cyber accents
```

---

## Layout Strategy
* **Widescreen & Desktop (1024px+):**
  * Centered responsive `max-w-7xl` container (`mx-auto px-4 sm:px-6 lg:px-8`).
  * Balanced 12-column grid:
    * **Left Column (5 cols):** Audio Upload Card + Evaluation Action Controls + Neural Scan Progress.
    * **Right Column (7 cols):** 5-Model Detection Matrix with responsive 2-column card grid.
  * **Bottom Deck (12 cols full width):** Threat Intelligence Risk Analyzer and Per-Model Forensics breakdown.
* **Tablets & Mobile:**
  * Gracefully collapses into a focused vertical stack with touch-friendly targets.
  * Eliminates left-side drift and empty horizontal space.

---

## Changed & Added Files Summary
* `frontend/src/api/client.ts` — Fixed TypeScript constructor syntax for `erasableSyntaxOnly` mode.
* `frontend/src/index.css` — Designed custom CSS custom property tokens, glassmorphism, and cyber HUD styles.
* `frontend/src/App.css` — Removed boilerplate Vite CSS, added audio visualizer animations.
* `frontend/src/components/Header.tsx` — Redesigned header with shield branding, subtitle, model counts, and live status.
* `frontend/src/components/AudioUploader.tsx` — Built interactive drag-and-drop zone with audio playback preview, extracted duration, size, format badges, and validation.
* `frontend/src/components/ModelCard.tsx` — Implemented 5 status states (Ready, Loading, Blocked, Error) with honest diagnostic reporting.
* `frontend/src/components/ModelSelector.tsx` — Built 5-model responsive grid with Select All Available, Clear, and selection counter.
* `frontend/src/components/EvaluationControls.tsx` — Designed prominent orange primary action button and secondary Auto/Ensemble mode.
* `frontend/src/components/InferenceProgress.tsx` — Added animated neural scanner bar and active model chips.
* `frontend/src/components/RiskAnalyzer.tsx` — Built threat intelligence dashboard with radial dial, telemetry cards, consensus chart, and methodology explanation.
* `frontend/src/components/ModelResults.tsx` — Implemented per-model logit score visualizer, execution times, and verdict tags.
* `frontend/src/components/ErrorAlert.tsx` — Sleek cybersecurity alert card.
* `frontend/src/App.tsx` — Redesigned into centered, balanced 2-column desktop / stacked mobile layout.
* `docs/PROJECT_GUIDE.md` — Project run commands, design palette, and architecture documentation.
