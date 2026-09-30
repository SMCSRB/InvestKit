'use client';

import { EducationProvider } from '@/app/context/EducationContext';
import { NotificationProvider } from '@/app/context/NotificationContext';
import { UserProvider } from '@/app/context/UserContext';
import { ThemeProvider } from '@/app/context/ThemeContext';
import BannerStack from '@/app/components/BannerStack';
import Toast from '@/app/components/Toast';
import SessionBootstrap from '@/app/components/SessionBootstrap';
import ImpersonationBanner from '@/app/components/ImpersonationBanner';
import AnnouncementsBanner from '@/app/components/AnnouncementsBanner';
import FeedbackWidget from '@/app/components/FeedbackWidget';

export default function ClientLayoutWrapper({ children }) {
  return (
    <ThemeProvider>
    <NotificationProvider>
      <SessionBootstrap />
      <BannerStack>
        <ImpersonationBanner />
        <AnnouncementsBanner />
      </BannerStack>
      <EducationProvider>
        <UserProvider>
          {children}
          <Toast />
          <FeedbackWidget />
        </UserProvider>
      </EducationProvider>
    </NotificationProvider>
    </ThemeProvider>
  );
}
