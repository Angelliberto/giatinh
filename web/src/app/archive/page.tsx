import type { Metadata } from 'next';
import ArchivePage from '@/components/ArchivePage';

export const metadata: Metadata = {
  title: 'Archive — Gia Tinh Lam',
  description: 'All published work by Gia Tinh Lam.',
};

export default function Page() {
  return <ArchivePage />;
}
