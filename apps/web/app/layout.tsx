import '../styles/globals.css';
import type { ReactNode } from 'react';
import HeaderNav from '../components/HeaderNav';
import RegisterSW from '../components/RegisterSW';

export const metadata = {
  title: 'FitFlow OS',
  description: 'Real-time gym management with attendance, gamification and AI planning.',
  manifest: '/manifest.webmanifest',
  themeColor: '#10b981',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#10b981" />
        <link rel="icon" href="/icon-192.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-background text-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <HeaderNav />
          {children}
        </div>
        <RegisterSW />
      </body>
    </html>
  );
}
