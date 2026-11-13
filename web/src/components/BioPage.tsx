'use client';

import Link from 'next/link';

const paragraphs = [
  'Gia Tinh Lam is a multidisciplinary audiovisual storyteller and art director whose work is rooted in real life narratives. Guided by the need to spark connectivity to create a strong sense of belonging, she lives to make art that feels both resonant and expansive.',
  'GT is particularly fascinated by immersive sound and visuals that open new worlds. Her work is borderless, sitting between film, fashion and music. Manifesting into a sphere designer who leaves the viewer with a sense of wonder and mystery.',
];

export default function BioPage() {
  return (
    <div style={{ background: '#0B0B0B', minHeight: '100vh' }} className="grain">
      <article
        style={{
          maxWidth: 780,
          margin: '0 auto',
          padding: 'calc(64px + clamp(48px, 8vw, 100px)) clamp(20px, 4vw, 60px) 120px',
        }}
      >
        <p
          style={{
            fontFamily: 'JetBrains Mono',
            fontSize: 10,
            color: '#8A8A8A',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            margin: '0 0 36px',
          }}
        >
          Bio
        </p>

        <h1
          style={{
            fontFamily: 'Playfair Display, serif',
            fontWeight: 900,
            fontSize: 'clamp(44px, 7vw, 88px)',
            lineHeight: 0.92,
            color: '#F4F4F0',
            margin: '0 0 12px',
            letterSpacing: '-0.02em',
          }}
        >
          Gia Tinh Lam
        </h1>

        <p
          style={{
            fontFamily: 'Playfair Display, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(20px, 2.6vw, 28px)',
            color: '#8A8A8A',
            margin: '0 0 48px',
            lineHeight: 1.25,
          }}
        >
          Audiovisual storyteller &amp; art director
        </p>

        <div style={{ height: 1, background: '#262626', marginBottom: 48 }} />

        {paragraphs.map((text) => (
          <p
            key={text.slice(0, 32)}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 'clamp(16px, 1.5vw, 18px)',
              lineHeight: 1.95,
              color: '#c8c8c4',
              margin: '0 0 28px',
              fontWeight: 300,
            }}
          >
            {text}
          </p>
        ))}

        <div style={{ height: 1, background: '#262626', margin: '56px 0 40px' }} />

        <Link
          href="/"
          style={{
            fontFamily: 'JetBrains Mono',
            fontSize: 10,
            color: '#8A8A8A',
            textDecoration: 'none',
            letterSpacing: '0.1em',
          }}
        >
          ← BACK TO FEED
        </Link>
      </article>
    </div>
  );
}
