'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Tag as TagIcon, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { debounce } from '@/lib/utils';
import { VideoCard } from '@/components/VideoCard';
import { VideoCardSkeleton } from '@/components/Skeleton';
import type { PaginatedApiResponse, Video } from '@/types';

const PAGE_SIZE = 24;

export default function LibraryPage() {
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [tag, setTag] = useState<string>('');
  const [hasJournal, setHasJournal] = useState<boolean | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debounced = useMemo(() => debounce((v: string) => setAppliedSearch(v), 350), []);

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: ['library', appliedSearch, tag, hasJournal],
      initialPageParam: 1,
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        params.set('page', String(pageParam));
        params.set('page_size', String(PAGE_SIZE));
        if (appliedSearch) params.set('search', appliedSearch);
        if (tag) params.set('tag', tag);
        if (hasJournal !== null) params.set('has_journal', String(hasJournal));
        const r = await api.get<PaginatedApiResponse<Video>>(`/videos?${params.toString()}`);
        return r.data;
      },
      getNextPageParam: (last) =>
        last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined,
    });

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, { rootMargin: '300px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const videos = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 grid grid-cols-12 gap-6">
      {/* Filters sidebar */}
      <aside className="col-span-12 lg:col-span-3 space-y-6">
        <div>
          <label className="text-xs uppercase tracking-widest text-text-secondary mb-2 flex items-center gap-2">
            <Search size={14} /> Search
          </label>
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); debounced(e.target.value); }}
            placeholder="By title…"
            className="w-full bg-bg-surface border border-border-strong rounded-md px-3 py-2 text-sm focus:border-accent outline-none"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-text-secondary mb-2 flex items-center gap-2">
            <TagIcon size={14} /> Tag
          </label>
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value.trim().toLowerCase())}
            placeholder="e.g. travel"
            className="w-full bg-bg-surface border border-border-strong rounded-md px-3 py-2 text-sm focus:border-accent outline-none"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-text-secondary mb-2 flex items-center gap-2">
            <Filter size={14} /> Journal
          </label>
          <div className="flex gap-2 text-xs">
            {([['Any', null], ['With', true], ['Without', false]] as const).map(([label, v]) => (
              <button
                key={label}
                onClick={() => setHasJournal(v)}
                className={`px-2.5 py-1 rounded-full border ${hasJournal === v ? 'border-accent text-accent' : 'border-border-strong text-text-secondary'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => refetch()} className="text-xs text-accent hover:underline">
          Refresh
        </button>
      </aside>

      {/* Grid */}
      <section className="col-span-12 lg:col-span-9">
        <header className="flex items-end justify-between mb-6">
          <h1 className="font-display text-5xl tracking-wider">LIBRARY</h1>
          <Link
            href="/upload"
            className="text-sm bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md"
          >
            Upload
          </Link>
        </header>

        {isFetching && videos.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)}
          </div>
        ) : videos.length === 0 ? (
          <div className="border border-dashed border-border-strong rounded-lg p-12 text-center">
            <p className="text-text-secondary mb-4">No videos match your filters.</p>
            <Link href="/upload" className="text-accent hover:underline">Upload one →</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((v) => <VideoCard key={v.id} video={v} />)}
            </div>
            <div ref={sentinelRef} className="h-12" />
            {isFetchingNextPage && (
              <p className="text-center text-text-secondary text-sm">Loading more…</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
