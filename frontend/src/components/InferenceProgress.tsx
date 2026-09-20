import { Loader2 } from 'lucide-react'

interface Props { isRunning: boolean; runningModels: string[] }

export function InferenceProgress({ isRunning, runningModels }: Props) {
  if (!isRunning) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 14px', border: '1px solid var(--border)', borderRadius: 5,
      background: 'var(--bg-1)', fontSize: 11, color: 'var(--ink-3)',
    }}>
      <Loader2 className="w-3.5 h-3.5 spin" style={{ color: 'var(--ink)', flexShrink: 0 }} />
      <span>Running <span className="mono" style={{ color: 'var(--ink)', fontWeight: 700 }}>{runningModels.length}</span> model{runningModels.length !== 1 ? 's' : ''}…</span>
      <div style={{ flex: 1, height: 2, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: 'var(--ink)', borderRadius: 2, width: '35%',
          animation: 'scanBar 1.4s ease-in-out infinite',
        }} />
      </div>
      <style>{`@keyframes scanBar { 0%{transform:translateX(-200%)} 100%{transform:translateX(450%)} }`}</style>
    </div>
  )
}
