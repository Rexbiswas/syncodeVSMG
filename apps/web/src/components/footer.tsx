'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Code2, Heart } from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!footerRef.current) return;

    const ctx = gsap.context(() => {
      if (containerRef.current) {
        gsap.fromTo(
          containerRef.current,
          {
            opacity: 0,
            y: 16,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: footerRef.current,
              start: 'top 95%',
              toggleActions: 'play none none reverse',
            },
          },
        );
      }
    }, footerRef.current);

    return () => ctx.revert();
  }, []);

  return (
    <footer
      ref={footerRef}
      className="relative overflow-hidden border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md"
    >
      {/* Ambient gradient line along top border */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 via-blue-500/40 via-yellow-500/40 to-transparent"
        aria-hidden="true"
      />

      <div
        ref={containerRef}
        className="mx-auto max-w-7xl px-4 flex items-center justify-center gap-2"
      >
        <motion.div
          className="inline-flex flex-wrap items-center justify-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        >
          <Code2 className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
          <span className="font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            SYNCODE
          </span>
          <span>&copy; 2026 &mdash; Developed by</span>
          <span className="font-semibold text-zinc-950 dark:text-zinc-50 relative group cursor-pointer inline-block">
            Rishi Biswas
            <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-gradient-to-r from-purple-500 via-blue-500 to-yellow-500 transition-all duration-300 group-hover:w-full" />
          </span>
          <motion.span
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="inline-flex items-center text-red-500 ml-0.5"
            aria-hidden="true"
          >
            <Heart className="h-3.5 w-3.5 fill-red-500" />
          </motion.span>
        </motion.div>
      </div>
    </footer>
  );
}

