'use client';

import { usePathname } from 'next/navigation';
import Nav from '@/components/Nav';

export default function SiteNav() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return <Nav />;
}
