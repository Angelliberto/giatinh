'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import MediaPlayer from '@/components/MediaPlayer';
import ImageCarousel, { slidesFromBlock } from '@/components/ImageCarousel';
import AudioPlayer, { type AudioTrack } from '@/components/AudioPlayer';
import { detectMediaProvider } from '@/lib/media';
import type { Post, PostBlock } from '@/lib/types';

function PostImageViewer({
  images,
  start,
  alt,
  onClose,
}: {
  images: string[];
  start: number;
  alt: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(start);
  const count = images.length;
  const safeIndex = count ? Math.min(index, count - 1) : 0;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (count < 2) return;
      if (event.key === 'ArrowRight') setIndex((value) => (value + 1) % count);
      if (event.key === 'ArrowLeft') setIndex((value) => (value - 1 + count) % count);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, count]);

  if (!count || typeof document === 'undefined') return null;

  const go = (direction: -1 | 1) => setIndex((value) => (value + direction + count) % count);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '72px 88px',
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 2,
          width: 44,
          height: 44,
          padding: 0,
          border: 'none',
          background: 'none',
          color: '#F4F4F0',
          fontSize: 32,
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => go(-1)}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              width: 48,
              height: 48,
              padding: 0,
              border: 'none',
              background: 'none',
              color: '#F4F4F0',
              cursor: 'pointer',
            }}
          >
            <svg viewBox="0 0 512 512" width="36" height="36" aria-hidden>
              <polyline
                points="328 112 184 256 328 400"
                fill="none"
                stroke="#fff"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="48"
              />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={() => go(1)}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              width: 48,
              height: 48,
              padding: 0,
              border: 'none',
              background: 'none',
              color: '#F4F4F0',
              cursor: 'pointer',
            }}
          >
            <svg viewBox="0 0 512 512" width="36" height="36" aria-hidden>
              <polyline
                points="184 112 328 256 184 400"
                fill="none"
                stroke="#fff"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="48"
              />
            </svg>
          </button>
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[safeIndex]}
        alt={alt}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>,
    document.body
  );
}

function audioTracksFromBlocks(blocks: PostBlock[], coverUrl?: string | null): AudioTrack[] {
  const out: AudioTrack[] = [];
  for (const b of blocks) {
    if (b.type !== 'audio') continue;
    const artist = (b.meta?.artist as string) || 'GT.';
    const artwork = (b.meta?.artwork as string) || coverUrl || undefined;
    const raw = b.meta?.tracks;
    if (Array.isArray(raw) && raw.length) {
      for (const t of raw) {
        const item = t as Record<string, unknown>;
        if (typeof item.url !== 'string' || !item.url) continue;
        out.push({
          title: typeof item.title === 'string' ? item.title : 'Untitled',
          artist,
          url: item.url,
          artwork,
        });
      }
      continue;
    }
    if (b.url && detectMediaProvider(b.url) !== 'spotify') {
      out.push({
        title: b.content || 'Untitled',
        artist,
        url: b.url,
        artwork,
      });
    }
  }
  return out;
}

export default function PostDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [viewer, setViewer] = useState<{ images: string[]; start: number; alt: string } | null>(null);
  const articleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    api<{ post: Post }>(`/api/posts/${slug}`)
      .then((d) => setPost(d.post))
      .catch((e) => setError(e instanceof Error ? e.message : 'Not found'));
  }, [slug]);

  useEffect(() => {
    const onScroll = () => {
      const total = document.body.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? Math.min(window.scrollY / total, 1) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0B0B', padding: 80, color: '#8A8A8A' }}>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{error}</p>
        <Link href="/" style={{ color: '#F4F4F0', fontFamily: 'JetBrains Mono', fontSize: 10 }}>
          ← BACK
        </Link>
      </div>
    );
  }

  if (!post) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0B0B0B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'JetBrains Mono',
          fontSize: 10,
          color: '#8A8A8A',
          letterSpacing: '0.12em',
        }}
      >
        LOADING…
      </div>
    );
  }

  const date = (post.publishedAt || post.createdAt || '').slice(0, 10);
  const blocks = post.blocks || [];
  const fileAudioTracks = audioTracksFromBlocks(blocks, post.coverUrl);
  const firstFileAudioIndex = blocks.findIndex((b) => {
    if (b.type !== 'audio') return false;
    const raw = b.meta?.tracks;
    if (Array.isArray(raw) && raw.some((t) => typeof (t as { url?: string }).url === 'string')) {
      return true;
    }
    return Boolean(b.url && detectMediaProvider(b.url) !== 'spotify');
  });

  return (
    <div style={{ background: '#0B0B0B', minHeight: '100vh' }} className="grain">
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 1,
          height: '100vh',
          background: '#1C1C1C',
          zIndex: 100,
        }}
      >
        <div
          style={{
            width: 1,
            background: '#F4F4F0',
            height: `${scrollProgress * 100}%`,
            transition: 'height 0.05s linear',
          }}
        />
      </div>

      <div
        style={{
          position: 'sticky',
          top: 64,
          zIndex: 90,
          background: 'rgba(11,11,11,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #262626',
          padding: '12px clamp(16px,4vw,60px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#8A8A8A', letterSpacing: '0.06em' }}>
            READ · {Math.round(scrollProgress * 100)}%
          </span>
        </div>
      </div>

      <article ref={articleRef} style={{ maxWidth: 1440, margin: '0 auto', padding: 'clamp(28px,4vw,48px) clamp(16px,2.5vw,28px) 120px' }}>
        <header style={{ marginBottom: 72, textAlign: 'center' }}>
          <p
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              color: '#8A8A8A',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              margin: '0 0 28px',
            }}
          >
            {date}
          </p>
          <h1
            className="line-reveal"
            style={{
              fontFamily: 'Playfair Display',
              fontWeight: 900,
              fontSize: 'clamp(44px, 5vw, 80px)',
              lineHeight: 1.12,
              color: '#F4F4F0',
              margin: '0 0 12px',
              paddingBottom: '0.08em',
              letterSpacing: '-0.02em',
            }}
          >
            <span style={{ ['--delay' as string]: '0.1s' }}>{post.title}</span>
          </h1>
          {post.subtitle && (
            <h2
              style={{
                fontFamily: 'Playfair Display',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(28px, 3vw, 48px)',
                color: '#8A8A8A',
                margin: '0 0 40px',
                lineHeight: 1.1,
              }}
            >
              {post.subtitle}
            </h2>
          )}
        </header>

        <div style={{ marginBottom: 64 }}>
          {blocks.map((block, i) => {
            if (block.type === 'heading' && block.content) {
              return (
                <h2
                  key={block._id || i}
                  style={{
                    fontFamily: 'Playfair Display',
                    fontWeight: 700,
                    fontSize: 'clamp(28px, 3.2vw, 44px)',
                    color: '#F4F4F0',
                    margin: '0 0 18px',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                  }}
                >
                  {block.content}
                </h2>
              );
            }
            if (block.type === 'subtitle' && block.content) {
              return (
                <h3
                  key={block._id || i}
                  style={{
                    fontFamily: 'Playfair Display',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    fontSize: 'clamp(20px, 2.4vw, 32px)',
                    color: '#8A8A8A',
                    margin: '0 0 18px',
                    lineHeight: 1.2,
                  }}
                >
                  {block.content}
                </h3>
              );
            }
            if (block.type === 'text') {
              return (
                <p
                  key={block._id || i}
                  className={i === 0 ? 'drop-cap' : undefined}
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 17,
                    lineHeight: 1.95,
                    color: '#c8c8c4',
                    margin: '0 0 28px',
                    fontWeight: 300,
                  }}
                >
                  {block.content}
                </p>
              );
            }
            if (block.type === 'carousel') {
              const slides = slidesFromBlock(block);
              if (!slides.length) return null;
              return (
                <div key={block._id || i} style={{ margin: '0 0 40px' }}>
                  <ImageCarousel
                    images={slides}
                    alt={post.title}
                    onImageClick={(_src, index) =>
                      setViewer({ images: slides.map((slide) => slide.url), start: index, alt: post.title })
                    }
                  />
                </div>
              );
            }
            if (block.type === 'image' && block.url) {
              return (
                <div key={block._id || i} style={{ margin: '0 0 40px', position: 'relative' }}>
                  <button
                    type="button"
                    aria-label="View image fullscreen"
                    onClick={() =>
                      setViewer({
                        images: [block.url || ''],
                        start: 0,
                        alt: (block.meta?.label as string) || 'figure',
                      })
                    }
                    style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'zoom-in' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={block.url}
                      alt={(block.meta?.label as string) || 'figure'}
                      style={{ width: '100%', display: 'block', filter: 'brightness(0.75) grayscale(0.2)' }}
                    />
                  </button>
                </div>
              );
            }
            if (block.type === 'audio' || block.type === 'playlist') {
              const hasTracks =
                Array.isArray(block.meta?.tracks) &&
                (block.meta.tracks as { url?: string }[]).some((t) => typeof t.url === 'string');
              const provider = block.url ? detectMediaProvider(block.url) : null;

              if (block.type === 'audio' && (hasTracks || (block.url && provider !== 'spotify'))) {
                if (i !== firstFileAudioIndex) return null;
                if (!fileAudioTracks.length) return null;
                return (
                  <div key={block._id || i} style={{ marginBottom: 40 }}>
                    <AudioPlayer
                      label={fileAudioTracks.length > 1 ? 'Playlist' : 'Audio'}
                      tracks={fileAudioTracks}
                    />
                  </div>
                );
              }

              if (!block.url) return null;
              return (
                <div key={block._id || i} style={{ marginBottom: 40 }}>
                  <MediaPlayer
                    url={block.url}
                    kind={block.type === 'playlist' ? 'playlist' : 'audio'}
                    title={block.content}
                    artist={(block.meta?.artist as string) || 'GT.'}
                    artwork={(block.meta?.artwork as string) || post.coverUrl || undefined}
                  />
                </div>
              );
            }
            if (block.type === 'video' && block.url) {
              const provider = detectMediaProvider(block.url);
              return (
                <div key={block._id || i} style={{ marginBottom: 40 }}>
                  {provider === 'youtube' && block.content && (
                    <p
                      style={{
                        fontFamily: 'JetBrains Mono',
                        fontSize: 9,
                        color: '#8A8A8A',
                        margin: '0 0 10px',
                        letterSpacing: '0.12em',
                      }}
                    >
                      YOUTUBE · {block.content}
                    </p>
                  )}
                  <MediaPlayer url={block.url} kind="video" title={block.content} />
                </div>
              );
            }
            return null;
          })}
        </div>

        <div style={{ height: 1, background: '#262626', margin: '0 0 48px' }} />
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
      {viewer && (
        <PostImageViewer
          images={viewer.images}
          start={viewer.start}
          alt={viewer.alt}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
