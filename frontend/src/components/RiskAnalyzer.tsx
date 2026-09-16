import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  Scale,
  Award,
} from 'lucide-react'
import type { InferenceResponse } from '../api/client'

interface RiskAnalyzerProps {
  response: InferenceResponse
}

interface RiskTheme {
  label: string
  sublabel: string
  verdict: string
  color: string
  bg: string
  border: string
  icon: React.ReactNode
}

const RISK_THEMES: Record<string, RiskTheme> = {
  low: {
    label: 'LOW RISK',
    sublabel: 'Acoustic patterns consistent with natural human speech',
    verdict: 'AUTHENTIC SPEECH DETECTED',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.08)',
    border: 'rgba(34, 197, 94, 0.35)',
    icon: <ShieldCheck className="w-10 h-10 text-emerald-400" />,
  },
  medium: {
    label: 'MEDIUM RISK',
    sublabel: 'Conflicting or boundary indicators detected across models',
    verdict: 'ANOMALOUS / UNCERTAIN SIGNAL',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.35)',
    icon: <ShieldAlert className="w-10 h-10 text-amber-400" />,
  },
  high: {
    label: 'HIGH RISK',
    sublabel: 'Synthesized vocoder or cloning artifacts flagged',
    verdict: 'SYNTHETIC IMPERSONATION DETECTED',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.4)',
    icon: <ShieldX className="w-10 h-10 text-rose-500" />,
  },
  unknown: {
    label: 'UNKNOWN RISK',
    sublabel: 'Insufficient model consensus or execution failure',
    verdict: 'INSUFFICIENT TELEMETRY',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.08)',
    border: 'rgba(148, 163, 184, 0.3)',
    icon: <HelpCircle className="w-10 h-10 text-slate-400" />,
  },
}

export function RiskAnalyzer({ response }: RiskAnalyzerProps) {
  const { risk, model_results } = response
  const theme = RISK_THEMES[risk.risk_level] ?? RISK_THEMES.unknown

  const riskPct = risk.risk_score != null ? Math.round(risk.risk_score * 100) : null
  const confidencePct = risk.confidence != null ? Math.round(risk.confidence * 100) : null

  return (
    <div className="vg-card p-6 animate-slide-up" id="risk-analyzer">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: 'rgba(242, 132, 47, 0.15)', border: '1px solid rgba(242, 132, 47, 0.3)' }}
          >
            <ShieldAlert className="w-4 h-4 text-[#F2842F]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Threat Intelligence Assessment</h2>
            <p className="text-xs text-[#9cb1d4]">
              Multi-model ensemble aggregation & spoof probability analysis
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-md bg-[#30497D] text-[#9cb1d4] border border-[#455B8A]">
          Method: {risk.calculation_method}
        </span>
      </div>

      {/* Main Threat Posture Hero Card */}
      <div
        className="rounded-2xl border p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${theme.bg} 0%, rgba(37, 60, 109, 0.4) 100%)`,
          borderColor: theme.border,
          boxShadow: `0 8px 32px -4px ${theme.border}`,
        }}
        id="risk-level-indicator"
      >
        {/* Left: Icon & Threat Verdict */}
        <div className="flex items-center gap-4 text-center sm:text-left flex-1">
          <div
            className="flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0"
            style={{
              background: 'rgba(26, 42, 74, 0.8)',
              border: `1px solid ${theme.border}`,
            }}
          >
            {theme.icon}
          </div>

          <div>
            <div className="flex items-center gap-3 justify-center sm:justify-start mb-1">
              <span
                className="text-2xl sm:text-3xl font-extrabold tracking-wider"
                style={{ color: theme.color }}
              >
                {theme.label}
              </span>
              {riskPct !== null && (
                <span
                  className="font-mono text-xl sm:text-2xl font-black px-2.5 py-0.5 rounded-lg border"
                  style={{
                    color: theme.color,
                    background: 'rgba(26, 42, 74, 0.7)',
                    borderColor: theme.border,
                  }}
                >
                  {riskPct}%
                </span>
              )}
            </div>

            <p className="text-sm font-semibold tracking-wide uppercase text-white mb-0.5">
              {theme.verdict}
            </p>
            <p className="text-xs text-[#9cb1d4]">{theme.sublabel}</p>
          </div>
        </div>

        {/* Right: Radial Threat Score Dial */}
        {riskPct !== null && (
          <div className="flex flex-col items-center flex-shrink-0" id="risk-gauge">
            <div className="w-24 h-24 relative flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="#30497D"
                  strokeWidth="3.2"
                />
                {/* Threat Value Ring */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke={theme.color}
                  strokeWidth="3.2"
                  strokeDasharray={`${riskPct} ${100 - riskPct}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-black font-mono" style={{ color: theme.color }}>
                  {riskPct}%
                </span>
                <span className="text-[9px] uppercase tracking-wider text-[#9cb1d4] -mt-1 font-bold">
                  Spoof
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Telemetry Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3.5 rounded-xl bg-[#30497D] border border-[#455B8A] text-center">
          <span className="text-[11px] text-[#9cb1d4] flex items-center justify-center gap-1 mb-1">
            <Layers className="w-3.5 h-3.5 text-[#F2842F]" /> Models Evaluated
          </span>
          <div className="text-xl font-mono font-bold text-white">
            {risk.models_succeeded + risk.models_failed}
            <span className="text-xs text-[#62749a] font-normal"> / {risk.models_total}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#30497D] border border-[#455B8A] text-center">
          <span className="text-[11px] text-[#9cb1d4] flex items-center justify-center gap-1 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Succeeded
          </span>
          <div className="text-xl font-mono font-bold text-emerald-400">
            {risk.models_succeeded}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#30497D] border border-[#455B8A] text-center">
          <span className="text-[11px] text-[#9cb1d4] flex items-center justify-center gap-1 mb-1">
            <XCircle className="w-3.5 h-3.5 text-rose-400" /> Failed / Blocked
          </span>
          <div className="text-xl font-mono font-bold text-rose-400">
            {risk.models_failed}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#30497D] border border-[#455B8A] text-center">
          <span className="text-[11px] text-[#9cb1d4] flex items-center justify-center gap-1 mb-1">
            <Scale className="w-3.5 h-3.5 text-[#F2842F]" /> Model Agreement
          </span>
          <div className="text-base font-bold text-white capitalize truncate">
            {risk.model_agreement ?? 'N/A'}
          </div>
        </div>
      </div>

      {/* Model Consensus Visual Breakdown */}
      {model_results.length > 0 && (
        <div className="rounded-xl border border-[#455B8A] bg-[rgba(48,73,125,0.3)] p-4 sm:p-5 mb-5">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9cb1d4] flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-[#F2842F]" />
              Model Consensus Comparison
            </h3>
            {confidencePct !== null && (
              <span className="text-xs font-mono text-emerald-400">
                Detection Confidence: {confidencePct}%
              </span>
            )}
          </div>

          <div className="space-y-3">
            {model_results.map((r) => {
              // Calculate spoof percentage (1 - bonafide probability)
              const spoofPct =
                r.success && r.bonafide_probability != null
                  ? Math.round((1 - r.bonafide_probability) * 100)
                  : r.success && r.raw_score != null
                  ? Math.round((1 / (1 + Math.exp(r.raw_score))) * 100)
                  : null

              return (
                <div key={r.model_id} className="flex items-center gap-3 text-xs">
                  <div className="w-32 sm:w-40 truncate font-semibold text-white" title={r.model_name}>
                    {r.model_name}
                  </div>

                  {r.success && spoofPct !== null ? (
                    <>
                      <div className="flex-1 h-2 rounded-full bg-[#1e3052] overflow-hidden border border-[#455B8A]">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${spoofPct}%`,
                            background:
                              spoofPct > 65
                                ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                                : spoofPct > 35
                                ? 'linear-gradient(90deg, #22c55e, #f59e0b)'
                                : 'linear-gradient(90deg, #10b981, #22c55e)',
                          }}
                        />
                      </div>

                      <span className="font-mono text-xs w-12 text-right text-white">
                        {spoofPct}%
                      </span>

                      <span
                        className="font-bold text-[11px] px-2 py-0.5 rounded text-right min-w-[75px] text-center"
                        style={{
                          background:
                            r.label === 'BONAFIDE'
                              ? 'rgba(34,197,94,0.15)'
                              : r.label === 'SPOOF'
                              ? 'rgba(239,68,68,0.15)'
                              : 'rgba(245,158,11,0.15)',
                          color:
                            r.label === 'BONAFIDE'
                              ? '#22c55e'
                              : r.label === 'SPOOF'
                              ? '#ef4444'
                              : '#f59e0b',
                        }}
                      >
                        {r.label}
                      </span>
                    </>
                  ) : (
                    <div className="flex-1 text-right text-[#ef4444] text-xs flex items-center justify-end gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Evaluation Skipped / Incompatible</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Analytical Methodology Card */}
      <div className="p-4 rounded-xl bg-[#30497D] border border-[#455B8A] mb-4 text-xs leading-relaxed text-[#9cb1d4]">
        <h4 className="font-bold text-white mb-1.5 flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5 text-[#F2842F]" />
          Analytical Risk Calculation Explanation
        </h4>
        <p>{risk.explanation}</p>
      </div>

      {/* Security Disclaimer Notice */}
      <div
        className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs text-[#9cb1d4] border"
        style={{
          background: 'rgba(242, 132, 47, 0.06)',
          borderColor: 'rgba(242, 132, 47, 0.25)',
        }}
        id="risk-disclaimer"
      >
        <AlertTriangle className="w-4 h-4 text-[#F2842F] flex-shrink-0 mt-0.5" />
        <span className="leading-snug">{risk.disclaimer}</span>
      </div>
    </div>
  )
}
