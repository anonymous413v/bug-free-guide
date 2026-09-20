import type { ModelCard } from '../api/client'
import { ModelCardComponent } from './ModelCard'

interface ModelSelectorProps {
  models: ModelCard[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClearAll: () => void
}

export function ModelSelector({ models, selectedIds, onToggle, onSelectAll, onClearAll }: ModelSelectorProps) {
  const availableModels = models.filter((m) => m.availability === 'available' || m.availability === 'ready')
  const allSelected = availableModels.length > 0 && availableModels.every((m) => selectedIds.includes(m.id))

  if (models.length === 0) {
    return (
      <div style={{
        padding: 32, textAlign: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="label-xs" style={{ marginBottom: 8 }}>Detection Model Fleet</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Querying model registry…</div>
      </div>
    )
  }

  return (
    <div>
      {/* Grid toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-1)',
      }}>
        <div className="label-xs">
          Detection Model Fleet
          <span style={{ marginLeft: 8, color: 'var(--text-3)' }}>
            {models.length} Architectures
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn-ghost"
            onClick={onSelectAll}
            disabled={allSelected}
            style={{ padding: '4px 10px', fontSize: 11 }}
          >
            Select All ({availableModels.length})
          </button>
          <button
            className="btn-ghost"
            onClick={onClearAll}
            disabled={selectedIds.length === 0}
            style={{ padding: '4px 10px', fontSize: 11 }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Model grid */}
      <div className="models-grid">
        {models.map((model) => (
          <ModelCardComponent
            key={model.id}
            model={model}
            selected={selectedIds.includes(model.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}
