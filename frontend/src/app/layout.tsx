'use client';

import { useState } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import CommandPalette from '@/components/CommandPalette';
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp';
import { ToastProvider } from '@/components/ui/Toast';
import { MobileSidebarContext } from '@/components/MobileSidebarContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <html lang="en" className={inter.className}>
      <head>
        <title>ServerAtlas</title>
        <meta name="description" content="Central infrastructure management for servers, providers, applications, SSH keys, and backups." />
        <meta name="theme-color" content="#1e293b" />
        <meta property="og:title" content="ServerAtlas" />
        <meta property="og:description" content="Central infrastructure management for servers, providers, applications, SSH keys, and backups." />
        <meta property="og:type" content="website" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-gray-50">
        <ToastProvider>
          <MobileSidebarContext.Provider value={() => setMobileOpen(true)}>
            <div className="flex min-h-screen">
              <Sidebar
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
              />
              <div className="flex flex-1 flex-col min-w-0">
                <ErrorBoundary>{children}</ErrorBoundary>
              </div>
              <CommandPalette />
              <KeyboardShortcutsHelp />
            </div>
          </MobileSidebarContext.Provider>
        </ToastProvider>
      </body>
    </html>
  );
}
