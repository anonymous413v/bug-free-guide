import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchHealth,
  fetchModels,
  runInference,
  type HealthResponse,
  type ModelCard,
  type InferenceResponse,
} from './api/client'
import { Header } from './components/Header'
import { AudioUploader } from './components/AudioUploader'
import { ModelSelector } from './components/ModelSelector'
import { EvaluationControls } from './components/EvaluationControls'
import { InferenceProgress } from './components/InferenceProgress'
import { ModelResults } from './components/ModelResults'
import { RiskAnalyzer } from './components/RiskAnalyzer'
import { ErrorAlert } from './components/ErrorAlert'
import { Shield, Sparkles, Terminal, Activity } from 'lucide-react'

export default function App() {
  // ── Backend health ───────────────────────────────────────────────────────────
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState<string | null>(null)

  // ── Model registry ───────────────────────────────────────────────────────────
  const [models, setModels] = useState<ModelCard[]>([])

  // ── File & selection state ───────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // ── Inference state ──────────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false)
  const [inferenceError, setInferenceError] = useState<string | null>(null)
  const [response, setResponse] = useState<InferenceResponse | null>(null)

  const resultsRef = useRef<HTMLDivElement>(null)

  // ── Fetch health & models on mount ──────────────────────────────────────────
  const pollBackend = useCallback(async () => {
    try {
      const h = await fetchHealth()
      setHealth(h)
      setHealthError(null)
      const ms = await fetchModels()
      setModels(ms)
      setSelectedIds((prev) => {
        if (prev.length > 0) return prev
        return ms
          .filter((m) => m.availability === 'ready' || m.availability === 'available')
          .map((m) => m.id)
      })
    } catch (e) {
      setHealthError(e instanceof Error ? e.message : 'Backend offline')
      setHealth(null)
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const run = async () => {
      if (mounted) await pollBackend()
    }
    run()
    const interval = setInterval(() => {
      if (mounted) pollBackend()
    }, 25000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [pollBackend])

  // ── Model selection ──────────────────────────────────────────────────────────
  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  const handleSelectAll = useCallback(() => {
    const available = models
      .filter((m) => m.availability === 'available' || m.availability === 'ready')
      .map((m) => m.id)
    setSelectedIds(available)
  }, [models])

  const handleClearAll = useCallback(() => setSelectedIds([]), [])

  // ── Inference ────────────────────────────────────────────────────────────────
  const handleRun = useCallback(
    async (mode: 'selected' | 'auto') => {
      if (!file || isRunning) return
      setIsRunning(true)
      setInferenceError(null)
      setResponse(null)

      try {
        const res = await runInference(file, selectedIds, mode)
        setResponse(res)
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 150)
      } catch (e) {
        setInferenceError(e instanceof Error ? e.message : 'Inference failed')
      } finally {
        setIsRunning(false)
      }
    },
    [file, selectedIds, isRunning]
  )

  const handleReset = useCallback(() => {
    setResponse(null)
    setInferenceError(null)
  }, [])

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-[#F2842F] selection:text-white">
      {/* Top Header */}
      <Header
        health={health}
        healthLoading={healthLoading}
        healthError={healthError}
      />

      {/* Main Responsive Centered Dashboard */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 flex-1">
        {/* Backend Offline Warning Banner */}
        {healthError && (
          <ErrorAlert
            message={`Backend Service Offline: ${healthError}. Ensure the Python FastAPI server is active on port 8000.`}
            onDismiss={() => setHealthError(null)}
          />
        )}

        {/* Dashboard Overview Hero Strip */}
        <section
          className="rounded-2xl border p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(37, 60, 109, 0.7) 0%, rgba(48, 73, 125, 0.4) 100%)',
            borderColor: '#455B8A',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{ background: 'rgba(242, 132, 47, 0.15)', border: '1px solid rgba(242, 132, 47, 0.3)' }}
            >
              <Shield className="w-5 h-5 text-[#F2842F]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Autonomous Audio Impersonation Screening
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[rgba(34,197,94,0.15)] text-emerald-400 border border-[rgba(34,197,94,0.3)]">
                  <Sparkles className="w-3 h-3" /> Zero Mock Data
                </span>
              </div>
              <p className="text-xs text-[#9cb1d4]">
                Multi-architecture forensic verification leveraging real PyTorch models and acoustic graph neural networks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#9cb1d4] self-end md:self-auto font-mono">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e3052] border border-[#455B8A]">
              <Terminal className="w-3 h-3 text-[#F2842F]" /> API v1.0.0
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e3052] border border-[#455B8A]">
              <Activity className="w-3 h-3 text-emerald-400" /> 16kHz Bio-Acoustics
            </span>
          </div>
        </section>

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Audio Upload & Action Controls (5 cols on desktop) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Audio Upload Card */}
            <AudioUploader
              file={file}
              onFileChange={(f) => {
                setFile(f)
                setResponse(null)
                setInferenceError(null)
              }}
            />

            {/* Evaluation Controls Card */}
            <EvaluationControls
              hasFile={!!file}
              selectedCount={selectedIds.length}
              isRunning={isRunning}
              hasResults={!!response}
              onRunSelected={() => handleRun('selected')}
              onRunAuto={() => handleRun('auto')}
              onReset={handleReset}
            />

            {/* Inference Execution Progress Card */}
            <InferenceProgress
              isRunning={isRunning}
              runningModels={selectedIds}
            />

            {/* Inference Error Notification */}
            {inferenceError && !isRunning && (
              <ErrorAlert
                message={`Analysis failed: ${inferenceError}`}
                onDismiss={() => setInferenceError(null)}
              />
            )}
          </div>

          {/* Right Column: Model Selection Matrix (7 cols on desktop) */}
          <div className="lg:col-span-7 space-y-6">
            <ModelSelector
              models={models}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
            />
          </div>
        </div>

        {/* Threat Intelligence & Analytical Results (Full Width) */}
        {response && !isRunning && (
          <div ref={resultsRef} className="space-y-6 pt-4">
            <div className="border-t border-[#455B8A] pt-6">
              <RiskAnalyzer response={response} />
            </div>

            <ModelResults response={response} />
          </div>
        )}
      </main>

      {/* Production-Grade Cyber Suite Footer */}
      <footer
        className="border-t mt-12 py-5 text-center text-xs"
        style={{
          background: 'linear-gradient(180deg, rgba(22, 34, 59, 0.9) 0%, rgba(16, 25, 43, 0.95) 100%)',
          borderColor: '#455B8A',
          color: '#9cb1d4',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">VOICE<span style={{ color: '#F2842F' }}>GUARD</span></span>
            <span className="text-[#62749a]">|</span>
            <span>Enterprise Voice Biometrics & Deepfake Shield</span>
          </div>
          <div className="text-[11px] text-[#62749a]">
            Results are automated algorithmic screening signals for authorized security analysis.
          </div>
        </div>
      </footer>
    </div>
  )
}
