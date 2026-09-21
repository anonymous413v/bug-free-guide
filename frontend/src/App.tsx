import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import {
  fetchHealth, fetchModels, runInference,
  type HealthResponse, type ModelCard, type InferenceResponse,
} from './api/client'
import { AudioUploader } from './components/AudioUploader'
import { ModelSelector } from './components/ModelSelector'
import { RiskAnalyzer } from './components/RiskAnalyzer'
import { ModelResults } from './components/ModelResults'
import { InferenceProgress } from './components/InferenceProgress'
import { HudGauge, ThreatDot, ThreatStrip, threatColor } from './components/HudGauge'
import { SpeedometerHud } from './components/SpeedometerHud'
import { ForensicTelemetryMatrix } from './components/ForensicTelemetryMatrix'
import { ModelCardComponent } from './components/ModelCard'
import {
  Files, Upload, Settings, SlidersHorizontal,
  BarChart2, Sliders, Play, Zap, RotateCcw,
  Loader2, AlertCircle, CheckCircle2, ShieldAlert,
  Check, XCircle, FileAudio, Pause, Clock, HardDrive,
} from 'lucide-react'

type SidebarView = 'files' | 'uploads' | 'settings' | 'llm-settings'
type EvalMode = 'auto' | 'manual'

/* ── Waveform bar (decorative) ──────────────────── */
function WaveBar({ isPlaying }: { isPlaying: boolean }) {
  const bars = useMemo(() =>
    Array.from({ length: 80 }, (_, i) =>
      Math.max(15, Math.min(100, 40 + Math.sin(i * 0.55) * 28 + Math.sin(i * 1.4) * 16))
    ), [])
  return (
    <div style={{
      width: '100%', height: 56,
      background: 'var(--ink)',
      borderRadius: 6,
      display: 'flex', alignItems: 'center',
      padding: '0 14px', gap: 2, overflow: 'hidden',
      position: 'relative',
    }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          width: 3, flexShrink: 0,
          height: `${h}%`,
          background: 'var(--bg-1)',
          borderRadius: 1.5,
          opacity: isPlaying ? 0.7 + (Math.sin(i * 0.4 + Date.now() * 0.001) * 0.3) : 0.45,
          transition: 'height 0.3s ease',
        }} />
      ))}
      <span style={{
        position: 'absolute', right: 14,
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        color: 'var(--bg-1)', fontFamily: 'monospace',
        textTransform: 'uppercase',
      }}>AUDIO BAR</span>
    </div>
  )
}

/* ── Audio control center ───────────────────────── */
function AudioControlCenter({
  file, duration, isPlaying, onToggle, onClear,
}: {
  file: File, duration: number | null, isPlaying: boolean,
  onToggle: () => void, onClear: () => void,
}) {
  function fmt(s: number) { return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}s` }
  function fmtB(b: number) { if (b < 1048576) return `${(b/1024).toFixed(1)} KB`; return `${(b/1048576).toFixed(2)} MB` }

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 6,
      background: 'var(--bg)', padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <button onClick={onToggle} style={{
        width: 32, height: 32, borderRadius: 5, flexShrink: 0,
        border: '1.5px solid var(--border)',
        background: isPlaying ? 'var(--ink)' : 'transparent',
        color: isPlaying ? 'var(--bg)' : 'var(--ink-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.12s',
      }}>
        {isPlaying
          ? <Pause className="w-3.5 h-3.5" style={{ fill: 'currentColor' }} />
          : <Play className="w-3.5 h-3.5" style={{ fill: 'currentColor', marginLeft: 2 }} />
        }
      </button>

      <FileAudio className="w-4 h-4" style={{ color: 'var(--ink-3)', flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name}
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><HardDrive className="w-3 h-3" />{fmtB(file.size)}</span>
          {duration != null && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }} className="mono"><Clock className="w-3 h-3" />{fmt(duration)}</span>}
        </div>
      </div>

      <button onClick={onClear} style={{
        background: 'none', border: '1px solid var(--border)', borderRadius: 4,
        padding: '4px 8px', fontSize: 11, color: 'var(--ink-3)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
        transition: 'color 0.12s',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-3)'}
      >
        <XCircle className="w-3.5 h-3.5" /> Clear
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════ */
export default function App() {
  const [health, setHealth]               = useState<HealthResponse | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError]     = useState<string | null>(null)
  const [models, setModels]               = useState<ModelCard[]>([])
  const [file, setFile]                   = useState<File | null>(null)
  const [audioUrl, setAudioUrl]           = useState<string | null>(null)
  const [duration, setDuration]           = useState<number | null>(null)
  const [isPlaying, setIsPlaying]         = useState(false)
  const [selectedIds, setSelectedIds]     = useState<string[]>([])
  const [isRunning, setIsRunning]         = useState(false)
  const [inferenceError, setInferenceError] = useState<string | null>(null)
  const [response, setResponse]           = useState<InferenceResponse | null>(null)
  const [sidebarView, setSidebarView]     = useState<SidebarView>('uploads')
  const [evalMode, setEvalMode]           = useState<EvalMode>('manual')
  const audioRef  = useRef<HTMLAudioElement | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const showResultsLayout = !!file   // switch to results view once file selected

  /* ── Backend polling ─────────────────────────── */
  const pollBackend = useCallback(async () => {
    try {
      const h = await fetchHealth()
      setHealth(h); setHealthError(null)
      const ms = await fetchModels()
      setModels(ms)
      setSelectedIds(prev => {
        if (prev.length > 0) return prev
        return ms.filter(m => m.availability === 'ready' || m.availability === 'available').map(m => m.id)
      })
    } catch (e) {
      setHealthError(e instanceof Error ? e.message : 'Backend offline')
      setHealth(null)
    } finally { setHealthLoading(false) }
  }, [])

  useEffect(() => {
    let mounted = true
    pollBackend()
    const id = setInterval(() => { if (mounted) pollBackend() }, 25000)
    return () => { mounted = false; clearInterval(id) }
  }, [pollBackend])

  /* ── File handling ───────────────────────────── */
  const handleFileChange = useCallback((f: File | null) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setFile(f); setResponse(null); setInferenceError(null); setIsPlaying(false)
    if (f) {
      const url = URL.createObjectURL(f)
      setAudioUrl(url)
      const tmp = new Audio(url)
      tmp.addEventListener('loadedmetadata', () => {
        if (!isNaN(tmp.duration) && isFinite(tmp.duration)) setDuration(tmp.duration)
      })
    } else { setAudioUrl(null); setDuration(null) }
  }, [audioUrl])

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }, [])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false) }
    else { audioRef.current.play(); setIsPlaying(true) }
  }

  /* ── Model selection ─────────────────────────── */
  const handleToggle    = useCallback((id: string) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]), [])
  const handleSelectAll = useCallback(() => setSelectedIds(models.filter(m => m.availability === 'available' || m.availability === 'ready').map(m => m.id)), [models])
  const handleClearAll  = useCallback(() => setSelectedIds([]), [])

  /* ── Inference ───────────────────────────────── */
  const handleRun = useCallback(async (mode: 'selected' | 'auto') => {
    if (!file || isRunning) return
    setIsRunning(true); setInferenceError(null); setResponse(null)
    try {
      const res = await runInference(file, selectedIds, mode)
      setResponse(res)
    } catch (e) {
      setInferenceError(e instanceof Error ? e.message : 'Inference failed')
    } finally { setIsRunning(false) }
  }, [file, selectedIds, isRunning])

  const handleReset = useCallback(() => { setResponse(null); setInferenceError(null) }, [])

  /* ── Derived state ───────────────────────────── */
  const readyModels    = models.filter(m => m.availability === 'ready' || m.availability === 'available')
  const canRunSelected = !!file && selectedIds.length > 0 && !isRunning
  const canRunAuto     = !!file && !isRunning
  const hudValue       = response?.risk.risk_score ?? null
  const tColor         = threatColor(hudValue)

  const navItems: { id: SidebarView; label: string; icon: React.ReactNode }[] = [
    { id: 'files',        label: 'Files',       icon: <Files className="w-3.5 h-3.5" /> },
    { id: 'uploads',      label: 'Uploads',     icon: <Upload className="w-3.5 h-3.5" /> },
    { id: 'settings',     label: 'Settings',    icon: <Settings className="w-3.5 h-3.5" /> },
    { id: 'llm-settings', label: 'LLM Settings',icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
  ]

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <div className="app-shell">
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl}
          onEnded={() => setIsPlaying(false)} onError={() => setIsPlaying(false)} style={{ display: 'none' }} />
      )}

      {/* ── TOPBAR ─────────────────────────────── */}
      <header className="topbar">
        <ShieldAlert className="w-4 h-4" style={{ color: 'var(--ink)' }} />
        <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)' }}>
          VOICEGUARD
        </span>
        <span style={{ color: 'var(--border-hi)', margin: '0 2px' }}>—</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          AI Voice Impersonation Detection
        </span>

        {/* Threat indicator in topbar — visible once we have a result */}
        {response && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 24,
            padding: '4px 12px', border: `1px solid ${tColor}55`, borderRadius: 4,
            background: `color-mix(in srgb, ${tColor} 8%, transparent)`,
          }}>
            <ThreatDot score={hudValue} />
            <span style={{ fontSize: 10, fontWeight: 700, color: tColor, letterSpacing: '0.08em' }}>
              {hudValue != null && hudValue >= 0.9 ? '⚠ CRITICAL THREAT' :
               hudValue != null && hudValue >= 0.8 ? 'HIGH THREAT' :
               hudValue != null && hudValue >= 0.7 ? 'ELEVATED' :
               hudValue != null && hudValue >= 0.15 ? 'LOW THREAT' : 'SAFE'}
            </span>
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {healthLoading
            ? <span className="label-xs" style={{ color: 'var(--ink-4)' }}>Connecting…</span>
            : healthError
              ? <span className="badge badge-err"><AlertCircle className="w-3 h-3" /> Offline</span>
              : <span className="badge badge-ok"><CheckCircle2 className="w-3 h-3" /> {health?.ready_models ?? 0} Ready</span>
          }
          {showResultsLayout && !isRunning && (
            <button className="btn-primary" onClick={() => handleRun(evalMode === 'auto' ? 'auto' : 'selected')} disabled={!canRunSelected && !canRunAuto}>
              <Play className="w-3.5 h-3.5" /> Run Analysis
            </button>
          )}
        </div>
      </header>

      {/* ── SIDEBAR ────────────────────────────── */}
      <aside className="sidebar">
        <div className="nav-label">Navigation</div>
        {navItems.map(item => (
          <div key={item.id} className={`nav-item${sidebarView === item.id ? ' active' : ''}`}
            onClick={() => setSidebarView(item.id)}>
            {item.icon} {item.label}
          </div>
        ))}

        {/* LLM Usages */}
        <div className="sidebar-panel" style={{ marginTop: 14 }}>
          <div className="sidebar-panel-label">LLM Usages</div>
          {[
            { k: 'Inferences', v: response ? 1 : 0 },
            { k: 'Models Used', v: response ? response.model_results.filter(r => r.success).length : 0 },
            { k: 'Ready', v: readyModels.length, color: 'var(--ok)' },
          ].map(({ k, v, color }) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, marginBottom: 5 }}>
              <span style={{ color: 'var(--ink-3)' }}>{k}</span>
              <span className="mono" style={{ fontWeight: 800, color: color ?? 'var(--ink)' }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, color: 'var(--ink-4)' }}>
            <BarChart2 className="w-3 h-3" />
            <span className="label-xs" style={{ fontSize: 8 }}>Session Stats</span>
          </div>
        </div>

        {/* Custom Settings */}
        <div className="sidebar-panel">
          <div className="sidebar-panel-label">Custom Settings</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>Auto-ensemble</span>
            <div onClick={() => setEvalMode(v => v === 'auto' ? 'manual' : 'auto')} style={{
              width: 28, height: 16, borderRadius: 8, cursor: 'pointer', position: 'relative',
              background: evalMode === 'auto' ? 'var(--ink)' : 'var(--border)',
              transition: 'background 0.2s',
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: evalMode === 'auto' ? 'var(--bg-1)' : 'var(--border-hi)',
                position: 'absolute', top: 3,
                left: evalMode === 'auto' ? 15 : 3, transition: 'left 0.2s',
              }} />
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Sliders className="w-3 h-3" /> Threshold: 0.5
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════
          MAIN AREA
      ════════════════════════════════════════ */}
      <main className="main-area">

        {!showResultsLayout ? (
          /* ── LANDING VIEW (no file selected) ─── */
          <>
            <div className="top-zone">
              <div className="upload-col">
                <AudioUploader file={file} onFileChange={handleFileChange} />
              </div>
              <div className="hud-col">
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
                  backgroundSize: '24px 24px', opacity: 0.35, pointerEvents: 'none',
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 28, position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 72 }}>
                    <div className="label-xs">STATUS</div>
                    <span className="badge badge-muted">STANDBY</span>
                    <div className="label-xs" style={{ marginTop: 8 }}>MODELS</div>
                    <span className="mono" style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)' }}>{readyModels.length}</span>
                    <span className="label-xs">READY</span>
                  </div>
                  <HudGauge value={null} isScanning={false} size={200} label="THREAT LEVEL" variant="orbital" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 72 }}>
                    <div className="label-xs">UPLOAD</div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', lineHeight: 1.4 }}>Drop an<br/>audio file<br/>to begin</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mode-tabbar">
              <div className={`mode-tab${evalMode === 'auto' ? ' active' : ''}`} onClick={() => setEvalMode('auto')}>Auto</div>
              <div className={`mode-tab${evalMode === 'manual' ? ' active' : ''}`} onClick={() => setEvalMode('manual')}>Manual</div>
              <div className="mode-tab-add">+ Add your own LLM model</div>
            </div>

            <ModelSelector models={models} selectedIds={selectedIds}
              onToggle={handleToggle} onSelectAll={handleSelectAll} onClearAll={handleClearAll} />
          </>

        ) : (
          /* ── RESULTS VIEW (file selected) ──────── */
          <>
            {/* Error banner */}
            {(healthError || inferenceError) && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600,
                color: 'var(--danger)', background: `color-mix(in srgb, var(--danger) 6%, var(--bg-1))`,
              }}>
                <AlertCircle className="w-3.5 h-3.5" />
                {healthError ? `Backend offline: ${healthError}` : inferenceError}
              </div>
            )}

            {/* Main results grid */}
            <div className="results-main-grid">

              {/* ── AUDIO PANEL (left) ──────────── */}
              <div className="audio-panel" style={{ gridRow: '1 / 3' }}>

                {/* ── ITEM 1 & 2 ON TOP: Speedometer HUD + Rich Forensic Text Matrix ── */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '260px 1fr',
                  gap: 14,
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: '#ffffff',
                  border: '1.5px solid var(--border)',
                  borderRadius: 6,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}>
                  {/* Item 1: Speedometer HUD (0% to 100%) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-4)',
                      marginBottom: 2,
                      alignSelf: 'flex-start',
                    }}>
                      SPEEDOMETER THREAT INDEX // 0% - 100%
                    </div>
                    <SpeedometerHud value={hudValue} isScanning={isRunning} size={250} />
                  </div>

                  {/* Item 2: Rich Forensic Text Matrix (risky, anonymous, spoofed, etc.) */}
                  <ForensicTelemetryMatrix
                    score={hudValue}
                    confidence={response?.risk.confidence}
                    isScanning={isRunning}
                    modelAgreement={response?.risk.model_agreement}
                    modelsSucceeded={response?.risk.models_succeeded}
                    modelsTotal={response?.risk.models_total}
                  />
                </div>

                {/* ── SHIFTED DOWN: Audio Bar, Controls & Action Toolbar ── */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: '12px 14px',
                  background: 'var(--bg-1)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="label-xs" style={{ fontSize: 10, fontWeight: 900, color: 'var(--ink)' }}>
                      Audio Intelligence Input &amp; Forensic Controls
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-primary" onClick={() => handleRun('selected')} disabled={!canRunSelected}>
                        {isRunning
                          ? <><Loader2 className="w-3.5 h-3.5 spin" /> Scanning…</>
                          : <><Play className="w-3.5 h-3.5" /> Run ({selectedIds.length})</>
                        }
                      </button>
                      <button className="btn-ghost" onClick={() => handleRun('auto')} disabled={!canRunAuto}>
                        <Zap className="w-3.5 h-3.5" /> Auto
                      </button>
                      {response && (
                        <button className="btn-ghost" onClick={handleReset} title="Reset Analysis">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Waveform Bar */}
                  <WaveBar isPlaying={isPlaying} />

                  {/* Audio control center */}
                  <AudioControlCenter
                    file={file!}
                    duration={duration}
                    isPlaying={isPlaying}
                    onToggle={togglePlay}
                    onClear={() => handleFileChange(null)}
                  />

                  {/* Progress Bar during scan */}
                  {isRunning && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>
                      <Loader2 className="w-3.5 h-3.5 spin" style={{ color: 'var(--ink)' }} />
                      Executing multi-architecture forensic inference ({selectedIds.length} models)…
                      <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--ink)', animation: 'scanBar 1.4s ease-in-out infinite', width: '35%' }} />
                      </div>
                      <style>{`@keyframes scanBar{0%{transform:translateX(-200%)}100%{transform:translateX(500%)}}`}</style>
                    </div>
                  )}
                </div>

                {/* Mode tabs */}
                <div className="mode-tabbar" style={{ margin: 'auto -16px -16px', borderTop: '1.5px solid var(--border)', borderBottom: 'none' }}>
                  <div className={`mode-tab${evalMode === 'auto' ? ' active' : ''}`} onClick={() => setEvalMode('auto')}>Auto</div>
                  <div className={`mode-tab${evalMode === 'manual' ? ' active' : ''}`} onClick={() => setEvalMode('manual')}>Manual</div>
                  <div className="mode-tab-add">+ Add LLM model</div>
                </div>
              </div>

              {/* ── THREAT PANEL (right top) - Clean & Tight without dead space ────── */}
              <div className="threat-panel">
                <ThreatStrip score={hudValue} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="label-xs" style={{ fontSize: 10, fontWeight: 900 }}>Threat Sensor HUD</span>
                  <ThreatDot score={hudValue} />
                </div>

                {/* Clean, balanced single HUD - clutter cut out */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}>
                  <HudGauge value={hudValue} isScanning={isRunning} size={145} label="ORBITAL TELEMETRY" variant="orbital" />
                </div>

                {/* Compact Risk Factor Box without empty voids */}
                <div style={{
                  border: `1.5px solid ${hudValue != null ? `color-mix(in srgb, ${tColor} 45%, transparent)` : 'var(--border)'}`,
                  borderRadius: 5, padding: '10px 12px',
                  background: hudValue != null ? `color-mix(in srgb, ${tColor} 6%, var(--bg-1))` : '#ffffff',
                }}>
                  <div className="label-xs" style={{ marginBottom: 4 }}>Risk Factor Telemetry</div>
                  {response ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: tColor, letterSpacing: '0.04em' }}>
                        {response.risk.risk_level.toUpperCase()} RISK CLASSIFICATION
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.4 }}>
                        {response.risk.risk_level === 'high' ? 'Synthesized vocoder or cloning artifacts flagged' :
                         response.risk.risk_level === 'medium' ? 'Conflicting indicators detected across models' :
                         'Acoustic patterns consistent with natural human speech'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--ink-4)', fontWeight: 700, marginTop: 2 }}>
                        Method: {response.risk.calculation_method}
                      </span>
                    </div>
                  ) : isRunning ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>Evaluating model fleet…</span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-4)' }}>Select models and trigger evaluation</span>
                  )}
                </div>
              </div>

              {/* ── MODEL RESULTS PANEL (right bottom) ── */}
              <div className="model-results-panel">
                <div className="label-xs" style={{ marginBottom: 10 }}>Model Wise Results</div>
                {response ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {response.model_results.map(r => {
                      const sp = r.success && r.bonafide_probability != null
                        ? Math.round((1 - r.bonafide_probability) * 100)
                        : r.success && r.raw_score != null
                          ? Math.round((1 / (1 + Math.exp(r.raw_score))) * 100) : null
                      const barColor = sp != null ? (sp > 65 ? 'var(--t-crit)' : sp > 35 ? 'var(--t-warn)' : 'var(--t-safe)') : 'var(--border)'
                      return (
                        <div key={r.model_id} style={{
                          padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 5,
                          background: 'var(--bg)',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>{r.model_name}</span>
                            {r.label && <span style={{
                              fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                              color: r.label === 'BONAFIDE' ? 'var(--ok)' : r.label === 'SPOOF' ? 'var(--danger)' : 'var(--warn)',
                            }}>{r.label}</span>}
                          </div>
                          {r.success && sp != null ? (
                            <>
                              <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${sp}%`, background: barColor, borderRadius: 2, transition: 'width 0.7s ease' }} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)' }}>LLM Result</span>
                                <span className="mono" style={{ fontSize: 10, fontWeight: 800, color: barColor }}>{sp}%</span>
                              </div>
                              {r.inference_time_s != null && (
                                <span style={{ fontSize: 9, color: 'var(--ink-4)', fontWeight: 600 }}>{r.inference_time_s.toFixed(3)}s</span>
                              )}
                            </>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)' }}>{r.error ?? 'Skipped'}</span>
                          )}
                        </div>
                      )
                    })}

                    {/* Model wise risk factor summary */}
                    <div style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg)' }}>
                      <div className="label-xs" style={{ marginBottom: 6 }}>Model Wise Risk Factor</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {[
                          { k: 'Consensus', v: response.risk.model_agreement ?? 'N/A' },
                          { k: 'Succeeded', v: response.risk.models_succeeded },
                          { k: 'Confidence', v: response.risk.confidence != null ? `${Math.round(response.risk.confidence * 100)}%` : '—' },
                        ].map(({ k, v }) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                            <span style={{ fontWeight: 600, color: 'var(--ink-3)' }}>{k}</span>
                            <span className="mono" style={{ fontWeight: 800, color: 'var(--ink)' }}>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)' }}>
                    {isRunning ? 'Evaluating models…' : 'No results yet'}
                  </span>
                )}
              </div>
            </div>

            {/* ── MODELS ROW (horizontal, bottom) ── */}
            <div className="models-row">
              {models.length === 0
                ? Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="model-card-h">
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-4)' }}>LLM Model {i + 1}</span>
                    </div>
                  ))
                : models.map(model => {
                    const isSelectable = model.availability === 'available' || model.availability === 'ready'
                    const isSelected = selectedIds.includes(model.id)
                    return (
                      <div key={model.id} id={`model-card-${model.id}`}
                        className={`model-card-h${isSelected ? ' selected' : ''}${!isSelectable ? ' blocked' : ''}`}
                        onClick={() => isSelectable && handleToggle(model.id)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              width: 13, height: 13, borderRadius: 2, flexShrink: 0,
                              border: `1px solid ${isSelected ? 'var(--ink)' : 'var(--border-hi)'}`,
                              background: isSelected ? 'var(--ink)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
                            }}>
                              {isSelected && <Check className="w-2.5 h-2.5" style={{ color: 'var(--bg)', strokeWidth: 3 }} />}
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink)' }}>{model.name}</span>
                          </div>
                          <span className={`badge ${isSelectable ? 'badge-ok' : 'badge-err'}`} style={{ fontSize: 8 }}>
                            {isSelectable ? 'Ready' : 'Blocked'}
                          </span>
                        </div>
                        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                          {model.description?.slice(0, 60)}{model.description && model.description.length > 60 ? '…' : ''}
                        </p>
                        {response?.model_results.find(r => r.model_id === model.id)?.success && (() => {
                          const r = response!.model_results.find(rr => rr.model_id === model.id)!
                          const sp = r.bonafide_probability != null ? Math.round((1 - r.bonafide_probability) * 100)
                            : r.raw_score != null ? Math.round((1 / (1 + Math.exp(r.raw_score))) * 100) : null
                          return sp != null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1, height: 2, background: 'var(--border)', borderRadius: 1, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${sp}%`, background: sp > 65 ? 'var(--t-crit)' : sp > 35 ? 'var(--t-warn)' : 'var(--t-safe)', transition: 'width 0.6s ease' }} />
                              </div>
                              <span className="mono" style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-3)' }}>{sp}%</span>
                            </div>
                          ) : null
                        })()}
                      </div>
                    )
                  })
              }
            </div>
          </>
        )}

        {/* ── FULL RESULTS SECTION (scrollable, results layout only) ── */}
        {showResultsLayout && response && !isRunning && (
          <div ref={resultsRef} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20, borderTop: '1.5px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="label-xs">Full Analysis Report</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <ThreatDot score={hudValue} />
            </div>
            <RiskAnalyzer response={response} />
            <ModelResults response={response} />
          </div>
        )}

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--border)', padding: '8px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 'auto', background: 'var(--bg-1)',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>VOICEGUARD</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)' }}>Automated screening signals for authorised security analysis.</span>
        </div>
      </main>
    </div>
  )
}
