import type { Metadata } from 'next';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';
import FetchInterceptor from '@/components/FetchInterceptor';

export const metadata: Metadata = {
  title: 'CYBERGARD AI',
  description: 'Plateforme audit cybersecurite multi-referentiels',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head />
      <body className="min-h-screen bg-background font-sans antialiased">
        <FetchInterceptor />
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}