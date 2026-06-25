'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Scissors, BookOpen,
} from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import type { JournalEntry } from '@/types';

interface VideoPlayerProps {
  src: string;            // HLS .m3u8 or progressive .mp4
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

  // -- attach HLS or native ---------------------------------------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const isHls = src.includes('.m3u8') || src.includes('/stream');
    let hls: Hls | null = null;
    if (isHls && Hls.isSupported() && !video.canPlayType('application/vnd.apple.mpegurl')) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
    }
    return () => { hls?.destroy(); };
  }, [src]);

  // -- listeners -------------------------------------------------------------
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => { setDuration(v.duration || 0); setLoaded(true); setRange({ start: 0, end: v.duration || 0 }); };
    const onTime = () => { setCurrent(v.currentTime); onTimeUpdate?.(v.currentTime); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, [onTimeUpdate]);

  // -- keyboard shortcuts ----------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement?.tagName !== 'BODY') return;
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
        case 'j':
          v.playbackRate = 0.5; setRate(0.5); break;
        case 'l':
          v.playbackRate = 2; setRate(2); break;
        case 'm':
          v.muted = !v.muted; setMuted(v.muted); break;
        case 'f':
          toggleFullscreen(); break;
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
    if (v.paused) v.play(); else v.pause();
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
      {!loaded && <div className="absolute inset-0 skeleton" />}
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        className="w-full h-full object-contain bg-black"
        onClick={togglePlay}
      />

      {/* Controls bar */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
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
          {/* Journal markers */}
          {markerPositions.map((mp) => (
            <button
              key={mp.id}
              onClick={(e) => { e.stopPropagation(); onSeekToMarker?.(mp.m); onSeek(mp.m.timestamp_seconds); }}
              style={{ left: `${mp.pct}%` }}
              className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent shadow-glow hover:scale-150 transition-transform"
              title={`Journal @ ${formatDuration(mp.m.timestamp_seconds)}`}
              aria-label="Jump to journal entry"
            />
          ))}
          {/* Trim handles */}
          {trimMode && duration > 0 && (
            <>
              <div
                role="slider"
                aria-label="Trim start"
                aria-valuenow={range.start}
                style={{ left: `${(range.start / duration) * 100}%` }}
                className="absolute -translate-x-1/2 top-0 bottom-0 w-1 bg-accent cursor-ew-resize"
                onPointerDown={(e) => {
                  const target = e.currentTarget.parentElement!;
                  const rect = target.getBoundingClientRect();
                  const move = (ev: PointerEvent) => {
                    const pct = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
                    const t = pct * duration;
                    setRange((r) => ({ start: Math.min(t, r.end - 0.5), end: r.end }));
                  };
                  const up = () => {
                    window.removeEventListener('pointermove', move);
                    window.removeEventListener('pointerup', up);
                  };
                  window.addEventListener('pointermove', move);
                  window.addEventListener('pointerup', up);
                }}
              />
              <div
                role="slider"
                aria-label="Trim end"
                aria-valuenow={range.end}
                style={{ left: `${(range.end / duration) * 100}%` }}
                className="absolute -translate-x-1/2 top-0 bottom-0 w-1 bg-accent cursor-ew-resize"
                onPointerDown={(e) => {
                  const target = e.currentTarget.parentElement!;
                  const rect = target.getBoundingClientRect();
                  const move = (ev: PointerEvent) => {
                    const pct = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
                    const t = pct * duration;
                    setRange((r) => ({ start: r.start, end: Math.max(t, r.start + 0.5) }));
                  };
                  const up = () => {
                    window.removeEventListener('pointermove', move);
                    window.removeEventListener('pointerup', up);
                  };
                  window.addEventListener('pointermove', move);
                  window.addEventListener('pointerup', up);
                }}
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-text-primary text-sm">
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
              if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; setMuted(v === 0); }
            }}
            className="timeline w-24"
            aria-label="Volume"
          />
          <span className="font-mono text-xs text-text-secondary">
            {formatDuration(current)} / {formatDuration(duration)}
          </span>
          <span className="font-mono text-xs text-text-muted ml-2">{rate.toFixed(2)}×</span>
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
                Save clip {formatDuration(range.end - range.start)}
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
