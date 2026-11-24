'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Badge } from '@/components/ui/badge';
import { ProductShowcaseCarousel } from '@/components/product-showcase-carousel';
import { CollaborationCta } from '@/components/collaboration-cta';
import {
  Server,
  Radio,
  Laptop,
  CheckCircle2,
  Terminal,
  ExternalLink,
} from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const heroContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.08,
    },
  },
};

const heroItemVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: 'easeOut',
    },
  },
};

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorPreviewRef = useRef<HTMLDivElement>(null);
  const architectureSectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'syncode.ts' | 'protocol.ts'>('syncode.ts');

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Animate Code Editor Window into view with scale and tilt
      if (editorPreviewRef.current) {
        gsap.fromTo(
          editorPreviewRef.current,
          { opacity: 0, y: 50, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: editorPreviewRef.current,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          },
        );
      }

      // Animate Architecture Section Heading
      if (headingRef.current) {
        gsap.fromTo(
          headingRef.current,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: headingRef.current,
              start: 'top 88%',
              toggleActions: 'play none none reverse',
            },
          },
        );
      }

      // Animate Architecture Cards on scroll
      if (cardsRef.current) {
        gsap.fromTo(
          cardsRef.current.children,
          { opacity: 0, y: 40, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            stagger: 0.16,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          },
        );
      }
    }, containerRef.current);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-grid-mesh">
      {/* Dynamic Ambient Background Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.12, 0.22, 0.12],
            x: [-30, 30, -30],
            y: [-20, 20, -20],
          }}
          transition={{
            repeat: Infinity,
            duration: 16,
            ease: 'easeInOut',
          }}
          className="absolute -top-40 left-1/2 h-[450px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/20 via-sky-500/20 to-emerald-500/20 blur-3xl dark:from-indigo-600/15 dark:via-sky-600/15 dark:to-emerald-600/15"
        />
        <motion.div
          animate={{
            scale: [1.1, 0.95, 1.1],
            opacity: [0.08, 0.18, 0.08],
            x: [30, -30, 30],
          }}
          transition={{
            repeat: Infinity,
            duration: 20,
            ease: 'easeInOut',
          }}
          className="absolute top-1/2 -right-40 h-[400px] w-[500px] rounded-full bg-gradient-to-bl from-emerald-500/20 via-teal-500/10 to-transparent blur-3xl"
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <motion.div
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center text-center space-y-6"
        >
          <motion.h1
            variants={heroItemVariants}
            className="text-4xl font-extrabold tracking-tight sm:text-6xl text-zinc-900 dark:text-zinc-50 max-w-4xl leading-[1.12]"
          >
            Universal Real-Time{' '}
            <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-zinc-100 dark:via-zinc-400 dark:to-zinc-100 bg-clip-text text-transparent">
              Code Collaboration
            </span>{' '}
            Platform
          </motion.h1>

          <motion.p
            variants={heroItemVariants}
            className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed"
          >
            Seamlessly collaborate across VS Code, JetBrains, Neovim, and the web.
            Powered by CRDT state synchronization, high-performance NestJS microservices, and modern TypeScript architecture.
          </motion.p>

          <motion.div
            variants={heroItemVariants}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            >
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg" className="gap-1.5 backdrop-blur-sm bg-white/50 dark:bg-zinc-900/50">
                  <span>Architecture Docs</span>
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Next-Level Interactive Multi-IDE Collaboration Editor Preview */}
        <div ref={editorPreviewRef} className="mt-14 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-950 text-zinc-50 shadow-2xl shadow-zinc-900/10 dark:shadow-black/70 overflow-hidden backdrop-blur-xl">
            {/* Editor Window Titlebar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/60 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="ml-3 flex items-center gap-1 font-mono text-zinc-400">
                  <Terminal className="h-3.5 w-3.5 text-zinc-400" />
                  <span>syncode-workspace</span>
                </div>
              </div>

              {/* Editor Tabs */}
              <div className="flex items-center gap-1 bg-zinc-950/70 p-0.5 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('syncode.ts')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                    activeTab === 'syncode.ts'
                      ? 'bg-zinc-800 text-zinc-100 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  syncode.ts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('protocol.ts')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                    activeTab === 'protocol.ts'
                      ? 'bg-zinc-800 text-zinc-100 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  protocol.ts
                </button>
              </div>

              {/* Active Collaborators Presence Indicator */}
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-mono text-zinc-400">3 IDEs Connected</span>
              </div>
            </div>

            {/* Code Body with Real-Time Multi-IDE Remote Cursors */}
            <div className="p-6 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto bg-zinc-950/95 selection:bg-emerald-500/30 selection:text-emerald-200">
              {activeTab === 'syncode.ts' ? (
                <div className="space-y-1.5 text-zinc-300">
                  <div className="text-zinc-500">&#47;&#47; Universal Real-Time Session &mdash; SYNCODE Phase 1</div>
                  <div>
                    <span className="text-purple-400">import</span> &#123;{' '}
                    <span className="text-sky-300">CollaborationEngine</span>,{' '}
                    <span className="text-sky-300">CRDTSync</span> &#125;{' '}
                    <span className="text-purple-400">from</span>{' '}
                    <span className="text-emerald-300">&apos;@syncode/core&apos;</span>;
                  </div>
                  <div>
                    <span className="text-purple-400">import</span> &#123;{' '}
                    <span className="text-sky-300">ProtocolMessage</span> &#125;{' '}
                    <span className="text-purple-400">from</span>{' '}
                    <span className="text-emerald-300">&apos;@syncode/protocol&apos;</span>;
                  </div>
                  <div className="h-2" />
                  <div>
                    <span className="text-purple-400">export async function</span>{' '}
                    <span className="text-yellow-300">joinWorkspace</span>(
                    <span className="text-orange-300">workspaceId</span>:{' '}
                    <span className="text-sky-300">string</span>) &#123;
                  </div>
                  <div className="pl-4">
                    <span className="text-purple-400">const</span> session ={' '}
                    <span className="text-purple-400">await</span> CollaborationEngine.
                    <span className="text-yellow-300">connect</span>(&#123;
                  </div>
                  <div className="pl-8">
                    workspaceId,
                  </div>
                  
                  {/* Remote Cursor 1: VS Code (Alex) */}
                  <div className="pl-8 relative inline-flex items-center">
                    <span>transport: </span>
                    <span className="text-emerald-300 ml-1">&apos;websocket+webrtc&apos;</span>,
                    <motion.div
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="ml-1 h-4 w-[2px] bg-sky-400"
                    />
                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-sans bg-sky-500 text-white shadow-sm flex items-center gap-1 select-none">
                      <span>Alex</span>
                      <span className="text-[8px] opacity-80 uppercase tracking-tighter">(VS Code)</span>
                    </span>
                  </div>

                  {/* Remote Cursor 2: JetBrains (Priya) */}
                  <div className="pl-8 relative flex items-center">
                    <span>crdtStrategy: </span>
                    <span className="text-emerald-300 ml-1">&apos;yjs-delta-sync&apos;</span>,
                    <motion.div
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="ml-1 h-4 w-[2px] bg-emerald-400"
                    />
                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-sans bg-emerald-600 text-white shadow-sm flex items-center gap-1 select-none">
                      <span>Priya</span>
                      <span className="text-[8px] opacity-80 uppercase tracking-tighter">(JetBrains)</span>
                    </span>
                  </div>

                  {/* Remote Cursor 3: Neovim (Liam) */}
                  <div className="pl-4 relative flex items-center">
                    <span>&#125;);</span>
                    <motion.div
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      className="ml-1 h-4 w-[2px] bg-amber-400"
                    />
                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-sans bg-amber-600 text-white shadow-sm flex items-center gap-1 select-none">
                      <span>Liam</span>
                      <span className="text-[8px] opacity-80 uppercase tracking-tighter">(Neovim)</span>
                    </span>
                  </div>

                  <div className="pl-4">
                    <span className="text-purple-400">return</span> session;
                  </div>
                  <div>&#125;</div>
                </div>
              ) : (
                <div className="space-y-1.5 text-zinc-300">
                  <div className="text-zinc-500">&#47;&#47; Protocol Specification Contract (v1.0.0)</div>
                  <div>
                    <span className="text-purple-400">export const</span>{' '}
                    <span className="text-sky-300">PROTOCOL_VERSION</span> ={' '}
                    <span className="text-emerald-300">&apos;1.0.0&apos;</span>;
                  </div>
                  <div className="h-2" />
                  <div>
                    <span className="text-purple-400">export enum</span>{' '}
                    <span className="text-yellow-300">MessageType</span> &#123;
                  </div>
                  <div className="pl-4 text-sky-300">
                    CLIENT_HANDSHAKE = <span className="text-emerald-300">&apos;sys:client_handshake&apos;</span>,
                  </div>
                  <div className="pl-4 text-sky-300">
                    AWARENESS_UPDATE = <span className="text-emerald-300">&apos;awareness:update&apos;</span>,
                  </div>
                  <div className="pl-4 text-sky-300">
                    DOC_UPDATE = <span className="text-emerald-300">&apos;doc:update&apos;</span>,
                  </div>
                  <div>&#125;</div>
                </div>
              )}
            </div>

            {/* Editor Window Footer Status Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800/80 bg-zinc-900/40 text-[11px] font-mono text-zinc-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> UTF-8
                </span>
                <span>TypeScript 5.x</span>
              </div>
              <div className="flex items-center gap-3">
                <span>Ln 12, Col 28</span>
                <span className="text-sky-400">Yjs CRDT Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Monorepo Architecture Overview */}
        <div ref={architectureSectionRef} className="mt-24">
          <div ref={headingRef} className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Monorepo Architecture &amp; Core Services
            </h2>
            <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mt-2 max-w-xl mx-auto">
              Engineered with strict separation of concerns, high scalability, and independent deployment topologies.
            </p>
          </div>

          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: apps/api (Purple Spotlight) */}
            <div className="h-full">
              <SpotlightCard
                spotlightColor="rgba(168, 85, 247, 0.25)"
                className="hover:border-purple-400/80 dark:hover:border-purple-500/80 hover:shadow-purple-500/10"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      <Server className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      <span>apps/api</span>
                    </div>
                    <Badge variant="purple">REST / NestJS</Badge>
                  </div>
                  <CardTitle className="mt-3 text-lg font-bold">Backend REST API</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    Modular NestJS application powered by Express, Helmet security, Pino logging, and global exception filtering.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1.5 pt-2">
                  <div className="flex items-start gap-1.5">
                    <span className="text-purple-500 font-bold">&bull;</span>
                    <span>Global API Prefix: <code className="text-zinc-800 dark:text-zinc-200 font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">/api/v1</code></span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-purple-500 font-bold">&bull;</span>
                    <span>PostgreSQL via Prisma ORM</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-purple-500 font-bold">&bull;</span>
                    <span>Redis cache &amp; connection lifecycle</span>
                  </div>
                </CardContent>
              </SpotlightCard>
            </div>

            {/* Card 2: apps/collaboration (Blue Spotlight) */}
            <div className="h-full">
              <SpotlightCard
                spotlightColor="rgba(59, 130, 246, 0.25)"
                className="hover:border-blue-400/80 dark:hover:border-blue-500/80 hover:shadow-blue-500/10"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      <Radio className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>apps/collaboration</span>
                    </div>
                    <Badge variant="blue">Yjs Foundation</Badge>
                  </div>
                  <CardTitle className="mt-3 text-lg font-bold">Collaboration Service</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    Dedicated real-time microservice foundation prepared for CRDT synchronization, presence, and WebSockets.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1.5 pt-2">
                  <div className="flex items-start gap-1.5">
                    <span className="text-blue-500 font-bold">&bull;</span>
                    <span>Standalone HTTP health endpoint</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-blue-500 font-bold">&bull;</span>
                    <span>Strict Zod environment validation</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-blue-500 font-bold">&bull;</span>
                    <span>Independently containerized &amp; deployable</span>
                  </div>
                </CardContent>
              </SpotlightCard>
            </div>

            {/* Card 3: extensions/* (Yellow Spotlight) */}
            <div className="h-full">
              <SpotlightCard
                spotlightColor="rgba(234, 179, 8, 0.25)"
                className="hover:border-yellow-400/80 dark:hover:border-yellow-500/80 hover:shadow-yellow-500/10"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      <Laptop className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                      <span>extensions/*</span>
                    </div>
                    <Badge variant="yellow">Multi-IDE</Badge>
                  </div>
                  <CardTitle className="mt-3 text-lg font-bold">Universal IDE Adapters</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    Shared protocol contracts and adapter abstractions for VS Code, JetBrains IDEs, and Neovim.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1.5 pt-2">
                  <div className="flex items-start gap-1.5">
                    <span className="text-yellow-500 dark:text-yellow-400 font-bold">&bull;</span>
                    <span>Standardized <code className="text-zinc-800 dark:text-zinc-200 font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">@syncode/editor-adapter</code></span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-yellow-500 dark:text-yellow-400 font-bold">&bull;</span>
                    <span>Shared protocol definitions in <code className="text-zinc-800 dark:text-zinc-200 font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">@syncode/protocol</code></span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-yellow-500 dark:text-yellow-400 font-bold">&bull;</span>
                    <span>Cross-editor cursor &amp; selection synchronization</span>
                  </div>
                </CardContent>
              </SpotlightCard>
            </div>
          </div>

          {/* Live Collaboration Experience Showcase Carousel */}
          <ProductShowcaseCarousel />

          {/* Animated Collaboration CTA Section */}
          <CollaborationCta />
        </div>
      </div>
    </div>
  );
}
