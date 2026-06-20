import './globals.css';
import type { ReactNode } from 'react';
import { Nav } from '@/components/Nav';
import styles from './layout.module.css';

export const metadata = { title: 'chess-coach' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className={styles.shell}>
          <aside className={`panel ${styles.sidebar}`}>
            <Nav />
          </aside>
          <main className={styles.content}>{children}</main>
        </div>
      </body>
    </html>
  );
}
