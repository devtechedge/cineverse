'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Film, Upload, LayoutGrid, LogOut, Menu, X, Sun, Moon, User } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-bg-base/70 border-b border-border-subtle">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-text-primary">
          <Film className="text-accent" size={22} />
          <span className="font-display text-2xl tracking-wider">CINEVERSE</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-text-secondary">
          <Link href="/library" className="hover:text-text-primary transition-colors flex items-center gap-2">
            <LayoutGrid size={16} /> Library
          </Link>
          <Link href="/upload" className="hover:text-text-primary transition-colors flex items-center gap-2">
            <Upload size={16} /> Upload
          </Link>

          {/* Theme toggle — visible to everyone */}
          <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-1.5 rounded-md border border-border-strong hover:border-accent hover:text-accent transition-colors"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/library"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-transparent hover:border-border-strong hover:text-text-primary transition-colors"
                aria-label="Go to your library"
                title="Your library"
              >
                <User size={14} className="text-accent" />
                <span className="text-text-primary">{user.full_name || user.email}</span>
              </Link>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1 text-text-secondary hover:text-accent transition-colors"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link href="/login" className="px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors">
              Sign in
            </Link>
          )}
        </nav>

        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="p-1.5 rounded-md border border-border-strong text-text-secondary"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            className="text-text-primary"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          'md:hidden overflow-hidden transition-all duration-300 ease-ui border-t border-border-subtle',
          open ? 'max-h-72' : 'max-h-0',
        )}
      >
        <div className="px-6 py-4 flex flex-col gap-3">
          <Link href="/library" onClick={() => setOpen(false)} className="text-text-secondary">Library</Link>
          <Link href="/upload" onClick={() => setOpen(false)} className="text-text-secondary">Upload</Link>
          {user ? (
            <>
              <Link href="/library" onClick={() => setOpen(false)} className="text-text-primary">
                {user.full_name || user.email}
              </Link>
              <button onClick={() => { logout(); setOpen(false); }} className="text-left text-accent">Log out</button>
            </>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)} className="text-accent">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
