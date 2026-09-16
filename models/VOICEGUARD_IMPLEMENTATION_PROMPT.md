# VOICEGUARD — Autonomous UI + Real AI Integration Prompt

## Role

You are taking over the `VOICEGUARD-REBUILD` project. Work autonomously as a senior full-stack and ML engineer. Inspect the existing repository before changing anything. Do not wait for detailed instructions about implementation choices. Decide the required architecture, dependencies, model-loading strategy, API contracts, error handling, and testing workflow yourself.

Do not use mock predictions, random values, placeholder confidence scores, or fake model statuses. A model may be marked as integrated only after it has been loaded and tested with a real audio file.

---

## Product Goal

Build a single-page VOICEGUARD application that allows a user to upload an audio file and evaluate it using one or multiple real audio deepfake/voice-spoofing detection models.

The interface must support:

1. Audio file uploading.
2. Model selection.
3. Two evaluation modes:
   - **Run Selected Models**
   - **Auto / Ensemble Mode**
4. A risk analyzer section.
5. Clear per-model results.
6. A combined final risk assessment.
7. Useful errors, loading states, and inference progress.
8. Documentation explaining every important folder, file, component, API route, and model adapter.

---

## Visual Design

Use the following color palette from the provided reference image:

- Navy Primary: `#253C6D`
- Navy Secondary: `#30497D`
- Slate Blue: `#455B8A`
- Orange Accent: `#F2842F`

Design direction:

- Clean, modern, professional cybersecurity dashboard.
- Use navy as the primary background/header color.
- Use the secondary navy and slate blue for cards, borders, panels, and model sections.
- Use orange for primary actions, warnings, progress indicators, and important risk highlights.
- Maintain strong contrast and readable typography.
- Use rounded cards, subtle shadows, consistent spacing, and responsive layout.
- Do not overcomplicate the UI with unnecessary animations.
- Make the page usable on desktop and tablet screens.

Use React with Vite and TypeScript if the existing frontend is compatible. Use Tailwind CSS or another lightweight/basic UI library. Use `lucide-react` for icons if appropriate. Use a simple chart or progress visualization only where it improves the risk analyzer.

---

## Required Page Layout

Create one unified page rather than multiple disconnected screens.

### 1. Header

Include:

- VOICEGUARD branding.
- Short subtitle such as “AI-Powered Voice Impersonation Detection”.
- Backend connection/health status.
- A compact indicator showing whether real inference is available.

The health indicator must be based on an actual backend health check, not a hardcoded value.

### 2. Audio Upload Section

Include:

- Drag-and-drop area.
- Browse/select file button.
- Selected filename.
- File size and duration where available.
- Audio format validation.
- Clear/remove file button.
- Upload state and validation errors.

Support common audio formats such as WAV, MP3, FLAC, and M4A when the backend dependencies support them.

Backend preprocessing should:

- Decode the audio safely.
- Convert it to mono.
- Resample to 16 kHz where required.
- Normalize or prepare the waveform according to each model's requirements.
- Validate duration and file size.
- Avoid modifying the original uploaded file.

### 3. Model Evaluation Section

Display the downloaded models as selectable cards or rows:

- DF Arena 500M
- HuBERT-XL AntiDeepfake
- AASIST
- RawNet2
- W2V2-AASIST

Each model item should show:

- Model name.
- Short purpose/description.
- Availability status: available, missing, loading, error, or ready.
- Checkbox or toggle for selection.
- Optional model-specific notes.
- Inference status after execution.

Add these controls:

- Select All
- Clear Selection
- Run Selected Models
- Auto / Ensemble Mode

Behavior:

- **Run Selected Models:** execute only the models selected by the user.
- **Auto / Ensemble Mode:** automatically choose all compatible available models, run them, and combine their outputs using a transparent and documented aggregation strategy.
- Do not silently include missing or failed models.
- If a model fails, show the failure clearly and continue with other compatible models where possible.
- Disable execution until a valid audio file is selected.
- Prevent duplicate simultaneous inference requests.

### 4. Results Section

For every executed model, show:

- Model name.
- Prediction label, such as `REAL`, `FAKE`, `SPOOF`, or `UNCERTAIN`, according to the model's actual output semantics.
- Probability/confidence if the model provides a calibrated or interpretable score.
- Raw score/logit when useful.
- Execution time.
- Model status.
- Error details if inference failed.

Do not call an arbitrary model score a calibrated probability unless the implementation verifies that interpretation. Clearly label uncertain or non-calibrated scores.

### 5. Risk Analyzer Section

Create a visually clear risk analyzer containing:

- Overall risk level: Low, Medium, High, or Unknown.
- Overall risk score.
- Combined result from successful models only.
- Number of models executed successfully.
- Number of models that failed.
- Agreement/disagreement between models.
- A model-by-model comparison list or chart.
- Explanation of how the combined risk was calculated.

The risk calculation must be implemented in Python and documented. It should account for:

- Available successful model outputs.
- Score direction and label semantics.
- Missing or failed models.
- Model disagreement.
- Unknown or uncalibrated outputs.

Do not present the risk score as a guaranteed truth. Include a small disclaimer that the result is an automated screening signal and not definitive proof.

If there is insufficient valid model output, show `Unknown / Insufficient Evidence` instead of inventing a risk score.

---

## Backend Requirements

Use Python with FastAPI.

Create a maintainable backend structure with clear separation between:

- API routes.
- Configuration.
- Audio preprocessing.
- Model adapters.
- Model registry.
- Inference orchestration.
- Score normalization.
- Risk aggregation.
- Schemas.
- Logging and error handling.

Suggested structure, adapting to the existing project where appropriate:

```text
backend/
├── app/
│   ├── main.py
│   ├── api/
│   │   └── routes/
│   │       ├── health.py
│   │       ├── models.py
│   │       └── inference.py
│   ├── core/
│   │   ├── config.py
│   │   └── logging_config.py
│   ├── schemas/
│   │   ├── model_schema.py
│   │   └── inference_schema.py
│   ├── services/
│   │   ├── audio_service.py
│   │   ├── inference_service.py
│   │   └── risk_service.py
│   ├── models/
│   │   ├── base_adapter.py
│   │   ├── registry.py
│   │   ├── aasist_adapter.py
│   │   ├── rawnet2_adapter.py
│   │   ├── w2v2_aasist_adapter.py
│   │   ├── hubert_adapter.py
│   │   └── df_arena_adapter.py
│   └── utils/
│       └── audio_utils.py
├── requirements.txt
└── README.md
```

Do not create unnecessary duplicate files if the project already has a working structure. Refactor carefully and preserve functioning code.

---

## Model Integration Rules

Inspect each local model directory and its documentation. Determine:

- Required architecture.
- Checkpoint format.
- Expected sample rate.
- Required tensor shape.
- Required preprocessing.
- CPU/GPU compatibility.
- Output meaning.
- Whether additional source files or dependencies are required.

Implement each model behind a common adapter interface, for example:

```python
class BaseModelAdapter:
    name: str

    def is_available(self) -> bool:
        ...

    def load(self) -> None:
        ...

    def predict(self, waveform, sample_rate: int) -> dict:
        ...
```

Use lazy loading when practical so the application does not load every large model into memory at startup.

Do not claim all five models are working just because their files exist. Integrate and test them one by one.

For the W2V2-AASIST model, resolve the missing wrapper/module issue using a compatible implementation or by adapting the available repository code. Document the decision and any limitations.

If a model cannot currently be executed because of an incompatible checkpoint, missing architecture, unsupported dependency, or insufficient hardware:

- Do not fake its output.
- Mark it as unavailable or integration-blocked.
- Provide the exact reason in the UI and documentation.
- Keep the rest of the application functional.

CPU execution is acceptable. Avoid requiring a GPU unless the existing model genuinely cannot run otherwise. Use inference mode and sensible memory management.

---

## API Contract

Implement and document endpoints similar to:

- `GET /api/health`
- `GET /api/models`
- `POST /api/inference`
- `POST /api/inference/selected`
- `POST /api/inference/auto`

The final endpoint design may be simplified if one well-designed endpoint supports both modes.

The inference response should include:

- Request ID.
- Filename metadata.
- Evaluation mode.
- Selected models.
- Per-model results.
- Successful model count.
- Failed model count.
- Overall risk result.
- Processing time.
- Errors and warnings.

Use Pydantic schemas and consistent HTTP error responses.

Configure CORS for the local React development server.

---

## Frontend Requirements

Create reusable React components such as:

- `Header`
- `AudioUploader`
- `ModelSelector`
- `ModelCard`
- `EvaluationControls`
- `InferenceProgress`
- `ModelResults`
- `RiskAnalyzer`
- `ErrorAlert`
- `BackendStatus`

Keep API calls in a dedicated service/client layer rather than scattering fetch calls across components.

Use clear state handling for:

- Selected file.
- Selected models.
- Evaluation mode.
- Loading state.
- Progress.
- Results.
- Errors.
- Backend health.
- Reset/new analysis.

The frontend must never fabricate a successful result when the backend is unavailable.

---

## Documentation Requirement

Create a root-level Markdown file:

```text
docs/PROJECT_GUIDE.md
```

It must explain:

1. Project purpose.
2. Complete folder structure.
3. Responsibility of every important folder.
4. Responsibility of every important file.
5. Frontend architecture.
6. Backend architecture.
7. Model adapter design.
8. Model paths and expected files.
9. Audio preprocessing flow.
10. API endpoints and request/response examples.
11. How the frontend connects to the backend.
12. How to install dependencies.
13. How to start the backend.
14. How to start the frontend.
15. How to run a real inference test.
16. How risk scoring works.
17. Known limitations.
18. Troubleshooting instructions.
19. Which models are fully working, partially working, or blocked.
20. Future improvement opportunities.

Update this file whenever architecture or integration decisions change.

Also maintain a concise root-level `README.md` with quick-start instructions.

---

## Testing and Verification

Perform real tests, not only syntax checks.

At minimum:

1. Backend imports successfully.
2. FastAPI health endpoint responds.
3. Model registry lists model availability accurately.
4. Audio upload validation works.
5. At least one model performs real inference with a real audio file.
6. The frontend can call the backend.
7. Failed model inference is represented honestly.
8. Risk analyzer handles success, failure, disagreement, and insufficient evidence.
9. No mock predictions remain in production execution paths.

Use small, focused tests where possible. Record commands and results in the documentation.

---

## Autonomous Execution Rules

- Inspect the existing codebase first.
- Make implementation decisions yourself.
- Do not stop to ask which library, folder name, API shape, or architecture to use unless a destructive or irreversible decision is required.
- Prefer the simplest reliable implementation.
- Work in small verifiable phases.
- Run tests after meaningful changes.
- Fix errors directly instead of only reporting them.
- Do not rewrite working parts unnecessarily.
- Do not mark a phase complete without evidence.
- Keep the UI polished but prioritize real model execution and correctness.
- At the end of each phase, report:
  - Files changed.
  - What was implemented.
  - Commands/tests executed.
  - Actual result.
  - Any blocked model or known limitation.
  - Next phase.

Begin now by inspecting the repository and implementing the unified UI plus the backend model registry. Then connect and verify the AASIST model first, followed by the remaining models one at a time.
