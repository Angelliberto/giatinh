'use client';

import { AuthProvider } from '@/hooks/useAuth';
import { HeroProvider } from '@/hooks/useHero';
import Cursor from '@/components/Cursor';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <HeroProvider>
        <Cursor />
        {children}
      </HeroProvider>
    </AuthProvider>
  );
}
