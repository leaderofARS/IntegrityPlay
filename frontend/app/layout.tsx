import './globals.css';
import { ReactNode } from 'react';
import TopNav from '../components/TopNav';
import Providers from './providers';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Providers>
          <TopNav />
          <main className="max-w-7xl mx-auto p-4">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

