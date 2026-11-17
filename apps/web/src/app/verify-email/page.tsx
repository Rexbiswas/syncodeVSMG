'use client';

import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/auth-api';
import { Code2, Loader2, AlertCircle, CheckCircle2, ArrowRight, RefreshCw, Mail } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenParam);
  const [resendEmail, setResendEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasTriggeredRef = useRef(false);

  const handleVerify = useCallback(async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) {
      setError('Please provide a verification token');
      return;
    }

    setIsVerifying(true);
    setError(null);
    const res = await authApi.verifyEmail(tokenToVerify.trim());
    setIsVerifying(false);

    if (res.success) {
      setIsVerified(true);
    } else {
      setError(res.error?.message || 'Verification token is invalid or has expired');
    }
  }, []);

  useEffect(() => {
    if (tokenParam && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      handleVerify(tokenParam);
    }
  }, [tokenParam, handleVerify]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResendStatus('Sending...');
    const res = await authApi.resendVerification(resendEmail.trim());
    if (res.success) {
      setResendStatus('If an unverified account exists, a new verification link was sent.');
    } else {
      setResendStatus(res.error?.message || 'Failed to resend verification.');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-md space-y-6 bg-white dark:bg-zinc-900/70 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-sm">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white font-bold text-lg dark:bg-zinc-100 dark:text-zinc-900 shadow-md">
            <Code2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Email Verification
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Confirm your email address to enable all SYNCODE platform capabilities
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
            <p>{error}</p>
          </div>
        )}

        {isVerified ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-semibold">Email Verified Successfully!</p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  Your email address has been verified. You can now use your account.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-sm font-medium transition-colors shadow-md"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
                Verification Token
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste verification token"
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleVerify(token)}
                  disabled={isVerifying || !token.trim()}
                  className="px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold disabled:opacity-50"
                >
                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Need a new verification link?
              </p>
              <form onSubmit={handleResend} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 pl-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                  <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend</span>
                </button>
              </form>
              {resendStatus && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">{resendStatus}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-mono text-zinc-500">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
