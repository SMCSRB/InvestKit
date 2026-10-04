import AppShell from '@/app/components/shell/AppShell';
import SupportContent from './SupportContent';

export const metadata = { title: 'Aide et support' };

export default function SupportPage() {
  return <AppShell><SupportContent /></AppShell>;
}
