import { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  children?: ReactNode;
  onMenuClick?: () => void;
}

export default function Header({ title, children, onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 md:hidden"
            aria-label="Open menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </header>
  );
}
