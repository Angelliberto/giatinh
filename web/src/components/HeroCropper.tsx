'use client';

import { useEffect, useRef, useState } from 'react';
import { blobToFile, getCroppedImageBlob } from '@/lib/cropImage';
import { currentHeroFrameAspect } from '@/lib/heroFrame';

type Props = {
  imageSrc: string;
  onCancel: () => void;
  onComplete: (file: File) => void | Promise<void>;
};

function coverScale(frameW: number, frameH: number, imgW: number, imgH: number, zoom: number) {
  return Math.max(frameW / imgW, frameH / imgH) * zoom;
}

function clampOffset(
  offset: { x: number; y: number },
  frameW: number,
  frameH: number,
  imgW: number,
  imgH: number,
  zoom: number
) {
  const scale = coverScale(frameW, frameH, imgW, imgH, zoom);
  const minX = Math.min(0, frameW - imgW * scale);
  const minY = Math.min(0, frameH - imgH * scale);
  return {
    x: Math.min(0, Math.max(minX, offset.x)),
    y: Math.min(0, Math.max(minY, offset.y)),
  };
}

export default function HeroCropper({ imageSrc, onCancel, onComplete }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const aspect = currentHeroFrameAspect();

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const measure = () => {
      const box = node.getBoundingClientRect();
      setFrame({ w: box.width, h: box.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [aspect]);

  const placed = useRef(false);

  useEffect(() => {
    if (!natural || frame.w < 2 || frame.h < 2 || placed.current) return;
    const scale = coverScale(frame.w, frame.h, natural.w, natural.h, 1);
    setZoom(1);
    setOffset({
      x: (frame.w - natural.w * scale) / 2,
      y: (frame.h - natural.h * scale) / 2,
    });
    placed.current = true;
    setReady(true);
  }, [natural, frame.w, frame.h]);

  const changeZoom = (next: number) => {
    if (!natural || frame.w < 2) {
      setZoom(next);
      return;
    }
    const prevScale = coverScale(frame.w, frame.h, natural.w, natural.h, zoom);
    const nextScale = coverScale(frame.w, frame.h, natural.w, natural.h, next);
    const cx = frame.w / 2;
    const cy = frame.h / 2;
    const focusX = (cx - offset.x) / prevScale;
    const focusY = (cy - offset.y) / prevScale;
    setZoom(next);
    setOffset(
      clampOffset(
        { x: cx - focusX * nextScale, y: cy - focusY * nextScale },
        frame.w,
        frame.h,
        natural.w,
        natural.h,
        next
      )
    );
  };

  const moveTo = (clientX: number, clientY: number) => {
    const start = drag.current;
    if (!start || !natural) return;
    setOffset(
      clampOffset(
        { x: start.ox + (clientX - start.px), y: start.oy + (clientY - start.py) },
        frame.w,
        frame.h,
        natural.w,
        natural.h,
        zoom
      )
    );
  };

  const apply = async () => {
    if (!natural || frame.w < 2 || frame.h < 2) return;
    setBusy(true);
    setError('');
    try {
      const scale = coverScale(frame.w, frame.h, natural.w, natural.h, zoom);
      const blob = await getCroppedImageBlob(imageSrc, {
        x: -offset.x / scale,
        y: -offset.y / scale,
        width: frame.w / scale,
        height: frame.h / scale,
      });
      await onComplete(blobToFile(blob, `hero-${Date.now()}.jpg`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not frame this hero image');
      setBusy(false);
    }
  };

  const scale = natural ? coverScale(frame.w || 1, frame.h || 1, natural.w, natural.h, zoom) : 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px clamp(16px, 3vw, 40px) 24px',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', gap: 18, minHeight: 0, flex: 1 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#F4F4F0',
                margin: 0,
              }}
            >
              Hero frame
            </p>
            <p
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                color: '#8A8A8A',
                letterSpacing: '0.04em',
                margin: '6px 0 0',
              }}
            >
              Drag the photo. Zoom in. The frame matches the hero and does not change size.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              color: '#8A8A8A',
              background: 'none',
              border: '1px solid #333',
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            ref={frameRef}
            onPointerDown={(event) => {
              if (!ready) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { px: event.clientX, py: event.clientY, ox: offset.x, oy: offset.y };
            }}
            onPointerMove={(event) => moveTo(event.clientX, event.clientY)}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            style={{
              width: `min(100%, calc(62vh * ${aspect}))`,
              aspectRatio: String(aspect),
              position: 'relative',
              overflow: 'hidden',
              background: '#000',
              border: '1px solid #F4F4F0',
              cursor: ready ? 'grab' : 'default',
              touchAction: 'none',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={imageSrc}
              src={imageSrc}
              alt=""
              draggable={false}
              onLoad={(event) =>
                setNatural({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })
              }
              style={{
                position: 'absolute',
                left: offset.x,
                top: offset.y,
                width: natural ? natural.w * scale : '100%',
                height: natural ? natural.h * scale : '100%',
                maxWidth: 'none',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 }}>
            <span
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 9,
                color: '#8A8A8A',
                letterSpacing: '0.12em',
              }}
            >
              ZOOM
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => changeZoom(Number(event.target.value))}
              style={{ flex: 1, accentColor: '#F4F4F0' }}
            />
          </label>
          {error && (
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#c07070' }}>{error}</span>
          )}
          <button
            type="button"
            onClick={() => void apply()}
            disabled={busy || !ready}
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              letterSpacing: '0.12em',
              padding: '12px 18px',
              background: '#F4F4F0',
              color: '#0B0B0B',
              border: 'none',
              cursor: busy || !ready ? 'default' : 'pointer',
              opacity: busy || !ready ? 0.6 : 1,
            }}
          >
            {busy ? 'SAVING…' : 'USE THIS FRAME'}
          </button>
        </div>
      </div>
    </div>
  );
}
