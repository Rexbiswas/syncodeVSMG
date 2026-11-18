'use client';

import React, { useEffect, useState, use, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { WorkspaceHeader } from '@/components/workspace-header';
import { workspaceApi } from '@/lib/workspace-api';
import type { WorkspaceDetail, RoomItem, WorkspaceMemberItem } from '@syncode/validation';
import {
  Layers,
  Users,
  Plus,
  Mail,
  User,
  Calendar,
  Lock,
  Globe,
  ArrowRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';

function WorkspaceOverviewContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.id;

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [wsRes, roomsRes, membersRes] = await Promise.all([
        workspaceApi.getWorkspace(workspaceId),
        workspaceApi.listRooms(workspaceId),
        workspaceApi.listMembers(workspaceId),
      ]);

      if (wsRes.success && wsRes.data) {
        setWorkspace(wsRes.data);
      } else {
        setError(wsRes.error?.message || 'Failed to load workspace');
      }

      if (roomsRes.success && roomsRes.data) {
        setRooms(roomsRes.data);
      }

      if (membersRes.success && membersRes.data) {
        setMembers(membersRes.data);
      }
    } catch {
      setError('An error occurred while loading workspace details');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      workspaceApi.getWorkspace(workspaceId),
      workspaceApi.listRooms(workspaceId),
      workspaceApi.listMembers(workspaceId),
    ])
      .then(([wsRes, roomsRes, membersRes]) => {
        if (!isMounted) return;
        if (wsRes.success && wsRes.data) {
          setWorkspace(wsRes.data);
        } else {
          setError(wsRes.error?.message || 'Failed to load workspace');
        }

        if (roomsRes.success && roomsRes.data) {
          setRooms(roomsRes.data);
        }

        if (membersRes.success && membersRes.data) {
          setMembers(membersRes.data);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('An error occurred while loading workspace details');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  const isOwnerOrAdmin =
    workspace?.currentUserRole === 'OWNER' ||
    workspace?.currentUserRole === 'ADMIN';

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {isLoading ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm animate-pulse space-y-6">
            <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-72 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
            <div className="h-32 w-full bg-zinc-100 dark:bg-zinc-800/40 rounded mt-6" />
          </div>
        ) : error || !workspace ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/60 text-center space-y-4">
            <div className="text-red-600 dark:text-red-400 font-semibold">
              {error || 'Workspace could not be loaded'}
            </div>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <>
            <WorkspaceHeader workspace={workspace} />

            {/* Quick Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-sky-500/10 to-transparent border border-purple-200/50 dark:border-purple-900/40">
              <div className="space-y-0.5">
                <h2 className="font-bold text-zinc-900 dark:text-zinc-100">
                  Real-Time Collaboration Hub
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Create dedicated code rooms or invite team members to this workspace.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {workspace.currentUserRole !== 'VIEWER' && (
                  <Link
                    href={`/workspaces/${workspace.id}/rooms`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-semibold transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Room</span>
                  </Link>
                )}
                {isOwnerOrAdmin && (
                  <Link
                    href={`/workspaces/${workspace.id}/invitations`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Invite Teammates</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Rooms Section (2 cols) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-zinc-500" />
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      Collaboration Rooms ({rooms.length})
                    </h2>
                  </div>
                  <Link
                    href={`/workspaces/${workspace.id}/rooms`}
                    className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <span>View all rooms</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {rooms.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 space-y-3">
                    <Layers className="w-8 h-8 mx-auto text-zinc-400" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No rooms created in this workspace yet.
                    </p>
                    {workspace.currentUserRole !== 'VIEWER' && (
                      <Link
                        href={`/workspaces/${workspace.id}/rooms`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create First Room
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rooms.slice(0, 4).map((room) => (
                      <Link
                        key={room.id}
                        href={`/workspaces/${workspace.id}/rooms/${room.id}`}
                        className="group flex items-center justify-between p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all shadow-sm"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              {room.name}
                            </span>
                            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                              #{room.slug}
                            </span>
                          </div>
                          {room.description && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                              {room.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-zinc-400">
                          <span>Created by @{room.createdBy.username}</span>
                          <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Workspace Metadata & Roster Preview (1 col) */}
              <div className="space-y-6">
                {/* Workspace Info Card */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-xs text-zinc-400">
                    Workspace Overview
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4 text-zinc-400" /> Owner
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        @{workspace.owner.username}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-zinc-400" /> Created
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {new Date(workspace.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                      <span className="flex items-center gap-2">
                        {workspace.visibility === 'PUBLIC' ? (
                          <Globe className="w-4 h-4 text-sky-500" />
                        ) : (
                          <Lock className="w-4 h-4 text-zinc-400" />
                        )}
                        Visibility
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                        {workspace.visibility.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Team Roster Preview */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Users className="w-4 h-4 text-zinc-400" />
                      Team Members ({members.length})
                    </h3>
                    <Link
                      href={`/workspaces/${workspace.id}/members`}
                      className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Manage
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {members.slice(0, 5).map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                            {m.user.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-zinc-900 dark:text-zinc-100 text-xs">
                              {m.user.displayName || m.user.username}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              @{m.user.username}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function WorkspaceOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      }
    >
      <WorkspaceOverviewContent params={params} />
    </Suspense>
  );
}
