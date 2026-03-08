import { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  children?: ReactNode;
}

export default function Header({ title, children }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </header>
  );
}
