import {
  Check,
  CheckCircle2,
  Lock,
  Loader2,
  AlertTriangle,
  Cpu,
  Activity,
  Layers,
  Info,
} from 'lucide-react'
import type { ModelCard } from '../api/client'

interface ModelCardComponentProps {
  model: ModelCard
  selected: boolean
  onToggle: (id: string) => void
}

interface StatusConfig {
  label: string
  color: string
  bg: string
  border: string
  icon: React.ReactNode
}

function getStatusConfig(availability: ModelCard['availability']): StatusConfig {
  switch (availability) {
    case 'ready':
      return {
        label: 'Ready',
        color: '#22c55e',
        bg: 'rgba(34, 197, 94, 0.12)',
        border: 'rgba(34, 197, 94, 0.3)',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      }
    case 'available':
      return {
        label: 'Available',
        color: '#22c55e',
        bg: 'rgba(34, 197, 94, 0.12)',
        border: 'rgba(34, 197, 94, 0.3)',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      }
    case 'loading':
      return {
        label: 'Loading',
        color: '#F2842F',
        bg: 'rgba(242, 132, 47, 0.12)',
        border: 'rgba(242, 132, 47, 0.3)',
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      }
    case 'blocked':
      return {
        label: 'Blocked',
        color: '#f43f5e',
        bg: 'rgba(244, 63, 94, 0.12)',
        border: 'rgba(244, 63, 94, 0.3)',
        icon: <Lock className="w-3.5 h-3.5" />,
      }
    case 'error':
    case 'missing':
    default:
      return {
        label: 'Error',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.3)',
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
      }
  }
}

export function ModelCardComponent({ model, selected, onToggle }: ModelCardComponentProps) {
  const isSelectable = model.availability === 'available' || model.availability === 'ready'
  const status = getStatusConfig(model.availability)

  return (
    <div
      onClick={() => isSelectable && onToggle(model.id)}
      className={`relative rounded-xl border p-4 transition-all duration-200 select-none flex flex-col justify-between ${
        isSelectable
          ? 'cursor-pointer hover:border-[rgba(242,132,47,0.5)] hover:-translate-y-0.5'
          : 'cursor-not-allowed opacity-75'
      }`}
      style={{
        background: selected
          ? 'linear-gradient(135deg, rgba(37, 60, 109, 0.9) 0%, rgba(48, 73, 125, 0.75) 100%)'
          : isSelectable
          ? 'rgba(30, 48, 82, 0.65)'
          : 'rgba(22, 33, 56, 0.5)',
        borderColor: selected
          ? '#F2842F'
          : isSelectable
          ? '#455B8A'
          : 'rgba(69, 91, 138, 0.3)',
        boxShadow: selected
          ? '0 0 16px -2px rgba(242, 132, 47, 0.25), inset 0 0 0 1px #F2842F'
          : '0 4px 12px rgba(0, 0, 0, 0.2)',
      }}
      id={`model-card-${model.id}`}
    >
      {/* Card Header: Checkbox / Status Pill */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            {/* Custom Checkbox */}
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${
                !isSelectable
                  ? 'bg-[rgba(69,91,138,0.2)] border border-[rgba(69,91,138,0.4)] text-transparent'
                  : selected
                  ? 'bg-[#F2842F] text-white shadow-sm'
                  : 'bg-[rgba(30,48,82,0.8)] border border-[#455B8A] text-transparent hover:border-[#F2842F]'
              }`}
            >
              {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>

            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">{model.name}</h3>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0"
            style={{
              color: status.color,
              background: status.bg,
              borderColor: status.border,
            }}
          >
            {status.icon}
            <span>{status.label}</span>
          </span>
        </div>

        {/* Model Description */}
        <p className="text-xs text-[#9cb1d4] leading-relaxed mb-3">
          {model.description}
        </p>
      </div>

      {/* Model Specs & Blocked Reason Footer */}
      <div className="pt-2.5 border-t border-[rgba(69,91,138,0.3)] mt-auto">
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#9cb1d4]">
          {model.params && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[rgba(48,73,125,0.6)] border border-[#455B8A]">
              <Cpu className="w-3 h-3 text-[#F2842F]" />
              {model.params}
            </span>
          )}
          {model.sample_rate && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[rgba(48,73,125,0.6)] border border-[#455B8A]">
              <Activity className="w-3 h-3 text-[#9cb1d4]" />
              {(model.sample_rate / 1000).toFixed(1)} kHz
            </span>
          )}
          {model.checkpoint_size_mb && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[rgba(48,73,125,0.6)] border border-[#455B8A]">
              <Layers className="w-3 h-3 text-[#9cb1d4]" />
              {model.checkpoint_size_mb} MB
            </span>
          )}
        </div>

        {/* Honest Blocked / Availability Reason Notice */}
        {!isSelectable && model.availability_reason && (
          <div className="mt-2 text-[11px] text-[#f43f5e] bg-[rgba(244,63,94,0.08)] border border-[rgba(244,63,94,0.2)] rounded-md px-2.5 py-1.5 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">
              {model.availability_reason}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
