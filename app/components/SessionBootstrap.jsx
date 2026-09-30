'use client';

import { useLayoutEffect } from 'react';
import { installApiFetch, upgradeLegacyToken } from '@/app/lib/session';

// Monté une fois dans le layout : active les cookies/CSRF sur les appels API et migre un éventuel ancien jeton.
export default function SessionBootstrap() {
  useLayoutEffect(() => {
    installApiFetch();
    upgradeLegacyToken();
  }, []);
  return null;
}
