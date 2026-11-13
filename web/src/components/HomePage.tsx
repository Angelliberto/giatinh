'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useHeroCtx } from '@/hooks/useHero';
import type { Post } from '@/lib/types';
import { api } from '@/lib/api';
import RecentWorkCarousel from '@/components/RecentWorkCarousel';

const RECENT_COUNT = 5;

function HeroSlideshow() {
  const { images } = useHeroCtx();
  const [current, setCurrent] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const captionRef = useRef<HTMLSpanElement>(null);
  const currentRef = useRef(0);
  const isAnimating = useRef(false);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const captionReady = useRef(false);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => () => {
    timeline.current?.kill();
  }, []);

  useLayoutEffect(() => {
    const index = Math.min(currentRef.current, Math.max(images.length - 1, 0));
    currentRef.current = index;
    layerRefs.current.forEach((el, i) => {
      if (!el) return;
      gsap.set(el, {
        opacity: i === index ? 1 : 0,
        scale: 1,
        zIndex: i === index ? 2 : 0,
      });
    });
  }, [images]);

  const goTo = useCallback((nextIdx: number) => {
    const count = images.length;
    if (isAnimating.current || count <= 1) return;
    const from = currentRef.current;
    const wrapped = ((nextIdx % count) + count) % count;
    if (wrapped === from) return;
    const fromEl = layerRefs.current[from];
    const toEl = layerRefs.current[wrapped];
    if (!fromEl || !toEl) {
      currentRef.current = wrapped;
      setCurrent(wrapped);
      return;
    }

    isAnimating.current = true;
    currentRef.current = wrapped;
    setCurrent(wrapped);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduce ? 0 : 1.8;
    timeline.current?.kill();
    gsap.killTweensOf([fromEl, toEl]);
    gsap.set(toEl, { opacity: 0, scale: 1.06, zIndex: 2 });
    gsap.set(fromEl, { opacity: 1, zIndex: 1 });

    timeline.current = gsap.timeline({
      onComplete: () => {
        gsap.set(fromEl, { opacity: 0, scale: 1, zIndex: 0 });
        gsap.set(toEl, { scale: 1, zIndex: 2 });
        isAnimating.current = false;
      },
    });
    timeline.current.to(toEl, { opacity: 1, scale: 1, duration, ease: 'power2.inOut' }, 0);
    timeline.current.to(fromEl, { opacity: 0, duration, ease: 'power2.inOut' }, 0);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => {
      goTo(currentRef.current + 1);
    }, 6400);
    return () => clearInterval(id);
  }, [images.length, goTo]);

  const activeImg = images[current];

  useLayoutEffect(() => {
    const el = captionRef.current;
    if (!el) return;
    if (!captionReady.current) {
      captionReady.current = true;
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.fromTo(
      el,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: reduce ? 0 : 0.9, ease: 'power2.out' }
    );
  }, [current, activeImg?.caption]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#121212',
      }}
    >
      <style>{`.hero-slide{opacity:0}`}</style>
      {images.map((image, i) => (
        <div
          key={image._id || image.imageUrl}
          ref={(node) => {
            layerRefs.current[i] = node;
          }}
          className="hero-slide"
          style={{ position: 'absolute', inset: 0, willChange: 'opacity, transform' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.imageUrl}
            alt={image.caption}
            style={{
              width: '100%',
              height: '120%',
              objectFit: 'cover',
              filter: 'brightness(0.9) contrast(1.05) grayscale(0.08)',
              position: 'absolute',
              top: '-10%',
              transform: `translateY(${scrollY * 0.12}px)`,
            }}
          />
        </div>
      ))}

      <div
        style={{
          position: 'absolute',
          top: 80,
          right: 28,
          width: 52,
          height: 52,
          borderTop: '1px solid rgba(244,244,240,0.2)',
          borderRight: '1px solid rgba(244,244,240,0.2)',
          zIndex: 3,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          right: 28,
          width: 52,
          height: 52,
          borderBottom: '1px solid rgba(244,244,240,0.2)',
          borderRight: '1px solid rgba(244,244,240,0.2)',
          zIndex: 3,
        }}
      />

      {activeImg && (
        <div style={{ position: 'absolute', bottom: 28, left: 24, zIndex: 4 }}>
          <span
            ref={captionRef}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              color: 'rgba(244,244,240,0.85)',
              letterSpacing: '0.08em',
              display: 'inline-block',
              textShadow: '0 1px 12px rgba(0,0,0,0.55)',
            }}
          >
            {activeImg.caption}
          </span>
        </div>
      )}

      {images.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            right: 24,
            display: 'flex',
            gap: 6,
            zIndex: 4,
          }}
        >
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: i === current ? 20 : 6,
                height: 6,
                background: i === current ? '#F4F4F0' : 'rgba(244,244,240,0.3)',
                border: 'none',
                padding: 0,
                cursor: 'none',
                transition: 'width 0.4s, background 0.3s',
                borderRadius: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const onScroll = () => {
      const max = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      setScrollProgress(Math.min((window.scrollY / max) * 100, 100));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    api<{ posts: Post[] }>('/api/posts')
      .then((d) => setPosts(d.posts))
      .catch(() => setPosts([]));
  }, []);

  const recent = posts.slice(0, RECENT_COUNT);

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
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: 1,
            background: '#F4F4F0',
            height: `${scrollProgress}%`,
          }}
        />
      </div>

      <section style={{ minHeight: '100svh', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <HeroSlideshow />
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            background:
              'linear-gradient(to right, rgba(11,11,11,0.58) 0%, rgba(11,11,11,0.28) 48%, rgba(11,11,11,0.04) 100%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            minHeight: '100svh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 'clamp(32px,6vw,80px) clamp(20px,4vw,60px)',
            paddingTop: 'calc(64px + clamp(32px,6vw,80px))',
            maxWidth: 680,
          }}
        >
          <h1
            style={{
              fontFamily: 'Playfair Display, serif',
              fontWeight: 900,
              fontSize: 'clamp(36px, 6.5vw, 88px)',
              lineHeight: 0.92,
              color: '#F4F4F0',
              margin: 0,
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              textShadow: '0 2px 28px rgba(0,0,0,0.45)',
            }}
          >
            <span className="line-reveal" style={{ display: 'block' }}>
              <span style={{ ['--delay' as string]: '0.1s' }}>Gia Tinh Lam</span>
            </span>
          </h1>
          <p
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 11,
              color: 'rgba(244,244,240,0.55)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              margin: '28px 0 0',
              maxWidth: 360,
              lineHeight: 1.6,
              textShadow: '0 1px 12px rgba(0,0,0,0.5)',
            }}
          >
            Audiovisual storytelling between film, fashion &amp; music
          </p>
          <div
            style={{
              marginTop: 44,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <Link
              href="/archive"
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#0B0B0B',
                background: '#F4F4F0',
                padding: '12px 28px',
                textDecoration: 'none',
                transition: 'background 0.25s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#ccc')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#F4F4F0')}
            >
              Enter Archive
            </Link>
            <span
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                color: 'rgba(244,244,240,0.5)',
                letterSpacing: '0.08em',
              }}
            >
              {posts.length} Entr{posts.length === 1 ? 'y' : 'ies'}
            </span>
          </div>
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 60,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ width: 36, height: 1, background: 'rgba(244,244,240,0.3)' }} />
            <span
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 9,
                color: 'rgba(244,244,240,0.4)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Scroll
            </span>
          </div>
        </div>
      </section>

      <div
        style={{
          borderTop: '1px solid #262626',
          borderBottom: '1px solid #262626',
          overflow: 'hidden',
          padding: '11px 0',
          background: '#121212',
        }}
      >
        <div className="marquee-track" style={{ display: 'flex', whiteSpace: 'nowrap' }}>
          {[0, 1].map((i) => (
            <span
              key={i}
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                color: '#8A8A8A',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                paddingRight: 60,
              }}
            >
              Photography · Audio Compositions · Film Works · Editorial Poetry · Conceptual Art ·
              Mixed Media · Installation · Performance ·&nbsp;
            </span>
          ))}
        </div>
      </div>

      <section
        id="recent"
        style={{
          padding: 'clamp(40px,6vw,80px) clamp(16px,3vw,40px)',
          maxWidth: 1440,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 40,
            paddingBottom: 24,
            borderBottom: '1px solid #262626',
          }}
        >
          <h2
            style={{
              fontFamily: 'Playfair Display',
              fontWeight: 700,
              fontSize: 'clamp(24px,3vw,44px)',
              color: '#F4F4F0',
              margin: 0,
              fontStyle: 'italic',
            }}
          >
            Recent work
          </h2>
          <Link
            href="/archive"
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              color: '#8A8A8A',
              letterSpacing: '0.12em',
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            Archive
          </Link>
        </div>

        {recent.length > 0 ? (
          <RecentWorkCarousel posts={recent} />
        ) : (
          <p
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              color: '#8A8A8A',
              letterSpacing: '0.1em',
            }}
          >
            NO PUBLISHED ENTRIES — RUN BACKEND SEED OR PUBLISH FROM ADMIN
          </p>
        )}
      </section>

      <footer
        style={{
          borderTop: '1px solid #262626',
          padding: 'clamp(24px,3vw,40px) clamp(16px,3vw,40px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <span style={{ fontFamily: 'Playfair Display', fontStyle: 'italic', fontSize: 14, color: '#8A8A8A' }}>
          Gia Tinh Lam © 2026
        </span>
        <span
          style={{
            fontFamily: 'JetBrains Mono',
            fontSize: 10,
            color: '#8A8A8A',
            letterSpacing: '0.1em',
          }}
        >
          ALL RIGHTS RESERVED
        </span>
      </footer>
    </div>
  );
}
