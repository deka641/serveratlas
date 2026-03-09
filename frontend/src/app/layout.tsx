'use client';

import { useState } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';
import { MobileSidebarContext } from '@/components/MobileSidebarContext';

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
        <meta name="description" content="Infrastructure Management" />
      </head>
      <body className="min-h-screen bg-gray-50">
        <ToastProvider>
          <MobileSidebarContext.Provider value={() => setMobileOpen(true)}>
            <div className="flex min-h-screen">
              <Sidebar
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
              />
              <div className="flex flex-1 flex-col min-w-0">{children}</div>
            </div>
          </MobileSidebarContext.Provider>
        </ToastProvider>
      </body>
    </html>
  );
}
