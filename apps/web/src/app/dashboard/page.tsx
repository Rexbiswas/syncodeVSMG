'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { workspaceApi } from '@/lib/workspace-api';
import type { WorkspaceItem } from '@syncode/validation';
import {
  FolderCode,
  Plus,
  Users,
  Layers,
  Shield,
  Lock,
  Globe,
  ArrowRight,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  User,
  KeyRound,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await workspaceApi.listWorkspaces();
      if (res.success && res.data) {
        setWorkspaces(res.data);
      } else {
        setError(res.error?.message || 'Failed to load workspaces');
      }
    } catch {
      setError('An unexpected error occurred while loading workspaces');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    workspaceApi.listWorkspaces().then((res) => {
      if (!isMounted) return;
      if (res.success && res.data) {
        setWorkspaces(res.data);
      } else {
        setError(res.error?.message || 'Failed to load workspaces');
      }
      setIsLoading(false);
    }).catch(() => {
      if (!isMounted) return;
      setError('An unexpected error occurred while loading workspaces');
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const roleBadgeStyles: Record<string, string> = {
    OWNER: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    ADMIN: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    MEMBER: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    VIEWER: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  };

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xl shadow-md">
              {user?.displayName
                ? user.displayName.slice(0, 2).toUpperCase()
                : user?.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {user?.displayName || user?.username}
                </h1>
                {user?.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                ) : (
                  <Link
                    href="/verify-email"
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-medium hover:underline"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Unverified
                  </Link>
                )}
              </div>
              <p className="text-sm font-mono text-zinc-500 dark:text-zinc-400">
                @{user?.username} • {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4 text-zinc-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Workspaces Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Workspaces
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Select or create a workspace to collaborate in real-time rooms.
              </p>
            </div>
            <Link
              href="/workspaces/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Workspace</span>
            </Link>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={fetchWorkspaces}
                className="inline-flex items-center gap-1.5 font-medium underline hover:no-underline"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm animate-pulse space-y-4"
                >
                  <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-4 w-48 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
                  <div className="h-10 w-full bg-zinc-100 dark:bg-zinc-800/40 rounded mt-4" />
                </div>
              ))}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                <FolderCode className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  No workspaces found
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                  You haven&apos;t created or joined any workspaces yet. Create your first workspace to start collaborating and managing rooms.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/workspaces/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-sm font-semibold transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Workspace</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((ws) => (
                <Link
                  key={ws.id}
                  href={`/workspaces/${ws.id}`}
                  className="group p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 shadow-sm transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {ws.name}
                        </h3>
                        <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                          {ws.slug}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                          roleBadgeStyles[ws.role] || roleBadgeStyles.VIEWER
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {ws.role}
                      </span>
                    </div>

                    <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 min-h-[2.5rem]">
                      {ws.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800/80 mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {ws._count?.members ?? 1} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        {ws._count?.rooms ?? 0} rooms
                      </span>
                      <span className="flex items-center gap-1">
                        {ws.visibility === 'PUBLIC' ? (
                          <>
                            <Globe className="w-3.5 h-3.5 text-sky-500" /> Public
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-zinc-400" /> Private
                          </>
                        )}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Settings & Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <Link
            href="/settings/profile"
            className="group p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Profile Settings</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Update your display name, username, and public avatar
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/settings/security"
            className="group p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Security & Sessions</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Change password, monitor active sessions, and revoke devices
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  );
}
