'use client';

import React, { useEffect, useState, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { workspaceApi, type InvitationPreview } from '@/lib/workspace-api';
import { useAuth } from '@/context/auth-context';
import {
  Mail,
  Shield,
  FolderCode,
  ArrowRight,
  AlertCircle,
  Loader2,
  Clock,
  LogIn,
  UserPlus,
} from 'lucide-react';

function AcceptInvitationContent({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    workspaceApi
      .getInvitationPreview(token)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setPreview(res.data);
        } else {
          setError(res.error?.message || 'Invalid or expired invitation link');
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('Failed to load invitation details');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleAccept = async () => {
    setIsAccepting(true);
    setAcceptError(null);
    try {
      const res = await workspaceApi.acceptInvitation(token);
      if (res.success && res.data) {
        router.push(`/workspaces/${res.data.workspaceId}`);
      } else {
        setAcceptError(res.error?.message || 'Failed to accept invitation');
      }
    } catch {
      setAcceptError('An unexpected error occurred while accepting invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const isEmailMatching =
    user?.email.toLowerCase() === preview?.email.toLowerCase();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 shadow-xl space-y-6">
        {isLoading || isAuthLoading ? (
          <div className="text-center py-10 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Verifying invitation link...
            </p>
          </div>
        ) : error || !preview ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Invalid or Expired Invitation
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {error || 'This invitation link is not valid or has expired.'}
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-semibold"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Header / Workspace Invitation Details */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner">
                <FolderCode className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Join Workspace
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  @{preview.invitedBy.username}
                </span>{' '}
                has invited you to collaborate in:
              </p>
            </div>

            {/* Workspace Card Preview */}
            <div className="p-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    {preview.workspace.name}
                  </h3>
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    #{preview.workspace.slug}
                  </span>
                </div>
                <span className="font-semibold text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {preview.role}
                </span>
              </div>

              {preview.workspace.description && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                  {preview.workspace.description}
                </p>
              )}

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Sent to: {preview.email}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Expires:{' '}
                  {new Date(preview.expiresAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {acceptError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{acceptError}</span>
              </div>
            )}

            {/* Acceptance or Auth Prompts */}
            {isAuthenticated && user ? (
              isEmailMatching ? (
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isAccepting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Joining Workspace...</span>
                      </>
                    ) : (
                      <>
                        <span>Accept Invitation & Join</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-zinc-400">
                    Signed in as <span className="font-medium text-zinc-300">{user.email}</span>
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Email Mismatch</span>
                  </div>
                  <p>
                    This invitation was sent to <strong className="font-mono">{preview.email}</strong>.
                    You are currently signed in as <strong className="font-mono">{user.email}</strong>.
                  </p>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Please switch accounts or log in with the invited email address to accept this workspace invitation.
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-4 pt-2">
                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                  You must be signed in with <strong className="text-zinc-700 dark:text-zinc-200">{preview.email}</strong> to accept this invitation.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href={`/login?redirect=/invitations/${token}`}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href={`/register?email=${encodeURIComponent(preview.email)}&redirect=/invitations/${token}`}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-sm font-semibold transition-colors shadow-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register</span>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-600 dark:text-zinc-400" />
            <p className="text-xs font-mono text-zinc-500">Loading invitation...</p>
          </div>
        </div>
      }
    >
      <AcceptInvitationContent params={params} />
    </Suspense>
  );
}
