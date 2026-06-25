'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Film, Upload, BookOpen } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { HeroSection, HeroSlide } from '@/components/HeroSection';
import type { JournalEntry, Video, PaginatedApiResponse } from '@/types';

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  const { data: slides = [], isLoading } = useQuery<HeroSlide[]>({
    queryKey: ['hero-slides', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await api.get<PaginatedApiResponse<Video>>(
        '/videos?page=1&page_size=6&status=ready&sort=created_desc',
      );
      const videos = res.data.data;
      const slides: HeroSlide[] = await Promise.all(
        videos.map(async (v) => {
          try {
            const journal = await unwrap<JournalEntry[]>(api.get(`/videos/${v.id}/journal`));
            return { video: v, excerpt: journal[0] };
          } catch {
            return { video: v };
          }
        }),
      );
      return slides;
    },
  });

  const [active, setActive] = useState(0);
  useEffect(() => {
    const handler = () => {
      const sections = document.querySelectorAll<HTMLElement>('.snap-cinematic > section');
      let best = 0;
      let bestDist = Infinity;
      sections.forEach((s, i) => {
        const rect = s.getBoundingClientRect();
        const dist = Math.abs(rect.top);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      setActive(best);
    };
    const container = document.getElementById('hero-scroll');
    container?.addEventListener('scroll', handler, { passive: true });
    return () => container?.removeEventListener('scroll', handler);
  }, []);

  if (!user) return <LandingHero />;

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-text-secondary">
        Loading your cineverse…
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center px-6">
        <Film className="text-accent mb-4" size={48} />
        <h1 className="font-display text-5xl mb-2">Your cineverse begins here.</h1>
        <p className="text-text-secondary max-w-md mb-6">
          Upload your first video to start building a cinematic archive of your moments.
        </p>
        <Link href="/upload" className="px-5 py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white inline-flex items-center gap-2">
          <Upload size={16} /> Upload your first video
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <div id="hero-scroll" className="snap-cinematic h-screen overflow-y-scroll">
        {slides.map((s, i) => (
          <HeroSection key={s.video.id} slide={s} index={i} />
        ))}
      </div>

      {/* Section dots */}
      <nav
        aria-label="Section navigation"
        className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 flex-col gap-3 z-30"
      >
        {slides.map((_, i) => (
          <a
            key={i}
            href={`#`}
            onClick={(e) => {
              e.preventDefault();
              const sections = document.querySelectorAll<HTMLElement>('.snap-cinematic > section');
              sections[i]?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${active === i ? 'bg-accent' : 'bg-text-muted/40 hover:bg-text-secondary'}`}
            aria-label={`Go to section ${i + 1}`}
          />
        ))}
      </nav>
    </div>
  );
}

function LandingHero() {
  return (
    <section className="relative h-[88vh] overflow-hidden flex items-center">
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(229,9,20,0.18),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(0,180,255,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-transparent to-bg-base" />
      </motion.div>
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 sm:px-12">
        <p className="text-xs uppercase tracking-[0.3em] text-accent mb-4">A personal cinema</p>
        <h1 className="font-display text-6xl sm:text-8xl lg:text-[140px] leading-[0.9]">
          Your moments,<br />framed.
        </h1>
        <p className="mt-6 max-w-xl text-text-secondary text-lg">
          Cineverse is a private 4K archive, journal, and streaming platform —
          built for the moments that deserve more than a camera roll.
        </p>
        <div className="mt-8 flex gap-3 flex-wrap">
          <Link href="/register" className="px-5 py-3 rounded-md bg-accent hover:bg-accent-hover text-white font-medium">
            Get started
          </Link>
          <Link href="/login" className="px-5 py-3 rounded-md border border-border-strong hover:border-accent text-text-primary">
            Sign in
          </Link>
        </div>
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl">
          <Feature icon={<Film size={20} />} title="4K archive" body="Resumable chunked uploads, ffmpeg HLS pipeline." />
          <Feature icon={<BookOpen size={20} />} title="Timestamped journal" body="Tie thoughts to exact moments in time." />
          <Feature icon={<Upload size={20} />} title="One-click clips" body="Trim and share with expiring links." />
        </div>
      </div>
    </section>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="p-4 bg-bg-surface/60 border border-border-subtle rounded-md">
      <div className="text-accent mb-2">{icon}</div>
      <h3 className="text-text-primary font-medium mb-1">{title}</h3>
      <p className="text-text-secondary text-sm">{body}</p>
    </div>
  );
}
