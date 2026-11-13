'use client';

import { useState } from 'react';
import Link from 'next/link';

export function formatWorkDate(iso?: string | null) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export const workCover = (url?: string | null) =>
  url ||
  'https://images.unsplash.com/photo-1682407799061-66e5ca0fbecc?w=600&h=800&fit=crop&auto=format';

export default function WorkCard({
  href,
  imageUrl,
  title,
  date,
  tall,
  objectPosition,
}: {
  href: string;
  imageUrl: string;
  title: string;
  date: string;
  tall?: boolean;
  objectPosition?: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={href}
      style={{ textDecoration: 'none', display: 'block' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        style={{
          overflow: 'hidden',
          position: 'relative',
          aspectRatio: tall ? '3/4' : '4/3',
          border: '1px solid #262626',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: objectPosition || '50% 50%',
            transform: hover ? 'scale(1.06)' : 'scale(1)',
            transition: 'transform 0.8s cubic-bezier(0.23,1,0.32,1)',
            filter: 'brightness(0.8) contrast(1.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(11,11,11,0.85) 0%, transparent 55%)',
            opacity: hover ? 1 : 0,
            transition: 'opacity 0.4s',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            right: 14,
            transform: hover ? 'translateY(0)' : 'translateY(8px)',
            opacity: hover ? 1 : 0,
            transition: 'all 0.4s',
          }}
        >
          <p
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 9,
              color: '#8A8A8A',
              margin: '0 0 4px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {date}
          </p>
          <p
            style={{
              fontFamily: 'Playfair Display',
              fontSize: 14,
              fontWeight: 700,
              color: '#F4F4F0',
              margin: 0,
              fontStyle: 'italic',
            }}
          >
            {title}
          </p>
        </div>
      </div>
    </Link>
  );
}
