import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { UploadCloud, FileAudio, X, AlertCircle, Play, Pause, Clock, HardDrive, CheckCircle2 } from 'lucide-react'

const SUPPORTED_TYPES = ['audio/wav','audio/wave','audio/x-wav','audio/mpeg','audio/mp3','audio/flac','audio/x-flac','audio/mp4','audio/m4a','audio/x-m4a','audio/ogg','audio/vorbis']
const SUPPORTED_EXTENSIONS = ['.wav', '.mp3', '.flac', '.m4a', '.ogg']
const MAX_MB = 50

interface AudioUploaderProps { file: File | null; onFileChange: (f: File | null) => void }

function formatBytes(b: number) { if (b < 1024) return `${b} B`; if (b < 1048576) return `${(b/1024).toFixed(1)} KB`; return `${(b/1048576).toFixed(2)} MB` }
function formatDuration(s: number) { const m = Math.floor(s/60); const ss = Math.floor(s%60); return `${m}:${ss.toString().padStart(2,'0')}s` }
function isValidAudio(f: File) { const ext = '.'+(f.name.split('.').pop()??'').toLowerCase(); return SUPPORTED_TYPES.includes(f.type) || SUPPORTED_EXTENSIONS.includes(ext) }

export function AudioUploader({ file, onFileChange }: AudioUploaderProps) {
  const [dragging, setDragging]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [duration, setDuration]   = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const audioRef  = useRef<HTMLAudioElement | null>(null)
  const audioUrl  = useMemo(() => file ? URL.createObjectURL(file) : null, [file])

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])
  useEffect(() => {
    if (!audioUrl) return
    const a = new Audio(audioUrl)
    const fn = () => { if (!isNaN(a.duration) && isFinite(a.duration)) setDuration(a.duration) }
    a.addEventListener('loadedmetadata', fn)
    return () => a.removeEventListener('loadedmetadata', fn)
  }, [audioUrl])

  const handleFile = useCallback((f: File | null) => {
    setError(null)
    if (!f) { onFileChange(null); return }
    if (!isValidAudio(f)) { setError(`Unsupported format. Supported: ${SUPPORTED_EXTENSIONS.join(', ').toUpperCase()}`); return }
    if (f.size > MAX_MB * 1048576) { setError(`Too large (${formatBytes(f.size)}). Max ${MAX_MB} MB.`); return }
    onFileChange(f)
  }, [onFileChange])

  const handleClear = () => {
    setError(null); onFileChange(null); setIsPlaying(false)
    if (audioRef.current) audioRef.current.pause()
    if (inputRef.current) inputRef.current.value = ''
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false) }
    else { audioRef.current.play(); setIsPlaying(true) }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!file ? (
        // ── Drop zone ──
        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 20,
            background: dragging ? 'var(--bg-2)' : 'var(--bg)',
            transition: 'background 0.12s',
          }}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={e => { e.preventDefault(); setDragging(false) }}
          onClick={() => inputRef.current?.click()}
        >
          <div style={{
            width: '100%', flex: 1,
            border: `1.5px dashed ${dragging ? 'var(--border-hi)' : 'var(--border)'}`,
            borderRadius: 8,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: 24, minHeight: 140,
            transition: 'border-color 0.12s',
          }}>
            <UploadCloud className="w-8 h-8" style={{ color: dragging ? 'var(--ink)' : 'var(--ink-4)', transition: 'color 0.12s' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>Drag &amp; Drop</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>or click to browse</div>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
              {SUPPORTED_EXTENSIONS.map(ext => (
                <span key={ext} className="badge badge-muted mono" style={{ fontSize: 9 }}>{ext.toUpperCase()}</span>
              ))}
            </div>
          </div>
          <input ref={inputRef} type="file" accept={SUPPORTED_EXTENSIONS.join(',')} style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0] ?? null)} />
        </div>
      ) : (
        // ── File selected ──
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 12, background: 'var(--bg-1)' }}>
          {/* File info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, border: '1px solid var(--border)',
              borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg)', flexShrink: 0,
            }}>
              <FileAudio className="w-4 h-4" style={{ color: 'var(--ink-3)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--ok)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--ink-3)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><HardDrive className="w-3 h-3" /> {formatBytes(file.size)}</span>
                {duration != null && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }} className="mono"><Clock className="w-3 h-3" /> {formatDuration(duration)}</span>}
              </div>
            </div>
            <button onClick={handleClear} style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 4,
              padding: '3px 8px', fontSize: 11, color: 'var(--ink-3)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, transition: 'color 0.12s, border-color 0.12s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          </div>

          {/* Playback */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 5,
            background: 'var(--bg)',
          }}>
            <button onClick={togglePlay} style={{
              width: 28, height: 28, borderRadius: 4,
              border: '1px solid var(--border)',
              background: isPlaying ? 'var(--ink)' : 'transparent',
              color: isPlaying ? 'var(--bg)' : 'var(--ink-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.12s', flexShrink: 0,
            }}>
              {isPlaying
                ? <Pause className="w-3 h-3" style={{ fill: 'currentColor' }} />
                : <Play className="w-3 h-3" style={{ fill: 'currentColor', marginLeft: 1 }} />
              }
            </button>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.5, height: 20, overflow: 'hidden' }}>
              {Array.from({ length: 52 }, (_, i) => (
                <div key={i} style={{
                  width: 2, flexShrink: 0,
                  height: `${Math.max(20, Math.min(85, 35 + Math.sin(i * 0.7) * 28 + Math.sin(i * 1.5) * 12))}%`,
                  background: 'var(--border-hi)', borderRadius: 1,
                  opacity: isPlaying ? 1 : 0.5, transition: 'opacity 0.2s',
                }} />
              ))}
            </div>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', flexShrink: 0 }}>
              {duration != null ? formatDuration(duration) : '—'}
            </span>
          </div>

          {audioUrl && (
            <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} onError={() => setIsPlaying(false)} style={{ display: 'none' }} />
          )}

          <div style={{ fontSize: 10, color: 'var(--ink-4)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ok)', display: 'inline-block' }} />
            Ready for model inference
          </div>
        </div>
      )}

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 14px', borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--danger)',
          background: 'color-mix(in srgb, var(--danger) 5%, var(--bg-1))',
        }}>
          <AlertCircle className="w-3.5 h-3.5" style={{ flexShrink: 0 }} /> {error}
        </div>
      )}
    </div>
  )
}
