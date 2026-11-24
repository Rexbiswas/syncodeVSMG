'use client';

import React, { useEffect, useState, use, useCallback, Suspense } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { WorkspaceHeader } from '@/components/workspace-header';
import { workspaceApi, type SendInvitationResponse } from '@/lib/workspace-api';
import {
  WorkspaceRole,
  type WorkspaceDetail,
  type WorkspaceInvitationItem,
} from '@syncode/validation';
import {
  Mail,
  Send,
  Copy,
  Check,
  RefreshCw,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
} from 'lucide-react';

function WorkspaceInvitationsContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.id;

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [invitations, setInvitations] = useState<WorkspaceInvitationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Send form states
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>(WorkspaceRole.MEMBER);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<SendInvitationResponse | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Copied state
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [wsRes, invRes] = await Promise.all([
        workspaceApi.getWorkspace(workspaceId),
        workspaceApi.listInvitations(workspaceId),
      ]);

      if (wsRes.success && wsRes.data) {
        setWorkspace(wsRes.data);
      } else {
        setError(wsRes.error?.message || 'Failed to load workspace');
      }

      if (invRes.success && invRes.data) {
        setInvitations(invRes.data);
      }
    } catch {
      setError('An error occurred while loading invitations');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      workspaceApi.getWorkspace(workspaceId),
      workspaceApi.listInvitations(workspaceId),
    ])
      .then(([wsRes, invRes]) => {
        if (!isMounted) return;
        if (wsRes.success && wsRes.data) {
          setWorkspace(wsRes.data);
        } else {
          setError(wsRes.error?.message || 'Failed to load workspace');
        }

        if (invRes.success && invRes.data) {
          setInvitations(invRes.data);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('An error occurred while loading invitations');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    setSendSuccess(null);

    if (!email.trim()) {
      setSendError('Please provide a valid email address');
      return;
    }

    setIsSending(true);
    try {
      const res = await workspaceApi.sendInvitation(workspaceId, {
        email: email.trim().toLowerCase(),
        role: role as 'ADMIN' | 'MEMBER' | 'VIEWER',
      });

      if (res.success && res.data) {
        setSendSuccess(res.data);
        setEmail('');
        // Refresh invitations list
        const updated = await workspaceApi.listInvitations(workspaceId);
        if (updated.success && updated.data) {
          setInvitations(updated.data);
        }
      } else {
        setSendError(res.error?.message || 'Failed to send invitation');
      }
    } catch {
      setSendError('An error occurred while sending invitation');
    } finally {
      setIsSending(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    setActionLoadingId(invitationId);
    try {
      const res = await workspaceApi.revokeInvitation(workspaceId, invitationId);
      if (res.success) {
        setInvitations((prev) =>
          prev.map((inv) =>
            inv.id === invitationId ? { ...inv, status: 'REVOKED' } : inv,
          ),
        );
      } else {
        alert(res.error?.message || 'Failed to revoke invitation');
      }
    } catch {
      alert('An error occurred while revoking invitation');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResend = async (invitationId: string) => {
    setActionLoadingId(invitationId);
    try {
      const res = await workspaceApi.resendInvitation(workspaceId, invitationId);
      if (res.success && res.data) {
        setSendSuccess(res.data);
        const updated = await workspaceApi.listInvitations(workspaceId);
        if (updated.success && updated.data) {
          setInvitations(updated.data);
        }
      } else {
        alert(res.error?.message || 'Failed to resend invitation');
      }
    } catch {
      alert('An error occurred while resending invitation');
    } finally {
      setActionLoadingId(null);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(url);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const isOwner = workspace?.currentUserRole === WorkspaceRole.OWNER;

  const statusBadgeStyles: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    ACCEPTED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    REVOKED: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800',
    EXPIRED: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
  };

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

            {/* Send Invitation Form */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-zinc-500" />
                  Invite a Developer
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Send a single-use, secure invitation link to collaborate in this workspace.
                </p>
              </div>

              {sendError && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              {sendSuccess && sendSuccess.invitationUrl && (
                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-purple-900 dark:purple-200">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Invitation generated for {sendSuccess.email}!</span>
                  </div>
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    Share this private single-use link with the invitee:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={sendSuccess.invitationUrl}
                      className="w-full px-3 py-1.5 rounded-lg font-mono text-xs bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-800 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sendSuccess.invitationUrl!)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors flex-shrink-0"
                    >
                      {copiedToken === sendSuccess.invitationUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendInvitation} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  placeholder="collaborator@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as WorkspaceRole)}
                  className="px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                >
                  {isOwner && <option value={WorkspaceRole.ADMIN}>ADMIN</option>}
                  <option value={WorkspaceRole.MEMBER}>MEMBER</option>
                  <option value={WorkspaceRole.VIEWER}>VIEWER</option>
                </select>

                <button
                  type="submit"
                  disabled={isSending || !email.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Invite</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Invitations List */}
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Invitation History ({invitations.length})
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Track sent invitations and their single-use acceptance status.
                </p>
              </div>

              {invitations.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  No invitations sent for this workspace yet.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                            {inv.email}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusBadgeStyles[inv.status] || statusBadgeStyles.PENDING
                              }`}
                          >
                            {inv.status}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            {inv.role}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-3">
                          <span>Invited by @{inv.invitedBy.username}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            Expires {new Date(inv.expiresAt).toLocaleDateString()}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {inv.status === 'PENDING' && (
                          <button
                            onClick={() => handleRevoke(inv.id)}
                            disabled={actionLoadingId === inv.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-red-600 hover:border-red-300 text-xs font-medium transition-colors"
                          >
                            {actionLoadingId === inv.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            <span>Revoke</span>
                          </button>
                        )}

                        {(inv.status === 'PENDING' || inv.status === 'EXPIRED') && (
                          <button
                            onClick={() => handleResend(inv.id)}
                            disabled={actionLoadingId === inv.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors"
                          >
                            {actionLoadingId === inv.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            <span>Resend</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function WorkspaceInvitationsPage({
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
      <WorkspaceInvitationsContent params={params} />
    </Suspense>
  );
}
