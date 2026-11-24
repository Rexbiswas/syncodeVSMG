'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  driftX: number;
  driftY: number;
}

interface ClickPulse {
  id: number;
  x: number;
  y: number;
  color: string;
}

const PARTICLE_COLORS = [
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#8b5cf6', // violet-500
  '#3b82f6', // blue-500
];

export function CursorFollower() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [clickPulses, setClickPulses] = useState<ClickPulse[]>([]);

  const rawMouseX = useMotionValue(-100);
  const rawMouseY = useMotionValue(-100);

  // Smooth ambient aura spring
  const auraX = useSpring(rawMouseX, { stiffness: 200, damping: 25 });
  const auraY = useSpring(rawMouseY, { stiffness: 200, damping: 25 });

  // Floating label spring (slightly faster follow)
  const labelX = useSpring(rawMouseX, { stiffness: 350, damping: 28 });
  const labelY = useSpring(rawMouseY, { stiffness: 350, damping: 28 });

  const lastSpawnTime = useRef<number>(0);
  const particleIdCounter = useRef<number>(0);
  const pulseIdCounter = useRef<number>(0);

  const spawnParticle = useCallback((x: number, y: number) => {
    const now = performance.now();
    // Throttle particle generation to ~45ms for 60fps performance
    if (now - lastSpawnTime.current < 45) return;
    lastSpawnTime.current = now;

    const id = ++particleIdCounter.current;
    const color = PARTICLE_COLORS[id % PARTICLE_COLORS.length];
    const size = ((id * 3) % 4) + 2.5; // 2.5px - 5.5px
    const driftX = ((id * 7) % 17) - 8;
    const driftY = ((id * 11) % 17) - 8;

    setParticles((prev) => [
      ...prev.slice(-10), // keep max 10 active particles in memory
      { id, x, y, size, color, driftX, driftY },
    ]);
  }, []);

  const triggerClickRipple = useCallback((x: number, y: number) => {
    const id = ++pulseIdCounter.current;
    const color = PARTICLE_COLORS[id % PARTICLE_COLORS.length];

    setClickPulses((prev) => [...prev.slice(-4), { id, x, y, color }]);

    setTimeout(() => {
      setClickPulses((prev) => prev.filter((p) => p.id !== id));
    }, 600);
  }, []);

  useEffect(() => {
    // Only activate on devices with fine pointer controls (mouse / trackpad)
    const mediaQuery = window.matchMedia('(pointer: fine)');
    if (!mediaQuery.matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      rawMouseX.set(e.clientX);
      rawMouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      spawnParticle(e.clientX, e.clientY);
    };

    const handleMouseDown = (e: MouseEvent) => {
      triggerClickRipple(e.clientX, e.clientY);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest<HTMLElement>(
        'a, button, [role="button"], input, textarea, select, .interactive, [data-cursor]',
      );

      if (interactive) {
        setIsHovered(true);
        const customText = interactive.getAttribute('data-cursor');
        setHoverLabel(customText);
      } else {
        setIsHovered(false);
        setHoverLabel(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseover', handleMouseOver, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseover', handleMouseOver);
    };
  }, [rawMouseX, rawMouseY, isVisible, spawnParticle, triggerClickRipple]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {/* 1. Ambient Dynamic Glow Aura (Smooth non-intrusive background illumination) */}
      <motion.div
        style={{
          x: auraX,
          y: auraY,
        }}
        animate={{
          scale: isHovered ? 1.35 : 1,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 280, damping: 25 }}
        className="pointer-events-none absolute -top-36 -left-36 h-72 w-72 rounded-full bg-gradient-to-tr from-emerald-500/15 via-cyan-500/12 to-violet-500/10 blur-3xl dark:from-emerald-400/12 dark:via-cyan-400/10 dark:to-violet-400/8 mix-blend-screen"
      />

      {/* 2. Interactive Movement Sparkles / Stardust Trail */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              x: p.x - p.size / 2,
              y: p.y - p.size / 2,
              scale: 1,
              opacity: 0.75,
            }}
            animate={{
              scale: 0.1,
              opacity: 0,
              y: p.y + p.driftY,
              x: p.x + p.driftX,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            onAnimationComplete={() => {
              setParticles((prev) => prev.filter((item) => item.id !== p.id));
            }}
            className="pointer-events-none absolute rounded-full shadow-sm"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              boxShadow: `0 0 8px ${p.color}`,
            }}
          />
        ))}
      </AnimatePresence>

      {/* 3. Click Shockwave Ripples & Embers */}
      <AnimatePresence>
        {clickPulses.map((pulse) => (
          <React.Fragment key={pulse.id}>
            {/* Expanding Shockwave Ring */}
            <motion.div
              initial={{
                x: pulse.x - 10,
                y: pulse.y - 10,
                width: 20,
                height: 20,
                scale: 0.3,
                opacity: 0.9,
              }}
              animate={{
                scale: 3.2,
                opacity: 0,
              }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="pointer-events-none absolute rounded-full border-2"
              style={{
                borderColor: pulse.color,
                boxShadow: `0 0 16px ${pulse.color}`,
              }}
            />

            {/* Micro Embers Radiating Outward on Click */}
            {[0, 60, 120, 180, 240, 300].map((angle, idx) => {
              const rad = (angle * Math.PI) / 180;
              const dist = 24;
              return (
                <motion.div
                  key={`${pulse.id}-ember-${idx}`}
                  initial={{
                    x: pulse.x,
                    y: pulse.y,
                    scale: 1,
                    opacity: 0.9,
                  }}
                  animate={{
                    x: pulse.x + Math.cos(rad) * dist,
                    y: pulse.y + Math.sin(rad) * dist,
                    scale: 0.2,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="pointer-events-none absolute h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: pulse.color,
                    boxShadow: `0 0 6px ${pulse.color}`,
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </AnimatePresence>

      {/* 4. Contextual Floating Chip / Badge when Hovering Interactive Elements with data-cursor */}
      <AnimatePresence>
        {hoverLabel && (
          <motion.div
            style={{
              x: labelX,
              y: labelY,
            }}
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 22 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            className="pointer-events-none absolute left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/90 dark:bg-zinc-900/90 text-white text-[11px] font-mono shadow-xl border border-emerald-500/40 backdrop-blur-md"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{hoverLabel}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
