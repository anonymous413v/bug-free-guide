import {
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  AlertTriangle,
  FileAudio,
  Cpu,
  Info,
} from 'lucide-react'
import type { ModelResult, InferenceResponse } from '../api/client'

function LabelBadge({ label }: { label: string | null }) {
  if (!label) return null
  const cfg: Record<string, { color: string; bg: string; border: string }> = {
    BONAFIDE: {
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.15)',
      border: 'rgba(34,197,94,0.4)',
    },
    SPOOF: {
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.15)',
      border: 'rgba(239,68,68,0.4)',
    },
    UNCERTAIN: {
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.15)',
      border: 'rgba(245,158,11,0.4)',
    },
  }
  const { color, bg, border } = cfg[label] ?? {
    color: '#9cb1d4',
    bg: 'rgba(156,177,212,0.1)',
    border: 'rgba(156,177,212,0.3)',
  }

  return (
    <span
      className="font-extrabold text-xs px-2.5 py-1 rounded-lg border tracking-wider uppercase"
      style={{ color, background: bg, borderColor: border }}
    >
      {label}
    </span>
  )
}

function LogitScoreBar({ value }: { value: number }) {
  // Score range typically ~ -10 to +10 (positive = bonafide, negative = spoof)
  const isBonafide = value >= 0
  const normalizedWidth = Math.min(Math.abs(value) / 10, 1) * 100

  return (
    <div className="mt-1">
      <div className="w-full h-2 rounded-full bg-[#1e3052] overflow-hidden border border-[#455B8A] relative flex items-center">
        {/* Center line marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#62749a] z-10" />
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${normalizedWidth / 2}%`,
            marginLeft: isBonafide ? '50%' : `${50 - normalizedWidth / 2}%`,
            background: isBonafide
              ? 'linear-gradient(90deg, #10b981, #22c55e)'
              : 'linear-gradient(90deg, #ef4444, #f43f5e)',
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[#62749a] mt-0.5">
        <span>← Spoof / Fake</span>
        <span>0</span>
        <span>Authentic →</span>
      </div>
    </div>
  )
}

function ModelResultCard({ result }: { result: ModelResult }) {
  return (
    <div
      className="rounded-xl border p-4 sm:p-5 animate-slide-up flex flex-col justify-between"
      style={{
        background: result.success
          ? 'linear-gradient(135deg, rgba(37,60,109,0.85) 0%, rgba(48,73,125,0.7) 100%)'
          : 'rgba(239,68,68,0.06)',
        borderColor: result.success ? '#455B8A' : 'rgba(239,68,68,0.3)',
      }}
      id={`result-${result.model_id}`}
    >
      <div>
        {/* Card Header: Model Name & Verdict Label */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <h4 className="font-bold text-sm text-white">{result.model_name}</h4>
          </div>
          {result.label && <LabelBadge label={result.label} />}
        </div>

        {/* Successful Prediction Details */}
        {result.success ? (
          <div className="space-y-3">
            {/* Raw Score */}
            {result.raw_score != null && (
              <div>
                <div className="flex justify-between text-xs text-[#9cb1d4] mb-1">
                  <span>Bona-fide Logit Score</span>
                  <span className="font-mono font-bold text-white">
                    {result.raw_score > 0 ? `+${result.raw_score.toFixed(4)}` : result.raw_score.toFixed(4)}
                  </span>
                </div>
                <LogitScoreBar value={result.raw_score} />
              </div>
            )}

            {/* Bonafide Probability */}
            {result.bonafide_probability != null && (
              <div className="flex justify-between items-center text-xs py-1 border-t border-[rgba(69,91,138,0.3)]">
                <span className="text-[#9cb1d4]">P(Bonafide / Authentic)</span>
                <span className="font-mono font-bold text-emerald-400">
                  {(result.bonafide_probability * 100).toFixed(2)}%
                </span>
              </div>
            )}

            {/* Notes if present */}
            {result.notes && (
              <div className="text-[11px] text-[#9cb1d4] bg-[rgba(26,42,74,0.5)] p-2 rounded border border-[rgba(69,91,138,0.3)] flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#F2842F] flex-shrink-0 mt-0.5" />
                <span>{result.notes}</span>
              </div>
            )}
          </div>
        ) : (
          /* Error Details */
          <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] text-xs text-[#f87171] mt-2">
            <p className="flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{result.error ?? 'Execution error encountered during model inference.'}</span>
            </p>
          </div>
        )}
      </div>

      {/* Execution Time Footer */}
      <div className="mt-4 pt-2.5 border-t border-[rgba(69,91,138,0.3)] flex items-center justify-between text-[11px] text-[#62749a]">
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3 text-[#F2842F]" />
          Model ID: <code className="text-[#9cb1d4]">{result.model_id}</code>
        </span>
        {result.execution_time_s != null && (
          <span className="flex items-center gap-1 font-mono text-[#9cb1d4]">
            <Clock className="w-3 h-3 text-[#455B8A]" />
            {result.execution_time_s.toFixed(3)}s
          </span>
        )}
      </div>
    </div>
  )
}

interface ModelResultsProps {
  response: InferenceResponse
}

export function ModelResults({ response }: ModelResultsProps) {
  const { model_results, processing_time_s, evaluation_mode, duration_s, warnings, filename } = response

  return (
    <div className="vg-card p-6 animate-slide-up" id="model-results">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: 'rgba(242, 132, 47, 0.15)', border: '1px solid rgba(242, 132, 47, 0.3)' }}
          >
            <Activity className="w-4 h-4 text-[#F2842F]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Model Forensics Breakdown</h2>
            <p className="text-xs text-[#9cb1d4]">
              Granular inference outputs, logit distributions, and execution telemetry
            </p>
          </div>
        </div>

        {/* Audio File & Evaluation Mode Pill */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#30497D] border border-[#455B8A] text-[#9cb1d4]">
            <FileAudio className="w-3.5 h-3.5 text-[#F2842F]" />
            {filename}
            {duration_s != null && <span className="font-mono text-white">({duration_s.toFixed(1)}s)</span>}
          </span>
          <span className="capitalize px-2.5 py-1 rounded bg-[#30497D] border border-[#455B8A] text-[#F2842F] font-semibold">
            {evaluation_mode === 'auto' ? 'Auto Ensemble' : 'Selected Models'}
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#30497D] border border-[#455B8A] text-[#9cb1d4] font-mono">
            <Clock className="w-3.5 h-3.5" />
            {processing_time_s.toFixed(2)}s total
          </span>
        </div>
      </div>

      {/* Grid of Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {model_results.map((r) => (
          <ModelResultCard key={r.model_id} result={r} />
        ))}
      </div>

      {/* Pipeline Warnings if any */}
      {warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {warnings.map((w, idx) => (
            <div
              key={idx}
              className="text-xs flex items-start gap-2 p-3 rounded-lg border"
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                borderColor: 'rgba(245, 158, 11, 0.3)',
                color: '#f59e0b',
              }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
