'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { HeroImage } from '@/lib/types';

type HeroCtx = {
  images: HeroImage[];
  loading: boolean;
  refresh: () => Promise<void>;
  add: (img: { caption: string; imageUrl: string; publicId?: string | null }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reorder: (fromIndex: number, toIndex: number) => Promise<void>;
  updateCaption: (id: string, caption: string) => Promise<void>;
};

const HeroContext = createContext<HeroCtx | null>(null);

export function HeroProvider({ children }: { children: ReactNode }) {
  const [images, setImages] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api<{ images: HeroImage[] }>('/api/hero');
    setImages(data.images);
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, [refresh]);

  const add = useCallback(
    async (img: { caption: string; imageUrl: string; publicId?: string | null }) => {
      await api('/api/hero', { method: 'POST', json: img });
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await api(`/api/hero/${id}`, { method: 'DELETE' });
      await refresh();
    },
    [refresh]
  );

  const reorder = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const next = [...images];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      setImages(next);
      await api('/api/hero', {
        method: 'PUT',
        json: {
          images: next.map((img) => ({
            caption: img.caption,
            imageUrl: img.imageUrl,
            publicId: img.publicId ?? null,
          })),
        },
      });
      await refresh();
    },
    [images, refresh]
  );

  const updateCaption = useCallback(
    async (id: string, caption: string) => {
      const next = images.map((img) => (img._id === id ? { ...img, caption } : img));
      setImages(next);
      await api('/api/hero', {
        method: 'PUT',
        json: {
          images: next.map((img) => ({
            caption: img.caption,
            imageUrl: img.imageUrl,
            publicId: img.publicId ?? null,
          })),
        },
      });
      await refresh();
    },
    [images, refresh]
  );

  return (
    <HeroContext.Provider value={{ images, loading, refresh, add, remove, reorder, updateCaption }}>
      {children}
    </HeroContext.Provider>
  );
}

export function useHeroCtx() {
  const ctx = useContext(HeroContext);
  if (!ctx) throw new Error('useHeroCtx must be used within HeroProvider');
  return ctx;
}
