import { AlertOctagon, ShieldAlert, ShieldCheck, HelpCircle, Activity, Radio, Cpu, Layers } from 'lucide-react'
import { getThreatColor, getThreatClassification } from './SpeedometerHud'

interface ForensicTelemetryMatrixProps {
  score: number | null
  confidence?: number | null
  isScanning?: boolean
  modelAgreement?: string | null
  modelsSucceeded?: number
  modelsTotal?: number
}

export function ForensicTelemetryMatrix({
  score,
  confidence,
  isScanning = false,
  modelAgreement,
  modelsSucceeded = 0,
  modelsTotal = 0,
}: ForensicTelemetryMatrixProps) {
  const pct = score !== null ? Math.round(score * 100) : null
  const threatCol = getThreatColor(score)
  const classification = getThreatClassification(score)

  const isHighThreat = pct !== null && pct >= 70
  const isSafe = pct !== null && pct < 15

  // List of forensic indicator tags
  const tags = [
    { label: 'SPOOFED', active: isHighThreat, severe: pct !== null && pct >= 80 },
    { label: 'RISKY', active: isHighThreat, severe: pct !== null && pct >= 80 },
    { label: 'ANONYMOUS ACTOR', active: isHighThreat, severe: false },
    { label: 'AI CLONED', active: pct !== null && pct >= 60, severe: isHighThreat },
    { label: 'VOCODER ARTIFACTS', active: pct !== null && pct >= 50, severe: isHighThreat },
    { label: 'PHONETIC WARPING', active: pct !== null && pct >= 70, severe: isHighThreat },
    { label: 'SPECTRAL INVERSION', active: pct !== null && pct >= 65, severe: false },
    { label: 'NEURAL DEEPFAKE', active: isHighThreat, severe: pct !== null && pct >= 90 },
    { label: 'BIOMETRIC IMPERSONATION', active: isHighThreat, severe: pct !== null && pct >= 80 },
    { label: 'SYNTHETIC ENVELOPE', active: pct !== null && pct >= 55, severe: false },
    { label: 'PHASE INCOHERENCE', active: pct !== null && pct >= 75, severe: isHighThreat },
    { label: 'AUTHENTIC ORGANIC', active: isSafe, safe: true },
    { label: 'VERIFIED VOCAL TRACT', active: isSafe, safe: true },
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        height: '100%',
        justifyContent: 'space-between',
        padding: '2px 0',
      }}
    >
      {/* ── Header Status Banner ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          borderBottom: '1.5px solid var(--border)',
          paddingBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {isScanning ? (
            <Radio className="w-4 h-4 spin" style={{ color: 'var(--ink)' }} />
          ) : isHighThreat ? (
            <AlertOctagon className="w-4 h-4" style={{ color: threatCol }} />
          ) : isSafe ? (
            <ShieldCheck className="w-4 h-4" style={{ color: threatCol }} />
          ) : score !== null ? (
            <ShieldAlert className="w-4 h-4" style={{ color: threatCol }} />
          ) : (
            <HelpCircle className="w-4 h-4" style={{ color: 'var(--ink-4)' }} />
          )}

          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: threatCol, letterSpacing: '0.04em' }}>
              {isScanning ? 'TELEMETRY SCAN IN PROGRESS…' : classification.status}
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink)', letterSpacing: '0.08em' }}>
              {classification.verdict}
            </div>
          </div>
        </div>

        {/* Small threat level pill */}
        <span
          style={{
            padding: '3px 8px',
            borderRadius: 4,
            border: `1.5px solid ${threatCol}`,
            background: `color-mix(in srgb, ${threatCol} 12%, transparent)`,
            color: threatCol,
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          {classification.level} RISK
        </span>
      </div>

      {/* ── Key Forensic Indicators (The user's requested words & tags) ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {tags.map((t, idx) => {
          const isHighlighted = t.active
          const isDanger = t.severe
          const isGood = t.safe

          const bg = isDanger
            ? 'color-mix(in srgb, #b91c1c 12%, #ffffff)'
            : isHighlighted
              ? 'color-mix(in srgb, #ea580c 10%, #ffffff)'
              : isGood
                ? 'color-mix(in srgb, #16a34a 10%, #ffffff)'
                : '#eaeae6'

          const borderCol = isDanger
            ? '#b91c1c'
            : isHighlighted
              ? '#ea580c'
              : isGood
                ? '#16a34a'
                : '#c8c8c2'

          const textCol = isDanger
            ? '#991b1b'
            : isHighlighted
              ? '#c2410c'
              : isGood
                ? '#15803d'
                : '#444444'

          return (
            <span
              key={idx}
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.06em',
                padding: '2.5px 6px',
                borderRadius: 3,
                border: `1px solid ${borderCol}`,
                background: bg,
                color: textCol,
                transition: 'all 0.2s',
              }}
            >
              {t.label}
            </span>
          )
        })}
      </div>

      {/* ── Telemetry Matrix Stats (High contrast for projector) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
          background: 'var(--bg-1)',
          padding: '6px 8px',
          borderRadius: 5,
          border: '1px solid var(--border)',
        }}
      >
        <div>
          <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            SPOOF PROBABILITY
          </div>
          <div className="mono" style={{ fontSize: 13, fontWeight: 900, color: threatCol }}>
            {pct !== null ? `${pct}%` : '—'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            CONFIDENCE
          </div>
          <div className="mono" style={{ fontSize: 13, fontWeight: 900, color: 'var(--ink)' }}>
            {confidence != null ? `${Math.round(confidence * 100)}%` : '—'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            CONSENSUS
          </div>
          <div className="mono" style={{ fontSize: 12, fontWeight: 900, color: 'var(--ink)' }}>
            {modelAgreement || (modelsSucceeded > 0 ? `${modelsSucceeded}/${modelsTotal}` : 'STANDBY')}
          </div>
        </div>
      </div>

      {/* ── Diagnostic Analysis Narrative ── */}
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          color: 'var(--ink)',
          lineHeight: 1.45,
          background: '#ffffff',
          padding: '6px 10px',
          borderRadius: 4,
          border: '1px solid var(--border)',
        }}
      >
        {pct !== null ? (
          pct >= 70 ? (
            <span>
              <strong style={{ color: threatCol, fontWeight: 800 }}>ALERT: </strong>
              Audio signal displays strong synthetic vocoder artifacts, anomalous phase discontinuity, and spectral modulation consistent with automated deepfake voice cloning.
            </span>
          ) : pct >= 40 ? (
            <span>
              <strong style={{ color: threatCol, fontWeight: 800 }}>ATTENTION: </strong>
              Ambiguous acoustic telemetry detected. Acoustic feature extraction indicates conflicting vocoder probability markers across detection models.
            </span>
          ) : (
            <span>
              <strong style={{ color: threatCol, fontWeight: 800 }}>VERIFIED: </strong>
              Acoustic resonance and formant spectral continuity conform to organic human vocal cord dynamics. No generative synthesis residues found.
            </span>
          )
        ) : (
          <span style={{ color: 'var(--ink-3)' }}>
            Ready for screening. Select desired detection models below and trigger analysis to view complete acoustic forensic breakdown.
          </span>
        )}
      </div>
    </div>
  )
}
