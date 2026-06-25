import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden />;
}

/** Library card placeholder — matches VideoCard dimensions */
export function VideoCardSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-1.5">
        <Skeleton className="h-4 w-12 rounded-full" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
    </div>
  );
}

/** Grid of N card skeletons — used by library while query is loading */
export function VideoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4" role="status" aria-label="Loading videos">
      {Array.from({ length: count }).map((_, i) => <VideoCardSkeleton key={i} />)}
    </div>
  );
}

/** Hero full-screen placeholder while initial videos load */
export function HeroSkeleton() {
  return (
    <section className="relative h-screen overflow-hidden flex flex-col justify-end p-6 sm:p-12" aria-busy="true">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="relative z-10 space-y-4 max-w-2xl">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-16 sm:h-24 lg:h-32 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
    </section>
  );
}

/** Watch page placeholder — player + sidebar */
export function WatchSkeleton() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-12 gap-6" aria-busy="true">
      <div className="col-span-12 lg:col-span-8 space-y-4">
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <aside className="col-span-12 lg:col-span-4 space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </aside>
    </div>
  );
}
