'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { useHeroCtx } from '@/hooks/useHero';
import { api, apiUpload } from '@/lib/api';
import type { Asset, Post, PostBlock } from '@/lib/types';
import { mediaPlaceholder } from '@/lib/media';
import MediaPlayer from '@/components/MediaPlayer';
import ImageCropper from '@/components/ImageCropper';
import CoverFrame, { COVER_ASPECT, DEFAULT_COVER_FOCUS, coverFocusFrom, coverObjectPosition, type CoverFocus } from '@/components/CoverFrame';
import AudioPlayer, { type AudioTrack } from '@/components/AudioPlayer';
import ImageCarousel, { CAROUSEL_LIMIT, slidesFromBlock, type CarouselSlide } from '@/components/ImageCarousel';

type Block = PostBlock & { id: string };

type MetaTrack = {
  title: string;
  url: string;
  publicId?: string | null;
};

function HoverTip({ label, children }: { label: string; children: ReactNode }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  const show = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setTip({ x: rect.left + rect.width / 2, y: rect.top });
  };

  return (
    <span
      className="hover-tip"
      onMouseEnter={(e) => show(e.currentTarget)}
      onMouseLeave={() => setTip(null)}
      onClick={() => setTip(null)}
    >
      {children}
      {tip && (
        <span
          role="tooltip"
          style={{
            position: 'fixed',
            left: tip.x,
            top: tip.y - 8,
            transform: 'translate(-50%, -100%)',
            background: '#121212',
            color: '#F4F4F0',
            border: '1px solid #333',
            fontFamily: 'JetBrains Mono',
            fontSize: 9,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            padding: '5px 8px',
            zIndex: 4000,
            pointerEvents: 'none',
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}

function getMetaTracks(block: Block): MetaTrack[] {
  const raw = block.meta?.tracks;
  if (Array.isArray(raw) && raw.length) {
    return raw
      .map((t) => {
        const item = t as Record<string, unknown>;
        return {
          title: typeof item.title === 'string' ? item.title : 'Untitled',
          url: typeof item.url === 'string' ? item.url : '',
          publicId: typeof item.publicId === 'string' ? item.publicId : null,
        };
      })
      .filter((t) => t.url);
  }
  if (block.url) {
    return [{ title: block.content || 'Untitled', url: block.url, publicId: block.publicId }];
  }
  return [];
}

function setCarouselImages(block: Block, images: CarouselSlide[]): Block {
  const next = images.slice(0, CAROUSEL_LIMIT);
  const first = next[0];
  return {
    ...block,
    url: first?.url || null,
    publicId: first?.publicId || null,
    meta: {
      ...(block.meta || {}),
      images: next,
    },
  };
}

function writeCarouselSlide(block: Block, slideIndex: number, image: CarouselSlide): Block {
  const images = slidesFromBlock(block);
  if (slideIndex >= images.length) {
    if (images.length >= CAROUSEL_LIMIT) return block;
    return setCarouselImages(block, [...images, image]);
  }
  return setCarouselImages(block, images.map((img, i) => (i === slideIndex ? image : img)));
}

function moveCarouselSlide(block: Block, index: number, direction: -1 | 1): Block {
  const images = slidesFromBlock(block);
  const next = index + direction;
  if (next < 0 || next >= images.length) return block;
  const copy = [...images];
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return setCarouselImages(block, copy);
}

function setAudioTracks(block: Block, tracks: MetaTrack[]): Block {
  const first = tracks[0];
  return {
    ...block,
    content: block.content || first?.title || '',
    url: first?.url || null,
    publicId: first?.publicId || null,
    meta: {
      ...(block.meta || {}),
      tracks,
    },
  };
}

type CropSession = {
  src: string;
  target: 'cover' | 'block' | 'hero';
  blockId?: string;
  slideIndex?: number;
  revokeOnClose?: boolean;
  defaultAspect?: number;
};

function HeroImagesPanel() {
  const { images, add, remove, reorder, updateCaption } = useHeroCtx();
  const [caption, setCaption] = useState('');
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [crop, setCrop] = useState<CropSession | null>(null);

  const closeCrop = () => {
    if (crop?.revokeOnClose) URL.revokeObjectURL(crop.src);
    setCrop(null);
  };

  const handleFile = (file: File) => {
    setError('');
    if (file.type === 'image/gif') {
      void (async () => {
        setUploading(true);
        try {
          const res = await apiUpload<{ url: string; publicId: string }>('/api/upload', file, {
            folder: 'hero',
          });
          await add({
            caption: caption.trim() || file.name,
            imageUrl: res.url,
            publicId: res.publicId,
          });
          setCaption('');
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Upload failed');
        } finally {
          setUploading(false);
        }
      })();
      return;
    }
    setCrop({
      src: URL.createObjectURL(file),
      target: 'hero',
      revokeOnClose: true,
      defaultAspect: 16 / 9,
    });
  };

  const handleAddUrl = async () => {
    if (!url.trim()) return;
    setError('');
    try {
      await add({ caption: caption.trim() || 'Untitled', imageUrl: url.trim() });
      setUrl('');
      setCaption('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Add failed');
    }
  };

  const applyHeroCrop = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const res = await apiUpload<{ url: string; publicId: string }>('/api/upload', file, {
        folder: 'hero',
      });
      await add({
        caption: caption.trim() || file.name,
        imageUrl: res.url,
        publicId: res.publicId,
      });
      setCaption('');
      closeCrop();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: 'clamp(24px,3vw,40px) clamp(16px,3vw,48px)' }}>
      <h2
        style={{
          fontFamily: 'Playfair Display',
          fontStyle: 'italic',
          fontWeight: 700,
          fontSize: 24,
          color: '#F4F4F0',
          margin: '0 0 8px',
        }}
      >
        Hero Images
      </h2>
      <p
        style={{
          fontFamily: 'JetBrains Mono',
          fontSize: 10,
          color: '#8A8A8A',
          letterSpacing: '0.1em',
          margin: '0 0 32px',
        }}
      >
        DRAG TO REORDER · {images.length} SLIDE{images.length !== 1 ? 'S' : ''} · SYNCED TO API
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 32 }}>
        {images.map((img, i) => (
          <div
            key={img._id}
            draggable
            onDragStart={() => setDraggingIdx(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggingIdx !== null && draggingIdx !== i) void reorder(draggingIdx, i);
              setDraggingIdx(null);
            }}
            style={{
              border: draggingIdx === i ? '1px dashed #8A8A8A' : '1px solid #262626',
              background: '#1C1C1C',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '12px 16px',
              opacity: draggingIdx === i ? 0.45 : 1,
            }}
          >
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#8A8A8A', cursor: 'grab' }}>⠿</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.imageUrl}
              alt=""
              style={{ width: 72, height: 48, objectFit: 'cover', filter: 'brightness(0.8)', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontFamily: 'Playfair Display',
                  fontStyle: 'italic',
                  fontSize: 15,
                  color: '#F4F4F0',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {img.caption}
              </p>
            </div>
            <button
              onClick={() => {
                const cap = prompt('New caption:', img.caption);
                if (cap !== null) void updateCaption(img._id, cap);
              }}
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 9,
                color: '#8A8A8A',
                background: 'none',
                border: '1px solid #333',
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              EDIT
            </button>
            <button
              onClick={() => void remove(img._id)}
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 9,
                color: '#8A4040',
                background: 'none',
                border: '1px solid #3a2020',
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              REMOVE
            </button>
          </div>
        ))}
      </div>

      <div style={{ border: '1px solid #262626', background: '#121212', padding: 24 }}>
        <p
          style={{
            fontFamily: 'JetBrains Mono',
            fontSize: 10,
            color: '#8A8A8A',
            letterSpacing: '0.12em',
            margin: '0 0 16px',
          }}
        >
          ADD SLIDE
        </p>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption"
          style={{
            width: '100%',
            background: '#1C1C1C',
            border: '1px solid #333',
            outline: 'none',
            padding: '10px 12px',
            fontFamily: 'JetBrains Mono',
            fontSize: 11,
            color: '#F4F4F0',
            boxSizing: 'border-box',
            marginBottom: 10,
          }}
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Or paste image URL"
          style={{
            width: '100%',
            background: '#1C1C1C',
            border: '1px solid #333',
            outline: 'none',
            padding: '10px 12px',
            fontFamily: 'JetBrains Mono',
            fontSize: 11,
            color: '#F4F4F0',
            boxSizing: 'border-box',
            marginBottom: 10,
          }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => void handleAddUrl()}
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              letterSpacing: '0.12em',
              padding: '12px 16px',
              background: '#F4F4F0',
              color: '#0B0B0B',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            + ADD URL
          </button>
          <label
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              letterSpacing: '0.12em',
              padding: '12px 16px',
              background: 'transparent',
              color: '#F4F4F0',
              border: '1px solid #333',
              cursor: 'pointer',
            }}
          >
            {uploading ? 'UPLOADING…' : 'UPLOAD (CLOUDINARY)'}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {error && (
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#8A4040', marginTop: 12 }}>{error}</p>
        )}
      </div>

      {crop && (
        <ImageCropper
          imageSrc={crop.src}
          title="Crop hero image"
          mode="hero"
          defaultAspect={crop.defaultAspect}
          onCancel={closeCrop}
          onComplete={applyHeroCrop}
        />
      )}
    </div>
  );
}

function EntriesPanel({ onEdit }: { onEdit: (post: Post) => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'title'>('newest');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api<{ posts: Post[] }>('/api/admin/posts');
      setPosts(data.posts);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = posts
    .filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${p.title} ${p.subtitle || ''} ${p.slug}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return sort === 'oldest' ? aTime - bTime : bTime - aTime;
    });

  const chip = (active: boolean): CSSProperties => ({
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '7px 12px',
    background: active ? '#F4F4F0' : 'transparent',
    color: active ? '#0B0B0B' : '#8A8A8A',
    border: '1px solid #333',
    cursor: 'pointer',
  });

  return (
    <div style={{ padding: 'clamp(24px,3vw,40px) clamp(16px,3vw,48px)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 28,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: 'Playfair Display',
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: 24,
              color: '#F4F4F0',
              margin: '0 0 8px',
            }}
          >
            Entries
          </h2>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#8A8A8A', letterSpacing: '0.1em', margin: 0 }}>
            {filtered.length} OF {posts.length} · CLICK A CARD TO EDIT
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or slug…"
          style={{
            width: 'min(320px, 100%)',
            background: '#121212',
            border: '1px solid #333',
            outline: 'none',
            padding: '10px 12px',
            fontFamily: 'JetBrains Mono',
            fontSize: 11,
            color: '#F4F4F0',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#555', letterSpacing: '0.12em' }}>STATUS</span>
        {(['all', 'published', 'draft'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStatusFilter(s)} style={chip(statusFilter === s)}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28, alignItems: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#555', letterSpacing: '0.12em' }}>SORT</span>
        {(
          [
            ['newest', 'Newest'],
            ['oldest', 'Oldest'],
            ['title', 'Title'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSort(id)} style={chip(sort === id)}>
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#8A8A8A' }}>LOADING…</p>
      )}

      {!loading && filtered.length === 0 && (
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#8A8A8A', letterSpacing: '0.1em' }}>
          NO ENTRIES MATCH THESE FILTERS
        </p>
      )}

      <style>{`
        .entries-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }
      `}</style>

      <div className="entries-grid">
        {filtered.map((p) => (
          <article
            key={p._id}
            style={{
              border: '1px solid #262626',
              background: '#121212',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => onEdit(p)}
              style={{
                display: 'block',
                width: '100%',
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'inherit',
              }}
            >
              <div
                style={{
                  aspectRatio: '16 / 9',
                  background: '#1C1C1C',
                  overflow: 'hidden',
                  borderBottom: '1px solid #262626',
                }}
              >
                {p.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.coverUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: coverObjectPosition(p.coverFocus), display: 'block' }}
                  />
                ) : (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'JetBrains Mono',
                      fontSize: 9,
                      color: '#555',
                      letterSpacing: '0.1em',
                    }}
                  >
                    NO COVER
                  </div>
                )}
              </div>
              <div style={{ padding: '14px 14px 10px' }}>
                <p
                  style={{
                    fontFamily: 'Playfair Display',
                    fontStyle: 'italic',
                    fontSize: 18,
                    color: '#F4F4F0',
                    margin: '0 0 8px',
                    lineHeight: 1.15,
                  }}
                >
                  {p.title || 'Untitled'}
                </p>
                <p style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#8A8A8A', margin: 0, letterSpacing: '0.08em' }}>
                  {p.status.toUpperCase()}
                  {p.updatedAt ? ` · ${p.updatedAt.slice(0, 10)}` : ''}
                </p>
              </div>
            </button>
            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                gap: 6,
                padding: '0 14px 14px',
              }}
            >
              <button
                type="button"
                onClick={() => onEdit(p)}
                style={{
                  flex: 1,
                  fontFamily: 'JetBrains Mono',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  padding: '8px 10px',
                  background: '#F4F4F0',
                  color: '#0B0B0B',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                EDIT
              </button>
              {p.status === 'published' && (
                <Link
                  href={`/post/${p.slug}`}
                  target="_blank"
                  style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    padding: '8px 10px',
                    color: '#8A8A8A',
                    border: '1px solid #333',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  VIEW
                </Link>
              )}
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`Delete “${p.title}”?`)) return;
                  await api(`/api/admin/posts/${p._id}`, { method: 'DELETE' });
                  await load();
                }}
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  padding: '8px 10px',
                  color: '#8A4040',
                  background: 'none',
                  border: '1px solid #3a2020',
                  cursor: 'pointer',
                }}
              >
                DELETE
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: 'entries', icon: '◈', label: 'Entries' },
  { id: 'new', icon: '+', label: 'New Post' },
  { id: 'hero', icon: '▤', label: 'Hero Images' },
  { id: 'vault', icon: '▣', label: 'Asset Vault' },
];

function PostLivePreview({
  title,
  subtitle,
  coverUrl,
  blocks,
}: {
  title: string;
  subtitle: string;
  coverUrl: string;
  blocks: Block[];
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#0B0B0B' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          borderBottom: '1px solid #262626',
          background: 'rgba(11,11,11,0.95)',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#8A8A8A', letterSpacing: '0.14em' }}>
          LIVE PREVIEW
        </span>
      </div>

      <article style={{ padding: '28px 20px 48px', maxWidth: 560, margin: '0 auto' }}>
        <p
          style={{
            fontFamily: 'JetBrains Mono',
            fontSize: 9,
            color: '#8A8A8A',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            margin: '0 0 18px',
          }}
        >
          {today}
        </p>
        <h1
          style={{
            fontFamily: 'Playfair Display',
            fontWeight: 900,
            fontSize: 'clamp(28px, 3.2vw, 44px)',
            lineHeight: 0.95,
            color: '#F4F4F0',
            margin: '0 0 10px',
            letterSpacing: '-0.02em',
          }}
        >
          {title.trim() || 'Untitled'}
        </h1>
        {subtitle.trim() && (
          <h2
            style={{
              fontFamily: 'Playfair Display',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(18px, 2vw, 26px)',
              color: '#8A8A8A',
              margin: '0 0 24px',
              lineHeight: 1.15,
            }}
          >
            {subtitle}
          </h2>
        )}

        {blocks.map((block, i) => {
          if (block.type === 'heading' && block.content) {
            return (
              <h2
                key={block.id}
                style={{
                  fontFamily: 'Playfair Display',
                  fontWeight: 700,
                  fontSize: 'clamp(22px, 2.4vw, 32px)',
                  color: '#F4F4F0',
                  margin: '0 0 14px',
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
                key={block.id}
                style={{
                  fontFamily: 'Playfair Display',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 'clamp(16px, 1.8vw, 22px)',
                  color: '#8A8A8A',
                  margin: '0 0 14px',
                  lineHeight: 1.2,
                }}
              >
                {block.content}
              </h3>
            );
          }
          if (block.type === 'text' && block.content) {
            return (
              <p
                key={block.id}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 14,
                  lineHeight: 1.9,
                  color: '#c8c8c4',
                  margin: '0 0 20px',
                  fontWeight: 300,
                }}
              >
                {block.content}
              </p>
            );
          }
          if (block.type === 'image' && block.url) {
            return (
              <div key={block.id} style={{ margin: '0 0 24px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={block.url}
                  alt=""
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            );
          }
          if (block.type === 'carousel') {
            const slides = slidesFromBlock(block);
            if (!slides.length) {
              return (
                <p
                  key={block.id}
                  style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: 10,
                    color: '#555',
                    letterSpacing: '0.1em',
                    margin: '0 0 20px',
                  }}
                >
                  CAROUSEL · ADD IMAGES
                </p>
              );
            }
            return (
              <div key={block.id} style={{ margin: '0 0 24px' }}>
                <ImageCarousel images={slides} />
              </div>
            );
          }
          if (block.type === 'audio') {
            const tracks = getMetaTracks(block).map((t) => ({
              title: t.title,
              artist: (block.meta?.artist as string) || 'GT.',
              url: t.url,
              artwork: (block.meta?.artwork as string) || coverUrl || undefined,
            }));
            if (!tracks.length) return null;
            return (
              <div key={block.id} style={{ marginBottom: 24 }}>
                <AudioPlayer
                  label={tracks.length > 1 ? 'Playlist' : 'Audio'}
                  tracks={tracks}
                />
              </div>
            );
          }
          if (block.type === 'video' && block.url) {
            return (
              <div key={block.id} style={{ marginBottom: 24 }}>
                <MediaPlayer url={block.url} kind="video" title={block.content} />
              </div>
            );
          }
          if (i === 0 && !block.content && !block.url) {
            return null;
          }
          return null;
        })}

        {!title.trim() && blocks.every((b) => !b.content && !b.url) && (
          <p
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              color: '#555',
              letterSpacing: '0.1em',
              marginTop: 40,
            }}
          >
            START WRITING TO SEE PREVIEW
          </p>
        )}
      </article>
    </div>
  );
}

function assetKind(a: Asset): 'image' | 'video' | 'audio' {
  const name = (a.filename || a.url || '').toLowerCase();
  if (/\.(mp3|wav|ogg|m4a|aac|flac|wma|aiff?)$/i.test(name)) return 'audio';
  if (a.resourceType === 'image') return 'image';
  if (a.resourceType === 'video') return 'video';
  return 'audio';
}

function postsUsingAsset(posts: Post[], asset: Asset): Post[] {
  return posts.filter((p) => {
    if (p.coverUrl === asset.url || p.coverPublicId === asset.publicId) return true;
    for (const b of p.blocks || []) {
      if (b.url === asset.url || b.publicId === asset.publicId) return true;
      if ((b.meta?.artwork as string | undefined) === asset.url) return true;
      const tracks = b.meta?.tracks;
      if (Array.isArray(tracks)) {
        for (const t of tracks) {
          const item = t as Record<string, unknown>;
          if (item.url === asset.url || item.publicId === asset.publicId) return true;
        }
      }
      for (const slide of slidesFromBlock(b)) {
        if (slide.url === asset.url || slide.publicId === asset.publicId) return true;
      }
    }
    return false;
  });
}

function VaultPanel() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [uploading, setUploading] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api<{ assets: Asset[] }>('/api/assets');
      setAssets(data.assets);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = assets
    .filter((a) => {
      if (typeFilter !== 'all' && assetKind(a) !== typeFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${a.filename} ${a.folder || ''} ${a.resourceType}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === 'name') return (a.filename || '').localeCompare(b.filename || '');
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return sort === 'oldest' ? aTime - bTime : bTime - aTime;
    });

  const selectedCount = selected.size;

  const exitDeleteMode = () => {
    setDeleteMode(false);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    if (!deleteMode) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteIds = async (ids: string[]) => {
    if (!ids.length) return;
    const targets = assets.filter((a) => ids.includes(a._id));
    if (!targets.length) return;

    let posts: Post[] = [];
    try {
      const data = await api<{ posts: Post[] }>('/api/admin/posts');
      posts = data.posts || [];
    } catch {
      posts = [];
    }

    const inUse = targets
      .map((asset) => ({ asset, posts: postsUsingAsset(posts, asset) }))
      .filter((row) => row.posts.length > 0);

    let message =
      ids.length === 1
        ? `Delete "${targets[0].filename}"?\nThis cannot be undone.`
        : `Delete ${ids.length} files?\nThis cannot be undone.`;

    if (inUse.length) {
      const lines = inUse.slice(0, 8).map(({ asset, posts: used }) => {
        const titles = used.map((p) => p.title || p.slug).join(', ');
        return `• ${asset.filename} → ${titles}`;
      });
      const more = inUse.length > 8 ? `\n…and ${inUse.length - 8} more` : '';
      message =
        `WARNING: ${inUse.length} of these file${inUse.length === 1 ? ' is' : 's are'} used in entries.\n\n` +
        `${lines.join('\n')}${more}\n\n` +
        `Deleting will remove them from the vault, but entries may keep broken media links.\n\n` +
        `Delete anyway?`;
    }

    if (!window.confirm(message)) return;

    setDeleting(true);
    try {
      for (const id of ids) {
        await api(`/api/assets/${id}`, { method: 'DELETE' });
      }
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setAssets((prev) => prev.filter((a) => !ids.includes(a._id)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
      await load();
    } finally {
      setDeleting(false);
    }
  };

  const chip = (active: boolean): CSSProperties => ({
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '7px 12px',
    background: active ? '#F4F4F0' : 'transparent',
    color: active ? '#0B0B0B' : '#8A8A8A',
    border: '1px solid #333',
    cursor: 'pointer',
  });

  const counts = {
    all: assets.length,
    image: assets.filter((a) => assetKind(a) === 'image').length,
    video: assets.filter((a) => assetKind(a) === 'video').length,
    audio: assets.filter((a) => assetKind(a) === 'audio').length,
  };

  return (
    <div style={{ padding: 'clamp(24px,3vw,40px) clamp(16px,3vw,48px)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 28,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: 'Playfair Display',
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: 24,
              color: '#F4F4F0',
              margin: '0 0 8px',
            }}
          >
            Asset Vault
          </h2>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#8A8A8A', letterSpacing: '0.1em', margin: 0 }}>
            {filtered.length} OF {assets.length}
            {deleteMode && selectedCount > 0 ? ` · ${selectedCount} SELECTED` : ''}
            {deleteMode ? ' · DELETE MODE' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search filename…"
            style={{
              width: 'min(260px, 100%)',
              background: '#121212',
              border: '1px solid #333',
              outline: 'none',
              padding: '10px 12px',
              fontFamily: 'JetBrains Mono',
              fontSize: 11,
              color: '#F4F4F0',
            }}
          />
          {!deleteMode ? (
            <button
              type="button"
              onClick={() => setDeleteMode(true)}
              disabled={!assets.length}
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '10px 12px',
                background: 'transparent',
                color: assets.length ? '#c07070' : '#555',
                border: '1px solid #3a2020',
                cursor: assets.length ? 'pointer' : 'default',
              }}
            >
              Delete Files
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={exitDeleteMode}
                disabled={deleting}
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '10px 12px',
                  background: 'transparent',
                  color: '#8A8A8A',
                  border: '1px solid #333',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteIds(Array.from(selected))}
                disabled={deleting || selectedCount === 0}
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '10px 12px',
                  background: selectedCount ? '#F4F4F0' : 'transparent',
                  color: selectedCount ? '#0B0B0B' : '#555',
                  border: selectedCount ? '1px solid #F4F4F0' : '1px solid #333',
                  cursor: selectedCount && !deleting ? 'pointer' : 'default',
                }}
              >
                {deleting ? 'Deleting…' : `Delete Selected (${selectedCount})`}
              </button>
            </>
          )}
          <label
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              border: '1px solid #333',
              padding: '10px 12px',
              cursor: uploading || deleteMode ? 'default' : 'pointer',
              color: '#F4F4F0',
              opacity: uploading || deleteMode ? 0.45 : 1,
              pointerEvents: deleteMode ? 'none' : 'auto',
            }}
          >
            {uploading ? 'UPLOADING…' : '+ UPLOAD'}
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              hidden
              multiple
              disabled={uploading || deleting || deleteMode}
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                setUploading(true);
                try {
                  for (const f of files) {
                    await apiUpload('/api/upload', f, { folder: 'vault' });
                  }
                  await load();
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Upload failed');
                } finally {
                  setUploading(false);
                  e.target.value = '';
                }
              }}
            />
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#555', letterSpacing: '0.12em' }}>TYPE</span>
        {(['all', 'image', 'video', 'audio'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTypeFilter(t)} style={chip(typeFilter === t)}>
            {t} · {counts[t]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28, alignItems: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#555', letterSpacing: '0.12em' }}>SORT</span>
        {(
          [
            ['newest', 'Newest'],
            ['oldest', 'Oldest'],
            ['name', 'Name'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSort(id)} style={chip(sort === id)}>
            {label}
          </button>
        ))}
      </div>

      {deleteMode && (
        <p
          style={{
            fontFamily: 'JetBrains Mono',
            fontSize: 10,
            color: '#8A8A8A',
            letterSpacing: '0.08em',
            margin: '0 0 16px',
          }}
        >
          CLICK ASSETS TO SELECT · USE ✕ TO DELETE ONE
        </p>
      )}

      {loading && (
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#8A8A8A' }}>LOADING…</p>
      )}

      {!loading && filtered.length === 0 && (
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#8A8A8A', letterSpacing: '0.1em' }}>
          {assets.length === 0
            ? 'EMPTY — UPLOAD REQUIRES CLOUDINARY KEYS IN BACKEND .ENV'
            : 'NO ASSETS MATCH THESE FILTERS'}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 2 }}>
        {filtered.map((a) => {
          const kind = assetKind(a);
          const isSelected = deleteMode && selected.has(a._id);
          return (
            <div
              key={a._id}
              role={deleteMode ? 'button' : undefined}
              tabIndex={deleteMode ? 0 : undefined}
              onClick={() => {
                if (deleteMode) toggleSelect(a._id);
              }}
              onKeyDown={(e) => {
                if (!deleteMode) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSelect(a._id);
                }
              }}
              style={{
                border: isSelected ? '1px solid #F4F4F0' : '1px solid #262626',
                aspectRatio: '1',
                overflow: 'hidden',
                position: 'relative',
                background: '#121212',
                cursor: deleteMode ? 'pointer' : 'default',
                outline: 'none',
                boxShadow: isSelected ? 'inset 0 0 0 1px #F4F4F0' : 'none',
              }}
            >
              {kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.url}
                  alt={a.filename}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    opacity: isSelected ? 0.72 : 1,
                  }}
                />
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 10,
                    boxSizing: 'border-box',
                    opacity: isSelected ? 0.72 : 1,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: 18,
                      color: '#555',
                      lineHeight: 1,
                    }}
                  >
                    {kind === 'audio' ? '♪' : '▶'}
                  </span>
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: 9,
                      color: '#8A8A8A',
                      textAlign: 'center',
                      wordBreak: 'break-all',
                      lineHeight: 1.35,
                    }}
                  >
                    {a.filename}
                  </span>
                </div>
              )}

              {deleteMode && (
                <>
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: 6,
                      width: 16,
                      height: 16,
                      border: isSelected ? '1px solid #F4F4F0' : '1px solid #555',
                      background: isSelected ? '#F4F4F0' : 'rgba(11,11,11,0.65)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'JetBrains Mono',
                      fontSize: 10,
                      color: '#0B0B0B',
                      lineHeight: 1,
                    }}
                  >
                    {isSelected ? '✓' : ''}
                  </span>
                  <button
                    type="button"
                    title="Delete file"
                    disabled={deleting}
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteIds([a._id]);
                    }}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 26,
                      height: 26,
                      border: '1px solid #3a2020',
                      background: 'rgba(11,11,11,0.8)',
                      color: '#c07070',
                      cursor: deleting ? 'wait' : 'pointer',
                      fontFamily: 'JetBrains Mono',
                      fontSize: 11,
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                </>
              )}

              <span
                style={{
                  position: 'absolute',
                  left: 6,
                  bottom: 6,
                  fontFamily: 'JetBrains Mono',
                  fontSize: 8,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#F4F4F0',
                  background: 'rgba(11,11,11,0.75)',
                  border: '1px solid #333',
                  padding: '3px 6px',
                }}
              >
                {kind}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CarouselFields({
  block,
  onChange,
  onUpload,
  onRecrop,
  onLimit,
}: {
  block: Block;
  onChange: (next: Block) => void;
  onUpload: (file: File, slideIndex: number) => void;
  onRecrop: (src: string, slideIndex: number) => void;
  onLimit: () => void;
}) {
  const images = slidesFromBlock(block);
  const tiny: CSSProperties = {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#8A8A8A',
    background: 'rgba(11,11,11,0.8)',
    border: '1px solid #333',
    padding: '2px 5px',
    cursor: 'pointer',
  };

  const addUrl = (value: string) => {
    const url = value.trim();
    if (!url) return;
    if (images.length >= CAROUSEL_LIMIT) {
      onLimit();
      return;
    }
    onChange(setCarouselImages(block, [...images, { url, publicId: null }]));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
        {Array.from({ length: CAROUSEL_LIMIT }, (_, i) => {
          const image = images[i];
          return (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                border: '1px dashed #333',
                background: '#121212',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {image ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', left: 4, right: 4, bottom: 4, display: 'flex', gap: 3, justifyContent: 'space-between' }}>
                    <HoverTip label="Move left">
                      <button
                        type="button"
                        aria-label="Move left"
                        disabled={i === 0}
                        onClick={() => onChange(moveCarouselSlide(block, i, -1))}
                        style={{ ...tiny, opacity: i === 0 ? 0.35 : 1, cursor: i === 0 ? 'default' : 'pointer' }}
                      >
                        ←
                      </button>
                    </HoverTip>
                    <HoverTip label="Crop image">
                      <button type="button" aria-label="Crop image" onClick={() => onRecrop(image.url, i)} style={tiny}>
                        CROP
                      </button>
                    </HoverTip>
                    <HoverTip label="Move right">
                      <button
                        type="button"
                        aria-label="Move right"
                        disabled={i === images.length - 1}
                        onClick={() => onChange(moveCarouselSlide(block, i, 1))}
                        style={{
                          ...tiny,
                          opacity: i === images.length - 1 ? 0.35 : 1,
                          cursor: i === images.length - 1 ? 'default' : 'pointer',
                        }}
                      >
                        →
                      </button>
                    </HoverTip>
                    <HoverTip label="Remove image">
                      <button
                        type="button"
                        aria-label="Remove image"
                        onClick={() => onChange(setCarouselImages(block, images.filter((_, index) => index !== i)))}
                        style={tiny}
                      >
                        ✕
                      </button>
                    </HoverTip>
                  </div>
                </>
              ) : (
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'JetBrains Mono',
                    fontSize: 9,
                    color: '#555',
                    letterSpacing: '0.08em',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p style={{ margin: 0, fontFamily: 'JetBrains Mono', fontSize: 9, color: '#8A8A8A', letterSpacing: '0.12em' }}>
        {images.length} / {CAROUSEL_LIMIT} IMAGES
      </p>
      {images.length < CAROUSEL_LIMIT && (
        <>
          <label
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 9,
              color: '#8A8A8A',
              border: '1px dashed #333',
              padding: 12,
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            UPLOAD & CROP
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                if (images.length >= CAROUSEL_LIMIT) {
                  onLimit();
                  return;
                }
                onUpload(file, images.length);
              }}
            />
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('carousel-url');
              if (!(input instanceof HTMLInputElement)) return;
              addUrl(input.value);
              input.value = '';
            }}
            style={{ display: 'flex', gap: 6 }}
          >
            <input
              name="carousel-url"
              placeholder="Or paste image URL"
              style={{
                flex: 1,
                background: '#121212',
                border: '1px solid #333',
                outline: 'none',
                padding: 10,
                fontFamily: 'JetBrains Mono',
                fontSize: 11,
                color: '#F4F4F0',
              }}
            />
            <button
              type="submit"
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 9,
                letterSpacing: '0.12em',
                color: '#8A8A8A',
                background: 'transparent',
                border: '1px solid #333',
                padding: '0 12px',
                cursor: 'pointer',
              }}
            >
              ADD
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function Admin({ onLogout }: { onLogout: () => void }) {
  const [activeNav, setActiveNav] = useState('new');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverPublicId, setCoverPublicId] = useState<string | null>(null);
  const [coverFocus, setCoverFocus] = useState<CoverFocus>(DEFAULT_COVER_FOCUS);
  const [coverUploading, setCoverUploading] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: 'ok' | 'error' } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropSession | null>(null);

  const showToast = (text: string, kind: 'ok' | 'error' = 'ok') => {
    setToast({ text, kind });
  };

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const resetEditor = () => {
    setEditingId(null);
    setTitle('');
    setSubtitle('');
    setCoverUrl('');
    setCoverPublicId(null);
    setCoverFocus(DEFAULT_COVER_FOCUS);
    setBlocks([]);
    setToast(null);
  };

  const loadPost = (post: Post) => {
    setEditingId(post._id);
    setTitle(post.title || '');
    setSubtitle(post.subtitle || '');
    setCoverUrl(post.coverUrl || '');
    setCoverPublicId(post.coverPublicId || null);
    setCoverFocus(coverFocusFrom(post.coverFocus));
    setBlocks(
      (post.blocks || []).map((b, i) => ({
        ...b,
        id: b._id || `b${i}-${Date.now()}`,
      }))
    );
    setToast(null);
    setActiveNav('new');
  };

  const closeCrop = () => {
    if (crop?.revokeOnClose) URL.revokeObjectURL(crop.src);
    setCrop(null);
  };

  const openFileCrop = (file: File, target: 'cover' | 'block', blockId?: string, slideIndex?: number) => {
    if (file.type === 'image/gif') {
      void (async () => {
        if (target === 'cover') setCoverUploading(true);
        try {
          const res = await apiUpload<{ url: string; publicId: string }>('/api/upload', file, {
            folder: target === 'cover' ? 'covers' : 'posts',
          });
          if (target === 'cover') {
            setCoverUrl(res.url);
            setCoverPublicId(res.publicId);
            setCoverFocus(DEFAULT_COVER_FOCUS);
          } else if (blockId) {
            setBlocks((prev) =>
              prev.map((b) => {
                if (b.id !== blockId) return b;
                if (typeof slideIndex === 'number') {
                  return writeCarouselSlide(b, slideIndex, { url: res.url, publicId: res.publicId });
                }
                return { ...b, url: res.url, publicId: res.publicId, content: b.content || file.name };
              })
            );
          }
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Upload failed');
        } finally {
          if (target === 'cover') setCoverUploading(false);
        }
      })();
      return;
    }
    setCrop({
      src: URL.createObjectURL(file),
      target,
      blockId,
      slideIndex,
      revokeOnClose: true,
      defaultAspect: target === 'cover' ? COVER_ASPECT : typeof slideIndex === 'number' ? 16 / 10 : undefined,
    });
  };

  const applyCrop = async (file: File) => {
    if (!crop) return;
    if (crop.target === 'cover') setCoverUploading(true);
    try {
      const res = await apiUpload<{ url: string; publicId: string }>('/api/upload', file, {
        folder: crop.target === 'cover' ? 'covers' : 'posts',
      });
      if (crop.target === 'cover') {
        setCoverUrl(res.url);
        setCoverPublicId(res.publicId);
        setCoverFocus(DEFAULT_COVER_FOCUS);
      } else if (crop.blockId) {
        setBlocks((prev) =>
          prev.map((b) => {
            if (b.id !== crop.blockId) return b;
            if (typeof crop.slideIndex === 'number') {
              return writeCarouselSlide(b, crop.slideIndex, { url: res.url, publicId: res.publicId });
            }
            return { ...b, url: res.url, publicId: res.publicId, content: b.content || file.name };
          })
        );
      }
      closeCrop();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      if (crop.target === 'cover') setCoverUploading(false);
    }
  };

  const addBlock = (type: Block['type']) =>
    setBlocks((prev) => [...prev, { id: `b${Date.now()}`, type, content: '' }]);

  const moveBlock = (index: number, direction: -1 | 1) => {
    setBlocks((prev) => {
      const next = index + direction;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  };

  const save = async () => {
    if (!coverUrl.trim()) {
      showToast('Cover image required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim() || 'Untitled',
        subtitle: subtitle.trim(),
        status: 'published' as const,
        blocks: blocks.map(({ type, content, url, publicId, meta }) => ({
          type,
          content,
          url: url ?? null,
          publicId: publicId ?? null,
          meta: meta ?? {},
        })),
        coverUrl: coverUrl.trim(),
        coverPublicId: coverPublicId,
        coverFocus,
      };

      if (editingId) {
        await api(`/api/admin/posts/${editingId}`, { method: 'PUT', json: payload });
        showToast('Saved', 'ok');
      } else {
        const data = await api<{ post: Post }>('/api/admin/posts', { method: 'POST', json: payload });
        setEditingId(data.post._id);
        showToast('Created', 'ok');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: '#0B0B0B', minHeight: '100vh', display: 'flex' }} className="grain">
      <style>{`
        @media (max-width: 640px) {
          .admin-sidebar { transform: translateX(${sidebarOpen ? '0' : '-100%'}) !important; transition: transform 0.3s ease !important; }
          .admin-main { margin-left: 0 !important; }
        }
      `}</style>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 140 }}
        />
      )}

      <aside
        className="admin-sidebar"
        style={{
          width: 200,
          background: '#121212',
          borderRight: '1px solid #262626',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          padding: '68px 10px 16px',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 150,
          gap: 4,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 16px',
            borderBottom: '1px solid #262626',
            boxSizing: 'border-box',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gtl-logo.svg" alt="GTL" width={22} height={26} style={{ display: 'block', height: 22, width: 'auto' }} />
          <span
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: '#F4F4F0',
              textTransform: 'uppercase',
            }}
          >
            Studio
          </span>
        </div>
        {NAV_ITEMS.map((item) => {
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === 'new') resetEditor();
                setActiveNav(item.id);
                setSidebarOpen(false);
              }}
              style={{
                width: '100%',
                height: 42,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0 12px',
                background: active ? '#1C1C1C' : 'transparent',
                border: active ? '1px solid #333' : '1px solid transparent',
                color: active ? '#F4F4F0' : '#8A8A8A',
                cursor: 'pointer',
                boxSizing: 'border-box',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  width: 18,
                  textAlign: 'center',
                  fontSize: item.id === 'new' ? 16 : 13,
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                {item.icon}
              </span>
              <span
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Link
            href="/"
            style={{
              width: '100%',
              height: 42,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 12px',
              color: '#8A8A8A',
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ width: 18, textAlign: 'center', fontSize: 12, flexShrink: 0, fontFamily: 'JetBrains Mono' }}>
              ↗
            </span>
            <span
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Live Site
            </span>
          </Link>
          <button
            type="button"
            onClick={onLogout}
            style={{
              width: '100%',
              height: 42,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 12px',
              color: '#8A8A8A',
              background: 'none',
              border: '1px solid #333',
              cursor: 'pointer',
              boxSizing: 'border-box',
              textAlign: 'left',
            }}
          >
            <span style={{ width: 18, textAlign: 'center', fontSize: 12, flexShrink: 0, fontFamily: 'JetBrains Mono' }}>
              ⏻
            </span>
            <span
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Log Out
            </span>
          </button>
        </div>
      </aside>

      <main className="admin-main" style={{ flex: 1, marginLeft: 200, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            height: 56,
            borderBottom: '1px solid #262626',
            background: 'rgba(18,18,18,0.95)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 clamp(12px,2vw,28px)',
            gap: 12,
          }}
        >
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="hamburger"
            style={{ background: 'none', border: 'none', color: '#8A8A8A', cursor: 'pointer', fontSize: 16 }}
          >
            ☰
          </button>
          <style>{`.hamburger { display: none !important; } @media(max-width:640px) { .hamburger { display: flex !important; } }`}</style>

          <span
            style={{
              flex: 1,
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#8A8A8A',
              minWidth: 0,
            }}
          >
            {activeNav === 'new' && editingId ? 'Edit Post' : NAV_ITEMS.find((n) => n.id === activeNav)?.label}
          </span>

          {activeNav === 'new' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <button
                onClick={() => void save()}
                disabled={saving}
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  padding: '7px 16px',
                  background: '#F4F4F0',
                  color: '#0B0B0B',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {saving ? '…' : 'SAVE'}
              </button>
            </div>
          )}
        </div>

        {activeNav === 'hero' && <HeroImagesPanel />}
        {activeNav === 'entries' && <EntriesPanel onEdit={loadPost} />}
        {activeNav === 'vault' && <VaultPanel />}

        {activeNav === 'new' && (
          <div
            className="editor-split"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.95fr)',
              flex: 1,
              minHeight: 0,
            }}
          >
            <style>{`
              @media (max-width: 1100px) {
                .editor-split { grid-template-columns: 1fr !important; }
                .editor-preview { display: none !important; }
              }
              .hover-tip { display: inline-flex; }
              .hover-tip > button:disabled { pointer-events: none; }
            `}</style>
          <div style={{ padding: 'clamp(24px,3vw,40px) clamp(16px,3vw,44px)', maxWidth: 900, width: '100%', boxSizing: 'border-box', overflow: 'auto' }}>
            <div style={{ marginBottom: 16 }}>
              <p
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: 9,
                  color: '#8A8A8A',
                  letterSpacing: '0.14em',
                  margin: '0 0 8px',
                }}
              >
                POST TITLE
              </p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled"
                style={{
                  width: '100%',
                  background: '#121212',
                  border: '1px solid #333',
                  outline: 'none',
                  fontFamily: 'Playfair Display',
                  fontWeight: 700,
                  fontSize: 'clamp(22px,3vw,32px)',
                  color: '#F4F4F0',
                  letterSpacing: '-0.02em',
                  padding: '14px 16px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <p
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: 9,
                  color: '#8A8A8A',
                  letterSpacing: '0.14em',
                  margin: '0 0 8px',
                }}
              >
                POST SUBTITLE
              </p>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Optional"
                style={{
                  width: '100%',
                  background: '#121212',
                  border: '1px solid #333',
                  outline: 'none',
                  fontFamily: 'Playfair Display',
                  fontStyle: 'italic',
                  fontSize: 20,
                  color: '#F4F4F0',
                  padding: '12px 16px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <p
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: 9,
                  color: '#8A8A8A',
                  letterSpacing: '0.14em',
                  margin: '0 0 10px',
                }}
              >
                COVER IMAGE / GIF *
              </p>
              {coverUrl ? (
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <CoverFrame
                    src={coverUrl}
                    alt="Cover"
                    focus={coverFocus}
                    onFocusChange={setCoverFocus}
                  />
                  <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6, zIndex: 2 }}>
                    <HoverTip label="Crop cover">
                    <button
                      type="button"
                      aria-label="Crop cover"
                      onClick={() =>
                        setCrop({
                          src: coverUrl,
                          target: 'cover',
                          defaultAspect: COVER_ASPECT,
                        })
                      }
                      style={{
                        fontFamily: 'JetBrains Mono',
                        fontSize: 9,
                        color: '#F4F4F0',
                        background: 'rgba(11,11,11,0.85)',
                        border: '1px solid #333',
                        padding: '4px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      CROP
                    </button>
                    </HoverTip>
                    <HoverTip label="Replace cover">
                    <button
                      type="button"
                      aria-label="Replace cover"
                      onClick={() => {
                        setCoverUrl('');
                        setCoverPublicId(null);
                        setCoverFocus(DEFAULT_COVER_FOCUS);
                      }}
                      style={{
                        fontFamily: 'JetBrains Mono',
                        fontSize: 9,
                        color: '#F4F4F0',
                        background: 'rgba(11,11,11,0.85)',
                        border: '1px solid #333',
                        padding: '4px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      REPLACE
                    </button>
                    </HoverTip>
                  </div>
                  <p
                    style={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: 9,
                      color: '#8A8A8A',
                      letterSpacing: '0.1em',
                      margin: '8px 0 0',
                    }}
                  >
                    DRAG THE PHOTO TO MOVE IT INSIDE THE FRAME
                  </p>
                </div>
              ) : (
                <label
                  style={{
                    display: 'block',
                    border: '1px dashed #333',
                    background: '#121212',
                    padding: '48px 24px',
                    textAlign: 'center',
                    cursor: coverUploading ? 'wait' : 'pointer',
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: 10,
                      color: '#8A8A8A',
                      letterSpacing: '0.12em',
                    }}
                  >
                    {coverUploading ? 'UPLOADING…' : 'UPLOAD IMAGE / GIF — THEN CROP'}
                  </span>
                  <input
                    type="file"
                    hidden
                    accept="image/*,.gif"
                    disabled={coverUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) openFileCrop(f, 'cover');
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
              <input
                value={coverUrl}
                onChange={(e) => {
                  setCoverUrl(e.target.value);
                  setCoverPublicId(null);
                  setCoverFocus(DEFAULT_COVER_FOCUS);
                }}
                placeholder="Or paste cover image / GIF URL"
                style={{
                  width: '100%',
                  background: '#121212',
                  border: '1px solid #333',
                  outline: 'none',
                  padding: 10,
                  fontFamily: 'JetBrains Mono',
                  fontSize: 11,
                  color: '#F4F4F0',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {blocks.map((block, index) => (
              <div
                key={block.id}
                style={{ border: '1px solid #262626', background: '#1C1C1C', marginBottom: 2, padding: 16 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#8A8A8A', letterSpacing: '0.14em' }}>
                    {String(index + 1).padStart(2, '0')} /{' '}
                    {block.type === 'heading' ? 'TITLE' : block.type.toUpperCase()}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <HoverTip label="Move up">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={index === 0}
                        onClick={() => moveBlock(index, -1)}
                        style={{
                          fontFamily: 'JetBrains Mono',
                          fontSize: 11,
                          lineHeight: 1,
                          color: '#8A8A8A',
                          background: 'none',
                          border: '1px solid #333',
                          padding: '3px 7px',
                          cursor: index === 0 ? 'default' : 'pointer',
                          opacity: index === 0 ? 0.35 : 1,
                        }}
                      >
                        ↑
                      </button>
                    </HoverTip>
                    <HoverTip label="Move down">
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={index === blocks.length - 1}
                        onClick={() => moveBlock(index, 1)}
                        style={{
                          fontFamily: 'JetBrains Mono',
                          fontSize: 11,
                          lineHeight: 1,
                          color: '#8A8A8A',
                          background: 'none',
                          border: '1px solid #333',
                          padding: '3px 7px',
                          cursor: index === blocks.length - 1 ? 'default' : 'pointer',
                          opacity: index === blocks.length - 1 ? 0.35 : 1,
                        }}
                      >
                        ↓
                      </button>
                    </HoverTip>
                    <HoverTip label="Remove component">
                      <button
                        type="button"
                        aria-label="Remove component"
                        onClick={() => setBlocks((prev) => prev.filter((b) => b.id !== block.id))}
                        style={{
                          fontFamily: 'JetBrains Mono',
                          fontSize: 9,
                          color: '#8A8A8A',
                          background: 'none',
                          border: '1px solid #333',
                          padding: '3px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        REMOVE
                      </button>
                    </HoverTip>
                  </div>
                </div>
                {(block.type === 'text' || block.type === 'heading' || block.type === 'subtitle') && (
                  block.type === 'text' ? (
                    <textarea
                      value={block.content || ''}
                      onChange={(e) =>
                        setBlocks((prev) =>
                          prev.map((b) => (b.id === block.id ? { ...b, content: e.target.value } : b))
                        )
                      }
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontFamily: 'Inter',
                        fontSize: 15,
                        lineHeight: 1.8,
                        color: '#c8c8c4',
                        resize: 'vertical',
                        minHeight: 90,
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <input
                      value={block.content || ''}
                      onChange={(e) =>
                        setBlocks((prev) =>
                          prev.map((b) => (b.id === block.id ? { ...b, content: e.target.value } : b))
                        )
                      }
                      placeholder={block.type === 'heading' ? 'Enter section title' : 'Enter subtitle'}
                      style={{
                        width: '100%',
                        background: '#0B0B0B',
                        border: '1px solid #333',
                        outline: 'none',
                        fontFamily: 'Playfair Display',
                        fontWeight: block.type === 'heading' ? 700 : 400,
                        fontStyle: block.type === 'subtitle' ? 'italic' : 'normal',
                        fontSize: block.type === 'heading' ? 24 : 18,
                        color: '#F4F4F0',
                        padding: '12px 14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  )
                )}
                {block.type === 'audio' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input
                      value={block.content || ''}
                      onChange={(e) =>
                        setBlocks((prev) =>
                          prev.map((b) => (b.id === block.id ? { ...b, content: e.target.value } : b))
                        )
                      }
                      placeholder="Player title (optional)"
                      style={{
                        background: '#121212',
                        border: '1px solid #333',
                        outline: 'none',
                        padding: 10,
                        fontFamily: 'JetBrains Mono',
                        fontSize: 11,
                        color: '#F4F4F0',
                      }}
                    />
                    <input
                      value={(block.meta?.artist as string) || ''}
                      onChange={(e) =>
                        setBlocks((prev) =>
                          prev.map((b) =>
                            b.id === block.id
                              ? { ...b, meta: { ...(b.meta || {}), artist: e.target.value } }
                              : b
                          )
                        )
                      }
                      placeholder="Artist (default GT.)"
                      style={{
                        background: '#121212',
                        border: '1px solid #333',
                        outline: 'none',
                        padding: 10,
                        fontFamily: 'JetBrains Mono',
                        fontSize: 11,
                        color: '#F4F4F0',
                      }}
                    />

                    <div style={{ border: '1px solid #262626', background: '#0B0B0B', padding: 12 }}>
                      <p
                        style={{
                          fontFamily: 'JetBrains Mono',
                          fontSize: 9,
                          color: '#8A8A8A',
                          letterSpacing: '0.12em',
                          margin: '0 0 10px',
                        }}
                      >
                        ARTWORK — URL OR FILE
                      </p>
                      {(block.meta?.artwork as string) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={block.meta?.artwork as string}
                          alt=""
                          style={{
                            width: 72,
                            height: 72,
                            objectFit: 'cover',
                            display: 'block',
                            marginBottom: 10,
                            border: '1px solid #333',
                          }}
                        />
                      )}
                      <input
                        value={(block.meta?.artwork as string) || ''}
                        onChange={(e) =>
                          setBlocks((prev) =>
                            prev.map((b) =>
                              b.id === block.id
                                ? { ...b, meta: { ...(b.meta || {}), artwork: e.target.value } }
                                : b
                            )
                          )
                        }
                        placeholder="Artwork image URL"
                        style={{
                          width: '100%',
                          background: '#121212',
                          border: '1px solid #333',
                          outline: 'none',
                          padding: 10,
                          fontFamily: 'JetBrains Mono',
                          fontSize: 11,
                          color: '#F4F4F0',
                          boxSizing: 'border-box',
                          marginBottom: 8,
                        }}
                      />
                      <label
                        style={{
                          fontFamily: 'JetBrains Mono',
                          fontSize: 9,
                          color: '#8A8A8A',
                          border: '1px dashed #333',
                          padding: 10,
                          textAlign: 'center',
                          cursor: 'pointer',
                          display: 'block',
                        }}
                      >
                        UPLOAD ARTWORK
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            try {
                              const res = await apiUpload<{ url: string }>('/api/upload', f, {
                                folder: 'posts',
                              });
                              setBlocks((prev) =>
                                prev.map((b) =>
                                  b.id === block.id
                                    ? { ...b, meta: { ...(b.meta || {}), artwork: res.url } }
                                    : b
                                )
                              );
                            } catch (err) {
                              showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>

                    <div style={{ border: '1px solid #262626', background: '#0B0B0B', padding: 12 }}>
                      <p
                        style={{
                          fontFamily: 'JetBrains Mono',
                          fontSize: 9,
                          color: '#8A8A8A',
                          letterSpacing: '0.12em',
                          margin: '0 0 10px',
                        }}
                      >
                        TRACKS — UPLOAD FILES ONLY
                      </p>
                      {getMetaTracks(block).map((track, ti) => (
                        <div
                          key={`${track.url}-${ti}`}
                          style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            marginBottom: 8,
                            borderBottom: '1px solid #1C1C1C',
                            paddingBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'JetBrains Mono',
                              fontSize: 9,
                              color: '#555',
                              width: 22,
                            }}
                          >
                            {String(ti + 1).padStart(2, '0')}
                          </span>
                          <input
                            value={track.title}
                            onChange={(e) => {
                              const tracks = getMetaTracks(block).map((t, i) =>
                                i === ti ? { ...t, title: e.target.value } : t
                              );
                              setBlocks((prev) =>
                                prev.map((b) => (b.id === block.id ? setAudioTracks(b, tracks) : b))
                              );
                            }}
                            placeholder="Track title"
                            style={{
                              flex: 1,
                              background: '#121212',
                              border: '1px solid #333',
                              outline: 'none',
                              padding: 8,
                              fontFamily: 'JetBrains Mono',
                              fontSize: 11,
                              color: '#F4F4F0',
                            }}
                          />
                          <HoverTip label="Remove track">
                          <button
                            type="button"
                            aria-label="Remove track"
                            onClick={() => {
                              const tracks = getMetaTracks(block).filter((_, i) => i !== ti);
                              setBlocks((prev) =>
                                prev.map((b) => (b.id === block.id ? setAudioTracks(b, tracks) : b))
                              );
                            }}
                            style={{
                              fontFamily: 'JetBrains Mono',
                              fontSize: 9,
                              color: '#8A4040',
                              background: 'none',
                              border: '1px solid #3a2020',
                              padding: '6px 8px',
                              cursor: 'pointer',
                            }}
                          >
                            ✕
                          </button>
                          </HoverTip>
                        </div>
                      ))}
                      <label
                        style={{
                          fontFamily: 'JetBrains Mono',
                          fontSize: 9,
                          color: '#8A8A8A',
                          border: '1px dashed #333',
                          padding: 12,
                          textAlign: 'center',
                          cursor: 'pointer',
                          display: 'block',
                        }}
                      >
                        + ADD AUDIO FILES
                        <input
                          type="file"
                          hidden
                          accept="audio/*"
                          multiple
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (!files.length) return;
                            try {
                              const uploaded: MetaTrack[] = [];
                              for (const f of files) {
                                const res = await apiUpload<{ url: string; publicId: string }>(
                                  '/api/upload',
                                  f,
                                  { folder: 'posts' }
                                );
                                uploaded.push({
                                  title: f.name.replace(/\.[^.]+$/, ''),
                                  url: res.url,
                                  publicId: res.publicId,
                                });
                              }
                              const tracks = [...getMetaTracks(block), ...uploaded];
                              setBlocks((prev) =>
                                prev.map((b) => (b.id === block.id ? setAudioTracks(b, tracks) : b))
                              );
                            } catch (err) {
                              showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {block.type === 'carousel' && (
                  <CarouselFields
                    block={block}
                    onChange={(next) =>
                      setBlocks((prev) => prev.map((b) => (b.id === block.id ? next : b)))
                    }
                    onUpload={(file, slideIndex) => openFileCrop(file, 'block', block.id, slideIndex)}
                    onRecrop={(src, slideIndex) =>
                      setCrop({
                        src,
                        target: 'block',
                        blockId: block.id,
                        slideIndex,
                        defaultAspect: 16 / 10,
                      })
                    }
                    onLimit={() => showToast('Carousel holds up to 10 images', 'error')}
                  />
                )}

                {(block.type === 'image' || block.type === 'video') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {block.type === 'image' && block.url && (
                      <div style={{ position: 'relative', border: '1px solid #333', overflow: 'hidden' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={block.url}
                          alt=""
                          style={{ width: '100%', display: 'block', height: 'auto' }}
                        />
                        <HoverTip label="Crop image">
                        <button
                          type="button"
                          aria-label="Crop image"
                          onClick={() =>
                            setCrop({
                              src: block.url!,
                              target: 'block',
                              blockId: block.id,
                              defaultAspect: undefined,
                            })
                          }
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            fontFamily: 'JetBrains Mono',
                            fontSize: 9,
                            color: '#F4F4F0',
                            background: 'rgba(11,11,11,0.85)',
                            border: '1px solid #333',
                            padding: '4px 10px',
                            cursor: 'pointer',
                          }}
                        >
                          CROP
                        </button>
                        </HoverTip>
                      </div>
                    )}
                    <input
                      value={block.url || ''}
                      onChange={(e) =>
                        setBlocks((prev) =>
                          prev.map((b) => (b.id === block.id ? { ...b, url: e.target.value } : b))
                        )
                      }
                      placeholder={block.type === 'image' ? 'Image URL' : mediaPlaceholder('video')}
                      style={{
                        background: '#121212',
                        border: '1px solid #333',
                        outline: 'none',
                        padding: 10,
                        fontFamily: 'JetBrains Mono',
                        fontSize: 11,
                        color: '#F4F4F0',
                      }}
                    />
                    <label
                      style={{
                        fontFamily: 'JetBrains Mono',
                        fontSize: 9,
                        color: '#8A8A8A',
                        border: '1px dashed #333',
                        padding: 12,
                        textAlign: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      {block.type === 'image' ? 'UPLOAD & CROP' : 'UPLOAD FILE'}
                      <input
                        type="file"
                        hidden
                        accept={block.type === 'image' ? 'image/*' : 'video/*'}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (block.type === 'image') {
                            openFileCrop(f, 'block', block.id);
                            e.target.value = '';
                            return;
                          }
                          try {
                            const res = await apiUpload<{ url: string; publicId: string }>(
                              '/api/upload',
                              f,
                              { folder: 'posts' }
                            );
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id
                                  ? {
                                      ...b,
                                      url: res.url,
                                      publicId: res.publicId,
                                      content: b.content || f.name,
                                    }
                                  : b
                              )
                            );
                          } catch (err) {
                            showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}

            <div style={{ marginTop: 14, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { key: 'heading', label: '+ Title', tip: 'Add a section title', onClick: () => addBlock('heading') },
                { key: 'subtitle', label: '+ Subtitle', tip: 'Add a subtitle', onClick: () => addBlock('subtitle') },
                { key: 'text', label: '+ Text', tip: 'Add a text block', onClick: () => addBlock('text') },
                { key: 'image', label: '+ Image', tip: 'Add an image', onClick: () => addBlock('image') },
                { key: 'carousel', label: '+ Carousel', tip: 'Add an image carousel, up to 10 images', onClick: () => addBlock('carousel') },
                { key: 'audio', label: '+ Audio', tip: 'Add an audio player', onClick: () => addBlock('audio') },
                { key: 'video', label: '+ Video', tip: 'Add a video', onClick: () => addBlock('video') },
              ].map((btn) => (
                <HoverTip key={btn.key} label={btn.tip}>
                  <button
                    type="button"
                    onClick={btn.onClick}
                    style={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: 9,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      padding: '7px 12px',
                      background: 'transparent',
                      color: '#8A8A8A',
                      border: '1px dashed #333',
                      cursor: 'pointer',
                    }}
                  >
                    {btn.label}
                  </button>
                </HoverTip>
              ))}
            </div>
          </div>

            <aside
              className="editor-preview"
              style={{
                borderLeft: '1px solid #262626',
                position: 'sticky',
                top: 56,
                height: 'calc(100vh - 56px)',
                overflow: 'hidden',
                background: '#0B0B0B',
              }}
            >
              <PostLivePreview
                title={title}
                subtitle={subtitle}
                coverUrl={coverUrl}
                blocks={blocks}
              />
            </aside>
          </div>
        )}
      </main>

      {crop && crop.target !== 'hero' && (
        <ImageCropper
          imageSrc={crop.src}
          title={crop.target === 'cover' ? 'Crop cover' : typeof crop.slideIndex === 'number' ? 'Crop carousel image' : 'Crop image'}
          mode={crop.target === 'cover' ? 'cover' : 'image'}
          defaultAspect={crop.target === 'cover' ? COVER_ASPECT : crop.defaultAspect}
          locked={crop.target === 'cover'}
          onCancel={closeCrop}
          onComplete={applyCrop}
        />
      )}

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
            minWidth: 220,
            maxWidth: 'min(420px, calc(100vw - 32px))',
            background: toast.kind === 'error' ? '#1a1010' : '#121212',
            border: `1px solid ${toast.kind === 'error' ? '#5a2a2a' : '#333'}`,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
          }}
        >
          <span
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 11,
              letterSpacing: '0.08em',
              color: toast.kind === 'error' ? '#e0a0a0' : '#F4F4F0',
            }}
          >
            {toast.text}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              color: '#8A8A8A',
              background: 'none',
              border: '1px solid #333',
              padding: '4px 8px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
