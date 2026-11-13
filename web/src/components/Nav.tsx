'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { label: 'Archive', href: '/archive' },
  { label: 'Bio', href: '/bio' },
];

function LocalTime() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        [now.getHours(), now.getMinutes(), now.getSeconds()]
          .map((n) => String(n).padStart(2, '0'))
          .join(':')
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span
      style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        color: '#8A8A8A',
        letterSpacing: '0.08em',
        whiteSpace: 'nowrap',
      }}
    >
      {time}
    </span>
  );
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const isCurrent = (href: string) => pathname === href;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        .nav-links { display: flex; align-items: center; gap: 32px; }
        .nav-time { display: block; }
        .nav-burger { display: none; background: none; border: none; color: #8A8A8A; cursor: pointer; font-size: 18px; padding: 0; line-height: 1; }
        .mobile-menu { display: none; }
        @media (max-width: 640px) {
          .nav-links { display: none !important; }
          .nav-time { display: none !important; }
          .nav-burger { display: block !important; }
          .mobile-menu { display: flex !important; }
        }
      `}</style>

      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          borderBottom: scrolled ? '1px solid #262626' : '1px solid transparent',
          background: scrolled ? 'rgba(11,11,11,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          transition: 'border-color 0.4s, background 0.4s',
          padding: '0 clamp(16px,3vw,40px)',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/gtl-logo.svg"
            alt="Gia Tinh Lam"
            width={36}
            height={42}
            style={{ display: 'block', height: 36, width: 'auto' }}
          />
        </Link>

        <nav className="nav-links">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="magnetic"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: isCurrent(link.href) ? '#F4F4F0' : '#8A8A8A',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F4F4F0')}
              onMouseLeave={(e) => (e.currentTarget.style.color = isCurrent(link.href) ? '#F4F4F0' : '#8A8A8A')}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="nav-time">
          <LocalTime />
        </div>

        <button className="nav-burger" onClick={() => setMenuOpen((p) => !p)} aria-label="Menu">
          {menuOpen ? '✕' : '☰'}
        </button>
      </header>

      <div
        className="mobile-menu"
        style={{
          display: 'none',
          position: 'fixed',
          top: 64,
          left: 0,
          right: 0,
          background: 'rgba(11,11,11,0.97)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #262626',
          flexDirection: 'column',
          padding: '24px clamp(16px,3vw,32px)',
          gap: 0,
          zIndex: 190,
          transform: menuOpen ? 'translateY(0)' : 'translateY(-8px)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'all' : 'none',
          transition: 'opacity 0.25s, transform 0.25s',
        }}
      >
        {links.map((link, i) => (
          <Link
            key={link.label}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: isCurrent(link.href) ? '#F4F4F0' : '#8A8A8A',
              textDecoration: 'none',
              padding: '14px 0',
              borderBottom: i < links.length - 1 ? '1px solid #1C1C1C' : 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#F4F4F0')}
            onMouseLeave={(e) => (e.currentTarget.style.color = isCurrent(link.href) ? '#F4F4F0' : '#8A8A8A')}
          >
            {link.label}
          </Link>
        ))}
        <div style={{ paddingTop: 16 }}>
          <LocalTime />
        </div>
      </div>
    </>
  );
}
