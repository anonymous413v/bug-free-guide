import { Play, Zap, Loader2, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react'

interface EvaluationControlsProps {
  hasFile: boolean
  selectedCount: number
  isRunning: boolean
  hasResults: boolean
  onRunSelected: () => void
  onRunAuto: () => void
  onReset: () => void
}

export function EvaluationControls({
  hasFile,
  selectedCount,
  isRunning,
  hasResults,
  onRunSelected,
  onRunAuto,
  onReset,
}: EvaluationControlsProps) {
  const canRunSelected = hasFile && selectedCount > 0 && !isRunning
  const canRunAuto = hasFile && !isRunning

  return (
    <div
      className="vg-card p-5"
      id="evaluation-controls-card"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Action Buttons Group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Primary Action: Run Selected Models */}
          <button
            type="button"
            onClick={onRunSelected}
            disabled={!canRunSelected}
            className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-md ${
              canRunSelected
                ? 'vg-btn-primary'
                : 'bg-[rgba(48,73,125,0.4)] text-[#62749a] border border-[#455B8A] cursor-not-allowed opacity-60 shadow-none'
            }`}
            id="run-selected-btn"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Play className="w-4 h-4 fill-current text-white" />
            )}
            <span>
              {isRunning
                ? 'Evaluating Audio...'
                : `Run Selected Models${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
            </span>
          </button>

          {/* Secondary Action: Auto / Ensemble Mode */}
          <button
            type="button"
            onClick={onRunAuto}
            disabled={!canRunAuto}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${
              canRunAuto
                ? 'bg-[rgba(242,132,47,0.12)] border-[#F2842F] text-[#F2842F] hover:bg-[#F2842F] hover:text-white shadow-sm hover:shadow-[0_0_15px_rgba(242,132,47,0.3)]'
                : 'bg-[rgba(30,48,82,0.3)] border-[#455B8A] text-[#62749a] cursor-not-allowed opacity-50'
            }`}
            id="run-auto-btn"
            title="Automatically run all ready models and aggregate their risk predictions"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Auto / Ensemble Mode</span>
          </button>

          {/* Reset / New Analysis Button */}
          {hasResults && (
            <button
              type="button"
              onClick={onReset}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold text-[#9cb1d4] hover:text-white bg-[rgba(48,73,125,0.5)] hover:bg-[#455B8A] border border-[#455B8A] transition-all cursor-pointer shadow-sm"
              id="reset-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Analysis</span>
            </button>
          )}
        </div>

        {/* Guidance / Feedback Badges */}
        <div className="flex items-center text-xs text-[#9cb1d4]">
          {!hasFile ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] text-[#f59e0b]">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Upload an audio recording to unlock evaluation</span>
            </div>
          ) : isRunning ? (
            <div className="flex items-center gap-2 text-[#F2842F] font-mono">
              <span className="w-2 h-2 rounded-full bg-[#F2842F] animate-ping" />
              <span>Neural Pipeline Active...</span>
            </div>
          ) : selectedCount === 0 ? (
            <div className="flex items-center gap-1.5 text-[#9cb1d4]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F2842F]" />
              <span>Select models or click Auto Mode</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ready for execution ({selectedCount} queued)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
