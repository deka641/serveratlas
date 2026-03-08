import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ServerAtlas',
  description: 'Infrastructure Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-gray-50">
        <ToastProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex flex-1 flex-col">{children}</div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
