'use client';

import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'success', duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const notification = { id, message, type };

    setNotifications((prev) => [...prev, notification]);

    if (duration) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification, notifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification doit être utilisé dans NotificationProvider');
  }
  return context;
}
