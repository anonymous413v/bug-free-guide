import { Layers, CheckSquare, XCircle, ShieldCheck } from 'lucide-react'
import type { ModelCard } from '../api/client'
import { ModelCardComponent } from './ModelCard'

interface ModelSelectorProps {
  models: ModelCard[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClearAll: () => void
}

export function ModelSelector({
  models,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
}: ModelSelectorProps) {
  const availableModels = models.filter(
    (m) => m.availability === 'available' || m.availability === 'ready'
  )
  const availableCount = availableModels.length
  const allAvailableSelected =
    availableCount > 0 && availableModels.every((m) => selectedIds.includes(m.id))

  return (
    <div className="vg-card p-6" id="model-selector">
      {/* Section Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: 'rgba(242, 132, 47, 0.15)', border: '1px solid rgba(242, 132, 47, 0.3)' }}
          >
            <Layers className="w-4 h-4 text-[#F2842F]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Detection Model Fleet</h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[rgba(48,73,125,0.7)] text-[#9cb1d4] border border-[#455B8A]">
                {models.length} Architectures
              </span>
            </div>
            <p className="text-xs text-[#9cb1d4]">
              Select acoustic deepfake detection models or run the automated ensemble engine
            </p>
          </div>
        </div>

        {/* Quick Selection Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={models.length === 0 || availableCount === 0 || allAvailableSelected}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              allAvailableSelected
                ? 'opacity-50 cursor-not-allowed border-[#455B8A] text-[#62749a]'
                : 'border-[#455B8A] bg-[#30497D] text-white hover:border-[#F2842F] hover:text-[#F2842F]'
            }`}
            id="select-all-btn"
          >
            <CheckSquare className="w-3.5 h-3.5 text-[#F2842F]" />
            Select All Available ({availableCount})
          </button>

          <button
            type="button"
            onClick={onClearAll}
            disabled={selectedIds.length === 0}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              selectedIds.length === 0
                ? 'opacity-40 cursor-not-allowed border-[#455B8A] text-[#62749a]'
                : 'border-[#455B8A] bg-[rgba(48,73,125,0.4)] text-[#9cb1d4] hover:text-[#ef4444] hover:border-[rgba(239,68,68,0.4)]'
            }`}
            id="clear-selection-btn"
          >
            <XCircle className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Models Grid: Responsive 2-column or 1-column layout */}
      {models.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed border-[#455B8A] bg-[rgba(26,42,74,0.3)]">
          <Layers className="w-8 h-8 mx-auto mb-2 text-[#455B8A] animate-pulse" />
          <p className="text-sm text-[#9cb1d4]">Querying model registry from backend service...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {models.map((model) => (
            <ModelCardComponent
              key={model.id}
              model={model}
              selected={selectedIds.includes(model.id)}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}

      {/* Model Selection Summary Pill */}
      <div className="mt-4 pt-3 border-t border-[rgba(69,91,138,0.3)] flex flex-wrap items-center justify-between text-xs text-[#9cb1d4] gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#F2842F]" />
          <span>
            Active Selection:{' '}
            <strong className="text-white font-mono">{selectedIds.length}</strong> of{' '}
            <span className="font-mono">{availableCount}</span> ready models
          </span>
        </div>

        <span className="text-[11px] text-[#62749a]">
          Auto Mode automatically selects optimal active models
        </span>
      </div>
    </div>
  )
}
