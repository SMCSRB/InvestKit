'use client';

import { useNotification } from '@/app/context/NotificationContext';
import { useEffect, useState } from 'react';
import Icon from '@/app/components/ui/Icon';

export default function Toast() {
  const { notifications } = useNotification();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const kind = (type) => {
    switch (type) {
      case 'success': return { icon: 'check', cls: 'success' };
      case 'error': return { icon: 'x', cls: 'error' };
      case 'warning': return { icon: 'alert', cls: 'warning' };
      case 'xp': return { icon: 'star', cls: 'warning' };
      case 'badge': return { icon: 'trophy', cls: 'badge' };
      default: return { icon: 'info', cls: 'info' };
    }
  };

  return (
    <div className="ik-toasts" aria-live="polite">
      {notifications.map((notification) => {
        const k = kind(notification.type);
        return (
          <div key={notification.id} className={`ik-toast ik-toast--${k.cls}`} role={notification.type === 'error' ? 'alert' : 'status'}>
            <span className="ik-toast__icon"><Icon name={k.icon} size={18} /></span>
            <span style={{ flex: 1 }}>{notification.message}</span>
          </div>
        );
      })}
    </div>
  );
}
