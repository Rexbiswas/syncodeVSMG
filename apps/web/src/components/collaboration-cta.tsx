'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  ArrowRight,
  Terminal,
  Shield,
  Activity,
  Code2,
  CheckCircle2,
  Laptop,
} from 'lucide-react';

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
          timeoutId = setTimeout(tick, 2200); // Pause on completed sentence
          return;
        }
        timeoutId = setTimeout(tick, 85 + Math.random() * 25);
      } else {
        index--;
        setTypedText(TYPING_TARGET.slice(0, index));
        if (index === 0) {
          isDeleting = false;
          timeoutId = setTimeout(tick, 600); // Pause before re-typing
          return;
        }
        timeoutId = setTimeout(tick, 45);
      }
    };

    timeoutId = setTimeout(tick, 500);
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
      {/* Outer Glow Highlights */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            repeat: Infinity,
            duration: 10,
            ease: 'easeInOut',
          }}
          className="h-[360px] w-[650px] rounded-full bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-yellow-500/20 blur-3xl"
        />
      </div>

      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/75 dark:border-zinc-800/80 dark:bg-zinc-900/65 backdrop-blur-xl p-8 sm:p-14 shadow-2xl transition-all"
      >
        {/* Animated Moving Gradient Beam on Top Border */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden">
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{
              repeat: Infinity,
              duration: 4,
              ease: 'linear',
            }}
            className="h-full w-1/2 bg-gradient-to-r from-transparent via-purple-500 via-blue-500 via-yellow-400 to-transparent"
          />
        </div>

        {/* Floating Ambient Mesh Behind Content */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/10 blur-2xl" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          {/* Eyebrow Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-purple-500/25 bg-purple-500/10 px-3.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 backdrop-blur-md shadow-sm mb-6"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-500 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Universal IDE Collaboration Hub</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </motion.div>

          {/* Headline */}
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-zinc-900 dark:text-zinc-50 leading-[1.15]">
            Bridge Any Editor.{' '}
            <span className="inline-block text-zinc-500 dark:text-zinc-400 font-mono tracking-tight font-bold">
              <span>{typedText}</span>
              <span className="inline-block w-[3px] h-[0.78em] ml-1 bg-zinc-500 dark:bg-zinc-400 animate-pulse align-middle" />
            </span>
          </h2>

          {/* Description */}
          <p className="mt-4 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Experience zero-latency state synchronization with your team across VS Code, JetBrains IDEs, and Neovim.
            Engineered with CRDT vector clocks, high-performance NestJS microservices, and standardized protocol contracts.
          </p>

          {/* Interactive IDE Support Pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <motion.div
              whileHover={{ y: -3, scale: 1.04 }}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/80 dark:bg-zinc-800/60 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm"
            >
              <Code2 className="h-4 w-4 text-purple-500" />
              <span>VS Code</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                <CheckCircle2 className="h-3 w-3" /> Ready
              </span>
            </motion.div>

            <motion.div
              whileHover={{ y: -3, scale: 1.04 }}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/80 dark:bg-zinc-800/60 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm"
            >
              <Laptop className="h-4 w-4 text-blue-500" />
              <span>JetBrains</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                <CheckCircle2 className="h-3 w-3" /> Configured
              </span>
            </motion.div>

            <motion.div
              whileHover={{ y: -3, scale: 1.04 }}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/80 dark:bg-zinc-800/60 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm"
            >
              <Terminal className="h-4 w-4 text-yellow-500" />
              <span>Neovim</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
            </motion.div>
          </div>

          {/* Call-To-Action Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {/* Primary Action Button */}
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            >
              <Link href="/status">
                <Button
                  size="lg"
                  className="relative group overflow-hidden bg-black text-white font-semibold px-8 py-6 rounded-xl shadow-xl  hover:shadow-purple-500/30 transition-all text-sm gap-2"
                >
                  {/* Shimmer sweep effect */}
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                  
                  
                  <span>Explore Live Infrastructure</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                </Button>
              </Link>
            </motion.div>

            {/* Secondary Action Button */}
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            >
              <Link href="/status">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-7 py-6 rounded-xl gap-2 text-sm font-medium border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
                >
                  <Activity className="h-4 w-4 text-emerald-500" />
                  <span>System Health Check</span>
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Micro Telemetry Metrics Footer */}
          <div className="mt-10 pt-6 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5 font-mono">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span>Strict TypeScript</span>
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
            <span className="flex items-center gap-1.5 font-mono">
              <Activity className="h-3.5 w-3.5 text-sky-500" />
              <span>Sub-15ms Sync Ready</span>
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
            <span className="flex items-center gap-1.5 font-mono">
              <Code2 className="h-3.5 w-3.5 text-purple-500" />
              <span>@syncode/protocol</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
