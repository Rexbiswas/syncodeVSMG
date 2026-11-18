'use client';

import React, { useEffect, useState, use, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { WorkspaceHeader } from '@/components/workspace-header';
import { workspaceApi } from '@/lib/workspace-api';
import { useAuth } from '@/context/auth-context';
import { WorkspaceRole, type WorkspaceDetail, type WorkspaceMemberItem } from '@syncode/validation';
import {
  Users,
  Shield,
  Trash2,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';

function WorkspaceMembersContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.id;

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [wsRes, membersRes] = await Promise.all([
        workspaceApi.getWorkspace(workspaceId),
        workspaceApi.listMembers(workspaceId),
      ]);

      if (wsRes.success && wsRes.data) {
        setWorkspace(wsRes.data);
      } else {
        setError(wsRes.error?.message || 'Failed to load workspace');
      }

      if (membersRes.success && membersRes.data) {
        setMembers(membersRes.data);
      }
    } catch {
      setError('An error occurred while loading member roster');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      workspaceApi.getWorkspace(workspaceId),
      workspaceApi.listMembers(workspaceId),
    ])
      .then(([wsRes, membersRes]) => {
        if (!isMounted) return;
        if (wsRes.success && wsRes.data) {
          setWorkspace(wsRes.data);
        } else {
          setError(wsRes.error?.message || 'Failed to load workspace');
        }

        if (membersRes.success && membersRes.data) {
          setMembers(membersRes.data);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('An error occurred while loading member roster');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  const handleRoleChange = async (
    targetUserId: string,
    newRole: 'ADMIN' | 'MEMBER' | 'VIEWER',
  ) => {
    setActionError(null);
    setActionSuccess(null);
    setUpdatingMemberId(targetUserId);

    try {
      const res = await workspaceApi.changeMemberRole(workspaceId, targetUserId, {
        role: newRole,
      });

      if (res.success && res.data) {
        setMembers((prev) =>
          prev.map((m) => (m.userId === targetUserId ? res.data! : m)),
        );
        setActionSuccess(`Member role updated to ${newRole}`);
      } else {
        setActionError(res.error?.message || 'Failed to update member role');
      }
    } catch {
      setActionError('An error occurred while updating member role');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (targetUserId: string, username: string) => {
    if (!confirm(`Are you sure you want to remove @${username} from this workspace?`)) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setUpdatingMemberId(targetUserId);

    try {
      const res = await workspaceApi.removeMember(workspaceId, targetUserId);
      if (res.success) {
        setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
        setActionSuccess(`@${username} has been removed from the workspace`);
      } else {
        setActionError(res.error?.message || 'Failed to remove member');
      }
    } catch {
      setActionError('An error occurred while removing member');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!confirm('Are you sure you want to leave this workspace?')) {
      return;
    }

    try {
      const res = await workspaceApi.leaveWorkspace(workspaceId);
      if (res.success) {
        router.push('/dashboard');
      } else {
        setActionError(res.error?.message || 'Failed to leave workspace');
      }
    } catch {
      setActionError('An error occurred while leaving workspace');
    }
  };

  const isOwner = workspace?.currentUserRole === WorkspaceRole.OWNER;
  const isAdmin = workspace?.currentUserRole === WorkspaceRole.ADMIN;

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {isLoading ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm animate-pulse space-y-4">
            <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-72 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
          </div>
        ) : error || !workspace ? (
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
          <>
            <WorkspaceHeader workspace={workspace} />

            {/* Notification messages */}
            {actionSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionSuccess}</span>
              </div>
            )}
            {actionError && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Member Roster Card */}
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Users className="w-5 h-5 text-zinc-500" />
                    Workspace Members ({members.length})
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Roles define permissions within the workspace and its collaboration rooms.
                  </p>
                </div>

                {!isOwner && (
                  <button
                    onClick={handleLeaveWorkspace}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Leave Workspace</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {members.map((member) => {
                  const isCurrentMemberRow = member.userId === user?.id;
                  const isRowOwner = member.role === WorkspaceRole.OWNER;
                  const isRowAdmin = member.role === WorkspaceRole.ADMIN;

                  // Can the active user manage this row?
                  // OWNER can manage any non-owner.
                  // ADMIN can manage non-admin, non-owner members (MEMBER, VIEWER).
                  const canManageThisRow =
                    !isCurrentMemberRow &&
                    !isRowOwner &&
                    (isOwner || (isAdmin && !isRowAdmin));

                  return (
                    <div
                      key={member.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/40 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-bold flex items-center justify-center shadow-sm">
                          {member.user.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                              {member.user.displayName || member.user.username}
                            </span>
                            {isCurrentMemberRow && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            @{member.user.username} • {member.user.email}
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {canManageThisRow ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={member.role}
                              disabled={updatingMemberId === member.userId}
                              onChange={(e) =>
                                handleRoleChange(
                                  member.userId,
                                  e.target.value as 'ADMIN' | 'MEMBER' | 'VIEWER',
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                            >
                              {isOwner && (
                                <option value={WorkspaceRole.ADMIN}>ADMIN</option>
                              )}
                              <option value={WorkspaceRole.MEMBER}>MEMBER</option>
                              <option value={WorkspaceRole.VIEWER}>VIEWER</option>
                            </select>

                            <button
                              onClick={() =>
                                handleRemoveMember(
                                  member.userId,
                                  member.user.username,
                                )
                              }
                              disabled={updatingMemberId === member.userId}
                              className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              title="Remove member"
                            >
                              {updatingMemberId === member.userId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 font-semibold">
                            <Shield className="w-3 h-3 text-zinc-400" />
                            {member.role}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function WorkspaceMembersPage({
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
      <WorkspaceMembersContent params={params} />
    </Suspense>
  );
}
