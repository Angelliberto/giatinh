'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';

export type AudioTrack = {
  title: string;
  artist?: string;
  url: string;
  artwork?: string;
};

type Props = {
  tracks: AudioTrack[];
  label?: string;
};

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const TRACK_ROW_H = 52;

function PlayingIcon({ active }: { active: boolean }) {
  const barsRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = barsRef.current;
    if (!root) return;
    const bars = root.querySelectorAll('i');
    if (!active) {
      gsap.killTweensOf(bars);
      gsap.to(bars, { scaleY: 0.35, duration: 0.25, ease: 'power2.out' });
      return;
    }
    const tweens = Array.from(bars).map((bar, i) =>
      gsap.to(bar, {
        scaleY: 1,
        duration: 0.28 + i * 0.08,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: i * 0.12,
      })
    );
    return () => {
      tweens.forEach((t) => t.kill());
    };
  }, [active]);

  return (
    <span
      ref={barsRef}
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 2,
        width: 14,
        height: 12,
      }}
    >
      {[0.45, 1, 0.65].map((h, i) => (
        <i
          key={i}
          style={{
            display: 'block',
            width: 2,
            height: 12 * h,
            background: '#F4F4F0',
            transformOrigin: 'center bottom',
            transform: 'scaleY(0.35)',
          }}
        />
      ))}
    </span>
  );
}

export default function AudioPlayer({ tracks, label = 'Audio' }: Props) {
  const list = tracks.filter((t) => t.url);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const metaRef = useRef<HTMLDivElement | null>(null);
  const seekRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const timeRef = useRef<HTMLSpanElement | null>(null);
  const durationRef = useRef(0);
  const mountDoneRef = useRef(false);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [hoverSeek, setHoverSeek] = useState<number | null>(null);
  const trackKey = list.map((t) => t.url).join('|');

  const track = list[index] || list[0];

  const paintProgress = (time: number, dur = durationRef.current) => {
    const ratio = dur > 0 ? Math.min(1, Math.max(0, time / dur)) : 0;
    const pct = `${ratio * 100}%`;
    if (fillRef.current) fillRef.current.style.width = pct;
    if (dotRef.current) dotRef.current.style.left = pct;
    if (timeRef.current) {
      timeRef.current.textContent = `${formatTime(time)} / ${formatTime(dur)}`;
    }
  };

  useEffect(() => {
    setIndex(0);
    setProgress(0);
    setPlaying(false);
    durationRef.current = 0;
    paintProgress(0, 0);
  }, [trackKey]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    el.src = track.url;
    el.load();
    paintProgress(0, durationRef.current);
    if (playing) {
      void el.play().catch(() => setPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.url]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) void el.play().catch(() => setPlaying(false));
    else el.pause();
  }, [playing]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // Smooth progress via rAF while playing
  useEffect(() => {
    if (!playing) {
      const el = audioRef.current;
      if (el) {
        setProgress(el.currentTime);
        paintProgress(el.currentTime);
      }
      return;
    }

    let raf = 0;
    const tick = () => {
      const el = audioRef.current;
      if (el) paintProgress(el.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Entrance (no artwork)
  useEffect(() => {
    if (!track || !rootRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          mountDoneRef.current = true;
        },
      });
      gsap.set(rootRef.current, { opacity: 0, y: 18 });
      if (metaRef.current) gsap.set(metaRef.current.children, { opacity: 0, y: 10 });
      if (seekRef.current) gsap.set(seekRef.current, { opacity: 0, scaleX: 0.4, transformOrigin: 'left center' });
      if (controlsRef.current) gsap.set(controlsRef.current.children, { opacity: 0, y: 8 });
      if (listRef.current) {
        gsap.set(listRef.current.querySelectorAll('[data-track-row]'), { opacity: 0, x: -12 });
      }

      tl.to(rootRef.current, { opacity: 1, y: 0, duration: 0.55 })
        .to(metaRef.current?.children || [], { opacity: 1, y: 0, duration: 0.45, stagger: 0.08 }, '-=0.35')
        .to(seekRef.current, { opacity: 1, scaleX: 1, duration: 0.5 }, '-=0.3')
        .to(controlsRef.current?.children || [], { opacity: 1, y: 0, duration: 0.35, stagger: 0.05 }, '-=0.35')
        .to(
          listRef.current?.querySelectorAll('[data-track-row]') || [],
          { opacity: 1, x: 0, duration: 0.4, stagger: 0.06 },
          '-=0.25'
        );
    }, rootRef);

    return () => {
      mountDoneRef.current = false;
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(track)]);

  // Track change — title/artist only
  useEffect(() => {
    if (!track || !mountDoneRef.current || !metaRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        metaRef.current!.children,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
      );
    }, rootRef);

    return () => ctx.revert();
  }, [track?.url, track?.title]);

  // Scroll active track into view
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const row = listEl.querySelector(`[data-track-row="${index}"]`) as HTMLElement | null;
    if (!row) return;
    gsap.to(listEl, {
      scrollTop: Math.max(0, row.offsetTop - TRACK_ROW_H),
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, [index]);

  if (!track) return null;

  const seekTo = (clientX: number, target: HTMLElement) => {
    const el = audioRef.current;
    if (!el || !durationRef.current) return;
    const rect = target.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    el.currentTime = ratio * durationRef.current;
    setProgress(el.currentTime);
    paintProgress(el.currentTime);
  };

  const prev = () => {
    if (list.length <= 1) {
      const el = audioRef.current;
      if (el) {
        el.currentTime = 0;
        setProgress(0);
        paintProgress(0);
      }
      return;
    }
    setIndex((i) => (i - 1 + list.length) % list.length);
    setPlaying(true);
  };

  const next = () => {
    if (list.length <= 1) {
      const el = audioRef.current;
      if (el) {
        el.currentTime = 0;
        setProgress(0);
        paintProgress(0);
        setPlaying(true);
      }
      return;
    }
    setIndex((i) => (i + 1) % list.length);
    setPlaying(true);
  };

  const pct = duration ? (progress / duration) * 100 : 0;

  const pulseCtrl = (el: HTMLElement | null) => {
    if (!el) return;
    gsap.fromTo(el, { scale: 0.88 }, { scale: 1, duration: 0.28, ease: 'power2.out' });
  };

  const onTrackHover = (el: HTMLElement, enter: boolean) => {
    gsap.to(el, {
      x: enter ? 6 : 0,
      duration: 0.28,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    const title = el.querySelector('[data-track-title]') as HTMLElement | null;
    if (title) {
      gsap.to(title, {
        color: enter || el.dataset.active === '1' ? '#F4F4F0' : '#c8c8c4',
        duration: 0.22,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  return (
    <div
      ref={rootRef}
      style={{
        width: '100%',
        border: '1px solid #262626',
        background: '#121212',
        padding: 'clamp(16px, 2.5vw, 28px)',
        opacity: 0,
      }}
    >
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) => {
          if (playing) return;
          setProgress(e.currentTarget.currentTime);
          paintProgress(e.currentTarget.currentTime);
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration || 0;
          durationRef.current = d;
          setDuration(d);
          paintProgress(e.currentTarget.currentTime, d);
        }}
        onEnded={() => {
          if (list.length > 1 && index < list.length - 1) {
            setIndex((i) => i + 1);
            setPlaying(true);
          } else {
            setPlaying(false);
            setProgress(0);
            paintProgress(0);
          }
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(72px, 112px) minmax(0, 1fr)',
          gap: 'clamp(14px, 2vw, 22px)',
          alignItems: 'start',
        }}
      >
        <div
          style={{
            aspectRatio: '1',
            border: '1px solid #262626',
            background: '#1C1C1C',
            overflow: 'hidden',
          }}
        >
          {track.artwork ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.artwork}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                filter: 'brightness(0.85) contrast(1.05) grayscale(0.15)',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Playfair Display',
                fontStyle: 'italic',
                fontSize: 22,
                color: '#333',
              }}
            >
              GT
            </div>
          )}
        </div>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div ref={metaRef} style={{ minWidth: 0 }}>
              <p
                style={{
                  fontFamily: 'Playfair Display',
                  fontWeight: 700,
                  fontStyle: 'italic',
                  fontSize: 'clamp(18px, 2vw, 24px)',
                  color: '#F4F4F0',
                  margin: '0 0 4px',
                  lineHeight: 1.15,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {track.title || 'Untitled'}
              </p>
              <p
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: 10,
                  color: '#8A8A8A',
                  margin: 0,
                  letterSpacing: '0.08em',
                }}
              >
                {track.artist || 'GT.'}
              </p>
            </div>
            <span
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 9,
                color: '#555',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              [{label}]
            </span>
          </div>

          <div>
            <div
              ref={seekRef}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={duration || 0}
              aria-valuenow={progress}
              tabIndex={0}
              onClick={(e) => seekTo(e.clientX, e.currentTarget)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoverSeek(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
              }}
              onMouseLeave={() => setHoverSeek(null)}
              style={{
                height: 18,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{ width: '100%', height: 1, background: '#333', position: 'relative' }}>
                <div
                  ref={fillRef}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${pct}%`,
                    background: '#F4F4F0',
                    willChange: 'width',
                  }}
                />
                <div
                  ref={dotRef}
                  style={{
                    position: 'absolute',
                    left: `${pct}%`,
                    top: '50%',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#F4F4F0',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 0 1px #121212',
                    pointerEvents: 'none',
                    willChange: 'left',
                  }}
                />
                {hoverSeek !== null && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${hoverSeek * 100}%`,
                      top: -3,
                      width: 1,
                      height: 7,
                      background: '#8A8A8A',
                    }}
                  />
                )}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 6,
                gap: 12,
              }}
            >
              <span
                ref={timeRef}
                style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#8A8A8A', letterSpacing: '0.06em' }}
              >
                {formatTime(progress)} / {formatTime(duration)}
              </span>
              <div ref={controlsRef} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    pulseCtrl(e.currentTarget);
                    setMuted((m) => !m);
                  }}
                  aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
                  style={ctrlBtn}
                >
                  {muted || volume === 0 ? '✕' : '♪'}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    if (v > 0) setMuted(false);
                  }}
                  aria-label="Volume"
                  style={{ width: 72, accentColor: '#F4F4F0' }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    pulseCtrl(e.currentTarget);
                    prev();
                  }}
                  aria-label="Previous"
                  style={ctrlBtn}
                >
                  ‹‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    pulseCtrl(e.currentTarget);
                    setPlaying((p) => !p);
                  }}
                  aria-label={playing ? 'Pause' : 'Play'}
                  style={{ ...ctrlBtn, width: 40, borderColor: '#F4F4F0', color: '#F4F4F0' }}
                >
                  {playing ? 'Ⅱ' : '▶'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    pulseCtrl(e.currentTarget);
                    next();
                  }}
                  aria-label="Next"
                  style={ctrlBtn}
                >
                  ››
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={listRef}
        style={{
          marginTop: 22,
          borderTop: '1px solid #262626',
          paddingTop: 8,
          maxHeight: TRACK_ROW_H * 3,
          overflowY: list.length > 3 ? 'auto' : 'visible',
          scrollbarWidth: 'thin',
          scrollbarColor: '#333 transparent',
        }}
      >
        {list.map((t, i) => {
          const active = i === index;
          const isPlayingHere = active && playing;
          return (
            <button
              key={`${t.url}-${i}`}
              type="button"
              data-track-row={i}
              data-active={active ? '1' : '0'}
              onMouseEnter={(e) => onTrackHover(e.currentTarget, true)}
              onMouseLeave={(e) => onTrackHover(e.currentTarget, false)}
              onClick={(e) => {
                gsap.fromTo(e.currentTarget, { x: 10 }, { x: 6, duration: 0.25, ease: 'power2.out' });
                setIndex(i);
                setPlaying(true);
              }}
              style={{
                width: '100%',
                height: TRACK_ROW_H,
                display: 'grid',
                gridTemplateColumns: '28px minmax(0, 1fr) 18px',
                gap: 12,
                alignItems: 'center',
                padding: '0',
                border: 'none',
                borderBottom: i < list.length - 1 ? '1px solid #1C1C1C' : 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'inherit',
                boxSizing: 'border-box',
              }}
            >
              <span
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: 10,
                  color: active ? '#F4F4F0' : '#555',
                  letterSpacing: '0.06em',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  data-track-title
                  style={{
                    display: 'block',
                    fontFamily: 'Playfair Display',
                    fontStyle: active ? 'italic' : 'normal',
                    fontWeight: 700,
                    fontSize: 15,
                    color: active ? '#F4F4F0' : '#c8c8c4',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.title || 'Untitled'}
                </span>
                <span
                  style={{
                    display: 'block',
                    fontFamily: 'JetBrains Mono',
                    fontSize: 9,
                    color: '#8A8A8A',
                    marginTop: 3,
                    letterSpacing: '0.08em',
                  }}
                >
                  {t.artist || 'GT.'}
                </span>
              </span>
              <span style={{ display: 'flex', justifyContent: 'flex-end', opacity: active ? 1 : 0 }}>
                <PlayingIcon active={isPlayingHere} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const ctrlBtn: CSSProperties = {
  fontFamily: 'JetBrains Mono',
  fontSize: 12,
  width: 34,
  height: 34,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  color: '#8A8A8A',
  border: '1px solid #333',
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
};
