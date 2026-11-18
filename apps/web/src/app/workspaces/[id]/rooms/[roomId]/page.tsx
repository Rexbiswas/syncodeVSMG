'use client';

import React, { useEffect, useState, use, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { workspaceApi } from '@/lib/workspace-api';
import type { RoomItem, WorkspaceDetail } from '@syncode/validation';
import {
  ChevronRight,
  Lock,
  Globe,
  User,
  Calendar,
  Code2,
  Terminal,
  Activity,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Loader2,
} from 'lucide-react';

function RoomDetailContent({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>;
}) {
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.id;
  const roomId = resolvedParams.roomId;

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [room, setRoom] = useState<RoomItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [wsRes, roomRes] = await Promise.all([
        workspaceApi.getWorkspace(workspaceId),
        workspaceApi.getRoom(workspaceId, roomId),
      ]);

      if (wsRes.success && wsRes.data) {
        setWorkspace(wsRes.data);
      } else {
        setError(wsRes.error?.message || 'Failed to load workspace');
      }

      if (roomRes.success && roomRes.data) {
        setRoom(roomRes.data);
      } else {
        setError(roomRes.error?.message || 'Failed to load room');
      }
    } catch {
      setError('An error occurred while loading room data');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, roomId]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      workspaceApi.getWorkspace(workspaceId),
      workspaceApi.getRoom(workspaceId, roomId),
    ])
      .then(([wsRes, roomRes]) => {
        if (!isMounted) return;
        if (wsRes.success && wsRes.data) {
          setWorkspace(wsRes.data);
        } else {
          setError(wsRes.error?.message || 'Failed to load workspace');
        }

        if (roomRes.success && roomRes.data) {
          setRoom(roomRes.data);
        } else {
          setError(roomRes.error?.message || 'Failed to load room');
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('An error occurred while loading room data');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId, roomId]);

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Link
            href="/dashboard"
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
          <Link
            href={`/workspaces/${workspaceId}`}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors truncate max-w-xs"
          >
            {workspace?.name || 'Workspace'}
          </Link>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
          <Link
            href={`/workspaces/${workspaceId}/rooms`}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Rooms
          </Link>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-900 dark:text-zinc-100 font-medium truncate">
            {room?.name || 'Room'}
          </span>
        </nav>

        {isLoading ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm animate-pulse space-y-4">
            <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-72 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
            <div className="h-64 w-full bg-zinc-100 dark:bg-zinc-800/40 rounded mt-6" />
          </div>
        ) : error || !room ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/60 text-center space-y-4">
            <div className="text-red-600 dark:text-red-400 font-semibold">{error}</div>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Room Info Header */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {room.name}
                  </h1>
                  <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    #{room.slug}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                    {room.visibility === 'PUBLIC' ? (
                      <>
                        <Globe className="w-3 h-3 text-sky-500" /> Public
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-zinc-400" /> Private
                      </>
                    )}
                  </span>
                </div>
                {room.description && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {room.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-zinc-400 pt-1">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    Created by @{room.createdBy.username}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(room.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/workspaces/${workspaceId}/rooms`}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>All Rooms</span>
                </Link>
              </div>
            </div>

            {/* Room Collaboration Workspace View (Phase 4 Ready Indicator) */}
            <div className="p-8 sm:p-12 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-xl space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Code2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Real-Time Code Room</span>
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                        <Activity className="w-3 h-3 animate-pulse" />
                        Room Active
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-400 font-mono">
                      Workspace: {workspace?.slug} / Room: {room.slug}
                    </p>
                  </div>
                </div>

                <div className="font-mono text-xs px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                  UUID: {room.id}
                </div>
              </div>

              {/* Terminal / Status preview */}
              <div className="space-y-4">
                <div className="p-6 rounded-xl bg-zinc-900/80 border border-zinc-800/80 font-mono text-xs space-y-2.5 text-zinc-300">
                  <div className="flex items-center justify-between text-zinc-500 border-b border-zinc-800 pb-2">
                    <span className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-purple-400" />
                      SYNCODE Real-Time State Hub
                    </span>
                    <span className="text-[10px]">Phase 3 Scope Completed</span>
                  </div>

                  <p className="text-emerald-400">
                    ✓ Workspace access control verified: Role ({workspace?.currentUserRole})
                  </p>
                  <p className="text-emerald-400">
                    ✓ Room persistence active in PostgreSQL: ID ({room.id})
                  </p>
                  <p className="text-purple-300">
                    ⚡ Prepared for Phase 4: Real-Time CRDT vector clocks and WebSocket document synchronization will attach to this room.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs text-purple-300 flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span>
                    Phase 3 guarantees room authorization and workspace tenancy. Live collaborative code editing (Yjs / Monaco editor) begins in Phase 4.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      }
    >
      <RoomDetailContent params={params} />
    </Suspense>
  );
}
