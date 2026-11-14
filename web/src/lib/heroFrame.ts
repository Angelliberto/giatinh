/** Desktop hero height. Mobile uses the matching rule in HomePage. */
export const HERO_FRAME_HEIGHT = 'clamp(480px, 68svh, 680px)';
export const HERO_FRAME_HEIGHT_MOBILE = 'clamp(420px, calc(100svh - 64px), 560px)';

export function heroFrameAspect(viewportWidth: number, viewportHeight: number) {
  const height =
    viewportWidth <= 640
      ? Math.min(560, Math.max(420, viewportHeight - 64))
      : Math.min(680, Math.max(480, viewportHeight * 0.68));
  return viewportWidth / Math.max(height, 1);
}

export function currentHeroFrameAspect() {
  if (typeof window === 'undefined') return 1440 / 612;
  return heroFrameAspect(window.innerWidth, window.innerHeight);
}
