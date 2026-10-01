import { notFound } from 'next/navigation';
import DesignSystemClient from './DesignSystemClient';

export const metadata = { title: 'Design system (développement)', robots: { index: false, follow: false } };

// Page de référence du design : disponible uniquement en développement, jamais en production.
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DesignSystemClient />;
}
