import type { Metadata } from 'next';
import BioPage from '@/components/BioPage';

export const metadata: Metadata = {
  title: 'Bio — Gia Tinh Lam',
  description:
    'Gia Tinh Lam is a multidisciplinary audiovisual storyteller and art director whose work is rooted in real life narratives.',
};

export default function Page() {
  return <BioPage />;
}
