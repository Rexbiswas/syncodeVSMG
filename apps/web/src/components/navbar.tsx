'use client';

import Link from 'next/link';
import { Code2, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white font-bold text-sm dark:bg-zinc-100 dark:text-zinc-900">
              <Code2 className="h-3.5 w-3.5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              SYNCODE
            </span>
          </Link>
        </div>

        <nav className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Overview
          </Link>
          <Link
            href="/status"
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Status
          </Link>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-zinc-500" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <Link
                href="/settings/profile"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:ring-2 hover:ring-zinc-400 transition-all"
                title={`${user.displayName || user.username} (${user.email})`}
              >
                {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : user.username.slice(0, 2).toUpperCase()}
              </Link>
              <button
                onClick={() => logout()}
                className="text-zinc-500 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <Link
                href="/login"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white px-3 py-1.5 rounded-md transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
