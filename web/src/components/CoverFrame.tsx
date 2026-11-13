'use client';

import { useRef, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent, type Ref } from 'react';

export const COVER_ASPECT = 16 / 9;

export type CoverFocus = { x: number; y: number };

export const DEFAULT_COVER_FOCUS: CoverFocus = { x: 50, y: 50 };

function clampFocus(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, value));
}

export function coverFocusFrom(focus?: Partial<CoverFocus> | null): CoverFocus {
  return {
    x: clampFocus(focus?.x ?? 50),
    y: clampFocus(focus?.y ?? 50),
  };
}

export function coverObjectPosition(focus?: Partial<CoverFocus> | null) {
  const next = coverFocusFrom(focus);
  return `${next.x}% ${next.y}%`;
}

export default function CoverFrame({
  src,
  alt,
  focus,
  onFocusChange,
  onClick,
  filter,
}: {
  src: string;
  alt: string;
  focus?: Partial<CoverFocus> | null;
  onFocusChange?: (focus: CoverFocus) => void;
  onClick?: () => void;
  filter?: string;
}) {
  const frameRef = useRef<HTMLDivElement | HTMLButtonElement>(null);
  const drag = useRef<{ px: number; py: number; fx: number; fy: number; moved: boolean } | null>(null);
  const point = coverFocusFrom(focus);
  const interactive = Boolean(onFocusChange);

  const move = (clientX: number, clientY: number) => {
    const start = drag.current;
    const frame = frameRef.current;
    if (!start || !frame || !onFocusChange) return;
    const box = frame.getBoundingClientRect();
    const dx = ((clientX - start.px) / Math.max(box.width, 1)) * 100;
    const dy = ((clientY - start.py) / Math.max(box.height, 1)) * 100;
    if (Math.abs(dx) + Math.abs(dy) > 0.8) start.moved = true;
    onFocusChange({
      x: clampFocus(start.fx - dx),
      y: clampFocus(start.fy - dy),
    });
  };

  const shared = {
    ref: frameRef as Ref<HTMLDivElement & HTMLButtonElement>,
    onPointerDown: (event: ReactPointerEvent) => {
      if (!onFocusChange) return;
      if ((event.target as HTMLElement).closest('button') && event.currentTarget !== event.target) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { px: event.clientX, py: event.clientY, fx: point.x, fy: point.y, moved: false };
    },
    onPointerMove: (event: ReactPointerEvent) => move(event.clientX, event.clientY),
    onPointerUp: (event: ReactPointerEvent) => {
      drag.current = null;
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    onPointerCancel: () => {
      drag.current = null;
    },
    onClick: (event: ReactMouseEvent) => {
      if (interactive) {
        event.preventDefault();
        return;
      }
      onClick?.();
    },
    style: {
      position: 'relative' as const,
      width: '100%',
      aspectRatio: String(COVER_ASPECT),
      overflow: 'hidden',
      background: '#121212',
      border: 'none',
      padding: 0,
      display: 'block',
      cursor: interactive ? 'grab' : onClick ? 'zoom-in' : 'default',
      touchAction: interactive ? ('none' as const) : undefined,
    },
  };

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      draggable={false}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: coverObjectPosition(point),
        display: 'block',
        pointerEvents: 'none',
        filter,
      }}
    />
  );

  if (onClick && !interactive) {
    return (
      <button type="button" aria-label={alt} {...shared}>
        {image}
      </button>
    );
  }

  return <div {...shared}>{image}</div>;
}
