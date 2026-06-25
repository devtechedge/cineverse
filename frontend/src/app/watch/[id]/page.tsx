'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Share2, BookOpen, X, NotebookPen } from 'lucide-react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { JournalEditor } from '@/components/JournalEditor';
import { WatchSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { api, unwrap, API_BASE_URL } from '@/lib/api';
import { formatTimestamp, cn } from '@/lib/utils';
import type { JournalEntry, Video, Clip, ShareToken } from '@/types';

export default function WatchPage() {
  const params = useParams<{ id: string }>();
  const videoId = Number(params.id);
  const qc = useQueryClient();
  const [currentTime, setCurrentTime] = useState(0);
  const [journalOpen, setJournalOpen] = useState(false); // mobile drawer

  const { data: video, isLoading: videoLoading } = useQuery<Video>({
    queryKey: ['video', videoId],
    queryFn: () => unwrap<Video>(api.get(`/videos/${videoId}`)),
  });
  const { data: entries = [] } = useQuery<JournalEntry[]>({
    queryKey: ['journal', videoId],
    queryFn: () => unwrap<JournalEntry[]>(api.get(`/videos/${videoId}/journal`)),
    enabled: !!video,
  });

  const createEntry = useMutation({
    mutationFn: (payload: { content: Record<string, unknown>; content_text: string; timestamp_seconds: number }) =>
      unwrap<JournalEntry>(api.post(`/videos/${videoId}/journal`, payload)),
    onSuccess: () => {
      toast.success('Journal entry saved');
      qc.invalidateQueries({ queryKey: ['journal', videoId] });
      setJournalOpen(false);
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
    onSuccess: () => toast.success('Clip queued'),
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

  if (videoLoading || !video) {
    return <WatchSkeleton />;
  }

  const src = video.stream_url
    ? (video.stream_url.startsWith('http') ? video.stream_url : `${API_BASE_URL}${video.stream_url}`)
    : '';
  const poster = video.thumbnail_url
    ? (video.thumbnail_url.startsWith('http') || video.thumbnail_url.startsWith('data:')
        ? video.thumbnail_url
        : `${API_BASE_URL}${video.thumbnail_url}`)
    : undefined;

  const journalPanel = (
    <div className="space-y-6">
      <div>
        <h2 className="text-xs uppercase tracking-widest text-text-secondary mb-2">New entry</h2>
        <JournalEditor
          currentTime={currentTime}
          draftKey={`journal-draft-${videoId}`}
          onSave={(p) => createEntry.mutate(p)}
          onSeek={(t) => setCurrentTime(t)}
        />
      </div>
      <div>
        <h2 className="text-xs uppercase tracking-widest text-text-secondary mb-2">
          Entries {entries.length > 0 && <span className="text-text-muted">({entries.length})</span>}
        </h2>
        {entries.length === 0 ? (
          <EmptyState
            icon={<NotebookPen size={28} />}
            title="No entries yet"
            description="Use the editor above to capture a thought tied to the current moment."
            className="py-8"
          />
        ) : (
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {entries.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => { setCurrentTime(e.timestamp_seconds); setJournalOpen(false); }}
                  className="w-full text-left bg-bg-surface border border-border-subtle rounded-md p-3 hover:border-accent/40 transition-colors"
                >
                  <p className="text-xs font-mono text-accent">{formatTimestamp(e.timestamp_seconds)}</p>
                  <p className="text-sm text-text-primary line-clamp-3 mt-1">{e.content_text}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 sm:py-6 grid grid-cols-12 gap-4 sm:gap-6">
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

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl sm:text-4xl tracking-wider break-words">{video.title}</h1>
            <p className="text-text-secondary text-xs sm:text-sm mt-1">
              {video.resolution || '—'} · {Math.round(video.duration || 0)}s · {new Date(video.created_at).toLocaleDateString()}
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
              <p className="text-text-secondary mt-3 whitespace-pre-wrap text-sm sm:text-base">{video.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile: open journal */}
            <button
              onClick={() => setJournalOpen(true)}
              className="lg:hidden text-sm inline-flex items-center gap-1 px-3 py-2 rounded-md border border-border-strong hover:border-accent transition-colors"
              aria-label="Open journal"
            >
              <BookOpen size={14} /> Journal
              {entries.length > 0 && (
                <span className="ml-1 text-[10px] bg-accent text-white px-1.5 rounded-full">{entries.length}</span>
              )}
            </button>
            <button
              onClick={() => shareVideo.mutate()}
              className="text-sm inline-flex items-center gap-1 px-3 py-2 rounded-md border border-border-strong hover:border-accent transition-colors"
              aria-label="Share video"
            >
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>
      </section>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block lg:col-span-4">{journalPanel}</aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity',
          journalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setJournalOpen(false)}
        role="dialog"
        aria-modal="true"
        aria-label="Journal"
        aria-hidden={!journalOpen}
      >
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 w-full max-w-md bg-bg-base border-l border-border-subtle p-5 overflow-y-auto transition-transform',
            journalOpen ? 'translate-x-0' : 'translate-x-full',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl tracking-wider">JOURNAL</h2>
            <button onClick={() => setJournalOpen(false)} aria-label="Close journal" className="text-text-secondary hover:text-accent">
              <X size={20} />
            </button>
          </div>
          {journalPanel}
        </div>
      </div>
    </div>
  );
}
