/**
 * VOICEGUARD API Client
 * Centralized layer for all backend communication.
 * The Vite proxy forwards /api/* to http://localhost:8000.
 */

const API_BASE = '/api'

export interface ModelCard {
  id: string
  name: string
  description: string
  params: string | null
  sample_rate: number
  window_samples: number
  score_direction: string
  availability: 'available' | 'loading' | 'ready' | 'missing' | 'blocked' | 'error'
  availability_reason: string | null
  checkpoint_path: string | null
  checkpoint_size_mb: number | null
  notes: string | null
}

export interface ModelResult {
  model_id: string
  model_name: string
  success: boolean
  label: string | null
  raw_score: number | null
  bonafide_probability: number | null
  score_is_calibrated: boolean
  execution_time_s: number | null
  error: string | null
  notes: string | null
}

export interface RiskResult {
  risk_level: 'low' | 'medium' | 'high' | 'unknown'
  risk_score: number | null
  confidence: number | null
  models_succeeded: number
  models_failed: number
  models_total: number
  model_agreement: string | null
  calculation_method: string
  explanation: string
  disclaimer: string
}

export interface InferenceResponse {
  request_id: string
  filename: string
  file_size_bytes: number
  duration_s: number | null
  evaluation_mode: 'selected' | 'auto'
  selected_models: string[]
  model_results: ModelResult[]
  risk: RiskResult
  processing_time_s: number
  warnings: string[]
}

export interface HealthResponse {
  status: string
  version: string
  inference_available: boolean
  models_ready: number
  models_total: number
  details: Record<string, { status: string; name: string; reason: string | null }>
}

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = body.detail ?? JSON.stringify(body)
    } catch {
      detail = await res.text()
    }
    throw new ApiError(res.status, detail)
  }
  return res.json() as Promise<T>
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`)
  return handleResponse<HealthResponse>(res)
}

export async function fetchModels(): Promise<ModelCard[]> {
  const res = await fetch(`${API_BASE}/models`)
  return handleResponse<ModelCard[]>(res)
}

export async function runInference(
  file: File,
  modelIds: string[],
  mode: 'selected' | 'auto'
): Promise<InferenceResponse> {
  const form = new FormData()
  form.append('audio_file', file)
  form.append('model_ids', JSON.stringify(modelIds))
  form.append('mode', mode)
  const res = await fetch(`${API_BASE}/inference`, {
    method: 'POST',
    body: form,
  })
  return handleResponse<InferenceResponse>(res)
}

export { ApiError }
