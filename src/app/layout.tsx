import './globals.css';
import type { ReactNode } from 'react';
import { Nav } from '@/components/Nav';

export const metadata = { title: 'chess-coach' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <aside className="panel" style={{ width: 180, margin: 12, height: 'fit-content' }}>
            <Nav />
          </aside>
          <main style={{ flex: 1, padding: 16 }}>{children}</main>
        </div>
      </body>
    </html>
  );
}
