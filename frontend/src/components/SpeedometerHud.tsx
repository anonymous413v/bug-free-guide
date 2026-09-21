import { useMemo } from 'react'

interface SpeedometerHudProps {
  /** 0 to 1 threat score, null if idle/untested */
  value: number | null
  size?: number
  isScanning?: boolean
}

/** Compute the threat colour from a 0–1 score matching the user's exact specification */
export function getThreatColor(score: number | null): string {
  if (score === null) return '#555555'
  const pct = score * 100
  if (pct >= 90) return '#b91c1c'  // Red alert (>= 90%)
  if (pct >= 80) return '#dc2626'  // Orange-red (80-90%)
  if (pct >= 70) return '#ea580c'  // Orange-amber (70-80%)
  if (pct >= 40) return '#ca8a04'  // Amber neutral (40-70%)
  if (pct >= 15) return '#65a30d'  // Light green / yellowish (15-40%)
  return '#16a34a'                 // Green safe (< 15%)
}

export function getThreatClassification(score: number | null): {
  status: string
  verdict: string
  color: string
  level: string
} {
  if (score === null) {
    return {
      status: 'IDLE / STANDBY',
      verdict: 'AWAITING TELEMETRY',
      color: '#555555',
      level: 'NOMINAL',
    }
  }
  const pct = score * 100
  if (pct >= 90) {
    return {
      status: 'CRITICAL THREAT ALERT',
      verdict: 'CONFIRMED SYNTHETIC SPOOF',
      color: '#b91c1c',
      level: 'CRITICAL',
    }
  }
  if (pct >= 80) {
    return {
      status: 'HIGH THREAT DETECTED',
      verdict: 'AI VOICE IMPERSONATION',
      color: '#dc2626',
      level: 'HIGH',
    }
  }
  if (pct >= 70) {
    return {
      status: 'ELEVATED RISK FLAGGED',
      verdict: 'SUSPICIOUS CLONED AUDIO',
      color: '#ea580c',
      level: 'ELEVATED',
    }
  }
  if (pct >= 40) {
    return {
      status: 'AMBIGUOUS ANOMALY',
      verdict: 'ANOMALOUS VOCODER RESIDUE',
      color: '#ca8a04',
      level: 'MODERATE',
    }
  }
  if (pct >= 15) {
    return {
      status: 'LOW RISK MARGINAL',
      verdict: 'MINOR SPECTRAL VARIANCE',
      color: '#65a30d',
      level: 'LOW',
    }
  }
  return {
    status: 'VERIFIED SAFE',
    verdict: 'AUTHENTIC HUMAN SPEECH',
    color: '#16a34a',
    level: 'SAFE',
  }
}

/**
 * High-precision Sci-Fi Speedometer HUD meter.
 * Spans from 150° (0%) to 390° (100%) - total 240° sweep.
 * Features color-coded zones, calibrated tick marks with numerical readings,
 * dynamic needle pointer, digital readout, and outer sci-fi bezel.
 */
export function SpeedometerHud({ value, size = 260, isScanning = false }: SpeedometerHudProps) {
  const pct = value !== null ? Math.min(100, Math.max(0, Math.round(value * 100))) : null
  const threatCol = getThreatColor(value)

  // Speedometer geometry
  const cx = size / 2
  const cy = size * 0.52
  const R_OUTER = size * 0.44
  const R_TRACK = size * 0.38
  const R_TICKS = size * 0.32
  const R_NUMS  = size * 0.24

  // Angular parameters (240° sweep)
  const START_DEG = 150
  const SWEEP_DEG = 240

  const degToRad = (d: number) => (d * Math.PI) / 180
  const polarToX = (r: number, deg: number) => cx + r * Math.cos(degToRad(deg))
  const polarToY = (r: number, deg: number) => cy + r * Math.sin(degToRad(deg))

  // Color segment zones: [startPct, endPct, color]
  const zones = useMemo(() => [
    { from: 0,  to: 15,  color: '#16a34a' }, // Safe (<15%)
    { from: 15, to: 40,  color: '#65a30d' }, // Light green / yellowish (15-40%)
    { from: 40, to: 70,  color: '#ca8a04' }, // Amber (40-70%)
    { from: 70, to: 80,  color: '#ea580c' }, // Orange (70-80%)
    { from: 80, to: 90,  color: '#dc2626' }, // Orange-red (80-90%)
    { from: 90, to: 100, color: '#b91c1c' }, // Red alert (>=90%)
  ], [])

  // Helper to describe an SVG arc path between two percentages
  function describeArc(r: number, p1: number, p2: number) {
    const a1 = START_DEG + (p1 / 100) * SWEEP_DEG
    const a2 = START_DEG + (p2 / 100) * SWEEP_DEG
    const x1 = polarToX(r, a1)
    const y1 = polarToY(r, a1)
    const x2 = polarToX(r, a2)
    const y2 = polarToY(r, a2)
    const large = (a2 - a1) > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }

  // Generate tick marks (every 2.5% small tick, every 5% medium tick, every 10% major tick)
  const ticks = useMemo(() => {
    const list = []
    for (let p = 0; p <= 100; p += 2.5) {
      const a = START_DEG + (p / 100) * SWEEP_DEG
      const isMajor = p % 10 === 0
      const isMedium = p % 5 === 0 && !isMajor
      const len = isMajor ? size * 0.055 : isMedium ? size * 0.038 : size * 0.022
      const r1 = R_TICKS - len
      const r2 = R_TICKS
      const isLit = pct !== null && p <= pct
      list.push({
        p,
        a,
        x1: polarToX(r1, a),
        y1: polarToY(r1, a),
        x2: polarToX(r2, a),
        y2: polarToY(r2, a),
        isMajor,
        isMedium,
        isLit,
        color: isLit ? getThreatColor(p / 100) : '#888880',
      })
    }
    return list
  }, [size, pct, R_TICKS])

  // Major tick numbers: 0, 10, 20, 30 ... 100
  const numbers = useMemo(() => {
    const list = []
    for (let p = 0; p <= 100; p += 10) {
      const a = START_DEG + (p / 100) * SWEEP_DEG
      list.push({
        p,
        x: polarToX(R_NUMS, a),
        y: polarToY(R_NUMS, a) + 3,
        color: pct !== null && p <= pct ? getThreatColor(p / 100) : '#333333',
        weight: pct !== null && p <= pct ? '800' : '600',
      })
    }
    return list
  }, [pct, R_NUMS])

  // Needle angle in degrees
  const needleAngle = pct !== null ? START_DEG + (pct / 100) * SWEEP_DEG : START_DEG
  const needleLen = R_TRACK - size * 0.02

  return (
    <div style={{ position: 'relative', width: size, height: size * 0.74, display: 'inline-block' }}>
      <svg
        width={size}
        height={size * 0.74}
        viewBox={`0 0 ${size} ${size * 0.74}`}
        style={{ overflow: 'visible', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))' }}
      >
        <defs>
          {/* Outer bezel gradient */}
          <linearGradient id="speedo-bezel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d4d4ce" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#b8b8b0" />
          </linearGradient>

          {/* Needle shadow */}
          <filter id="needle-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* ── Outer Sci-Fi Frame & Bezel ── */}
        <path
          d={describeArc(R_OUTER, 0, 100)}
          fill="none"
          stroke="#888880"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />

        {/* Corner alignment brackets */}
        <line x1={cx - R_OUTER - 4} y1={cy} x2={cx - R_OUTER + 8} y2={cy} stroke="#111111" strokeWidth="2" />
        <line x1={cx + R_OUTER - 8} y1={cy} x2={cx + R_OUTER + 4} y2={cy} stroke="#111111" strokeWidth="2" />
        <line x1={cx} y1={cy - R_OUTER - 4} x2={cx} y2={cy - R_OUTER + 8} stroke="#111111" strokeWidth="2" />

        {/* ── Speedometer Track (Background & Colored Zones) ── */}
        {/* Neutral background track */}
        <path
          d={describeArc(R_TRACK, 0, 100)}
          fill="none"
          stroke="#d8d8d2"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Subtle colored zone marks along the track */}
        {zones.map((z, idx) => (
          <path
            key={idx}
            d={describeArc(R_TRACK, z.from, z.to)}
            fill="none"
            stroke={z.color}
            strokeWidth="3"
            strokeOpacity="0.35"
          />
        ))}

        {/* ── Active Filled Threat Arc ── */}
        {pct !== null && pct > 0 && (
          <path
            d={describeArc(R_TRACK, 0, pct)}
            fill="none"
            stroke={threatCol}
            strokeWidth="8"
            strokeLinecap="round"
            style={{
              transition: 'stroke 0.4s ease',
              filter: `drop-shadow(0 0 5px ${threatCol}88)`,
            }}
          />
        )}

        {/* ── Tick Marks ── */}
        {ticks.map((t, idx) => (
          <line
            key={idx}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.isLit ? t.color : t.isMajor ? '#333333' : '#888880'}
            strokeWidth={t.isMajor ? 2 : t.isMedium ? 1.5 : 0.9}
            opacity={t.isLit ? 1 : t.isMajor ? 0.9 : 0.6}
          />
        ))}

        {/* ── Numerical Dial Numbers (0, 10, 20 ... 100) ── */}
        {numbers.map((n) => (
          <text
            key={n.p}
            x={n.x}
            y={n.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.038}
            fontWeight={n.weight}
            fontFamily="monospace"
            fill={n.color}
          >
            {n.p}
          </text>
        ))}

        {/* ── Center Metallic Pivot Base ── */}
        <circle cx={cx} cy={cy} r={size * 0.11} fill="#e2e2dc" stroke="#888880" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={size * 0.08} fill="#ffffff" stroke="#333333" strokeWidth="1" />

        {/* ── Pointer Needle ── */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${needleAngle}deg)`,
            transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          filter="url(#needle-shadow)"
        >
          {/* Main needle blade */}
          <polygon
            points={`${cx - 3},${cy} ${cx + needleLen},${cy - 1.5} ${cx + needleLen + 4},${cy} ${cx + needleLen},${cy + 1.5} ${cx - 3},${cy}`}
            fill="#050505"
          />
          {/* Needle red/color tip */}
          <polygon
            points={`${cx + needleLen - 14},${cy - 1.2} ${cx + needleLen + 4},${cy} ${cx + needleLen - 14},${cy + 1.2}`}
            fill={threatCol}
          />
          {/* Needle center cap */}
          <circle cx={cx} cy={cy} r={size * 0.032} fill="#111111" />
          <circle cx={cx} cy={cy} r={size * 0.015} fill={threatCol} />
        </g>

        {/* ── Central Digital Gauge Readout ── */}
        {pct !== null ? (
          <>
            <text
              x={cx}
              y={cy + size * 0.16}
              textAnchor="middle"
              fontSize={size * 0.11}
              fontWeight="900"
              fontFamily="monospace"
              fill={threatCol}
              letterSpacing="-0.03em"
            >
              {pct}%
            </text>
            <text
              x={cx}
              y={cy + size * 0.20}
              textAnchor="middle"
              fontSize={size * 0.036}
              fontWeight="800"
              fontFamily="monospace"
              fill="#111111"
              letterSpacing="0.12em"
            >
              THREAT INDEX
            </text>
          </>
        ) : (
          <>
            <text
              x={cx}
              y={cy + size * 0.16}
              textAnchor="middle"
              fontSize={size * 0.055}
              fontWeight="800"
              fontFamily="monospace"
              fill="#555555"
              letterSpacing="0.06em"
            >
              {isScanning ? 'SCANNING' : '0% READY'}
            </text>
            <text
              x={cx}
              y={cy + size * 0.20}
              textAnchor="middle"
              fontSize={size * 0.034}
              fontWeight="800"
              fontFamily="monospace"
              fill="#777777"
              letterSpacing="0.12em"
            >
              SPEEDOMETER
            </text>
          </>
        )}

        {/* ── Bottom Scale Legend ── */}
        <text
          x={cx - R_TRACK + 4}
          y={cy + size * 0.18}
          textAnchor="start"
          fontSize={size * 0.032}
          fontWeight="800"
          fontFamily="monospace"
          fill="#16a34a"
        >
          SAFE
        </text>
        <text
          x={cx + R_TRACK - 4}
          y={cy + size * 0.18}
          textAnchor="end"
          fontSize={size * 0.032}
          fontWeight="800"
          fontFamily="monospace"
          fill="#b91c1c"
        >
          CRITICAL
        </text>
      </svg>
    </div>
  )
}
