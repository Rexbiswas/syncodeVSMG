'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FolderCode,
  Users,
  Mail,
  Settings,
  ChevronRight,
  Shield,
  Globe,
  Lock,
  Layers,
} from 'lucide-react';
import type { WorkspaceDetail } from '@syncode/validation';

interface WorkspaceHeaderProps {
  workspace: WorkspaceDetail;
}

export function WorkspaceHeader({ workspace }: WorkspaceHeaderProps) {
  const pathname = usePathname();
  const baseUrl = `/workspaces/${workspace.id}`;

  const isOwnerOrAdmin =
    workspace.currentUserRole === 'OWNER' ||
    workspace.currentUserRole === 'ADMIN';

  const tabs = [
    { label: 'Overview', href: baseUrl, icon: FolderCode, exact: true },
    { label: 'Rooms', href: `${baseUrl}/rooms`, icon: Layers },
    { label: 'Members', href: `${baseUrl}/members`, icon: Users },
    ...(isOwnerOrAdmin
      ? [
          { label: 'Invitations', href: `${baseUrl}/invitations`, icon: Mail },
          { label: 'Settings', href: `${baseUrl}/settings`, icon: Settings },
        ]
      : []),
  ];

  const roleBadgeStyles: Record<string, string> = {
    OWNER: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    ADMIN: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    MEMBER: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    VIEWER: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/dashboard"
          className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          Dashboard
        </Link>
        <ChevronRight className="w-4 h-4 text-zinc-400" />
        <span className="text-zinc-900 dark:text-zinc-100 font-medium truncate max-w-xs">
          {workspace.name}
        </span>
      </nav>

      {/* Main Workspace Header Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {workspace.name}
              </h1>
              <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                {workspace.slug}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                  roleBadgeStyles[workspace.currentUserRole] || roleBadgeStyles.VIEWER
                }`}
              >
                <Shield className="w-3 h-3" />
                {workspace.currentUserRole}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                {workspace.visibility === 'PUBLIC' ? (
                  <>
                    <Globe className="w-3 h-3 text-sky-500" /> Public
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-zinc-400" /> Private
                  </>
                )}
              </span>
            </div>
            {workspace.description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
                {workspace.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
            <div className="text-right">
              <div className="text-xs uppercase font-medium tracking-wider text-zinc-400">
                Members
              </div>
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {workspace._count?.members ?? 1}
              </div>
            </div>
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="text-right">
              <div className="text-xs uppercase font-medium tracking-wider text-zinc-400">
                Rooms
              </div>
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {workspace._count?.rooms ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
