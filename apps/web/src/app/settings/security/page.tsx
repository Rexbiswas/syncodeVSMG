'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { authApi } from '@/lib/auth-api';
import { ProtectedRoute } from '@/components/protected-route';
import type { SessionItem } from '@syncode/validation';
import {
  KeyRound,
  Shield,
  Laptop,
  Trash2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  LogOut,
} from 'lucide-react';

export default function SecuritySettingsPage() {
  const { logoutAll } = useAuth();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [sessionActionError, setSessionActionError] = useState<string | null>(null);

  const reloadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    const res = await authApi.getSessions();
    if (res.success && res.data) {
      setSessions(res.data);
    }
    setIsLoadingSessions(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    authApi.getSessions().then((res) => {
      if (mounted) {
        if (res.success && res.data) {
          setSessions(res.data);
        }
        setIsLoadingSessions(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const passwordChecks = useMemo(() => ({
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
    matches: newPassword.length > 0 && newPassword === confirmNewPassword,
    different: newPassword.length > 0 && newPassword !== currentPassword,
  }), [newPassword, confirmNewPassword, currentPassword]);

  const isNewPasswordValid = passwordChecks.length &&
    passwordChecks.upper &&
    passwordChecks.lower &&
    passwordChecks.number &&
    passwordChecks.special &&
    passwordChecks.matches &&
    passwordChecks.different;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!isNewPasswordValid) {
      setPasswordStatus({
        type: 'error',
        text: 'Please ensure your new password satisfies all requirements and differs from your current password.',
      });
      return;
    }

    setIsChangingPassword(true);
    const res = await authApi.changePassword({
      currentPassword,
      newPassword,
      confirmNewPassword,
    });
    setIsChangingPassword(false);

    if (res.success) {
      setPasswordStatus({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      reloadSessions();
    } else {
      setPasswordStatus({ type: 'error', text: res.error?.message || 'Failed to change password' });
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setSessionActionError(null);
    const res = await authApi.revokeSession(sessionId);
    if (res.success) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } else {
      setSessionActionError(res.error?.message || 'Failed to revoke session');
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Security & Sessions</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Update credentials and monitor active browser sessions
            </p>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Change Password</h2>
              <p className="text-xs text-zinc-500">
                Argon2id password encryption protects your SYNCODE account
              </p>
            </div>
          </div>

          {passwordStatus && (
            <div
              className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
                passwordStatus.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300'
              }`}
            >
              {passwordStatus.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
              )}
              <p>{passwordStatus.text}</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 text-sm"
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-zinc-500 dark:text-zinc-400">
                <span className={`flex items-center gap-1 ${passwordChecks.length ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {passwordChecks.length ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  8+ chars
                </span>
                <span className={`flex items-center gap-1 ${passwordChecks.upper ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {passwordChecks.upper ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  Uppercase
                </span>
                <span className={`flex items-center gap-1 ${passwordChecks.lower ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {passwordChecks.lower ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  Lowercase
                </span>
                <span className={`flex items-center gap-1 ${passwordChecks.number ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {passwordChecks.number ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  Number
                </span>
                <span className={`flex items-center gap-1 ${passwordChecks.special ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {passwordChecks.special ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  Special symbol
                </span>
                <span className={`flex items-center gap-1 ${passwordChecks.matches ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {passwordChecks.matches ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  Matches
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isChangingPassword || !isNewPasswordValid}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium text-sm transition-all shadow-md disabled:opacity-50"
              >
                {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>

        {/* Active Sessions Section */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Active Sessions</h2>
                <p className="text-xs text-zinc-500">
                  Devices currently signed into your account via rotated refresh tokens
                </p>
              </div>
            </div>

            <button
              onClick={() => logoutAll()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Revoke All Other Sessions</span>
            </button>
          </div>

          {sessionActionError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span>{sessionActionError}</span>
            </div>
          )}

          {isLoadingSessions ? (
            <div className="py-8 text-center text-zinc-500 text-sm font-mono flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-zinc-500 italic py-4">No active sessions found.</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sessions.map((sess) => (
                <div key={sess.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 mt-1">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {sess.isCurrent ? 'Current Session' : 'Active Device'}
                        </span>
                        {sess.isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wider">
                            This Device
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                        IP: {sess.ipAddress || '127.0.0.1'} • Created: {new Date(sess.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate max-w-sm">
                        {sess.userAgent || 'Unknown Browser'}
                      </p>
                    </div>
                  </div>

                  {!sess.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(sess.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Revoke session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
