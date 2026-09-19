'use client';

import { EducationProvider } from '@/app/context/EducationContext';

export default function ClientLayoutWrapper({ children }) {
  return (
    <EducationProvider>
      {children}
    </EducationProvider>
  );
}
