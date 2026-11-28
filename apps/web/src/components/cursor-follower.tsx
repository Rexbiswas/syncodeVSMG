'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';

interface BinaryParticle {
  id: number;
  x: number;
  y: number;
  char: '0' | '1';
  size: number;
  color: string;
  driftX: number;
  driftY: number;
  rotation: number;
}

interface ClickBinaryParticle {
  id: number;
  x: number;
  y: number;
  char: '0' | '1';
  targetX: number;
  targetY: number;
  color: string;
}

const BINARY_COLORS = [
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#8b5cf6', // violet-500
  '#7657ff', // SYNCODE purple
  '#3b82f6', // blue-500
  '#34d399', // emerald-400
];

export function CursorFollower() {
  const [isVisible, setIsVisible] = useState(false);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [binaryTrail, setBinaryTrail] = useState<BinaryParticle[]>([]);
  const [clickBursts, setClickBursts] = useState<ClickBinaryParticle[]>([]);

  const rawMouseX = useMotionValue(-100);
  const rawMouseY = useMotionValue(-100);

  // Floating label spring
  const labelX = useSpring(rawMouseX, { stiffness: 350, damping: 28 });
  const labelY = useSpring(rawMouseY, { stiffness: 350, damping: 28 });

  const lastSpawnTime = useRef<number>(0);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const particleIdCounter = useRef<number>(0);

  const spawnBinaryParticle = useCallback((x: number, y: number) => {
    const now = performance.now();
    // Throttle to ~35ms for smooth 60fps performance
    if (now - lastSpawnTime.current < 35) return;

    // Minimum movement threshold (at least 6px) to avoid clustering when stationary
    const dx = x - lastMousePos.current.x;
    const dy = y - lastMousePos.current.y;
    if (Math.hypot(dx, dy) < 6) return;

    lastSpawnTime.current = now;
    lastMousePos.current = { x, y };

    const id = ++particleIdCounter.current;
    const char: '0' | '1' = id % 2 === 0 ? '1' : '0';
    const color = BINARY_COLORS[id % BINARY_COLORS.length];
    const size = (id % 3) + 11; // 11px to 13px
    const driftX = ((id * 5) % 15) - 7; // -7px to +7px
    const driftY = ((id * 7) % 18) + 8; // gentle downward fall 8px to 25px
    const rotation = ((id * 11) % 25) - 12; // -12deg to +12deg

    setBinaryTrail((prev) => [
      ...prev.slice(-16), // maintain at most 16 active trailing characters in memory
      { id, x, y, char, size, color, driftX, driftY, rotation },
    ]);
  }, []);

  const triggerClickBinaryBurst = useCallback((x: number, y: number) => {
    const burstParticles: ClickBinaryParticle[] = [];
    const angles = [0, 60, 120, 180, 240, 300];

    angles.forEach((angle, idx) => {
      const rad = (angle * Math.PI) / 180;
      const dist = 28 + (idx % 2) * 8; // 28px - 36px outward radius
      const id = ++particleIdCounter.current;
      burstParticles.push({
        id,
        x,
        y,
        char: idx % 2 === 0 ? '1' : '0',
        targetX: x + Math.cos(rad) * dist,
        targetY: y + Math.sin(rad) * dist,
        color: BINARY_COLORS[(id + idx) % BINARY_COLORS.length],
      });
    });

    setClickBursts((prev) => [...prev.slice(-12), ...burstParticles]);

    setTimeout(() => {
      setClickBursts((prev) =>
        prev.filter((p) => !burstParticles.some((bp) => bp.id === p.id)),
      );
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

      spawnBinaryParticle(e.clientX, e.clientY);
    };

    const handleMouseDown = (e: MouseEvent) => {
      triggerClickBinaryBurst(e.clientX, e.clientY);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest<HTMLElement>('[data-cursor]');
      if (interactive) {
        const customText = interactive.getAttribute('data-cursor');
        setHoverLabel(customText);
      } else {
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
  }, [rawMouseX, rawMouseY, isVisible, spawnBinaryParticle, triggerClickBinaryBurst]);

  if (!isVisible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. Binary Number Movement Trail */}
      <AnimatePresence>
        {binaryTrail.map((p) => (
          <motion.span
            key={p.id}
            initial={{
              x: p.x - 4,
              y: p.y - 8,
              scale: 1,
              opacity: 0.95,
              rotate: p.rotation,
            }}
            animate={{
              scale: 0.65,
              opacity: 0,
              y: p.y + p.driftY,
              x: p.x + p.driftX,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            onAnimationComplete={() => {
              setBinaryTrail((prev) => prev.filter((item) => item.id !== p.id));
            }}
            className="pointer-events-none absolute font-mono font-bold leading-none select-none"
            style={{
              fontSize: `${p.size}px`,
              color: p.color,
              textShadow: `0 0 6px ${p.color}`,
            }}
          >
            {p.char}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* 2. Click Binary Number Burst */}
      <AnimatePresence>
        {clickBursts.map((p) => (
          <motion.span
            key={p.id}
            initial={{
              x: p.x - 4,
              y: p.y - 8,
              scale: 1.2,
              opacity: 1,
            }}
            animate={{
              x: p.targetX,
              y: p.targetY,
              scale: 0.4,
              opacity: 0,
            }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="pointer-events-none absolute font-mono font-bold leading-none select-none text-xs"
            style={{
              color: p.color,
              textShadow: `0 0 8px ${p.color}`,
            }}
          >
            {p.char}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* 3. Contextual Floating Chip / Badge for [data-cursor] */}
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
            className="pointer-events-none absolute left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/90 dark:bg-zinc-900/90 text-white text-[11px] font-mono shadow-xl border border-purple-500/40 backdrop-blur-md"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span>{hoverLabel}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
