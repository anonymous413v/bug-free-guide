import { AlertCircle, X } from 'lucide-react'

interface ErrorAlertProps {
  message: string
  onDismiss?: () => void
}

export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '10px 14px',
      border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
      borderRadius: 6,
      background: 'color-mix(in srgb, var(--danger) 6%, transparent)',
      fontSize: 11, color: 'var(--danger)',
    }}>
      <AlertCircle className="w-3.5 h-3.5" style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ flex: 1, lineHeight: 1.5 }}>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', opacity: 0.7, padding: 0 }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
