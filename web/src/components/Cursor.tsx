'use client';

import { useEffect, useRef, useState } from 'react';

export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [magnetic, setMagnetic] = useState(false);
  const pos = useRef({ x: 0, y: 0 });
  const ring = useRef({ x: 0, y: 0 });
  const raf = useRef<number>(0);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    if (!mq.matches) return;

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      setVisible(true);
    };
    const onLeave = () => setVisible(false);

    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      ring.current.x = lerp(ring.current.x, pos.current.x, 0.12);
      ring.current.y = lerp(ring.current.y, pos.current.y, 0.12);

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.current.x - 3}px, ${pos.current.y - 3}px)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x - 20}px, ${ring.current.y - 20}px)`;
      }
      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);

    const onEnterTarget = () => setMagnetic(true);
    const onLeaveTarget = () => setMagnetic(false);

    const bindTargets = () => {
      document.querySelectorAll('a, button, [data-magnetic]').forEach((el) => {
        el.addEventListener('mouseenter', onEnterTarget);
        el.addEventListener('mouseleave', onLeaveTarget);
      });
    };
    bindTargets();
    const observer = new MutationObserver(bindTargets);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf.current);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="cursor-dot"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#F4F4F0',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.2s, width 0.2s, height 0.2s',
        }}
      />
      <div
        ref={ringRef}
        className="cursor-ring"
        style={{
          width: magnetic ? 52 : 40,
          height: magnetic ? 52 : 40,
          borderRadius: '50%',
          border: '1px solid rgba(244,244,240,0.5)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.2s, width 0.3s, height 0.3s, border-color 0.2s',
          borderColor: magnetic ? 'rgba(244,244,240,0.9)' : 'rgba(244,244,240,0.4)',
        }}
      />
    </>
  );
}
