import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion | CYBERGARD AI',
  description: 'Authentification plateforme CYBERGARD AI',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}