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

  // Restrained parallax — text never overlaps.
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.5, 0.7, 1], [0.55, 0.95, 1, 0.95, 0.55]);
  const scale   = useTransform(scrollYProgress, [0, 0.5, 1], [1.04, 1, 1.04]);
  const titleY  = useTransform(scrollYProgress, [0.2, 0.8], [reduceMotion ? 0 : 14, reduceMotion ? 0 : -14]);
  const subY    = useTransform(scrollYProgress, [0.2, 0.8], [reduceMotion ? 0 : 8,  reduceMotion ? 0 : -8]);

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

  const streamUrl = slide.video.stream_url
    ? (slide.video.stream_url.startsWith('http') ? slide.video.stream_url : `${API_BASE_URL}${slide.video.stream_url}`)
    : null;
  const poster = slide.video.thumbnail_url
    ? (slide.video.thumbnail_url.startsWith('http') || slide.video.thumbnail_url.startsWith('data:')
        ? slide.video.thumbnail_url
        : `${API_BASE_URL}${slide.video.thumbnail_url}`)
    : undefined;

  return (
    <section
      ref={ref}
      className="relative w-full h-[100svh] min-h-[560px] overflow-hidden bg-bg-base"
      data-index={index}
      aria-labelledby={`hero-title-${index}`}
    >
      <motion.div style={{ opacity, scale }} className="absolute inset-0">
        {streamUrl ? (
          <video
            ref={videoRef}
            src={streamUrl}
            poster={poster}
            muted autoPlay loop playsInline
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
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, var(--scrim-gradient-top) 0%, color-mix(in srgb, var(--bg-base) 35%, transparent) 50%, var(--scrim-gradient-bottom) 100%)',
          }}
        />
      </motion.div>

      <div className="relative z-10 h-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 flex flex-col justify-end pb-16 sm:pb-20 lg:pb-24">
        <motion.div
          style={{ y: subY }}
          className="mb-3 sm:mb-4 text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] text-accent font-medium flex flex-wrap items-center gap-x-3 gap-y-1"
        >
          <span>Section {String(index + 1).padStart(2, '0')}</span>
          {slide.excerpt && (
            <span className="text-text-secondary">
              · journal @ {formatTimestamp(slide.excerpt.timestamp_seconds)}
            </span>
          )}
        </motion.div>

        <motion.h2
          id={`hero-title-${index}`}
          style={{ y: titleY }}
          className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[110px] leading-[0.95] text-text-primary mb-4 sm:mb-6 break-words"
        >
          {slide.video.title}
        </motion.h2>

        {slide.excerpt?.content_text && (
          <p className="max-w-2xl text-sm sm:text-base text-text-secondary line-clamp-2 sm:line-clamp-3 mb-4 sm:mb-5">
            {slide.excerpt.content_text}
          </p>
        )}

        {slide.video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {slide.video.tags.map((t) => (
              <span
                key={t}
                className="px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] uppercase tracking-widest border border-border-strong rounded-full text-text-secondary bg-bg-base/40 backdrop-blur-sm"
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
