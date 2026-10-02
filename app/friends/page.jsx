'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell, { PageHeader } from '@/app/components/shell/AppShell';
import SocialHub from '@/app/components/social/SocialHub';

const TABS = ['friends', 'requests', 'add', 'guild', 'blocked'];

function FriendsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('tab');
  const tab = TABS.includes(raw) ? raw : 'friends';
  useEffect(() => { if (!localStorage.getItem('token')) router.push('/login'); }, [router]);
  return <SocialHub tab={tab} onTab={(t) => router.replace(t === 'friends' ? '/friends' : `/friends?tab=${t}`, { scroll: false })} />;
}

// Amis et guildes : tout est réel (serveur). Le code ami est la seule façon de trouver quelqu'un.
export default function FriendsPage() {
  return (
    <AppShell>
      <PageHeader title="Amis et guildes" subtitle="Compare ta progression avec des amis et monte une guilde. Seuls ton nom de joueur, ton niveau et ton XP sont visibles." />
      <Suspense fallback={null}><FriendsContent /></Suspense>
    </AppShell>
  );
}
