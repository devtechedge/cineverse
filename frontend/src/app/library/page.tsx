'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Tag as TagIcon, Filter, FilmIcon, Upload as UploadIcon, X } from 'lucide-react';
import { api } from '@/lib/api';
import { debounce, cn } from '@/lib/utils';
import { VideoCard } from '@/components/VideoCard';
import { VideoGridSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import type { PaginatedApiResponse, Video } from '@/types';

const PAGE_SIZE = 24;

export default function LibraryPage() {
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [tag, setTag] = useState<string>('');
  const [hasJournal, setHasJournal] = useState<boolean | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debounced = useMemo(() => debounce((v: string) => setAppliedSearch(v), 350), []);

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, refetch, isLoading } =
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
  const totalLoaded = videos.length;
  const totalAvailable = data?.pages[0]?.meta.total ?? 0;
  const hasFilters = !!(appliedSearch || tag || hasJournal !== null);

  const clearFilters = () => {
    setSearch(''); setAppliedSearch(''); setTag(''); setHasJournal(null);
  };

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <label htmlFor="search-input" className="text-xs uppercase tracking-widest text-text-secondary mb-2 flex items-center gap-2">
          <Search size={14} aria-hidden /> Search
        </label>
        <input
          id="search-input"
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); debounced(e.target.value); }}
          placeholder="By title…"
          className="w-full bg-bg-surface border border-border-strong rounded-md px-3 py-2 text-sm focus:border-accent outline-none"
        />
      </div>
      <div>
        <label htmlFor="tag-input" className="text-xs uppercase tracking-widest text-text-secondary mb-2 flex items-center gap-2">
          <TagIcon size={14} aria-hidden /> Tag
        </label>
        <input
          id="tag-input"
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value.trim().toLowerCase())}
          placeholder="e.g. animation"
          className="w-full bg-bg-surface border border-border-strong rounded-md px-3 py-2 text-sm focus:border-accent outline-none"
        />
      </div>
      <div>
        <span className="text-xs uppercase tracking-widest text-text-secondary mb-2 flex items-center gap-2">
          <Filter size={14} aria-hidden /> Journal
        </span>
        <div className="flex gap-2 text-xs" role="radiogroup" aria-label="Journal filter">
          {([['Any', null], ['With', true], ['Without', false]] as const).map(([label, v]) => (
            <button
              key={label}
              role="radio"
              aria-checked={hasJournal === v}
              onClick={() => setHasJournal(v)}
              className={cn(
                'px-2.5 py-1 rounded-full border transition-colors',
                hasJournal === v
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-border-strong text-text-secondary hover:border-accent/40',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          <X size={12} /> Clear filters
        </button>
      )}
      <button onClick={() => refetch()} className="text-xs text-text-secondary hover:text-accent block">
        Refresh
      </button>
    </div>
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-12 gap-6">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block lg:col-span-3" aria-label="Filters">
        {filterPanel}
      </aside>

      <section className="col-span-12 lg:col-span-9">
        <header className="flex items-end justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-wider">LIBRARY</h1>
            {totalAvailable > 0 && (
              <p className="text-xs text-text-muted mt-1">
                {totalLoaded} of {totalAvailable} {totalAvailable === 1 ? 'video' : 'videos'}
                {hasFilters && ' (filtered)'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 text-sm border border-border-strong hover:border-accent text-text-primary px-3 py-2 rounded-md"
              aria-label="Open filters"
            >
              <Filter size={14} /> Filters
              {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
            </button>
            <Link
              href="/upload"
              className="text-sm bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md transition-colors"
            >
              Upload
            </Link>
          </div>
        </header>

        {isLoading ? (
          <VideoGridSkeleton count={8} />
        ) : videos.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={<Search size={36} />}
              title="No matches"
              description="Nothing in your library fits those filters. Try a broader search or clear them."
              action={
                <button onClick={clearFilters} className="px-4 py-2 rounded-md bg-accent hover:bg-accent-hover text-white text-sm">
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={<FilmIcon size={36} />}
              title="Your library is empty"
              description="Upload your first video to start building your cinematic archive."
              action={
                <Link href="/upload" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent hover:bg-accent-hover text-white text-sm">
                  <UploadIcon size={14} /> Upload a video
                </Link>
              }
            />
          )
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {videos.map((v) => <VideoCard key={v.id} video={v} />)}
            </div>
            <div ref={sentinelRef} className="h-12" aria-hidden />
            {isFetchingNextPage && (
              <p className="text-center text-text-secondary text-sm pt-4" role="status">Loading more…</p>
            )}
          </>
        )}
      </section>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setFiltersOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
        >
          <div
            className="bg-bg-surface w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl border border-border-subtle p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl tracking-wider">FILTERS</h2>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="text-text-secondary hover:text-accent">
                <X size={18} />
              </button>
            </div>
            {filterPanel}
          </div>
        </div>
      )}
    </div>
  );
}
