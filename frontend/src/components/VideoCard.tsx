'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Clock } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import type { Video } from '@/types';

export function VideoCard({ video }: { video: Video }) {
  const thumb = video.thumbnail_url
    ? (video.thumbnail_url.startsWith('http') || video.thumbnail_url.startsWith('data:')
        ? video.thumbnail_url
        : `${API_BASE_URL}${video.thumbnail_url}`)
    : null;

  return (
    <Link
      href={`/watch/${video.id}`}
      className="group block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
      aria-label={`Watch ${video.title}`}
    >
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        className="bg-bg-surface rounded-md overflow-hidden border border-border-subtle group-hover:border-accent/40 group-hover:shadow-card transition-colors"
      >
        <div className="relative aspect-video bg-bg-elevated overflow-hidden">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-cinematic motion-reduce:transform-none"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted text-xs uppercase tracking-widest">
              {video.status}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="p-3 rounded-full bg-bg-base/60 backdrop-blur-sm">
              <Play className="text-accent drop-shadow-lg" size={28} aria-hidden />
            </div>
          </div>
          {video.duration ? (
            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[11px] rounded bg-black/70 text-white font-mono">
              {formatDuration(video.duration)}
            </span>
          ) : null}
          {video.status !== 'ready' && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded bg-warning/90 text-white">
              {video.status}
            </span>
          )}
        </div>
        <div className="p-3 space-y-1">
          <h3 className="text-sm font-medium text-text-primary truncate group-hover:text-accent transition-colors">
            {video.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Clock size={12} aria-hidden />
            <time dateTime={video.created_at}>
              {new Date(video.created_at).toLocaleDateString()}
            </time>
          </div>
          {video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {video.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded-full border border-border-strong text-text-secondary"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
