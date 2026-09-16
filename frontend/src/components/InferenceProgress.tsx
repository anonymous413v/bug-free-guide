import { Loader2, Brain, Activity, ShieldAlert } from 'lucide-react'

interface InferenceProgressProps {
  isRunning: boolean
  runningModels?: string[]
}

export function InferenceProgress({ isRunning, runningModels = [] }: InferenceProgressProps) {
  if (!isRunning) return null

  return (
    <div
      className="vg-card p-6 animate-slide-up relative overflow-hidden"
      style={{
        borderColor: '#F2842F',
        boxShadow: '0 0 24px -2px rgba(242, 132, 47, 0.25)',
      }}
      id="inference-progress"
    >
      {/* Top Banner */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3.5">
          <div
            className="flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(242, 132, 47, 0.25) 0%, rgba(37, 60, 109, 0.8) 100%)',
              border: '1px solid rgba(242, 132, 47, 0.5)',
            }}
          >
            <Brain className="w-6 h-6 text-[#F2842F] animate-pulse-slow" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Acoustic Forensics Pipeline Running
              </h3>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[rgba(242,132,47,0.15)] text-[#F2842F] border border-[rgba(242,132,47,0.3)]">
                Processing
              </span>
            </div>
            <p className="text-xs text-[#9cb1d4] mt-0.5">
              Extracting spectro-temporal features and evaluating deepfake neural probability
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#F2842F] font-mono flex-shrink-0">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </div>

      {/* Cyber Scanning Progress Bar */}
      <div className="w-full h-2.5 rounded-full bg-[#1e3052] overflow-hidden relative border border-[#455B8A]">
        <div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #F2842F, #ff994a, #d96f1a)',
            animation: 'cyberScan 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            width: '45%',
          }}
        />
      </div>

      <style>{`
        @keyframes cyberScan {
          0% { transform: translateX(-100%); width: 30%; }
          50% { transform: translateX(120%); width: 55%; }
          100% { transform: translateX(300%); width: 30%; }
        }
      `}</style>

      {/* Active models tags & CPU notice */}
      <div className="mt-4 pt-3 border-t border-[rgba(69,91,138,0.3)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#F2842F]" />
          <span className="text-[#9cb1d4]">
            Evaluating:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {runningModels.length > 0 ? (
              runningModels.map((m) => (
                <span
                  key={m}
                  className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#30497D] border border-[#455B8A] text-white"
                >
                  {m}
                </span>
              ))
            ) : (
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#30497D] text-[#9cb1d4]">
                Ensemble selection
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#62749a]">
          <ShieldAlert className="w-3.5 h-3.5 text-[#F2842F]" />
          <span>Local CPU inference: 3s – 30s per model</span>
        </div>
      </div>
    </div>
  )
}
