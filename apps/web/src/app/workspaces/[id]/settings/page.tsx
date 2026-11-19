'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { WorkspaceHeader } from '@/components/workspace-header';
import { workspaceApi } from '@/lib/workspace-api';
import {
  WorkspaceVisibility,
  WorkspaceRole,
  type WorkspaceDetail,
  type WorkspaceMemberItem,
} from '@syncode/validation';
import {
  Settings,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  UserCheck,
  RefreshCw,
  Lock,
  Globe,
} from 'lucide-react';

export default function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.id;

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // General settings state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<WorkspaceVisibility>(WorkspaceVisibility.PRIVATE);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Transfer ownership state
  const [newOwnerId, setNewOwnerId] = useState('');
  const [transferConfirmText, setTransferConfirmText] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Delete workspace state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
        setName(wsRes.data.name);
        setDescription(wsRes.data.description || '');
        setVisibility(wsRes.data.visibility);
      } else {
        setError(wsRes.error?.message || 'Failed to load workspace settings');
      }

      if (membersRes.success && membersRes.data) {
        setMembers(membersRes.data);
      }
    } catch {
      setError('An error occurred while loading workspace settings');
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
          setName(wsRes.data.name);
          setDescription(wsRes.data.description || '');
          setVisibility(wsRes.data.visibility);
        } else {
          setError(wsRes.error?.message || 'Failed to load workspace settings');
        }

        if (membersRes.success && membersRes.data) {
          setMembers(membersRes.data);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('An error occurred while loading workspace settings');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  const handleUpdateGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setGeneralSuccess(null);

    if (name.trim().length < 2) {
      setGeneralError('Workspace name must be at least 2 characters');
      return;
    }

    setIsSavingGeneral(true);
    try {
      const res = await workspaceApi.updateWorkspace(workspaceId, {
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        visibility,
      });

      if (res.success && res.data) {
        setWorkspace(res.data);
        setGeneralSuccess('Workspace details updated successfully');
      } else {
        setGeneralError(res.error?.message || 'Failed to update workspace');
      }
    } catch {
      setGeneralError('An error occurred while updating workspace');
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);

    if (!newOwnerId) {
      setTransferError('Please select a member to transfer ownership to');
      return;
    }

    if (transferConfirmText !== 'TRANSFER') {
      setTransferError('Please type TRANSFER to confirm ownership change');
      return;
    }

    setIsTransferring(true);
    try {
      const res = await workspaceApi.transferOwnership(workspaceId, {
        newOwnerId,
      });

      if (res.success && res.data) {
        alert('Ownership transferred successfully. Your role is now ADMIN.');
        router.push(`/workspaces/${workspaceId}`);
      } else {
        setTransferError(res.error?.message || 'Failed to transfer ownership');
      }
    } catch {
      setTransferError('An error occurred while transferring ownership');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleDeleteWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    if (deleteConfirmText !== workspace?.slug) {
      setDeleteError(`Please type "${workspace?.slug}" exactly to confirm deletion`);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await workspaceApi.deleteWorkspace(workspaceId);
      if (res.success) {
        router.push('/dashboard');
      } else {
        setDeleteError(res.error?.message || 'Failed to delete workspace');
      }
    } catch {
      setDeleteError('An error occurred while deleting workspace');
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwner = workspace?.currentUserRole === WorkspaceRole.OWNER;
  const isOwnerOrAdmin = isOwner || workspace?.currentUserRole === WorkspaceRole.ADMIN;

  const eligibleNewOwners = members.filter(
    (m) => m.userId !== workspace?.ownerId,
  );

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
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
        ) : !isOwnerOrAdmin ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Access Restricted
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Only workspace OWNER and ADMIN members can modify settings.
            </p>
          </div>
        ) : (
          <>
            <WorkspaceHeader workspace={workspace} />

            {/* General Settings */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-zinc-500" />
                  General Settings
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Update public details and visibility for this workspace.
                </p>
              </div>

              {generalSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{generalSuccess}</span>
                </div>
              )}
              {generalError && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{generalError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateGeneral} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Workspace Visibility
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setVisibility(WorkspaceVisibility.PRIVATE)}
                      className={`p-3.5 rounded-xl border text-left flex items-start gap-3 ${visibility === WorkspaceVisibility.PRIVATE
                        ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-500'
                        : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                    >
                      <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Private
                        </div>
                        <div className="text-xs text-zinc-500">Only invited members can access.</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVisibility(WorkspaceVisibility.PUBLIC)}
                      className={`p-3.5 rounded-xl border text-left flex items-start gap-3 ${visibility === WorkspaceVisibility.PUBLIC
                        ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-500'
                        : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                    >
                      <Globe className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Public
                        </div>
                        <div className="text-xs text-zinc-500">Authenticated users can view metadata.</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingGeneral || !name.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                  >
                    {isSavingGeneral ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Danger Zone (OWNER ONLY) */}
            {isOwner && (
              <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/60 shadow-sm space-y-8">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" />
                    Danger Zone
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    High-impact administrative actions reserved strictly for the workspace owner.
                  </p>
                </div>

                {/* Transfer Ownership Form */}
                <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-zinc-500" />
                      Transfer Workspace Ownership
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Transfer full owner privileges to an existing member. Your role will be changed to ADMIN.
                    </p>
                  </div>

                  {transferError && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-xs text-red-600 dark:text-red-400">
                      {transferError}
                    </div>
                  )}

                  {eligibleNewOwners.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">
                      There are no other members in this workspace to transfer ownership to.
                    </p>
                  ) : (
                    <form onSubmit={handleTransferOwnership} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          value={newOwnerId}
                          onChange={(e) => setNewOwnerId(e.target.value)}
                          className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100"
                        >
                          <option value="">Select eligible member...</option>
                          {eligibleNewOwners.map((m) => (
                            <option key={m.userId} value={m.userId}>
                              @{m.user.username} ({m.user.email}) [{m.role}]
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          placeholder="Type TRANSFER to confirm"
                          value={transferConfirmText}
                          onChange={(e) => setTransferConfirmText(e.target.value)}
                          className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 font-mono"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isTransferring || !newOwnerId || transferConfirmText !== 'TRANSFER'}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-50"
                        >
                          {isTransferring ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Transfer Ownership</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Delete Workspace Form */}
                <div className="p-5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/20 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Delete Workspace
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Permanently delete this workspace, including all rooms, memberships, and invitations. This action cannot be undone.
                    </p>
                  </div>

                  {deleteError && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-xs text-red-600 dark:text-red-400">
                      {deleteError}
                    </div>
                  )}

                  <form onSubmit={handleDeleteWorkspace} className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Type <span className="font-mono font-bold text-red-600 dark:text-red-400">{workspace.slug}</span> to confirm deletion:
                      </label>
                      <input
                        type="text"
                        placeholder={workspace.slug}
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-red-300 dark:border-red-900 text-xs text-zinc-900 dark:text-zinc-100 font-mono"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isDeleting || deleteConfirmText !== workspace.slug}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Permanently Delete Workspace</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
