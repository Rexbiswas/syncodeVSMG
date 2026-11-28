'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';

interface BinaryParticle {
  id: number;
  x: number;
  y: number;
  char: '0' | '1';
  size: number;
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
  size: number;
}

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
    // Throttle to ~28ms for responsive trail generation
    if (now - lastSpawnTime.current < 28) return;

    // Minimum movement threshold (at least 5px)
    const dx = x - lastMousePos.current.x;
    const dy = y - lastMousePos.current.y;
    if (Math.hypot(dx, dy) < 5) return;

    lastSpawnTime.current = now;
    lastMousePos.current = { x, y };

    const id = ++particleIdCounter.current;
    const char: '0' | '1' = id % 2 === 0 ? '1' : '0';
    
    // Increased font size diameter: 14px to 17px
    const size = (id % 4) + 14;

    // Expanded radial diameter: spread particles across a ~50px - 70px circular field around cursor
    const angle = (id * 137.5 * Math.PI) / 180; // golden ratio distribution
    const spreadRadius = ((id % 7) + 2) * 4.5; // 9px to 36px radius (up to 72px diameter)
    const spawnX = x + Math.cos(angle) * spreadRadius;
    const spawnY = y + Math.sin(angle) * spreadRadius;

    // Outward drift + subtle downward gravity
    const driftX = Math.cos(angle) * 10;
    const driftY = Math.sin(angle) * 10 + 12;
    const rotation = ((id * 13) % 29) - 14; // -14deg to +14deg

    setBinaryTrail((prev) => [
      ...prev.slice(-24), // maintain up to 24 active trailing characters for a fuller aura
      { id, x: spawnX, y: spawnY, char, size, driftX, driftY, rotation },
    ]);
  }, []);

  const triggerClickBinaryBurst = useCallback((x: number, y: number) => {
    const burstParticles: ClickBinaryParticle[] = [];
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];

    angles.forEach((angle, idx) => {
      const rad = (angle * Math.PI) / 180;
      // Increased click burst spread diameter (up to 120px - 150px)
      const dist = 52 + (idx % 3) * 16;
      const id = ++particleIdCounter.current;
      burstParticles.push({
        id,
        x,
        y,
        char: idx % 2 === 0 ? '1' : '0',
        targetX: x + Math.cos(rad) * dist,
        targetY: y + Math.sin(rad) * dist,
        size: 15 + (idx % 3),
      });
    });

    setClickBursts((prev) => [...prev.slice(-16), ...burstParticles]);

    setTimeout(() => {
      setClickBursts((prev) =>
        prev.filter((p) => !burstParticles.some((bp) => bp.id === p.id)),
      );
    }, 650);
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
      {/* 1. Binary Number Movement Trail (Expanded Diameter & #1d1d1f) */}
      <AnimatePresence>
        {binaryTrail.map((p) => (
          <motion.span
            key={p.id}
            initial={{
              x: p.x - 6,
              y: p.y - 10,
              scale: 1.1,
              opacity: 0.95,
              rotate: p.rotation,
            }}
            animate={{
              scale: 0.7,
              opacity: 0,
              y: p.y + p.driftY,
              x: p.x + p.driftX,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            onAnimationComplete={() => {
              setBinaryTrail((prev) => prev.filter((item) => item.id !== p.id));
            }}
            className="pointer-events-none absolute font-mono font-bold leading-none select-none text-[#1d1d1f] dark:text-zinc-300"
            style={{
              fontSize: `${p.size}px`,
            }}
          >
            {p.char}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* 2. Click Binary Number Burst (Expanded Diameter) */}
      <AnimatePresence>
        {clickBursts.map((p) => (
          <motion.span
            key={p.id}
            initial={{
              x: p.x - 6,
              y: p.y - 10,
              scale: 1.3,
              opacity: 1,
            }}
            animate={{
              x: p.targetX,
              y: p.targetY,
              scale: 0.45,
              opacity: 0,
            }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="pointer-events-none absolute font-mono font-bold leading-none select-none text-[#1d1d1f] dark:text-zinc-300"
            style={{
              fontSize: `${p.size}px`,
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
