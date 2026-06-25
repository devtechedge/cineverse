'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
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

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [0.3, 0.7, 1, 0.7, 0.3]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.05, 1, 1.05]);
  const titleY = useTransform(scrollYProgress, [0.2, 0.6], [60, -40]);
  const subY = useTransform(scrollYProgress, [0.2, 0.6], [80, -20]);

  // IntersectionObserver to pause off-screen videos on mobile
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

  const streamUrl = slide.video.stream_url ? `${API_BASE_URL}${slide.video.stream_url}` : null;
  const poster = slide.video.thumbnail_url ? `${API_BASE_URL}${slide.video.thumbnail_url}` : undefined;

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
        <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-bg-base/40 to-bg-base/60" />
      </motion.div>

      <div className="relative z-10 h-full max-w-[1440px] mx-auto px-6 sm:px-12 flex flex-col justify-end pb-24">
        <motion.span
          style={{ y: subY }}
          className="text-xs uppercase tracking-[0.3em] text-accent mb-3"
        >
          Section {String(index + 1).padStart(2, '0')}
          {slide.excerpt && (
            <span className="ml-3 text-text-secondary">
              · journal @ {formatTimestamp(slide.excerpt.timestamp_seconds)}
            </span>
          )}
        </motion.span>
        <motion.h2
          style={{ y: titleY }}
          className="font-display text-6xl sm:text-8xl lg:text-[120px] leading-[0.9] text-text-primary"
        >
          {slide.video.title}
        </motion.h2>
        {slide.excerpt?.content_text && (
          <motion.p
            style={{ y: subY }}
            className="mt-6 max-w-2xl text-base sm:text-lg text-text-secondary line-clamp-3"
          >
            {slide.excerpt.content_text}
          </motion.p>
        )}
        {slide.video.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {slide.video.tags.map((t) => (
              <span
                key={t}
                className="px-3 py-1 text-[11px] uppercase tracking-widest border border-border-strong rounded-full text-text-secondary"
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
