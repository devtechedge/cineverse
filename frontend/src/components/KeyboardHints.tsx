'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: 'Space / K',  action: 'Play / Pause' },
  { keys: '←',          action: 'Seek back 5s' },
  { keys: '→',          action: 'Seek forward 5s' },
  { keys: 'J',          action: 'Slow to 0.5×' },
  { keys: 'L',          action: 'Speed up to 2×' },
  { keys: 'M',          action: 'Mute / Unmute' },
  { keys: 'F',          action: 'Fullscreen' },
  { keys: '?',          action: 'Toggle this help' },
];

/** Press "?" anywhere to toggle a shortcut-cheatsheet overlay. */
export function KeyboardHints() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Show keyboard shortcuts"
        title="Keyboard shortcuts (press ?)"
        className="fixed bottom-6 left-6 z-30 p-2.5 rounded-full bg-bg-surface/80 backdrop-blur border border-border-strong text-text-secondary hover:text-accent hover:border-accent transition-colors hidden sm:flex"
      >
        <Keyboard size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-bg-surface border border-border-subtle rounded-lg shadow-elevated"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
                <h2 className="font-display text-xl tracking-wider text-text-primary">SHORTCUTS</h2>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="text-text-secondary hover:text-accent"
                >
                  <X size={18} />
                </button>
              </div>
              <ul className="divide-y divide-border-subtle">
                {SHORTCUTS.map((s) => (
                  <li key={s.keys} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <span className="text-text-secondary">{s.action}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-bg-elevated border border-border-strong rounded text-text-primary">
                      {s.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
              <p className="px-5 py-3 text-xs text-text-muted border-t border-border-subtle">
                Press <kbd className="font-mono">?</kbd> any time to toggle this panel.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
