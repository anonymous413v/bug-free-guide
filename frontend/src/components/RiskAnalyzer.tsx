import { ShieldAlert, ShieldCheck, ShieldX, HelpCircle, AlertTriangle, CheckCircle2, XCircle, Layers, Scale } from 'lucide-react'
import type { InferenceResponse } from '../api/client'

interface Props { response: InferenceResponse }

const META: Record<string, { label: string; color: string; verdict: string; sublabel: string; icon: React.ReactNode }> = {
  low:     { label: 'LOW RISK',    color: 'var(--ok)',     verdict: 'AUTHENTIC SPEECH',       sublabel: 'Acoustic patterns consistent with natural human speech', icon: <ShieldCheck className="w-5 h-5" /> },
  medium:  { label: 'MEDIUM RISK', color: 'var(--warn)',   verdict: 'ANOMALOUS SIGNAL',        sublabel: 'Conflicting indicators detected across models',           icon: <ShieldAlert className="w-5 h-5" /> },
  high:    { label: 'HIGH RISK',   color: 'var(--danger)', verdict: 'SYNTHETIC IMPERSONATION', sublabel: 'Synthesized vocoder or cloning artifacts flagged',         icon: <ShieldX className="w-5 h-5" /> },
  unknown: { label: 'UNKNOWN',     color: 'var(--ink-3)',  verdict: 'INSUFFICIENT DATA',       sublabel: 'Insufficient model consensus or execution failure',        icon: <HelpCircle className="w-5 h-5" /> },
}

export function RiskAnalyzer({ response }: Props) {
  const { risk, model_results } = response
  const meta = META[risk.risk_level] ?? META.unknown
  const riskPct = risk.risk_score != null ? Math.round(risk.risk_score * 100) : null
  const confPct = risk.confidence  != null ? Math.round(risk.confidence * 100)  : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Main verdict card */}
      <div style={{
        border: `1px solid color-mix(in srgb, ${meta.color} 35%, transparent)`,
        borderRadius: 6, padding: '16px 20px',
        background: `color-mix(in srgb, ${meta.color} 4%, var(--bg-1))`,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <span style={{ color: meta.color }}>{meta.icon}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: meta.color, letterSpacing: '0.06em' }}>{meta.label}</span>
              {riskPct != null && <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: meta.color }}>{riskPct}%</span>}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.06em', marginBottom: 2 }}>{meta.verdict}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{meta.sublabel}</div>
          </div>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Evaluated', value: `${risk.models_succeeded + risk.models_failed}/${risk.models_total}`, icon: <Layers className="w-3 h-3" /> },
            { label: 'Passed',    value: risk.models_succeeded, color: 'var(--ok)',     icon: <CheckCircle2 className="w-3 h-3" /> },
            { label: 'Failed',    value: risk.models_failed,    color: 'var(--danger)', icon: <XCircle className="w-3 h-3" /> },
            { label: 'Agreement', value: risk.model_agreement ?? 'N/A',                 icon: <Scale className="w-3 h-3" /> },
            ...(confPct != null ? [{ label: 'Confidence', value: `${confPct}%`, color: 'var(--ok)', icon: null }] : []),
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{
              padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 5,
              background: 'var(--bg)', textAlign: 'center', minWidth: 64,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 3, color: 'var(--ink-3)' }}>
                {icon} <span className="label-xs" style={{ fontSize: 8 }}>{label}</span>
              </div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 800, color: color ?? 'var(--ink)' }}>{String(value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Consensus bars */}
      {model_results.length > 0 && (
        <div style={{
          border: '1px solid var(--border)', borderRadius: 6,
          padding: '14px 18px', background: 'var(--bg-1)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <span className="label-xs" style={{ marginBottom: 4 }}>Model Consensus</span>
          {model_results.map(r => {
            const sp = r.success && r.bonafide_probability != null
              ? Math.round((1 - r.bonafide_probability) * 100)
              : r.success && r.raw_score != null
                ? Math.round((1 / (1 + Math.exp(r.raw_score))) * 100)
                : null
            const barColor = sp != null ? (sp > 65 ? 'var(--danger)' : sp > 35 ? 'var(--warn)' : 'var(--ok)') : 'var(--border)'
            return (
              <div key={r.model_id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                <span style={{ width: 120, color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{r.model_name}</span>
                {r.success && sp != null ? (
                  <>
                    <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${sp}%`, background: barColor, borderRadius: 2, transition: 'width 0.7s ease' }} />
                    </div>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', width: 34, textAlign: 'right', flexShrink: 0 }}>{sp}%</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: r.label === 'BONAFIDE' ? 'var(--ok)' : r.label === 'SPOOF' ? 'var(--danger)' : 'var(--warn)', width: 56, textAlign: 'right', flexShrink: 0, letterSpacing: '0.06em' }}>{r.label}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 10, color: 'var(--ink-4)', display: 'flex', alignItems: 'center', gap: 3 }}><XCircle className="w-3 h-3" /> Skipped</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Explanation + disclaimer */}
      <div style={{ fontSize: 11, color: 'var(--ink-3)', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg-1)', lineHeight: 1.6 }}>
        <span style={{ fontWeight: 700, color: 'var(--ink)', marginRight: 6 }}>Method:</span>{risk.explanation}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 10, color: 'var(--ink-3)', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg)', lineHeight: 1.5 }}>
        <AlertTriangle className="w-3.5 h-3.5" style={{ flexShrink: 0, marginTop: 1 }} />{risk.disclaimer}
      </div>
    </div>
  )
}
