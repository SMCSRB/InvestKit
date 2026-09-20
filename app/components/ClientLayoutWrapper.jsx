'use client';

import { EducationProvider } from '@/app/context/EducationContext';
import { NotificationProvider } from '@/app/context/NotificationContext';
import { UserProvider } from '@/app/context/UserContext';
import Toast from '@/app/components/Toast';

export default function ClientLayoutWrapper({ children }) {
  return (
    <NotificationProvider>
      <EducationProvider>
        <UserProvider>
          {children}
          <Toast />
        </UserProvider>
      </EducationProvider>
    </NotificationProvider>
  );
}
