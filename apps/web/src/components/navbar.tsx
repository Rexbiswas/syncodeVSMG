import Link from 'next/link';
import { Code2 } from 'lucide-react';


export function Navbar() {
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

        <nav className="flex items-center gap-6">
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
            System Status
          </Link>
        </nav>
      </div>
    </header>
  );
}

