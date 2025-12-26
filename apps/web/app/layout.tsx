import '../styles/globals.css';
import type { ReactNode } from 'react';
import HeaderNav from '../components/HeaderNav';

export const metadata = {
  title: 'FitFlow OS',
  description: 'Advanced gym management system',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <HeaderNav />
          {children}
        </div>
      </body>
    </html>
  );
}
