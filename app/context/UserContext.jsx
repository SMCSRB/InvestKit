'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

function generateFriendCode() {
  return '#' + Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, '0');
}

export function UserProvider({ children }) {
  const [user, setUser] = useState({
    friendCode: '', // le vrai code ami vient du serveur (/api/v1/social/me)
    fullName: '',
    bio: 'Investisseur Premium',
    profilePhoto: '',
    friends: [], // { userId, friendCode, name, status: 'confirmed', addedDate }
    friendRequests: {
      sent: [], // { userId, friendCode, name, sentDate }
      received: [], // { userId, friendCode, name, sentDate }
    },
    blockedUsers: [], // { userId, friendCode, name }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('userData');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser((prev) => ({
          ...prev,
          ...parsed,
        }));
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
        initializeUser();
      }
    } else {
      initializeUser();
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('userData', JSON.stringify(user));
    }
  }, [user, isLoading]);

  // Récupère la vraie identité du compte connecté (pseudo, email) et
  // l'affiche à la place des données fictives par défaut. Le reste
  // (amis, guildes...) reste en local en attendant le vrai backend.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser((prev) => ({
            ...prev,
            email: data.user.email,
            username: data.user.username,
            fullName: data.user.username || prev.fullName,
            subscriptionTier: data.user.subscriptionTier,
            freeDomain: data.user.freeDomain,
            enable2FA: data.user.enable2FA,
            referralCode: data.user.referralCode,
          }));
        }
      })
      .catch((error) => {
        console.error('Erreur lors de la récupération du compte:', error);
      });
  }, []);

  const initializeUser = () => {
    // Keep the preset friend code and name
    // Only initialize if not already set
    if (!user.friendCode || user.friendCode === '') {
      setUser((prev) => ({
        ...prev,
        friendCode: '', // le vrai code ami vient du serveur (/api/v1/social/me)
        fullName: '',
        bio: 'Investisseur Premium',
      }));
    }
  };

  const sendFriendRequest = (friendCode, friendName) => {
    setUser((prev) => {
      // Vérifier si demande déjà envoyée
      if (prev.friendRequests.sent.some((req) => req.friendCode === friendCode)) {
        return prev;
      }

      // Vérifier si déjà ami
      if (prev.friends.some((f) => f.friendCode === friendCode)) {
        return prev;
      }

      return {
        ...prev,
        friendRequests: {
          ...prev.friendRequests,
          sent: [
            ...prev.friendRequests.sent,
            {
              userId: Math.random().toString(36).substr(2, 9),
              friendCode,
              name: friendName,
              sentDate: new Date().toISOString(),
            },
          ],
        },
      };
    });
  };

  const receiveFriendRequest = (friendCode, friendName) => {
    setUser((prev) => {
      // Vérifier si demande déjà reçue
      if (prev.friendRequests.received.some((req) => req.friendCode === friendCode)) {
        return prev;
      }

      return {
        ...prev,
        friendRequests: {
          ...prev.friendRequests,
          received: [
            ...prev.friendRequests.received,
            {
              userId: Math.random().toString(36).substr(2, 9),
              friendCode,
              name: friendName,
              sentDate: new Date().toISOString(),
            },
          ],
        },
      };
    });
  };

  const acceptFriendRequest = (friendCode, friendName) => {
    setUser((prev) => ({
      ...prev,
      friends: [
        ...prev.friends,
        {
          userId: Math.random().toString(36).substr(2, 9),
          friendCode,
          name: friendName,
          status: 'confirmed',
          addedDate: new Date().toISOString(),
        },
      ],
      friendRequests: {
        ...prev.friendRequests,
        received: prev.friendRequests.received.filter((req) => req.friendCode !== friendCode),
      },
    }));
  };

  const rejectFriendRequest = (friendCode) => {
    setUser((prev) => ({
      ...prev,
      friendRequests: {
        ...prev.friendRequests,
        received: prev.friendRequests.received.filter((req) => req.friendCode !== friendCode),
      },
    }));
  };

  const removeFriend = (friendCode) => {
    setUser((prev) => ({
      ...prev,
      friends: prev.friends.filter((f) => f.friendCode !== friendCode),
    }));
  };

  const cancelFriendRequest = (friendCode) => {
    setUser((prev) => ({
      ...prev,
      friendRequests: {
        ...prev.friendRequests,
        sent: prev.friendRequests.sent.filter((req) => req.friendCode !== friendCode),
      },
    }));
  };

  const blockUser = (friendCode, userName) => {
    setUser((prev) => {
      // Supprimer de amis et demandes
      const updated = {
        ...prev,
        friends: prev.friends.filter((f) => f.friendCode !== friendCode),
        friendRequests: {
          ...prev.friendRequests,
          sent: prev.friendRequests.sent.filter((req) => req.friendCode !== friendCode),
          received: prev.friendRequests.received.filter((req) => req.friendCode !== friendCode),
        },
        blockedUsers: [
          ...prev.blockedUsers,
          {
            userId: Math.random().toString(36).substr(2, 9),
            friendCode,
            name: userName,
          },
        ],
      };
      return updated;
    });
  };

  const unblockUser = (friendCode) => {
    setUser((prev) => ({
      ...prev,
      blockedUsers: prev.blockedUsers.filter((u) => u.friendCode !== friendCode),
    }));
  };

  const isFriend = (friendCode) => {
    return user.friends.some((f) => f.friendCode === friendCode);
  };

  const isFriendRequestSent = (friendCode) => {
    return user.friendRequests.sent.some((req) => req.friendCode === friendCode);
  };

  const isFriendRequestReceived = (friendCode) => {
    return user.friendRequests.received.some((req) => req.friendCode === friendCode);
  };

  const isBlocked = (friendCode) => {
    return user.blockedUsers.some((u) => u.friendCode === friendCode);
  };

  const value = {
    user,
    setUser,
    sendFriendRequest,
    receiveFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    cancelFriendRequest,
    blockUser,
    unblockUser,
    isFriend,
    isFriendRequestSent,
    isFriendRequestReceived,
    isBlocked,
    isLoading,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser doit être utilisé dans UserProvider');
  }
  return context;
}
