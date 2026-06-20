import Link from 'next/link';
import styles from './Nav.module.css';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/plan', label: 'Lesson Plan' },
  { href: '/progress', label: 'Progress' },
  { href: '/settings', label: 'Settings' },
];

export function Nav() {
  return (
    <nav aria-label="Primary" className={styles.nav}>
      <strong className={styles.brand}>♟ chess-coach</strong>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={styles.link}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
