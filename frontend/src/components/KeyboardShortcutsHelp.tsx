'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Open command palette' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['Esc'], description: 'Close dialogs and modals' },
];

function isMac() {
  return typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
}

export default function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const mod = isMac() ? '\u2318' : 'Ctrl';

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Keyboard Shortcuts">
      <div className="space-y-3">
        {shortcuts.map(({ keys, description }) => (
          <div key={description} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{description}</span>
            <div className="flex items-center gap-1">
              {keys.map((key) => (
                <kbd
                  key={key}
                  className="inline-flex items-center rounded border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs font-mono text-gray-600"
                >
                  {key === 'Ctrl' ? mod : key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-400">
        Press <kbd className="rounded border border-gray-300 bg-gray-50 px-1 text-xs font-mono">Esc</kbd> to close
      </p>
    </Modal>
  );
}

export function ShortcutsButton({ collapsed }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white ${collapsed ? 'justify-center' : 'gap-3'}`}
        title="Keyboard shortcuts (?)"
        aria-label="Keyboard shortcuts"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
        </svg>
        {!collapsed && <span>Shortcuts</span>}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Keyboard Shortcuts">
        <div className="space-y-3">
          {shortcuts.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{description}</span>
              <div className="flex items-center gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex items-center rounded border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs font-mono text-gray-600"
                  >
                    {key === 'Ctrl' ? (typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '\u2318' : 'Ctrl') : key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
