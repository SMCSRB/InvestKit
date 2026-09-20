'use client';

import { EducationProvider } from '@/app/context/EducationContext';
import { NotificationProvider } from '@/app/context/NotificationContext';
import Toast from '@/app/components/Toast';

export default function ClientLayoutWrapper({ children }) {
  return (
    <NotificationProvider>
      <EducationProvider>
        {children}
        <Toast />
      </EducationProvider>
    </NotificationProvider>
  );
}
