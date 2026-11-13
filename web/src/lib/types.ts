export type HeroImage = {
  _id: string;
  caption: string;
  imageUrl: string;
  publicId?: string | null;
  order: number;
};

export type PostBlock = {
  _id?: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'playlist' | 'heading' | 'subtitle' | 'carousel';
  content?: string;
  url?: string | null;
  publicId?: string | null;
  meta?: Record<string, unknown>;
};

export type Post = {
  _id: string;
  title: string;
  subtitle?: string;
  slug: string;
  status: 'draft' | 'published';
  blocks?: PostBlock[];
  coverUrl?: string | null;
  coverPublicId?: string | null;
  coverFocus?: { x: number; y: number } | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Asset = {
  _id: string;
  url: string;
  publicId: string;
  resourceType: 'image' | 'video' | 'raw';
  filename: string;
  folder?: string;
  createdAt?: string;
  updatedAt?: string;
};
