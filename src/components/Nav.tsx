import Link from 'next/link';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/plan', label: 'Lesson Plan' },
  { href: '/progress', label: 'Progress' },
  { href: '/settings', label: 'Settings' },
];

export function Nav() {
  return (
    <nav aria-label="Primary" style={{ display: 'grid', gap: 4 }}>
      <strong style={{ padding: '0 8px 8px' }}>♟ chess-coach</strong>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} style={{ padding: '8px 10px', borderRadius: 8 }}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
