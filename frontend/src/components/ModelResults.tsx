import { CheckCircle2, XCircle, Clock, Activity, AlertTriangle, FileAudio, Cpu, Info } from 'lucide-react'
import type { ModelResult, InferenceResponse } from '../api/client'

function LabelBadge({ label }: { label: string | null }) {
  if (!label) return null
  const color = label === 'BONAFIDE' ? 'var(--ok)' : label === 'SPOOF' ? 'var(--danger)' : 'var(--warn)'
  return (
    <span className="badge" style={{
      color,
      borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
      background: `color-mix(in srgb, ${color} 8%, transparent)`,
      fontWeight: 800, letterSpacing: '0.08em',
    }}>
      {label}
    </span>
  )
}

function LogitScoreBar({ value }: { value: number }) {
  const isBonafide = value >= 0
  const normalizedWidth = Math.min(Math.abs(value) / 10, 1) * 100

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{
        width: '100%', height: 4, background: 'var(--border)',
        borderRadius: 2, overflow: 'hidden', position: 'relative',
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border-hi)', zIndex: 1 }} />
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${normalizedWidth / 2}%`,
          marginLeft: isBonafide ? '50%' : `${50 - normalizedWidth / 2}%`,
          background: isBonafide ? 'var(--ok)' : 'var(--danger)',
          transition: 'width 0.7s ease, margin-left 0.7s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 9, color: 'var(--text-3)' }}>
        <span>SPOOF</span>
        <span>BONAFIDE</span>
      </div>
    </div>
  )
}

function SingleModelResult({ r }: { r: ModelResult }) {
  const borderColor = r.success
    ? r.label === 'BONAFIDE'
      ? 'color-mix(in srgb, var(--ok) 25%, transparent)'
      : r.label === 'SPOOF'
        ? 'color-mix(in srgb, var(--danger) 25%, transparent)'
        : 'var(--border)'
    : 'var(--border)'

  return (
    <div style={{
      border: `1px solid ${borderColor}`,
      borderRadius: 6, padding: '14px 16px',
      background: 'var(--bg-1)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 4,
            border: '1px solid var(--border)', background: 'var(--bg-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {r.success
              ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--ok)' }} />
              : <XCircle className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
            }
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{r.model_name}</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{r.model_id}</div>
          </div>
        </div>
        <LabelBadge label={r.label} />
      </div>

      {r.success ? (
        <>
          {/* Logit bar */}
          {r.raw_score != null && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-2)', marginBottom: 2 }}>
                <span>Raw Logit Score</span>
                <span className="mono" style={{ color: 'var(--text-1)' }}>{r.raw_score.toFixed(4)}</span>
              </div>
              <LogitScoreBar value={r.raw_score} />
            </div>
          )}

          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {r.bonafide_probability != null && (
              <div style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg-2)' }}>
                <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>P(Bonafide)</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                  {(r.bonafide_probability * 100).toFixed(1)}%
                </div>
              </div>
            )}
            {r.spoof_probability != null && (
              <div style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg-2)' }}>
                <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>P(Spoof)</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: r.spoof_probability > 0.5 ? 'var(--danger)' : 'var(--ok)' }}>
                  {(r.spoof_probability * 100).toFixed(1)}%
                </div>
              </div>
            )}
            {r.inference_time_s != null && (
              <div style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg-2)' }}>
                <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock className="w-2.5 h-2.5" /> Latency
                </div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                  {r.inference_time_s.toFixed(3)}s
                </div>
              </div>
            )}
          </div>

          {/* Extra info */}
          {(r.features_used || r.sample_rate) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {r.features_used && (
                <span className="badge badge-muted" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Activity className="w-2.5 h-2.5" /> {r.features_used}
                </span>
              )}
              {r.sample_rate && (
                <span className="badge badge-muted mono" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Cpu className="w-2.5 h-2.5" /> {(r.sample_rate / 1000).toFixed(1)}kHz
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 6,
          padding: '10px 12px',
          border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
          borderRadius: 4, fontSize: 10,
          background: 'color-mix(in srgb, var(--danger) 5%, transparent)',
          color: 'var(--danger)',
        }}>
          <AlertTriangle className="w-3.5 h-3.5" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>Evaluation Failed</div>
            <div style={{ color: 'var(--text-2)', lineHeight: 1.4 }}>{r.error ?? 'Unknown error'}</div>
          </div>
        </div>
      )}

      {r.diagnostic_note && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 5,
          fontSize: 10, color: 'var(--text-3)', lineHeight: 1.4,
          padding: '6px 10px',
          border: '1px solid var(--border)', borderRadius: 4,
          background: 'var(--bg-2)',
        }}>
          <Info className="w-3 h-3" style={{ flexShrink: 0, marginTop: 1 }} />
          {r.diagnostic_note}
        </div>
      )}
    </div>
  )
}

interface ModelResultsProps {
  response: InferenceResponse
}

export function ModelResults({ response }: ModelResultsProps) {
  const { model_results, audio_info } = response

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Audio info bar */}
      {audio_info && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '10px 14px',
          border: '1px solid var(--border)', borderRadius: 6,
          background: 'var(--bg-1)',
          fontSize: 11, color: 'var(--text-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <FileAudio className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
            <span className="label-xs">Audio Input</span>
          </div>
          <div style={{ height: 12, width: 1, background: 'var(--border)' }} />
          {[
            { label: 'File', val: audio_info.filename },
            { label: 'Size', val: audio_info.file_size_bytes ? `${(audio_info.file_size_bytes / 1024).toFixed(1)} KB` : null },
            { label: 'Duration', val: audio_info.duration_s ? `${audio_info.duration_s.toFixed(2)}s` : null },
            { label: 'Sample Rate', val: audio_info.sample_rate ? `${(audio_info.sample_rate / 1000).toFixed(1)} kHz` : null },
            { label: 'Channels', val: audio_info.channels },
          ].filter(({ val }) => val != null).map(({ label, val }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: 'var(--text-3)', fontSize: 10 }}>{label}:</span>
              <span className="mono" style={{ color: 'var(--text-1)', fontSize: 11 }}>{val}</span>
            </span>
          ))}
        </div>
      )}

      {/* Model results label */}
      <div className="label-xs">Per-Model Forensic Results</div>

      {/* Results grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {model_results.map((r) => (
          <SingleModelResult key={r.model_id} r={r} />
        ))}
      </div>
    </div>
  )
}
