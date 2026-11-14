import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import SiteNav from '@/components/SiteNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gia Tinh Lam',
  description:
    'Multidisciplinary audiovisual storyteller and art director — work between film, fashion and music.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SiteNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
