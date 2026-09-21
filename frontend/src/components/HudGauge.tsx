/** Compute the threat colour from a 0–1 score */
export function threatColor(score: number | null): string {
  if (score === null) return 'var(--ink-4)'
  const pct = score * 100
  if (pct >= 90) return 'var(--t-crit)'   // red
  if (pct >= 80) return 'var(--t-hi)'     // orange-red
  if (pct >= 70) return 'var(--t-warn)'   // orange-amber
  if (pct >= 40) return 'var(--t-mid)'    // amber neutral
  if (pct >= 15) return 'var(--t-low)'    // yellow-green
  return 'var(--t-safe)'                  // green
}

/** Small inline dot indicator */
export function ThreatDot({ score }: { score: number | null }) {
  const color = threatColor(score)
  const pct = score != null ? Math.round(score * 100) : null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span
        className="threat-dot"
        style={{
          background: color,
          boxShadow: pct != null && pct >= 70 ? `0 0 6px ${color}` : 'none',
          animation: pct != null && pct >= 90 ? 'threat-pulse 1.2s ease-in-out infinite' : 'none',
        }}
      />
      {pct != null && (
        <span className="mono" style={{ fontSize: 11, fontWeight: 800, color }}>
          {pct}%
        </span>
      )}
    </span>
  )
}

/** Thin colored strip that goes under a panel header */
export function ThreatStrip({ score }: { score: number | null }) {
  const color = threatColor(score)
  if (score === null) return null
  return (
    <div
      className="threat-strip"
      style={{
        background: color,
        opacity: 0.7,
        boxShadow: score * 100 >= 70 ? `0 1px 6px ${color}` : 'none',
      }}
    />
  )
}

/* ─────────────────────────────────────────────────
   HUD VARIANT 1 — Orbital rings (original enhanced)
───────────────────────────────────────────────── */
interface HudGaugeProps {
  value: number | null
  label?: string
  size?: number
  isScanning?: boolean
  variant?: 'orbital' | 'radar' | 'crosshair' | 'arc'
}

export function HudGauge({ value, label = 'THREAT LEVEL', size = 220, isScanning = false, variant = 'orbital' }: HudGaugeProps) {
  const pct   = value != null ? Math.round(value * 100) : null
  const color = threatColor(value)

  if (variant === 'radar')     return <RadarHud value={value} size={size} label={label} isScanning={isScanning} />
  if (variant === 'crosshair') return <CrosshairHud value={value} size={size} label={label} />
  if (variant === 'arc')       return <ArcHud value={value} size={size} label={label} />

  /* ── ORBITAL (default) ─────────────────────── */
  const cx = size / 2, cy = size / 2
  const R_OUTER = size * 0.44
  const R_MID   = size * 0.35
  const R_INNER = size * 0.27
  const R_CORE  = size * 0.17

  const ticks = Array.from({ length: 72 }, (_, i) => {
    const angle = (i / 72) * 360
    const rad   = (angle * Math.PI) / 180
    const isMajor = i % 9 === 0
    const isLit   = pct != null && (i / 72) * 100 <= pct
    const r0 = isMajor ? R_OUTER - size * 0.055 : R_OUTER - size * 0.028
    return {
      x1: cx + r0 * Math.sin(rad), y1: cy - r0 * Math.cos(rad),
      x2: cx + R_OUTER * Math.sin(rad), y2: cy - R_OUTER * Math.cos(rad),
      isMajor, isLit,
    }
  })

  function describeArc(r: number, start: number, end: number) {
    const s = ((start - 90) * Math.PI) / 180, e = ((end - 90) * Math.PI) / 180
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e)
    return `M ${x1} ${y1} A ${r} ${r} 0 ${end - start > 180 ? 1 : 0} 1 ${x2} ${y2}`
  }

  const filled = pct != null ? (pct / 100) * 340 : 0
  const arcPath = pct != null && pct > 0 ? describeArc(R_MID, 10, 10 + filled) : null

  const orbs = [
    { angle: 315, label: 'AASIST' },
    { angle: 45,  label: 'RAW2' },
    { angle: 180, label: 'ENSEMBLE' },
  ].map(({ angle, label: l }) => {
    const rad = ((angle - 90) * Math.PI) / 180
    return { x: cx + R_OUTER * Math.cos(rad), y: cy + R_OUTER * Math.sin(rad), label: l, angle }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <defs>
        <pattern id="hud-dots" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.5" fill="var(--border)" />
        </pattern>
        <mask id="hud-dot-mask">
          <circle cx={cx} cy={cy} r={R_OUTER + 6} fill="white" />
          <circle cx={cx} cy={cy} r={R_INNER - 2} fill="black" />
        </mask>
      </defs>
      <rect x={cx - R_OUTER - 6} y={cy - R_OUTER - 6} width={(R_OUTER + 6) * 2} height={(R_OUTER + 6) * 2}
        fill="url(#hud-dots)" mask="url(#hud-dot-mask)" opacity="0.5" />

      {/* Outer ring (rotating) */}
      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'spin-cw 18s linear infinite' }}>
        <circle cx={cx} cy={cy} r={R_OUTER} fill="none" stroke="var(--border-hi)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={R_OUTER + size * 0.024} fill="none" stroke="var(--border)" strokeWidth="0.7"
          strokeDasharray="3 10" style={{ animation: 'dash-flow 2.5s linear infinite' }} />
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.isLit ? color : 'var(--border-hi)'}
            strokeWidth={t.isMajor ? 1.5 : 0.8} opacity={t.isLit ? 1 : 0.45} />
        ))}
      </g>

      {/* Mid ring (counter) */}
      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'spin-ccw 22s linear infinite' }}>
        <circle cx={cx} cy={cy} r={R_MID} fill="none" stroke="var(--border)" strokeWidth="0.9" strokeDasharray="3 6" />
        {[0,45,90,135,180,225,270,315].map(a => {
          const rad = ((a - 90) * Math.PI) / 180
          return <line key={a}
            x1={cx + (R_MID - size * 0.05) * Math.cos(rad)} y1={cy + (R_MID - size * 0.05) * Math.sin(rad)}
            x2={cx + (R_MID + size * 0.018) * Math.cos(rad)} y2={cy + (R_MID + size * 0.018) * Math.sin(rad)}
            stroke="var(--border-hi)" strokeWidth="1" />
        })}
      </g>

      {/* Threat arc */}
      {arcPath && <path d={arcPath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${color}88)` }} />}

      {/* Inner ring */}
      <circle cx={cx} cy={cy} r={R_INNER} fill="none" stroke="var(--border)" strokeWidth="0.9" />

      {/* Scanner sweep */}
      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: `hud-scan ${isScanning ? '1.4s' : '9s'} linear infinite` }}>
        <line x1={cx} y1={cy} x2={cx} y2={cy - R_MID} stroke="var(--ink-3)" strokeWidth="0.8" opacity="0.5" />
        <path d={`M ${cx} ${cy} L ${cx - R_MID * 0.3} ${cy - R_MID * 0.95} A ${R_MID} ${R_MID} 0 0 1 ${cx} ${cy - R_MID} Z`}
          fill="var(--ink)" opacity="0.035" />
      </g>

      {/* Orb nodes */}
      {orbs.map((orb, i) => {
        const rad = ((orb.angle - 90) * Math.PI) / 180
        const ox = cx + (R_OUTER + size * 0.115) * Math.cos(rad)
        const oy = cy + (R_OUTER + size * 0.115) * Math.sin(rad)
        const or = size * 0.052
        return (
          <g key={i}>
            <line x1={cx + (R_OUTER - 2) * Math.cos(rad)} y1={cy + (R_OUTER - 2) * Math.sin(rad)}
              x2={cx + (R_OUTER + size * 0.065) * Math.cos(rad)} y2={cy + (R_OUTER + size * 0.065) * Math.sin(rad)}
              stroke="var(--border-hi)" strokeWidth="0.8" />
            <circle cx={ox} cy={oy} r={or} fill="var(--bg-1)" stroke="var(--border-hi)" strokeWidth="1" />
            <g style={{ transformOrigin: `${ox}px ${oy}px`, animation: `spin-cw ${10 + i * 3}s linear infinite` }}>
              <ellipse cx={ox} cy={oy} rx={or * 0.82} ry={or * 0.32} fill="none" stroke="var(--ink)" strokeWidth="0.8" />
              <ellipse cx={ox} cy={oy} rx={or * 0.32} ry={or * 0.82} fill="none" stroke="var(--ink)" strokeWidth="0.8" />
              <circle cx={ox} cy={oy} r={or * 0.18} fill="var(--ink)" opacity="0.35" />
            </g>
            <text x={ox} y={oy + or + size * 0.06} textAnchor="middle"
              fontSize={size * 0.034} fill="var(--ink-3)" fontFamily="monospace" letterSpacing="0.08em">
              {orb.label}
            </text>
          </g>
        )
      })}

      {/* Core */}
      <circle cx={cx} cy={cy} r={R_CORE} fill="var(--bg)" stroke="var(--border)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={R_CORE * 0.72} fill="none" stroke="var(--border-hi)" strokeWidth="0.7" strokeDasharray="2 3" />
      <line x1={cx - R_CORE * 0.55} y1={cy} x2={cx + R_CORE * 0.55} y2={cy} stroke="var(--border-hi)" strokeWidth="0.8" />
      <line x1={cx} y1={cy - R_CORE * 0.55} x2={cx} y2={cy + R_CORE * 0.55} stroke="var(--border-hi)" strokeWidth="0.8" />

      {/* Reading */}
      {pct != null ? (
        <>
          <text x={cx} y={cy - size * 0.018} textAnchor="middle" dominantBaseline="auto"
            fontSize={size * 0.1} fontWeight="900" fontFamily="monospace" fill={color} letterSpacing="-0.02em">{pct}</text>
          <text x={cx} y={cy + size * 0.044} textAnchor="middle"
            fontSize={size * 0.033} fontFamily="monospace" fill="var(--ink-3)" letterSpacing="0.1em">% THREAT</text>
        </>
      ) : (
        <>
          <text x={cx} y={cy - size * 0.018} textAnchor="middle" dominantBaseline="auto"
            fontSize={size * 0.044} fontWeight="700" fontFamily="monospace" fill="var(--ink-4)" letterSpacing="0.04em">IDLE</text>
          <text x={cx} y={cy + size * 0.04} textAnchor="middle"
            fontSize={size * 0.03} fontFamily="monospace" fill="var(--ink-4)" letterSpacing="0.08em">STANDBY</text>
        </>
      )}

      <text x={cx} y={cy + R_OUTER + size * 0.17} textAnchor="middle"
        fontSize={size * 0.033} fontFamily="monospace" fill="var(--ink-4)" letterSpacing="0.14em">{label}</text>
    </svg>
  )
}

/* ─────────────────────────────────────────────────
   HUD VARIANT 2 — Radar sweep (hexagonal)
───────────────────────────────────────────────── */
function RadarHud({ value, size, label, isScanning }: { value: number | null; size: number; label: string; isScanning: boolean }) {
  const cx = size / 2, cy = size / 2
  const R = size * 0.42
  const pct = value != null ? Math.round(value * 100) : null
  const color = threatColor(value)

  // Hexagon points
  const hexPoints = (r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (i * 60 - 30) * Math.PI / 180
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
    })

  const rings = [1, 0.72, 0.5, 0.28].map(f => hexPoints(R * f))

  // Blip dots proportional to threat
  const blips = value != null
    ? Array.from({ length: Math.floor(value * 8) }, (_, i) => {
        const a = (i * 47.3 + 12) * Math.PI / 180
        const r = R * (0.25 + (i % 3) * 0.22)
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
      })
    : []

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Hex rings */}
      {rings.map((pts, ri) => (
        <polygon key={ri} points={pts.map(p => p.join(',')).join(' ')}
          fill="none" stroke="var(--border)" strokeWidth={ri === 0 ? '1.2' : '0.7'}
          opacity={1 - ri * 0.15} />
      ))}
      {/* Spokes */}
      {hexPoints(R).map(([x, y], i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth="0.7" opacity="0.6" />
      ))}

      {/* Threat fill polygon */}
      {pct != null && pct > 0 && (() => {
        const f = pct / 100
        const pts = hexPoints(R * Math.min(f + 0.05, 0.95))
        return <polygon points={pts.map(p => p.join(',')).join(' ')}
          fill={color} opacity="0.08" stroke={color} strokeWidth="1.5" strokeOpacity="0.5" />
      })()}

      {/* Sweep */}
      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: `hud-scan ${isScanning ? '1.4s' : '8s'} linear infinite` }}>
        <line x1={cx} y1={cy} x2={cx + R} y2={cy} stroke="var(--ink-3)" strokeWidth="1" opacity="0.4" />
        <path d={`M ${cx} ${cy} L ${cx + R * 0.98} ${cy - R * 0.22} A ${R} ${R} 0 0 0 ${cx + R} ${cy} Z`}
          fill="var(--ink)" opacity="0.05" />
      </g>

      {/* Blip dots */}
      {blips.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={2.5} fill={color} opacity={0.6 + (i % 3) * 0.15} />
      ))}

      {/* Center */}
      <circle cx={cx} cy={cy} r={size * 0.08} fill="var(--bg)" stroke="var(--border)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={3} fill={pct != null && pct > 0 ? color : 'var(--border-hi)'} />

      {/* Reading */}
      {pct != null ? (
        <text x={cx} y={cy + size * 0.5} textAnchor="middle"
          fontSize={size * 0.07} fontWeight="900" fontFamily="monospace" fill={color}>{pct}%</text>
      ) : (
        <text x={cx} y={cy + size * 0.5} textAnchor="middle"
          fontSize={size * 0.044} fontFamily="monospace" fill="var(--ink-4)">RADAR</text>
      )}
      <text x={cx} y={cy + size * 0.62} textAnchor="middle"
        fontSize={size * 0.033} fontFamily="monospace" fill="var(--ink-4)" letterSpacing="0.12em">{label}</text>
    </svg>
  )
}

/* ─────────────────────────────────────────────────
   HUD VARIANT 3 — Crosshair / targeting reticle
───────────────────────────────────────────────── */
function CrosshairHud({ value, size, label }: { value: number | null; size: number; label: string }) {
  const cx = size / 2, cy = size / 2
  const R = size * 0.4
  const pct = value != null ? Math.round(value * 100) : null
  const color = threatColor(value)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Outer circle (slow pulse) */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border-hi)" strokeWidth="1"
        style={{ animation: 'spin-cw 30s linear infinite' }} />
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border)" strokeWidth="0.6" strokeDasharray="6 18" />

      {/* Cross arms */}
      {[[-1,0],[1,0],[0,-1],[0,1]].map(([dx, dy], i) => (
        <line key={i}
          x1={cx + dx * (size * 0.1)} y1={cy + dy * (size * 0.1)}
          x2={cx + dx * (R - size * 0.02)} y2={cy + dy * (R - size * 0.02)}
          stroke="var(--border-hi)" strokeWidth="1" />
      ))}

      {/* Corner brackets */}
      {[[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx, sy], i) => {
        const bx = cx + sx * R * 0.65, by = cy + sy * R * 0.65
        const len = size * 0.07
        return (
          <g key={i}>
            <line x1={bx} y1={by} x2={bx + sx * len} y2={by} stroke="var(--ink-2)" strokeWidth="1.5" />
            <line x1={bx} y1={by} x2={bx} y2={by + sy * len} stroke="var(--ink-2)" strokeWidth="1.5" />
          </g>
        )
      })}

      {/* Threat arc fill */}
      {pct != null && pct > 0 && (() => {
        const end = 10 + (pct / 100) * 340
        const toRad = (a: number) => ((a - 90) * Math.PI) / 180
        const s = toRad(10), e = toRad(end)
        const x1 = cx + (R - 6) * Math.cos(s), y1 = cy + (R - 6) * Math.sin(s)
        const x2 = cx + (R - 6) * Math.cos(e), y2 = cy + (R - 6) * Math.sin(e)
        return <path d={`M ${x1} ${y1} A ${R - 6} ${R - 6} 0 ${end - 10 > 180 ? 1 : 0} 1 ${x2} ${y2}`}
          fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${color}88)` }} />
      })()}

      {/* Target ring (rotating CCW) */}
      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'spin-ccw 12s linear infinite' }}>
        <circle cx={cx} cy={cy} r={R * 0.55} fill="none" stroke="var(--border)" strokeWidth="0.8" strokeDasharray="2 8" />
      </g>

      {/* Inner dot */}
      <circle cx={cx} cy={cy} r={5} fill={pct != null && pct > 0 ? color : 'var(--border-hi)'} />
      <circle cx={cx} cy={cy} r={10} fill="none" stroke={pct != null && pct > 0 ? color : 'var(--border)'} strokeWidth="0.8" opacity="0.5" />

      {/* Reading */}
      {pct != null ? (
        <text x={cx} y={cy + size * 0.28} textAnchor="middle"
          fontSize={size * 0.08} fontWeight="900" fontFamily="monospace" fill={color}>{pct}%</text>
      ) : (
        <text x={cx} y={cy + size * 0.28} textAnchor="middle"
          fontSize={size * 0.042} fontFamily="monospace" fill="var(--ink-4)">TARGET</text>
      )}
      <text x={cx} y={cy + size * 0.42} textAnchor="middle"
        fontSize={size * 0.033} fontFamily="monospace" fill="var(--ink-4)" letterSpacing="0.12em">{label}</text>

      {/* Tick labels at compass points */}
      {[{a:0,t:'N'},{a:90,t:'E'},{a:180,t:'S'},{a:270,t:'W'}].map(({a,t}) => {
        const rad = ((a - 90) * Math.PI) / 180
        const tx = cx + (R + 12) * Math.cos(rad), ty = cy + (R + 12) * Math.sin(rad)
        return <text key={a} x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.034} fontFamily="monospace" fill="var(--ink-4)">{t}</text>
      })}
    </svg>
  )
}

/* ─────────────────────────────────────────────────
   HUD VARIANT 4 — Arc gauge (semicircle meter)
───────────────────────────────────────────────── */
function ArcHud({ value, size, label }: { value: number | null; size: number; label: string }) {
  const cx = size / 2, cy = size * 0.62
  const R = size * 0.42
  const pct = value != null ? Math.round(value * 100) : null
  const color = threatColor(value)

  // Arc spans from 210° to 330° (150° sweep)
  const START = 210, SWEEP = 180
  const toRad = (a: number) => (a * Math.PI) / 180
  const arcX = (r: number, a: number) => cx + r * Math.cos(toRad(a))
  const arcY = (r: number, a: number) => cy + r * Math.sin(toRad(a))

  const filled = pct != null ? (pct / 100) * SWEEP : 0

  const bgPath = `M ${arcX(R, START)} ${arcY(R, START)} A ${R} ${R} 0 1 1 ${arcX(R, START + SWEEP)} ${arcY(R, START + SWEEP)}`
  const fillEnd = START + filled
  const fillPath = pct != null && pct > 0
    ? `M ${arcX(R, START)} ${arcY(R, START)} A ${R} ${R} 0 ${filled > 180 ? 1 : 0} 1 ${arcX(R, fillEnd)} ${arcY(R, fillEnd)}`
    : null

  // Tick marks
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const a = START + (i / 10) * SWEEP
    const isLit = pct != null && i <= Math.floor(pct / 10)
    return { a, isLit, isMajor: i % 5 === 0 }
  })

  // Needle angle
  const needleAngle = START + (pct ?? 0) / 100 * SWEEP

  return (
    <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`} style={{ overflow: 'visible' }}>
      {/* Background arc */}
      <path d={bgPath} fill="none" stroke="var(--border)" strokeWidth="6" strokeLinecap="round" />
      {/* Fill arc */}
      {fillPath && <path d={fillPath} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}66)` }} />}

      {/* Tick marks */}
      {ticks.map((t, i) => (
        <line key={i}
          x1={arcX(R - (t.isMajor ? 12 : 7), t.a)} y1={arcY(R - (t.isMajor ? 12 : 7), t.a)}
          x2={arcX(R + 4, t.a)} y2={arcY(R + 4, t.a)}
          stroke={t.isLit ? color : 'var(--border-hi)'}
          strokeWidth={t.isMajor ? 1.5 : 0.9} />
      ))}

      {/* Needle */}
      {pct != null && (
        <g style={{ transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${needleAngle - 270}deg)`, transition: 'transform 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - R + 8} stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={5} fill="var(--ink)" />
        </g>
      )}

      {/* Labels */}
      {['0', '25', '50', '75', '100'].map((t, i) => {
        const a = START + (i / 4) * SWEEP
        return <text key={t} x={arcX(R + 18, a)} y={arcY(R + 18, a)} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.032} fontFamily="monospace" fill="var(--ink-4)">{t}</text>
      })}

      {/* Central reading */}
      {pct != null ? (
        <text x={cx} y={cy - size * 0.04} textAnchor="middle"
          fontSize={size * 0.1} fontWeight="900" fontFamily="monospace" fill={color}>{pct}</text>
      ) : (
        <text x={cx} y={cy - size * 0.04} textAnchor="middle"
          fontSize={size * 0.05} fontFamily="monospace" fill="var(--ink-4)">—</text>
      )}
      <text x={cx} y={cy + size * 0.06} textAnchor="middle"
        fontSize={size * 0.034} fontFamily="monospace" fill="var(--ink-4)" letterSpacing="0.1em">{label}</text>
    </svg>
  )
}
