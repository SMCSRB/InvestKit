import AppShell from '@/app/components/shell/AppShell';
import GuideContent from './GuideContent';

export const metadata = { title: 'Guide du site' };

// Guide complet pour un débutant total (le parcours du premier lancement en est la version courte).
export default function GuidePage() {
  return <AppShell><GuideContent /></AppShell>;
}
