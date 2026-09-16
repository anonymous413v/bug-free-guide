import { Shield, ShieldCheck, ShieldAlert, ShieldX, Cpu } from 'lucide-react'
import type { HealthResponse } from '../api/client'

interface HeaderProps {
  health: HealthResponse | null
  healthLoading: boolean
  healthError: string | null
}

export function Header({ health, healthLoading, healthError }: HeaderProps) {
  const getStatusBadge = () => {
    if (healthLoading) {
      return {
        bg: 'rgba(242, 132, 47, 0.12)',
        border: 'rgba(242, 132, 47, 0.35)',
        text: '#F2842F',
        label: 'Connecting...',
        icon: <ShieldAlert className="w-4 h-4 animate-pulse-slow" />,
        dot: 'bg-[#F2842F]',
      }
    }
    if (healthError || !health) {
      return {
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.35)',
        text: '#ef4444',
        label: 'System Offline',
        icon: <ShieldX className="w-4 h-4" />,
        dot: 'bg-red-500',
      }
    }
    if (health.inference_available) {
      return {
        bg: 'rgba(34, 197, 94, 0.12)',
        border: 'rgba(34, 197, 94, 0.35)',
        text: '#22c55e',
        label: 'Inference Engine Ready',
        icon: <ShieldCheck className="w-4 h-4" />,
        dot: 'bg-emerald-400',
      }
    }
    return {
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.35)',
      text: '#f59e0b',
      label: 'No Active Models',
      icon: <ShieldAlert className="w-4 h-4" />,
      dot: 'bg-amber-400',
    }
  }

  const badge = getStatusBadge()

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md transition-all"
      style={{
        background: 'linear-gradient(180deg, rgba(26, 42, 74, 0.95) 0%, rgba(17, 26, 46, 0.92) 100%)',
        borderColor: '#455B8A',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Branding & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div
            className="relative flex items-center justify-center w-11 h-11 rounded-xl shadow-lg flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #F2842F 0%, #253C6D 100%)',
              border: '1px solid rgba(242, 132, 47, 0.5)',
            }}
          >
            <Shield className="w-6 h-6 text-white drop-shadow-md" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#F2842F] animate-ping" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-wider text-white">
                VOICE<span style={{ color: '#F2842F' }}>GUARD</span>
              </span>
              <span
                className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border"
                style={{
                  background: 'rgba(69, 91, 138, 0.3)',
                  borderColor: '#455B8A',
                  color: '#9cb1d4',
                }}
              >
                Cyber Defense
              </span>
            </div>
            <p className="text-xs font-medium tracking-tight" style={{ color: '#9cb1d4' }}>
              AI-Powered Voice Impersonation Detection
            </p>
          </div>
        </div>

        {/* Right: Operational Status HUD */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {/* Models count pill */}
          {health && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
              style={{
                background: 'rgba(48, 73, 125, 0.35)',
                borderColor: '#455B8A',
                color: '#9cb1d4',
              }}
            >
              <Cpu className="w-3.5 h-3.5 text-[#F2842F]" />
              <span>
                Models Ready:{' '}
                <strong className="text-white font-mono">
                  {health.models_ready}
                </strong>
                <span className="text-[#62749a]">/{health.models_total}</span>
              </span>
            </div>
          )}

          {/* Engine Health Status Indicator */}
          <div
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-semibold tracking-wide shadow-sm"
            style={{
              background: badge.bg,
              borderColor: badge.border,
              color: badge.text,
            }}
          >
            <span className="flex items-center justify-center">{badge.icon}</span>
            <span>{badge.label}</span>
            <span className={`w-2 h-2 rounded-full ${badge.dot} animate-pulse ml-1`} />
          </div>
        </div>
      </div>
    </header>
  )
}
