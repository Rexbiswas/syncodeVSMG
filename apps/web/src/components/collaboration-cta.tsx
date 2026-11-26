'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const TYPING_TARGET = 'Code in Real-Time.';

export function CollaborationCta() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Typewriter state for "Code in Real-Time."
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    let index = 0;
    let isDeleting = false;
    let timeoutId: NodeJS.Timeout;

    const tick = () => {
      if (!isDeleting) {
        index++;
        setTypedText(TYPING_TARGET.slice(0, index));
        if (index === TYPING_TARGET.length) {
          isDeleting = true;
          timeoutId = setTimeout(tick, 2600); // Pause on completed sentence
          return;
        }
        timeoutId = setTimeout(tick, 90 + Math.random() * 25);
      } else {
        index--;
        setTypedText(TYPING_TARGET.slice(0, index));
        if (index === 0) {
          isDeleting = false;
          timeoutId = setTimeout(tick, 700); // Pause before re-typing
          return;
        }
        timeoutId = setTimeout(tick, 45);
      }
    };

    timeoutId = setTimeout(tick, 400);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!sectionRef.current || !cardRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        {
          opacity: 0,
          y: 60,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: cardRef.current,
            start: 'top 88%',
            toggleActions: 'play none none reverse',
          },
        },
      );
    }, sectionRef.current);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative mt-20 sm:mt-28">
      {/* Outer Full-Box Aura Glow Highlights */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.18, 0.32, 0.18],
          }}
          transition={{
            repeat: Infinity,
            duration: 8,
            ease: 'easeInOut',
          }}
          className="h-full w-full max-w-4xl rounded-3xl bg-gradient-to-r from-purple-500/20 via-blue-500/15 to-yellow-500/20 blur-3xl"
        />
      </div>

      <div
        ref={cardRef}
        className="relative rounded-3xl p-[1.5px] overflow-hidden shadow-2xl shadow-purple-500/10 dark:shadow-purple-950/20 transition-all"
      >
        {/* Full-Box 360-Degree Continuous Rotating Border Beam */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 7,
            ease: 'linear',
          }}
          className="pointer-events-none absolute -inset-[150%] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,transparent_270deg,#a855f7_305deg,#3b82f6_330deg,#eab308_350deg,transparent_360deg)]"
        />

        {/* Static Base Subtle Border Layer */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80" />

        {/* Inner Card Background & Content */}
        <div className="relative overflow-hidden rounded-[22.5px] bg-white/85 dark:bg-zinc-900/80 backdrop-blur-2xl p-6 sm:p-14">
          {/* Dynamic Full-Box Ambient Mesh Glowing Behind Content */}
          <motion.div
            animate={{
              x: [-30, 30, -30],
              y: [-15, 15, -15],
              scale: [1, 1.15, 1],
              opacity: [0.15, 0.28, 0.15],
            }}
            transition={{
              repeat: Infinity,
              duration: 8,
              ease: 'easeInOut',
            }}
            className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/20 blur-3xl"
          />
          <motion.div
            animate={{
              x: [30, -30, 30],
              y: [15, -15, 15],
              scale: [1.1, 0.95, 1.1],
              opacity: [0.12, 0.24, 0.12],
            }}
            transition={{
              repeat: Infinity,
              duration: 10,
              ease: 'easeInOut',
            }}
            className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-gradient-to-tr from-blue-500/30 to-emerald-500/20 blur-3xl"
          />

          <div className="relative z-10 mx-auto max-w-3xl text-center py-4">
            {/* Headline */}
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-zinc-900 dark:text-zinc-50 leading-tight">
              <span>Bridge Any Editor.</span>
              <span className="block mt-2.5 sm:mt-3 text-lg sm:text-xl md:text-2xl font-mono font-medium text-zinc-500 dark:text-zinc-400 tracking-tight">
                <span>{typedText || '\u00A0'}</span>
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: 'easeInOut' }}
                  className="inline-block w-[2px] h-[0.8em] ml-1 bg-zinc-500 dark:bg-zinc-400 align-middle"
                />
              </span>
            </h2>

            {/* Description */}
            <p className="mt-4 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto">
              Experience zero-latency state synchronization with your team across VS Code, JetBrains IDEs, and Neovim.
              Engineered with CRDT vector clocks, high-performance NestJS microservices, and standardized protocol contracts.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
