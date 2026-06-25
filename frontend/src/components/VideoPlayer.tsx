'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Scissors,
} from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import type { JournalEntry } from '@/types';

interface VideoPlayerProps {
  src: string;                  // HLS .m3u8 or progressive .mp4
  poster?: string;
  markers?: JournalEntry[];
  onTimeUpdate?: (t: number) => void;
  onSeekToMarker?: (entry: JournalEntry) => void;
  onSaveClip?: (range: { start: number; end: number }) => void;
  className?: string;
}

export function VideoPlayer({
  src, poster, markers = [], onTimeUpdate, onSeekToMarker, onSaveClip, className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [trimMode, setTrimMode] = useState(false);
  const [range, setRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [rate, setRate] = useState(1);

  // -- attach source ---------------------------------------------------------
  // For .mp4 → native <video src>. For .m3u8 → native (Safari) or hls.js (others).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let destroyHls: (() => void) | null = null;
    setLoaded(false);

    const isHls = /\.m3u8(\?|$)/i.test(src);

    if (isHls && !video.canPlayType('application/vnd.apple.mpegurl')) {
      // Lazy-load hls.js only when needed → keeps initial bundle small.
      let cancelled = false;
      import('hls.js').then(({ default: Hls }) => {
        if (cancelled || !Hls.isSupported()) {
          video.src = src;
          return;
        }
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(src);
        hls.attachMedia(video);
        destroyHls = () => hls.destroy();
      }).catch(() => {
        if (!cancelled) video.src = src;
      });
      return () => { cancelled = true; destroyHls?.(); };
    }
    video.src = src;
    return () => { destroyHls?.(); };
  }, [src]);

  // -- listeners -------------------------------------------------------------
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      const d = isFinite(v.duration) ? v.duration : 0;
      setDuration(d);
      setLoaded(true);
      setRange({ start: 0, end: d });
    };
    const onTime = () => { setCurrent(v.currentTime); onTimeUpdate?.(v.currentTime); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onCanPlay = () => setLoaded(true);
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, [onTimeUpdate]);

  // -- keyboard shortcuts ----------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ignore when user is typing in an input/textarea/contenteditable
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (v.paused) v.play(); else v.pause();
          break;
        case 'ArrowLeft':
          v.currentTime = Math.max(0, v.currentTime - 5);
          break;
        case 'ArrowRight':
          v.currentTime = Math.min(duration, v.currentTime + 5);
          break;
        case 'j': v.playbackRate = 0.5; setRate(0.5); break;
        case 'l': v.playbackRate = 2;   setRate(2);   break;
        case 'm': v.muted = !v.muted; setMuted(v.muted); break;
        case 'f': toggleFullscreen(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [duration]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => undefined);
    else document.exitFullscreen().catch(() => undefined);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  }, []);

  const onSeek = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = val;
    setCurrent(val);
  };

  const markerPositions = useMemo(
    () => (duration ? markers.map((m) => ({ id: m.id, pct: (m.timestamp_seconds / duration) * 100, m })) : []),
    [markers, duration],
  );

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={cn('relative w-full bg-black rounded-lg overflow-hidden group select-none', className)}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 pointer-events-none">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-accent animate-spin" />
        </div>
      )}
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        controls={false}
        preload="metadata"
        crossOrigin="anonymous"
        className="w-full h-full object-contain bg-black cursor-pointer"
        onClick={togglePlay}
      />

      {/* Controls bar — always visible (better UX than hover-only on touch) */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-100 sm:opacity-90 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity duration-300">
        {/* Timeline */}
        <div className="relative h-6 flex items-center mb-2">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={current}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="timeline w-full"
            aria-label="Seek"
          />
          {markerPositions.map((mp) => (
            <button
              key={mp.id}
              onClick={(e) => { e.stopPropagation(); onSeekToMarker?.(mp.m); onSeek(mp.m.timestamp_seconds); }}
              style={{ left: `${mp.pct}%` }}
              className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-accent shadow-glow hover:scale-150 transition-transform"
              title={`Journal @ ${formatDuration(mp.m.timestamp_seconds)}`}
              aria-label="Jump to journal entry"
            />
          ))}
          {trimMode && duration > 0 && (
            <>
              <TrimHandle
                kind="start"
                duration={duration}
                value={range.start}
                onChange={(t) => setRange((r) => ({ start: Math.min(t, r.end - 0.5), end: r.end }))}
              />
              <TrimHandle
                kind="end"
                duration={duration}
                value={range.end}
                onChange={(t) => setRange((r) => ({ start: r.start, end: Math.max(t, r.start + 0.5) }))}
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-white text-sm">
          <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} className="hover:text-accent">
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={() => { const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); }}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="hover:text-accent"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (videoRef.current) {
                videoRef.current.volume = v;
                videoRef.current.muted = v === 0;
                setMuted(v === 0);
              }
            }}
            className="timeline w-24"
            aria-label="Volume"
          />
          <span className="font-mono text-xs text-white/70">
            {formatDuration(current)} / {formatDuration(duration)}
          </span>
          <span className="font-mono text-xs text-white/50 ml-2">{rate.toFixed(2)}×</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setTrimMode((v) => !v)}
              className={cn('hover:text-accent', trimMode && 'text-accent')}
              aria-label="Toggle clip trimmer"
              title="Clip trimmer"
            >
              <Scissors size={18} />
            </button>
            {trimMode && (
              <button
                onClick={() => onSaveClip?.({ start: range.start, end: range.end })}
                className="px-2 py-1 text-xs rounded bg-accent hover:bg-accent-hover text-white"
              >
                Save {formatDuration(range.end - range.start)}
              </button>
            )}
            <button onClick={toggleFullscreen} aria-label="Fullscreen" className="hover:text-accent">
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrimHandle({
  kind, duration, value, onChange,
}: { kind: 'start' | 'end'; duration: number; value: number; onChange: (t: number) => void; }) {
  return (
    <div
      role="slider"
      aria-label={`Trim ${kind}`}
      aria-valuenow={value}
      style={{ left: `${(value / duration) * 100}%` }}
      className="absolute -translate-x-1/2 top-0 bottom-0 w-1 bg-accent cursor-ew-resize"
      onPointerDown={(e) => {
        const target = e.currentTarget.parentElement!;
        const rect = target.getBoundingClientRect();
        const move = (ev: PointerEvent) => {
          const pct = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
          onChange(pct * duration);
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      }}
    />
  );
}
