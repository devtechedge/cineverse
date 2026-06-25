'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { VideoPlayer } from '@/components/VideoPlayer';
import { api, unwrap, API_BASE_URL } from '@/lib/api';
import { formatDuration } from '@/lib/utils';

interface SharedResource {
  kind: 'video' | 'clip';
  title: string;
  stream_url: string;
  duration: number | null;
  view_count: number;
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useQuery<SharedResource>({
    queryKey: ['share', token],
    queryFn: () => unwrap<SharedResource>(api.get(`/share/${token}`)),
    retry: false,
  });

  if (isLoading) return <div className="p-12 text-text-secondary">Loading…</div>;
  if (error || !data) return <div className="p-12 text-danger">Invalid or expired link.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-4">
      <p className="text-xs uppercase tracking-widest text-accent">Shared {data.kind}</p>
      <h1 className="font-display text-5xl tracking-wider">{data.title}</h1>
      <VideoPlayer src={`${API_BASE_URL}${data.stream_url}`} className="aspect-video" />
      <p className="text-text-secondary text-sm">
        {data.duration ? `${formatDuration(data.duration)} · ` : ''}
        {data.view_count} view{data.view_count === 1 ? '' : 's'}
      </p>
    </div>
  );
}
