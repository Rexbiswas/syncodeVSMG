'use client';

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function CursorFollower() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [cursorText, setCursorText] = useState<string | null>(null);

  const rawMouseX = useMotionValue(-100);
  const rawMouseY = useMotionValue(-100);

  // High-performance spring physics for ultra-smooth fluid movement
  const springX = useSpring(rawMouseX, { stiffness: 450, damping: 28 });
  const springY = useSpring(rawMouseY, { stiffness: 450, damping: 28 });

  // Secondary delayed spring for the ambient trail / spotlight
  const trailX = useSpring(rawMouseX, { stiffness: 180, damping: 24 });
  const trailY = useSpring(rawMouseY, { stiffness: 180, damping: 24 });

  useEffect(() => {
    // Only enable custom cursor on devices that support a fine pointer (mouse)
    const mediaQuery = window.matchMedia('(pointer: fine)');
    if (!mediaQuery.matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      rawMouseX.set(e.clientX);
      rawMouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    const handleElementHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactiveEl = target.closest<HTMLElement>(
        'a, button, [role="button"], input, textarea, select, .interactive',
      );

      if (interactiveEl) {
        setIsHovered(true);
        const dataLabel = interactiveEl.getAttribute('data-cursor');
        setCursorText(dataLabel);
      } else {
        setIsHovered(false);
        setCursorText(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseover', handleElementHover, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseover', handleElementHover);
    };
  }, [rawMouseX, rawMouseY, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Dynamic Ambient Cursor Spotlight (Illuminates grid & card borders) */}
      <motion.div
        style={{
          x: trailX,
          y: trailY,
        }}
        className="pointer-events-none absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-r from-emerald-500/15 via-sky-500/10 to-indigo-500/5 blur-3xl dark:from-emerald-400/10 dark:via-sky-400/8 dark:to-indigo-400/5 mix-blend-screen"
      />

      {/* Outer Fluid Magnetic Ring */}
      <motion.div
        style={{
          x: springX,
          y: springY,
        }}
        animate={{
          scale: isClicking ? 0.8 : isHovered ? 1.75 : 1,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="pointer-events-none absolute -top-5 -left-5 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-900/40 dark:border-zinc-100/50 backdrop-blur-[1px]"
      >
        {/* Subtle inner pulse when hovering interactive targets */}
        {isHovered && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.2 }}
            className="h-full w-full rounded-full bg-emerald-500 dark:bg-emerald-400"
          />
        )}
      </motion.div>

      {/* Inner Precision Target Dot */}
      <motion.div
        style={{
          x: rawMouseX,
          y: rawMouseY,
        }}
        animate={{
          scale: isClicking ? 1.4 : isHovered ? 0.5 : 1,
        }}
        transition={{ duration: 0.1 }}
        className="pointer-events-none absolute -top-1 -left-1 h-2 w-2 rounded-full bg-zinc-900 dark:bg-zinc-100 shadow-sm"
      />

      {/* Floating Micro-Badge on special interactive items (if data-cursor is set) */}
      {cursorText && (
        <motion.div
          style={{
            x: springX,
            y: springY,
          }}
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 24, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="pointer-events-none absolute -left-10 px-2 py-0.5 rounded-full bg-zinc-900 text-[10px] font-mono text-zinc-100 shadow-lg dark:bg-zinc-100 dark:text-zinc-900 border border-zinc-700/50"
        >
          {cursorText}
        </motion.div>
      )}
    </div>
  );
}

