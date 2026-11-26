'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  Activity,
  User,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo Area */}
        <div className="flex items-center shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg p-1"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white font-bold text-sm shadow-sm dark:bg-zinc-100 dark:text-zinc-900 transition-transform group-hover:scale-105">
              <Code2 className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              SYNCODE
            </span>
          </Link>
        </div>

        {/* Desktop Navigation Links & Actions (Hidden on Mobile) */}
        <nav className="hidden md:flex items-center gap-6">
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
            <div className="flex items-center gap-3 pl-3 border-l border-zinc-200 dark:border-zinc-800">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-zinc-500" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/settings/profile"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:ring-2 hover:ring-zinc-400 transition-all"
                title={`${user.displayName || user.username} (${user.email})`}
              >
                {user.displayName
                  ? user.displayName.slice(0, 2).toUpperCase()
                  : user.username.slice(0, 2).toUpperCase()}
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="text-zinc-500 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-3 border-l border-zinc-200 dark:border-zinc-800">
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

        {/* Mobile Navigation Controls (Visible ONLY on Mobile < md) */}
        <div className="flex md:hidden items-center gap-2">
          {isAuthenticated && user ? (
            <Link
              href="/dashboard"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:ring-2 hover:ring-zinc-400 transition-all mr-1"
              title={user.displayName || user.username}
            >
              {user.displayName
                ? user.displayName.slice(0, 2).toUpperCase()
                : user.username.slice(0, 2).toUpperCase()}
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold px-2.5 py-1.5 rounded-md text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              Sign In
            </Link>
          )}

          {/* Hamburger Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl shadow-xl"
          >
            <div className="px-4 py-4 space-y-3">
              {/* Navigation Links */}
              <div className="space-y-1">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Code2 className="h-4 w-4 text-zinc-400" />
                    <span>Overview</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                </Link>

                <Link
                  href="/status"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    <span>Platform Status</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Operational
                  </span>
                </Link>
              </div>

              {/* User Section in Mobile Menu */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80">
                {isAuthenticated && user ? (
                  <div className="space-y-2">
                    {/* User Profile summary card */}
                    <div className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {user.displayName || user.username}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {user.email}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <LayoutDashboard className="h-4 w-4 text-zinc-400" />
                        <span>Workspaces Dashboard</span>
                      </Link>

                      <Link
                        href="/settings/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <User className="h-4 w-4 text-zinc-400" />
                        <span>Profile &amp; Settings</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full text-center px-4 py-2 rounded-lg text-sm font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full text-center px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
