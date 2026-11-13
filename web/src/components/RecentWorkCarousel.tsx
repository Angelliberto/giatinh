'use client';

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import type { Post } from '@/lib/types';
import { formatWorkDate, workCover } from '@/components/WorkCard';
import { coverObjectPosition } from '@/components/CoverFrame';

type Placement = 'previous' | 'current' | 'next' | 'hidden-left' | 'hidden-right';

type Slot = {
  key: string;
  index: number;
  placement: Placement;
};

function buildSlots(count: number, current: number): Slot[] {
  if (count <= 0) return [];
  if (count === 1) return [{ key: '0', index: 0, placement: 'current' }];

  const prev = (current - 1 + count) % count;
  const next = (current + 1) % count;
  const slots: Slot[] = [];

  for (let i = 0; i < count; i++) {
    let placement: Placement = 'hidden-right';
    if (i === current) placement = 'current';
    else if (count === 2) placement = 'next';
    else if (i === prev) placement = 'previous';
    else if (i === next) placement = 'next';
    else {
      let dist = i - current;
      if (dist > count / 2) dist -= count;
      if (dist < -count / 2) dist += count;
      placement = dist < 0 ? 'hidden-left' : 'hidden-right';
    }
    slots.push({ key: String(i), index: i, placement });
  }

  if (count === 2) slots.push({ key: 'clone', index: prev, placement: 'previous' });
  return slots;
}

function pose(placement: Placement, offset: number) {
  switch (placement) {
    case 'current':
      return { x: 0, y: 0, rotateY: 0, scale: 1.05, autoAlpha: 1, zIndex: 30 };
    case 'previous':
      return { x: -offset, y: 0, rotateY: 16, scale: 0.88, autoAlpha: 1, zIndex: 20 };
    case 'next':
      return { x: offset, y: 0, rotateY: -16, scale: 0.88, autoAlpha: 1, zIndex: 20 };
    case 'hidden-left':
      return { x: -offset * 2.15, y: 0, rotateY: 35, scale: 0.78, autoAlpha: 0, zIndex: 5 };
    default:
      return { x: offset * 2.15, y: 0, rotateY: -35, scale: 0.78, autoAlpha: 0, zIndex: 5 };
  }
}

function shadeFor(placement: Placement) {
  if (placement === 'current') return 0;
  if (placement === 'previous' || placement === 'next') return 0.28;
  return 0.72;
}

function Arrow({ direction }: { direction: 'left' | 'right' }) {
  const points = direction === 'left' ? '328 112 184 256 328 400' : '184 112 328 256 184 400';
  return (
    <svg viewBox="0 0 512 512" width="34" height="34" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="48"
      />
    </svg>
  );
}

export default function RecentWorkCarousel({ posts }: { posts: Post[] }) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const animating = useRef(false);
  const introduced = useRef(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const count = posts.length;
  const safeIndex = count ? Math.min(index, count - 1) : 0;
  const cardW = width > 0 ? Math.min(960, width * 0.86) : 560;
  const cardH = cardW * 0.68;
  const offset = cardW * 0.92;
  const slots = buildSlots(count, safeIndex);
  const current = posts[safeIndex];

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [count, index]);

  useLayoutEffect(() => {
    if (!count || width < 20) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const first = !introduced.current;
    introduced.current = true;
    let alive = true;
    animating.current = !reduce && !first && count > 1;

    const tweens = slots.flatMap((slot) => {
      const el = cardRefs.current[slot.key];
      if (!el) return [];
      const target = pose(slot.placement, offset);
      const shade = el.querySelector<HTMLElement>('[data-shade]');
      const duration = reduce ? 0 : first ? 0.75 : 0.8;
      const created = [];
      if (shade) {
        created.push(gsap.to(shade, { opacity: shadeFor(slot.placement), duration, ease: 'power2.inOut' }));
      }
      if (first && !reduce) {
        gsap.set(el, {
          ...target,
          y: slot.placement.startsWith('hidden') ? 0 : 64,
          autoAlpha: 0,
        });
      }
      created.push(
        gsap.to(el, {
          ...target,
          duration,
          ease: first ? 'power3.out' : 'power3.inOut',
          onComplete: () => {
            if (alive && slot.placement === 'current') animating.current = false;
          },
        })
      );
      return created;
    });

    if (reduce || count < 2) animating.current = false;

    return () => {
      alive = false;
      tweens.forEach((tween) => tween.kill());
    };
    // slots is derived from safeIndex and count
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, count, width, offset]);

  if (!count || !current) return null;

  const go = (direction: -1 | 1) => {
    if (animating.current || count < 2) return;
    animating.current = true;
    setIndex((value) => (value + direction + count) % count);
  };

  const tilt = (event: PointerEvent<HTMLAnchorElement>) => {
    if (animating.current) return;
    const card = cardRefs.current[String(safeIndex)];
    if (!card) return;
    const box = card.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const angle = Math.max(-12, Math.min(12, (dx / box.width) * 28));
    gsap.to(card, { rotateY: angle, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
  };

  const resetTilt = () => {
    const card = cardRefs.current[String(safeIndex)];
    if (!card) return;
    gsap.to(card, { rotateY: 0, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    drag.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    suppressClick.current = true;
    go(dx < 0 ? 1 : -1);
  };

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Recent work"
      onMouseLeave={() => {
        drag.current = null;
        resetTilt();
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current = null;
      }}
      style={{
        position: 'relative',
        width: '100%',
        height: cardH * 1.16,
        overflow: 'hidden',
        touchAction: 'pan-y',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, perspective: 1200 }}>
        {slots.map((slot) => {
          const post = posts[slot.index];
          const interactive = slot.placement === 'previous' || slot.placement === 'next' || slot.placement === 'current';
          return (
            <Link
              key={slot.key}
              href={`/post/${post.slug}`}
              ref={(node) => {
                cardRefs.current[slot.key] = node;
              }}
              aria-hidden={slot.placement !== 'current'}
              tabIndex={slot.placement === 'current' ? 0 : -1}
              aria-label={post.title}
              onPointerMove={slot.placement === 'current' ? tilt : undefined}
              onPointerLeave={slot.placement === 'current' ? resetTilt : undefined}
              onClick={(event) => {
                if (!interactive) {
                  event.preventDefault();
                  return;
                }
                if (suppressClick.current) {
                  suppressClick.current = false;
                  event.preventDefault();
                  return;
                }
                if (slot.placement === 'previous') {
                  event.preventDefault();
                  go(-1);
                } else if (slot.placement === 'next') {
                  event.preventDefault();
                  go(1);
                }
              }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: cardW,
                height: cardH,
                marginLeft: -cardW / 2,
                marginTop: -cardH / 2,
                textDecoration: 'none',
                cursor: interactive ? 'pointer' : 'default',
                userSelect: 'none',
                pointerEvents: interactive ? 'auto' : 'none',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#111', border: '1px solid #262626' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={workCover(post.coverUrl)}
                  alt=""
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: coverObjectPosition(post.coverFocus), display: 'block' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: '48px 18px 16px',
                    background: 'linear-gradient(to top, rgba(11,11,11,0.92) 0%, transparent 100%)',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9,
                      color: '#8A8A8A',
                      margin: '0 0 6px',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {formatWorkDate(post.publishedAt || post.createdAt)}
                  </p>
                  <p
                    style={{
                      fontFamily: 'Playfair Display, serif',
                      fontSize: 18,
                      fontWeight: 700,
                      fontStyle: 'italic',
                      color: '#F4F4F0',
                      margin: 0,
                      lineHeight: 1.15,
                    }}
                  >
                    {post.title}
                  </p>
                </div>
                <div
                  data-shade
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: '#000',
                    opacity: shadeFor(slot.placement),
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous work"
            onClick={() => go(-1)}
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 40,
              width: 36,
              height: 36,
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            <Arrow direction="left" />
          </button>
          <button
            type="button"
            aria-label="Next work"
            onClick={() => go(1)}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 40,
              width: 36,
              height: 36,
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            <Arrow direction="right" />
          </button>
        </>
      )}

      <p
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 10,
          zIndex: 40,
          margin: 0,
          textAlign: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          letterSpacing: '0.16em',
          color: '#8A8A8A',
          pointerEvents: 'none',
        }}
      >
        {String(safeIndex + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
      </p>
    </div>
  );
}
