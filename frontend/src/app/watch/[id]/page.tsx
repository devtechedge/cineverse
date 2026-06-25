'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Share2 } from 'lucide-react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { JournalEditor } from '@/components/JournalEditor';
import { api, unwrap, API_BASE_URL } from '@/lib/api';
import { formatTimestamp } from '@/lib/utils';
import type { JournalEntry, Video, Clip, ShareToken } from '@/types';

export default function WatchPage() {
  const params = useParams<{ id: string }>();
  const videoId = Number(params.id);
  const qc = useQueryClient();
  const [currentTime, setCurrentTime] = useState(0);

  const { data: video } = useQuery<Video>({
    queryKey: ['video', videoId],
    queryFn: () => unwrap<Video>(api.get(`/videos/${videoId}`)),
  });
  const { data: entries = [] } = useQuery<JournalEntry[]>({
    queryKey: ['journal', videoId],
    queryFn: () => unwrap<JournalEntry[]>(api.get(`/videos/${videoId}/journal`)),
  });

  const createEntry = useMutation({
    mutationFn: (payload: { content: Record<string, unknown>; content_text: string; timestamp_seconds: number }) =>
      unwrap<JournalEntry>(api.post(`/videos/${videoId}/journal`, payload)),
    onSuccess: () => {
      toast.success('Journal entry saved');
      qc.invalidateQueries({ queryKey: ['journal', videoId] });
    },
    onError: () => toast.error('Could not save entry'),
  });

  const createClip = useMutation({
    mutationFn: (range: { start: number; end: number }) =>
      unwrap<Clip>(api.post(`/videos/${videoId}/clips`, {
        title: `Clip ${formatTimestamp(range.start)}–${formatTimestamp(range.end)}`,
        start_time: range.start,
        end_time: range.end,
      })),
    onSuccess: () => toast.success('Clip queued — processing in background'),
    onError: () => toast.error('Could not create clip'),
  });

  const shareVideo = useMutation({
    mutationFn: () => unwrap<ShareToken>(api.post(`/videos/${videoId}/share`)),
    onSuccess: (s) => {
      try { navigator.clipboard.writeText(s.url); } catch { /* ignore */ }
      toast.success('Share link copied to clipboard');
    },
    onError: () => toast.error('Could not generate share link'),
  });

  if (!video) {
    return <div className="p-12 text-text-secondary">Loading…</div>;
  }

  const src = video.stream_url
    ? (video.stream_url.startsWith('http') ? video.stream_url : `${API_BASE_URL}${video.stream_url}`)
    : '';
  const poster = video.thumbnail_url
    ? (video.thumbnail_url.startsWith('http') || video.thumbnail_url.startsWith('data:')
        ? video.thumbnail_url
        : `${API_BASE_URL}${video.thumbnail_url}`)
    : undefined;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-12 gap-6">
      <section className="col-span-12 lg:col-span-8 space-y-4">
        {video.status === 'ready' ? (
          <VideoPlayer
            src={src}
            poster={poster}
            markers={entries}
            onTimeUpdate={setCurrentTime}
            onSeekToMarker={(e) => setCurrentTime(e.timestamp_seconds)}
            onSaveClip={(r) => createClip.mutate(r)}
            className="aspect-video"
          />
        ) : (
          <div className="aspect-video flex items-center justify-center bg-bg-surface border border-border-subtle rounded-lg text-text-secondary">
            <span className="uppercase tracking-widest text-sm">
              {video.status === 'processing' ? 'Processing…' : video.status}
            </span>
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-4xl tracking-wider">{video.title}</h1>
            <p className="text-text-secondary text-sm mt-1">
              {video.resolution || '—'} · {Math.round(video.duration || 0)}s · {new Date(video.created_at).toLocaleString()}
            </p>
            {video.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {video.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-border-strong rounded-full text-text-secondary">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {video.description && (
              <p className="text-text-secondary mt-3 whitespace-pre-wrap">{video.description}</p>
            )}
          </div>
          <button
            onClick={() => shareVideo.mutate()}
            className="shrink-0 text-sm inline-flex items-center gap-1 px-3 py-2 rounded-md border border-border-strong hover:border-accent"
          >
            <Share2 size={14} /> Share
          </button>
        </div>
      </section>

      <aside className="col-span-12 lg:col-span-4 space-y-6">
        <div>
          <h2 className="text-sm uppercase tracking-widest text-text-secondary mb-2">New entry</h2>
          <JournalEditor
            currentTime={currentTime}
            draftKey={`journal-draft-${videoId}`}
            onSave={(p) => createEntry.mutate(p)}
            onSeek={(t) => setCurrentTime(t)}
          />
        </div>

        <div>
          <h2 className="text-sm uppercase tracking-widest text-text-secondary mb-2">Entries</h2>
          {entries.length === 0 ? (
            <p className="text-text-muted text-sm">No entries yet. Write your first thought.</p>
          ) : (
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="bg-bg-surface border border-border-subtle rounded-md p-3 hover:border-accent/40 cursor-pointer"
                  onClick={() => setCurrentTime(e.timestamp_seconds)}
                >
                  <p className="text-xs font-mono text-accent">{formatTimestamp(e.timestamp_seconds)}</p>
                  <p className="text-sm text-text-primary line-clamp-3 mt-1">{e.content_text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
