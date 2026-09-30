'use client';

import { EducationProvider } from '@/app/context/EducationContext';
import { NotificationProvider } from '@/app/context/NotificationContext';
import { UserProvider } from '@/app/context/UserContext';
import Toast from '@/app/components/Toast';
import SessionBootstrap from '@/app/components/SessionBootstrap';
import ImpersonationBanner from '@/app/components/ImpersonationBanner';

export default function ClientLayoutWrapper({ children }) {
  return (
    <NotificationProvider>
      <SessionBootstrap />
      <ImpersonationBanner />
      <EducationProvider>
        <UserProvider>
          {children}
          <Toast />
        </UserProvider>
      </EducationProvider>
    </NotificationProvider>
  );
}
