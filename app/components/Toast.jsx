'use client';

import { useNotification } from '@/app/context/NotificationContext';
import { useEffect, useState } from 'react';

export default function Toast() {
  const { notifications } = useNotification();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'xp':
        return '⭐';
      case 'badge':
        return '🏆';
      default:
        return '📢';
    }
  };

  const getColors = (type) => {
    switch (type) {
      case 'success':
        return { bg: '#10b981', border: '#059669' };
      case 'error':
        return { bg: '#ef4444', border: '#dc2626' };
      case 'warning':
        return { bg: '#f59e0b', border: '#d97706' };
      case 'xp':
        return { bg: '#f59e0b', border: '#d97706' };
      case 'badge':
        return { bg: '#a78bfa', border: '#9333ea' };
      default:
        return { bg: '#3b82f6', border: '#2563eb' };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '400px',
      }}
    >
      {notifications.map((notification) => {
        const colors = getColors(notification.type);
        const icon = getIcon(notification.type);

        return (
          <div
            key={notification.id}
            style={{
              background: `linear-gradient(135deg, ${colors.bg}dd, ${colors.bg}bb)`,
              border: `2px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '16px 20px',
              color: 'white',
              fontWeight: '500',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: `0 8px 24px rgba(0, 0, 0, 0.3)`,
              animation: 'slideIn 0.3s ease-out',
              backdropFilter: 'blur(10px)',
            }}
          >
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <span style={{ flex: 1 }}>{notification.message}</span>
            <style>{`
              @keyframes slideIn {
                from {
                  transform: translateX(400px);
                  opacity: 0;
                }
                to {
                  transform: translateX(0);
                  opacity: 1;
                }
              }
              @keyframes slideOut {
                from {
                  transform: translateX(0);
                  opacity: 1;
                }
                to {
                  transform: translateX(400px);
                  opacity: 0;
                }
              }
            `}</style>
          </div>
        );
      })}
    </div>
  );
}
