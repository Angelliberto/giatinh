'use client';

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import gsap from 'gsap';

export const CAROUSEL_LIMIT = 10;

export type CarouselSlide = {
  url: string;
  publicId?: string | null;
};

export function slidesFromBlock(block: {
  url?: string | null;
  publicId?: string | null;
  meta?: Record<string, unknown>;
}): CarouselSlide[] {
  const raw = block.meta?.images;
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        const slide = item as Record<string, unknown>;
        return {
          url: typeof slide.url === 'string' ? slide.url : '',
          publicId: typeof slide.publicId === 'string' ? slide.publicId : null,
        };
      })
      .filter((slide) => slide.url)
      .slice(0, CAROUSEL_LIMIT);
  }
  if (block.url) return [{ url: block.url, publicId: block.publicId ?? null }];
  return [];
}

type Placement = 'previous' | 'current' | 'next' | 'hidden-left' | 'hidden-right';

type Slot = {
  key: string;
  imageIndex: number;
  placement: Placement;
};

function buildSlots(count: number, current: number): Slot[] {
  if (count <= 0) return [];
  if (count === 1) return [{ key: '0', imageIndex: 0, placement: 'current' }];

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
    slots.push({ key: String(i), imageIndex: i, placement });
  }

  if (count === 2) slots.push({ key: 'clone', imageIndex: prev, placement: 'previous' });
  return slots;
}

function pose(placement: Placement, offset: number) {
  switch (placement) {
    case 'current':
      return { x: 0, y: 0, rotateY: 0, scale: 1.05, autoAlpha: 1, zIndex: 30 };
    case 'previous':
      return { x: -offset, y: 0, rotateY: 16, scale: 0.92, autoAlpha: 1, zIndex: 20 };
    case 'next':
      return { x: offset, y: 0, rotateY: -16, scale: 0.92, autoAlpha: 1, zIndex: 20 };
    case 'hidden-left':
      return { x: -offset * 2.15, y: 0, rotateY: 35, scale: 0.8, autoAlpha: 0, zIndex: 5 };
    default:
      return { x: offset * 2.15, y: 0, rotateY: -35, scale: 0.8, autoAlpha: 0, zIndex: 5 };
  }
}

function shadeFor(placement: Placement) {
  if (placement === 'current') return 0;
  if (placement === 'previous' || placement === 'next') return 0.22;
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

export default function ImageCarousel({
  images,
  alt = 'Carousel image',
  onImageClick,
}: {
  images: CarouselSlide[];
  alt?: string;
  onImageClick?: (src: string, index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLImageElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const animating = useRef(false);
  const introduced = useRef(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const count = images.length;
  const safeIndex = count ? Math.min(index, count - 1) : 0;
  const imageKey = images.map((slide) => slide.url).join('\n');
  const cardW = width > 0 ? Math.min(480, width * 0.52) : 280;
  const cardH = cardW * 1.15;
  const offset = cardW * 0.72;
  const slots = buildSlots(count, safeIndex);

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

    const bg = bgRef.current;
    if (bg) {
      if (first || reduce) gsap.set(bg, { opacity: 1 });
      else gsap.fromTo(bg, { opacity: 0.35 }, { opacity: 1, duration: 0.7, ease: 'power2.out' });
    }

    if (reduce || count < 2) animating.current = false;

    return () => {
      alive = false;
      tweens.forEach((tween) => tween.kill());
    };
    // slots is derived from safeIndex and count; imageKey covers slide URL edits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, count, imageKey, width, offset]);

  if (!count) return null;

  const go = (direction: -1 | 1) => {
    if (animating.current || count < 2) return;
    animating.current = true;
    setIndex((value) => (value + direction + count) % count);
  };

  const tilt = (event: PointerEvent<HTMLDivElement>) => {
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
        background: '#0B0B0B',
        touchAction: 'pan-y',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          filter: 'blur(10px)',
          transform: 'scale(1.12)',
          pointerEvents: 'none',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={bgRef}
          src={images[safeIndex].url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', pointerEvents: 'none' }} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          perspective: 1000,
        }}
      >
        {slots.map((slot) => {
          const interactive = slot.placement === 'previous' || slot.placement === 'next' || slot.placement === 'current';
          return (
            <div
              key={slot.key}
              ref={(node) => {
                cardRefs.current[slot.key] = node;
              }}
              onPointerMove={slot.placement === 'current' ? tilt : undefined}
              onPointerLeave={slot.placement === 'current' ? resetTilt : undefined}
              onClick={() => {
                if (!interactive) return;
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                if (onImageClick) {
                  onImageClick(images[slot.imageIndex].url, slot.imageIndex);
                  return;
                }
                if (slot.placement === 'previous') go(-1);
                if (slot.placement === 'next') go(1);
              }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: cardW,
                height: cardH,
                marginLeft: -cardW / 2,
                marginTop: -cardH / 2,
                cursor: interactive && onImageClick ? 'zoom-in' : slot.placement === 'current' ? 'default' : interactive ? 'pointer' : 'default',
                userSelect: 'none',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#111' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[slot.imageIndex].url}
                  alt={slot.placement === 'current' ? `${alt} ${safeIndex + 1}` : ''}
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
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
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
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
            aria-label="Next image"
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
    </div>
  );
}
