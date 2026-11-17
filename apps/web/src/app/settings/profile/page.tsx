'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, Save } from 'lucide-react';
import type { AuthUser } from '@syncode/validation';

function ProfileForm({ user }: { user: AuthUser }) {
  const { updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [username, setUsername] = useState(user.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsSaving(true);

    const res = await updateProfile({
      displayName: displayName.trim() || undefined,
      username: username.toLowerCase().trim() || undefined,
      avatarUrl: avatarUrl.trim() || null,
    });

    setIsSaving(false);
    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Profile updated successfully!' });
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to update profile' });
    }
  };

  return (
    <>
      {statusMessage && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          )}
          <p>{statusMessage.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
            Email Address (Cannot be changed directly)
          </label>
          <input
            type="text"
            disabled
            value={user.email}
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 text-sm cursor-not-allowed font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your full name or handle"
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
            Username
          </label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="unique_username"
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 font-mono text-sm"
          />
          <p className="text-xs text-zinc-400">
            May only contain letters, numbers, underscores, and dashes.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
            Avatar Image URL
          </label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 text-sm font-mono"
          />
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium text-sm transition-all shadow-md disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Changes</span>
          </button>
        </div>
      </form>
    </>
  );
}

export default function ProfileSettingsPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Profile Settings</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Manage your identity and public profile details
            </p>
          </div>
        </div>

        {user ? (
          <ProfileForm key={user.id} user={user} />
        ) : (
          <div className="p-8 text-center text-sm font-mono text-zinc-500">Loading user profile...</div>
        )}
      </div>
    </ProtectedRoute>
  );
}
