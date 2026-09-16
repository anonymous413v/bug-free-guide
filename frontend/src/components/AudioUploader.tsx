import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import {
  UploadCloud,
  FileAudio,
  X,
  AlertCircle,
  Play,
  Pause,
  Clock,
  HardDrive,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react'

const SUPPORTED_TYPES = [
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/flac',
  'audio/x-flac',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/vorbis',
]
const SUPPORTED_EXTENSIONS = ['.wav', '.mp3', '.flac', '.m4a', '.ogg']
const MAX_MB = 50

interface AudioUploaderProps {
  file: File | null
  onFileChange: (file: File | null) => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}s`
}

function isValidAudio(file: File): boolean {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase()
  return SUPPORTED_TYPES.includes(file.type) || SUPPORTED_EXTENSIONS.includes(ext)
}

export function AudioUploader({ file, onFileChange }: AudioUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const audioUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  useEffect(() => {
    if (!audioUrl) {
      return
    }
    const tempAudio = new Audio(audioUrl)
    const onLoadedMetadata = () => {
      if (!isNaN(tempAudio.duration) && isFinite(tempAudio.duration)) {
        setDuration(tempAudio.duration)
      }
    }
    tempAudio.addEventListener('loadedmetadata', onLoadedMetadata)
    return () => {
      tempAudio.removeEventListener('loadedmetadata', onLoadedMetadata)
    }
  }, [audioUrl])

  const handleFile = useCallback(
    (f: File | null) => {
      setError(null)
      if (!f) {
        onFileChange(null)
        return
      }
      if (!isValidAudio(f)) {
        setError(
          `Unsupported audio format. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ').toUpperCase()}`
        )
        return
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        setError(`File exceeds maximum size limit (${formatBytes(f.size)}). Max allowed is ${MAX_MB} MB.`)
        return
      }
      onFileChange(f)
    },
    [onFileChange]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const dropped = e.dataTransfer.files[0]
      if (dropped) handleFile(dropped)
    },
    [handleFile]
  )

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }

  const handleClear = () => {
    setError(null)
    onFileChange(null)
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  const togglePlayback = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  return (
    <div className="vg-card p-6" id="upload-section">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: 'rgba(242, 132, 47, 0.15)', border: '1px solid rgba(242, 132, 47, 0.3)' }}
          >
            <FileAudio className="w-4 h-4 text-[#F2842F]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Audio Intelligence Input</h2>
            <p className="text-xs text-[#9cb1d4]">Upload suspect voice recording for multi-model acoustic analysis</p>
          </div>
        </div>

        {file && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md text-[#ef4444] hover:bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)] transition-all cursor-pointer"
            id="clear-audio-btn"
            title="Remove selected audio file"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear File</span>
          </button>
        )}
      </div>

      {!file ? (
        /* Drag & Drop Upload Zone */
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className="relative border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 group"
          style={{
            borderColor: dragging ? '#F2842F' : '#455B8A',
            background: dragging
              ? 'rgba(242, 132, 47, 0.12)'
              : 'linear-gradient(180deg, rgba(48, 73, 125, 0.25) 0%, rgba(37, 60, 109, 0.3) 100%)',
            boxShadow: dragging ? '0 0 24px rgba(242, 132, 47, 0.2)' : 'none',
          }}
          id="audio-drop-zone"
        >
          <div
            className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
            style={{
              background: dragging ? 'rgba(242, 132, 47, 0.25)' : 'rgba(69, 91, 138, 0.35)',
              border: `1px solid ${dragging ? '#F2842F' : '#455B8A'}`,
            }}
          >
            <UploadCloud
              className="w-7 h-7 transition-colors duration-200"
              style={{ color: dragging ? '#F2842F' : '#9cb1d4' }}
            />
          </div>

          <p className="font-semibold text-sm sm:text-base text-white mb-1.5">
            Drop target audio recording here, or{' '}
            <span className="text-[#F2842F] group-hover:underline inline-flex items-center gap-1">
              browse file
            </span>
          </p>

          <p className="text-xs text-[#9cb1d4] mb-4 max-w-sm mx-auto">
            Supports standard uncompressed or compressed voice samples for deepfake feature extraction.
          </p>

          {/* Formats and constraints pill strip */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto">
            {SUPPORTED_EXTENSIONS.map((ext) => (
              <span
                key={ext}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[rgba(30,48,82,0.8)] border border-[#455B8A] text-[#9cb1d4]"
              >
                {ext.toUpperCase()}
              </span>
            ))}
            <span className="text-[11px] px-2 py-0.5 rounded bg-[rgba(242,132,47,0.1)] border border-[rgba(242,132,47,0.25)] text-[#F2842F]">
              Max {MAX_MB}MB
            </span>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                inputRef.current?.click()
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#30497D] hover:bg-[#455B8A] border border-[#455B8A] transition-all cursor-pointer shadow-sm"
              id="browse-file-btn"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#F2842F]" />
              Browse Local Files
            </button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={SUPPORTED_EXTENSIONS.join(',')}
            className="hidden"
            id="audio-file-input"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </div>
      ) : (
        /* Selected Audio Intelligence Card */
        <div
          className="rounded-xl border p-4 sm:p-5 animate-slide-up"
          style={{
            background: 'linear-gradient(135deg, rgba(48, 73, 125, 0.45) 0%, rgba(37, 60, 109, 0.6) 100%)',
            borderColor: '#455B8A',
          }}
          id="audio-file-info"
        >
          <div className="flex items-start gap-3.5">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlayback}
              className="flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 cursor-pointer shadow-md transition-all hover:scale-105 active:scale-95"
              style={{
                background: isPlaying
                  ? 'linear-gradient(135deg, #F2842F 0%, #d96f1a 100%)'
                  : 'rgba(242, 132, 47, 0.2)',
                border: '1px solid rgba(242, 132, 47, 0.5)',
                color: isPlaying ? '#ffffff' : '#F2842F',
              }}
              title={isPlaying ? 'Pause playback' : 'Play audio clip'}
              id="toggle-playback-btn"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Audio Metadata */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="font-semibold text-sm text-white truncate" title={file.name}>
                  {file.name}
                </p>
              </div>

              {/* Badges: File Size, Duration, Format */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#9cb1d4] mt-1.5">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-[#455B8A]" />
                  {formatBytes(file.size)}
                </span>
                {duration !== null && (
                  <span className="flex items-center gap-1 font-mono text-[#F2842F]">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(duration)}
                  </span>
                )}
                <span className="uppercase text-[10px] px-1.5 py-0.5 rounded font-mono bg-[#30497D] border border-[#455B8A] text-[#e6edfa]">
                  {file.name.split('.').pop()}
                </span>
              </div>
            </div>

            {/* Clear Button */}
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg text-[#9cb1d4] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors cursor-pointer"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Hidden native audio element for playback */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              onError={() => setIsPlaying(false)}
              className="hidden"
            />
          )}

          {/* Quick Audio Track Timeline Bar */}
          <div className="mt-4 pt-3 border-t border-[rgba(69,91,138,0.4)] flex items-center justify-between text-xs text-[#9cb1d4]">
            <span className="text-[11px] text-[#62749a]">Status: Ready for Model Inference</span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs text-[#F2842F] hover:underline cursor-pointer"
            >
              Replace audio file
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={SUPPORTED_EXTENSIONS.join(',')}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      )}

      {/* Validation Error Message */}
      {error && (
        <div
          className="flex items-start gap-2.5 mt-3.5 p-3 rounded-lg text-xs animate-fade-in"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            borderWidth: '1px',
          }}
          role="alert"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#ef4444]" />
          <div>
            <strong className="font-semibold block">File Validation Warning</strong>
            {error}
          </div>
        </div>
      )}
    </div>
  )
}
