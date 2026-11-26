'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
  Video as VideoIcon,
} from 'lucide-react';

export interface ShowcaseSlide {
  id: string;
  tag: string;
  eyebrow: string;
  title: string;
  description: string;
  type: 'image' | 'video';
  src: string;
  fallbackSrc?: string;
  poster?: string;
  accentGlow: string;
  badge: {
    text: string;
    icon: 'sparkles' | 'video';
  };
}

const SHOWCASE_SLIDES: ShowcaseSlide[] = [
  {
    id: 'developer-workspace',
    tag: 'Workspace Experience',
    eyebrow: 'MULTI-IDE WORKSPACE',
    title: 'Multi-Editor Real-Time Sync',
    description:
      'Seamlessly collaborate in real-time across disparate code editors with instantaneous CRDT vector state synchronization, participant awareness, and presence.',
    type: 'image',
    src: '/media/developer-collaboration.png',
    fallbackSrc: 'https://ik.imagekit.io/c4aufc4vx/developer_collaboration.png',
    accentGlow: 'rgba(118, 87, 255, 0.22)',
    badge: {
      text: 'CRDT Sync Engine',
      icon: 'sparkles',
    },
  },
  {
    id: 'developer-meeting-video',
    tag: 'Live Team Meeting',
    eyebrow: 'AUDIO / VIDEO & CODE STREAMING',
    title: 'Real-Time Collaboration & Meetings',
    description:
      'Unite code editing, voice, video, and discussions into a singular low-latency collaboration hub built for distributed engineering teams.',
    type: 'video',
    src: '/media/developer-collaboration.mp4',
    poster: '/media/developer-collaboration.png',
    accentGlow: 'rgba(16, 185, 129, 0.20)',
    badge: {
      text: 'Live 1080p Video',
      icon: 'video',
    },
  },
];

export function ProductShowcaseCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null);

  const prefersReducedMotion = useReducedMotion();
  const currentSlide = SHOWCASE_SLIDES[currentIndex];

  const paginate = useCallback((newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      let next = prev + newDirection;
      if (next < 0) next = SHOWCASE_SLIDES.length - 1;
      if (next >= SHOWCASE_SLIDES.length) next = 0;
      return next;
    });
  }, []);

  const goToSlide = useCallback((index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  // Handle Video Playback & Pause on Slide Change
  useEffect(() => {
    const videoEl = videoRef.current;
    if (currentSlide.type === 'video' && videoEl) {
      videoEl.currentTime = 0;
      videoEl.muted = isMuted;
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay might be restricted before interaction
            setIsPlaying(false);
          });
      }
    } else if (videoEl) {
      videoEl.pause();
      videoEl.currentTime = 0;
      setIsPlaying(false);
    }
  }, [currentIndex, currentSlide.type, isMuted]);

  // Autoplay timer: auto-advance every 8 seconds if not hovered and not reduced motion
  useEffect(() => {
    if (isHovered || prefersReducedMotion) return;

    // If current slide is video, let the video play without auto-cutting early
    const intervalTime = currentSlide.type === 'video' ? 12000 : 7500;
    const timer = setInterval(() => {
      paginate(1);
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentIndex, isHovered, prefersReducedMotion, paginate, currentSlide.type]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      paginate(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      paginate(1);
    }
  };

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      paginate(1);
    } else if (distance < -minSwipeDistance) {
      paginate(-1);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const toggleVideoPlayback = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // Restrained motion transitions
  const slideVariants: Variants = {
    enter: (dir: number) => ({
      x: prefersReducedMotion ? 0 : dir > 0 ? 36 : -36,
      opacity: 0,
      scale: prefersReducedMotion ? 1 : 0.985,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 280, damping: 28 },
        opacity: { duration: 0.45 },
        scale: { duration: 0.45 },
      },
    },
    exit: (dir: number) => ({
      zIndex: 0,
      x: prefersReducedMotion ? 0 : dir < 0 ? 36 : -36,
      opacity: 0,
      scale: prefersReducedMotion ? 1 : 0.985,
      transition: {
        duration: 0.35,
        ease: [0.25, 1, 0.5, 1],
      },
    }),
  };

  const renderBadgeIcon = (icon: 'sparkles' | 'video') => {
    switch (icon) {
      case 'sparkles':
        return <Sparkles className="h-3 w-3" />;
      case 'video':
        return <VideoIcon className="h-3 w-3" />;
      default:
        return <Sparkles className="h-3 w-3" />;
    }
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Live Collaboration Showcase"
      className="relative my-20 sm:my-28"
    >
      {/* Dynamic Ambient Background Glow reflecting active slide */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            repeat: Infinity,
            duration: 8,
            ease: 'easeInOut',
          }}
          style={{
            background: `radial-gradient(ellipse at center, ${currentSlide.accentGlow} 0%, transparent 70%)`,
          }}
          className="h-[520px] w-full max-w-5xl rounded-full blur-3xl transition-colors duration-700"
        />
      </div>

      <div
        ref={carouselContainerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded-3xl"
      >
        {/* Section Top Editorial Header */}
        <div className="text-center space-y-3 mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-widest uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Radio className="h-3 w-3 animate-pulse text-purple-500" />
            <span>LIVE COLLABORATION EXPERIENCE</span>
          </div>

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.15]">
            Code Together.{' '}
            <span className="bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              Build Together.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            One workspace for shared coding, team discussions and live meetings.
          </p>

          {/* Quick Slide Navigation Pill Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
            {SHOWCASE_SLIDES.map((slide, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 shadow-md scale-105'
                      : 'bg-zinc-100 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800'
                  }`}
                  aria-label={`Jump to slide ${idx + 1}: ${slide.tag}`}
                >
                  {renderBadgeIcon(slide.badge.icon)}
                  <span>{slide.tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Media Showcase Area — 16:9 Cinema Container */}
        <div className="relative mx-auto max-w-5xl">
          {/* Subtle Accent Glow Ring */}
          <div
            className="pointer-events-none absolute -inset-1 rounded-3xl opacity-50 blur-xl transition-all duration-700"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${currentSlide.accentGlow}, transparent 70%)`,
            }}
          />

          {/* Media Frame Window */}
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-[#0D0D12] shadow-2xl shadow-zinc-900/10 dark:shadow-black/70">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={currentSlide.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0 flex items-center justify-center bg-[#0D0D12]"
              >
                {currentSlide.type === 'video' ? (
                  <div className="relative h-full w-full flex items-center justify-center">
                    <video
                      ref={videoRef}
                      src={currentSlide.src}
                      poster={currentSlide.poster}
                      playsInline
                      muted={isMuted}
                      loop
                      className="h-full w-full object-contain"
                      aria-label="SYNCODE live multi-user collaboration and meeting video"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />

                    {/* Minimal Media Controls Overlay */}
                    <div className="absolute bottom-2.5 right-2.5 sm:bottom-4 sm:right-4 flex items-center gap-1.5 sm:gap-2 bg-black/60 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/10 z-20">
                      <button
                        type="button"
                        onClick={toggleVideoPlayback}
                        className="text-zinc-300 hover:text-white transition-colors p-1 rounded-full focus:outline-none"
                        aria-label={isPlaying ? 'Pause demo video' : 'Play demo video'}
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4 ml-0.5" />
                        )}
                      </button>

                      <div className="h-3 w-[1px] bg-white/20" />

                      <button
                        type="button"
                        onClick={toggleMute}
                        className="text-zinc-300 hover:text-white transition-colors p-1 rounded-full focus:outline-none"
                        aria-label={isMuted ? 'Unmute video audio' : 'Mute video audio'}
                      >
                        {isMuted ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-full w-full flex items-center justify-center">
                    <Image
                      src={
                        imgError[currentSlide.id] && currentSlide.fallbackSrc
                          ? currentSlide.fallbackSrc
                          : currentSlide.src
                      }
                      alt={currentSlide.title}
                      fill
                      priority={currentIndex === 0}
                      sizes="(max-width: 1024px) 100vw, 1024px"
                      className="object-contain select-none"
                      onError={() => {
                        setImgError((prev) => ({ ...prev, [currentSlide.id]: true }));
                      }}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* In-Frame Corner Pill Badge */}
            <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-20">
              <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-mono font-medium tracking-wide bg-zinc-900/80 backdrop-blur-md text-zinc-200 border border-white/10 shadow-lg">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {currentSlide.badge.text}
              </span>
            </div>
          </div>
        </div>

        {/* Carousel Bottom Control & Information Bar */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 max-w-5xl mx-auto px-1 sm:px-3">
          {/* Active Slide Information (Animated Typography) */}
          <div className="space-y-1 text-center md:text-left max-w-xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <div className="text-[11px] font-mono uppercase tracking-wider text-purple-600 dark:text-purple-400 font-semibold">
                  {currentSlide.eyebrow}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mt-0.5">
                  {currentSlide.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  {currentSlide.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Controls & Pagination Indicators */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Pagination Indicators */}
            <div className="flex items-center gap-1.5" aria-label="Slide indicators">
              {SHOWCASE_SLIDES.map((slide, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => goToSlide(idx)}
                    className="focus:outline-none p-1 cursor-pointer"
                    aria-label={`Go to slide ${idx + 1}`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span
                      className={`block h-1.5 rounded-full transition-all duration-300 ${
                        isActive
                          ? 'w-7 bg-purple-500 shadow-sm shadow-purple-500/50'
                          : 'w-2 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Prev / Next Arrow Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => paginate(-1)}
                className="h-10 w-10 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-purple-500/40 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 cursor-pointer shadow-sm active:scale-95"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => paginate(1)}
                className="h-10 w-10 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-purple-500/40 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 cursor-pointer shadow-sm active:scale-95"
                aria-label="Next slide"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
