'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { workspaceApi } from '@/lib/workspace-api';
import { WorkspaceVisibility } from '@syncode/validation';
import {
  FolderCode,
  ArrowLeft,
  Lock,
  Globe,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function NewWorkspacePage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<WorkspaceVisibility>(
    WorkspaceVisibility.PRIVATE,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugManual) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  };

  const handleSlugChange = (val: string) => {
    setIsSlugManual(true);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-'),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (name.trim().length < 2) {
      setErrorMessage('Workspace name must be at least 2 characters');
      return;
    }

    if (slug.trim().length < 2) {
      setErrorMessage('Workspace slug must be at least 2 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await workspaceApi.createWorkspace({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() ? description.trim() : null,
        visibility,
      });

      if (res.success && res.data) {
        router.push(`/workspaces/${res.data.id}`);
      } else {
        setErrorMessage(
          res.error?.message || 'Failed to create workspace. Please check your input.',
        );
      }
    } catch {
      setErrorMessage('An unexpected error occurred while creating workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                <FolderCode className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Create Workspace
              </h1>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Workspaces are shared hubs for your team to organize code collaboration rooms and manage roles.
            </p>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-sm text-red-600 dark:text-red-400 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Workspace Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="ws-name"
                className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200"
              >
                Workspace Name <span className="text-red-500">*</span>
              </label>
              <input
                id="ws-name"
                type="text"
                required
                maxLength={50}
                placeholder="e.g. Acme Core Team"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-zinc-400"
              />
            </div>

            {/* Workspace Slug */}
            <div className="space-y-1.5">
              <label
                htmlFor="ws-slug"
                className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200"
              >
                Workspace Slug <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="ws-slug"
                  type="text"
                  required
                  maxLength={50}
                  placeholder="e.g. acme-core-team"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl font-mono bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-zinc-400"
                />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label
                htmlFor="ws-desc"
                className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200"
              >
                Description <span className="text-xs text-zinc-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="ws-desc"
                rows={3}
                maxLength={300}
                placeholder="What is this workspace for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-zinc-400 resize-none"
              />
              <div className="flex justify-end text-xs text-zinc-400">
                {description.length}/300
              </div>
            </div>

            {/* Visibility Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Visibility
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVisibility(WorkspaceVisibility.PRIVATE)}
                  className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    visibility === WorkspaceVisibility.PRIVATE
                      ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-500'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <Lock className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    visibility === WorkspaceVisibility.PRIVATE ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-400'
                  }`} />
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Private
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Only invited members can view and access rooms.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility(WorkspaceVisibility.PUBLIC)}
                  className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    visibility === WorkspaceVisibility.PUBLIC
                      ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-500'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <Globe className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    visibility === WorkspaceVisibility.PUBLIC ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-400'
                  }`} />
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Public
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Any authenticated user can view basic workspace metadata.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !slug.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Workspace</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
