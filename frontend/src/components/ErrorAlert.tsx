import { AlertCircle, X } from 'lucide-react'

interface ErrorAlertProps {
  message: string
  onDismiss?: () => void
}

export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div
      className="flex items-start gap-3.5 p-4 rounded-xl border animate-slide-up shadow-md"
      style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(37, 60, 109, 0.8) 100%)',
        borderColor: 'rgba(239, 68, 68, 0.5)',
        color: '#fca5a5',
      }}
      id="error-alert"
      role="alert"
    >
      <div className="p-1 rounded-lg bg-[rgba(239,68,68,0.2)] text-[#ef4444] flex-shrink-0 mt-0.5">
        <AlertCircle className="w-4 h-4" />
      </div>

      <div className="flex-1 text-xs sm:text-sm font-medium leading-relaxed">
        {message}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-[#9cb1d4] hover:text-white hover:bg-[rgba(239,68,68,0.2)] transition-colors cursor-pointer"
          title="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
