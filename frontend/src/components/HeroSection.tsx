'use client';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { formatTimestamp } from '@/lib/utils';
import type { Video, JournalEntry } from '@/types';

export interface HeroSlide {
  video: Video;
  excerpt?: JournalEntry;
}

export function HeroSection({ slide, index }: { slide: HeroSlide; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Heavily reduced parallax ranges so text never overlaps.
  // Title moves ±18px, subtitle ±10px — tag chips stay completely still.
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.5, 0.7, 1], [0.6, 0.95, 1, 0.95, 0.6]);
  const scale   = useTransform(scrollYProgress, [0, 0.5, 1], [1.04, 1, 1.04]);
  const titleY  = useTransform(scrollYProgress, [0.2, 0.8], [reduceMotion ? 0 : 18, reduceMotion ? 0 : -18]);
  const subY    = useTransform(scrollYProgress, [0.2, 0.8], [reduceMotion ? 0 : 10, reduceMotion ? 0 : -10]);

  // Pause off-screen videos for performance
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const visible = entry.intersectionRatio > 0.5;
        setInView(visible);
        const v = videoRef.current;
        if (!v) return;
        if (visible) v.play().catch(() => undefined);
        else v.pause();
      },
      { threshold: [0, 0.5, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const streamUrl = slide.video.stream_url ? (
    slide.video.stream_url.startsWith('http') ? slide.video.stream_url : `${API_BASE_URL}${slide.video.stream_url}`
  ) : null;
  const poster = slide.video.thumbnail_url ? (
    slide.video.thumbnail_url.startsWith('http') ? slide.video.thumbnail_url : `${API_BASE_URL}${slide.video.thumbnail_url}`
  ) : undefined;

  return (
    <section
      ref={ref}
      className="relative w-full h-screen overflow-hidden bg-bg-base"
      data-index={index}
    >
      <motion.div style={{ opacity, scale }} className="absolute inset-0">
        {streamUrl ? (
          <video
            ref={videoRef}
            src={streamUrl}
            poster={poster}
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            aria-hidden
            className="w-full h-full object-cover"
          />
        ) : (
          poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" className="w-full h-full object-cover" aria-hidden />
          )
        )}
        {/* Theme-aware scrim so text is readable in both light & dark */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, var(--scrim-gradient-top) 0%, color-mix(in srgb, var(--bg-base) 30%, transparent) 45%, var(--scrim-gradient-bottom) 100%)',
          }}
        />
      </motion.div>

      <div className="relative z-10 h-full max-w-[1440px] mx-auto px-6 sm:px-12 flex flex-col justify-end pb-20 sm:pb-24">
        {/* Section + journal meta */}
        <motion.div
          style={{ y: subY }}
          className="mb-4 text-xs uppercase tracking-[0.3em] text-accent font-medium flex flex-wrap items-center gap-x-3 gap-y-1"
        >
          <span>Section {String(index + 1).padStart(2, '0')}</span>
          {slide.excerpt && (
            <span className="text-text-secondary">
              · journal @ {formatTimestamp(slide.excerpt.timestamp_seconds)}
            </span>
          )}
        </motion.div>

        {/* Title */}
        <motion.h2
          style={{ y: titleY }}
          className="font-display text-5xl sm:text-7xl lg:text-[110px] leading-[0.95] text-text-primary mb-6"
        >
          {slide.video.title}
        </motion.h2>

        {/* Excerpt — sits in its own block, won't collide with title or tags */}
        {slide.excerpt?.content_text && (
          <p className="max-w-2xl text-sm sm:text-base text-text-secondary line-clamp-2 sm:line-clamp-3 mb-5">
            {slide.excerpt.content_text}
          </p>
        )}

        {/* Tag chips — fixed position, no parallax, generous spacing */}
        {slide.video.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {slide.video.tags.map((t) => (
              <span
                key={t}
                className="px-3 py-1 text-[11px] uppercase tracking-widest border border-border-strong rounded-full text-text-secondary bg-bg-base/40 backdrop-blur-sm"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <span className="sr-only">{inView ? 'In view' : 'Off screen'}</span>
    </section>
  );
}
