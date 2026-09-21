import { Check, CheckCircle2, Lock, Loader2, AlertTriangle, Cpu, Activity, Layers, Info } from 'lucide-react'
import type { ModelCard } from '../api/client'

interface Props { model: ModelCard; selected: boolean; onToggle: (id: string) => void }

function getStatus(av: ModelCard['availability']) {
  switch (av) {
    case 'ready': case 'available': return { label: 'Ready',   cls: 'badge-ok',   icon: <CheckCircle2 className="w-3 h-3" /> }
    case 'loading':                  return { label: 'Loading', cls: 'badge-warn',  icon: <Loader2 className="w-3 h-3 spin" /> }
    case 'blocked':                  return { label: 'Blocked', cls: 'badge-err',   icon: <Lock className="w-3 h-3" /> }
    default:                         return { label: 'Error',   cls: 'badge-err',   icon: <AlertTriangle className="w-3 h-3" /> }
  }
}

export function ModelCardComponent({ model, selected, onToggle }: Props) {
  const selectable = model.availability === 'available' || model.availability === 'ready'
  const status = getStatus(model.availability)

  return (
    <div
      className={`model-tile${selected ? ' selected' : ''}${!selectable ? ' blocked' : ''}`}
      onClick={() => selectable && onToggle(model.id)}
      id={`model-card-${model.id}`}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 15, height: 15, borderRadius: 3, flexShrink: 0,
            border: `1px solid ${selected ? 'var(--ink)' : 'var(--border-hi)'}`,
            background: selected ? 'var(--ink)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.12s',
          }}>
            {selected && <Check className="w-2.5 h-2.5" style={{ color: 'var(--bg)', strokeWidth: 3 }} />}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{model.name}</span>
        </div>
        <span className={`badge ${status.cls}`} style={{ flexShrink: 0 }}>{status.icon} {status.label}</span>
      </div>

      <p style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5 }}>{model.description}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 'auto' }}>
        {model.params && <span className="badge badge-muted mono" style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Cpu className="w-2.5 h-2.5" /> {model.params}</span>}
        {model.sample_rate && <span className="badge badge-muted mono" style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Activity className="w-2.5 h-2.5" /> {(model.sample_rate/1000).toFixed(1)}kHz</span>}
        {model.checkpoint_size_mb && <span className="badge badge-muted mono" style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Layers className="w-2.5 h-2.5" /> {model.checkpoint_size_mb}MB</span>}
      </div>

      {!selectable && model.availability_reason && (
        <div style={{
          fontSize: 10, color: 'var(--danger)', lineHeight: 1.4,
          padding: '5px 7px', borderRadius: 3,
          border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
          background: 'color-mix(in srgb, var(--danger) 5%, transparent)',
          display: 'flex', alignItems: 'flex-start', gap: 4,
        }}>
          <Info className="w-3 h-3" style={{ flexShrink: 0, marginTop: 1 }} /> {model.availability_reason}
        </div>
      )}
    </div>
  )
}
