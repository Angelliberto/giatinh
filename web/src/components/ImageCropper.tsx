'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { blobToFile, getCroppedImageBlob, getCroppedImageDataUrl } from '@/lib/cropImage';

export type AspectOption = {
  label: string;
  value: number | undefined;
};

const ASPECTS: AspectOption[] = [
  { label: 'Free', value: undefined },
  { label: '16:9', value: 16 / 9 },
  { label: '3:2', value: 3 / 2 },
  { label: '4:3', value: 4 / 3 },
  { label: '1:1', value: 1 },
  { label: '3:4', value: 3 / 4 },
  { label: '2:3', value: 2 / 3 },
];

function sameAspect(a: number | undefined, b: number | undefined) {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  return Math.abs(a - b) < 0.001;
}

type Props = {
  imageSrc: string;
  title?: string;
  mode?: 'cover' | 'image' | 'hero';
  defaultAspect?: number | undefined;
  locked?: boolean;
  onCancel: () => void;
  onComplete: (file: File) => void | Promise<void>;
};

export default function ImageCropper({
  imageSrc,
  title = 'Crop image',
  mode = 'image',
  defaultAspect,
  locked = false,
  onCancel,
  onComplete,
}: Props) {
  const initialAspect = locked ? (defaultAspect ?? 16 / 9) : defaultAspect;

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(initialAspect);
  const [aspectKey, setAspectKey] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const previewGen = useRef(0);

  const onCropAreaChange = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const changeAspect = (next: number | undefined) => {
    if (sameAspect(aspect, next)) return;
    setAspect(next);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setPreviewUrl(null);
    setCroppedAreaPixels(null);
    setAspectKey((k) => k + 1);
  };

  useEffect(() => {
    if (!croppedAreaPixels) return;
    const id = ++previewGen.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const url = await getCroppedImageDataUrl(imageSrc, croppedAreaPixels);
          if (previewGen.current === id) {
            setPreviewUrl(url);
            setError('');
          }
        } catch (err) {
          if (previewGen.current === id) {
            setError(err instanceof Error ? err.message : 'Could not preview this crop');
          }
        }
      })();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [croppedAreaPixels, imageSrc]);

  const apply = async () => {
    if (!croppedAreaPixels) return;
    setBusy(true);
    setError('');
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      const file = blobToFile(blob, `crop-${Date.now()}.jpg`);
      await onComplete(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Crop failed');
      setBusy(false);
    }
  };

  const previewAspect =
    aspect ??
    (croppedAreaPixels && croppedAreaPixels.height
      ? croppedAreaPixels.width / croppedAreaPixels.height
      : undefined);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1100px, 100%)',
          background: '#121212',
          border: '1px solid #262626',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid #262626',
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#F4F4F0',
            }}
          >
            {title}
          </span>
          <button
            type="button"
            onClick={onCancel}
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              color: '#8A8A8A',
              background: 'none',
              border: '1px solid #333',
              padding: '5px 10px',
              cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
        </div>

        <div
          className="crop-split"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.85fr',
            minHeight: 0,
            flex: 1,
          }}
        >
          <style>{`
            @media (max-width: 820px) {
              .crop-split { grid-template-columns: 1fr !important; }
              .crop-result { border-left: none !important; border-top: 1px solid #262626; }
            }
          `}</style>

          <div style={{ position: 'relative', minHeight: 'min(52vh, 480px)', background: '#0B0B0B' }}>
            <Cropper
              key={`crop-${aspectKey}-${aspect ?? 'free'}`}
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropAreaChange}
              onCropAreaChange={onCropAreaChange}
              objectFit="contain"
              showGrid
              style={{
                containerStyle: { background: '#0B0B0B' },
                cropAreaStyle: { border: '1px solid #F4F4F0' },
              }}
            />
          </div>

          <div
            className="crop-result"
            style={{
              borderLeft: '1px solid #262626',
              background: '#0B0B0B',
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              overflow: 'auto',
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 9,
                letterSpacing: '0.14em',
                color: '#8A8A8A',
              }}
            >
              LIVE RESULT — EXACT OUTPUT
            </span>

            <div
              style={{
                width: '100%',
                maxHeight: 420,
                background: '#121212',
                border: '1px solid #262626',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...(previewAspect
                  ? { aspectRatio: String(previewAspect) }
                  : { minHeight: 180 }),
              }}
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Crop preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    filter:
                      mode === 'cover' || mode === 'hero'
                        ? 'brightness(0.85) contrast(1.08) grayscale(0.12)'
                        : undefined,
                  }}
                />
              ) : (
                <div
                  style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: 9,
                    color: '#555',
                    letterSpacing: '0.1em',
                    padding: 24,
                  }}
                >
                  ADJUST CROP…
                </div>
              )}
            </div>

            <p
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 9,
                color: '#555',
                letterSpacing: '0.06em',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {locked
                ? 'Drag the photo to move it. The cover frame stays 16:9.'
                : 'Saved image keeps this exact crop and ratio on the page.'}
            </p>
          </div>
        </div>

        <div
          style={{
            padding: '16px 18px',
            borderTop: '1px solid #262626',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {!locked && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ASPECTS.map((opt) => {
              const active = sameAspect(aspect, opt.value);
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => changeAspect(opt.value)}
                  style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    padding: '6px 10px',
                    background: active ? '#F4F4F0' : 'transparent',
                    color: active ? '#0B0B0B' : '#8A8A8A',
                    border: '1px solid #333',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 9,
                color: '#8A8A8A',
                letterSpacing: '0.1em',
                minWidth: 40,
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
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#F4F4F0' }}
            />
          </label>

          {error && (
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#c07070', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                letterSpacing: '0.1em',
                padding: '8px 14px',
                background: 'transparent',
                color: '#8A8A8A',
                border: '1px solid #333',
                cursor: 'pointer',
              }}
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={() => void apply()}
              disabled={busy || !croppedAreaPixels}
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                letterSpacing: '0.1em',
                padding: '8px 16px',
                background: '#F4F4F0',
                color: '#0B0B0B',
                border: 'none',
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? 'APPLYING…' : 'APPLY CROP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
