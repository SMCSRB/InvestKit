'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const EducationContext = createContext();

export function EducationProvider({ children }) {
  const [progress, setProgress] = useState({
    completedChapters: [],
    completedDomains: [],
    totalXP: 9500,
    userLevel: 20,
    streak: 0,
    maxStreak: 0,
    badges: ['first_blood', 'perfect', 'no_mistakes', 'crypto_master', 'stocks_master'],
    notes: {}, // { "domainId-chapterId": "note text" }
    attempts: {}, // { "domainId-chapterId": attemptCount }
    selectedTheme: 'dark', // Theme seleccionado
    domainsProgress: {
      crypto: 100,
      stocks: 100,
      bonds: 100,
      realestate: 100,
    },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedProgress = localStorage.getItem('educationProgress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setProgress((prev) => ({
          ...prev,
          ...parsed,
          notes: parsed.notes || {},
          attempts: parsed.attempts || {},
          domainsProgress: parsed.domainsProgress || {
            crypto: 100,
            stocks: 100,
            bonds: 100,
            realestate: 100,
          },
        }));
      } catch (error) {
        console.error('Erreur lors du chargement de la progression:', error);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('educationProgress', JSON.stringify(progress));
    }
  }, [progress, isLoading]);

  const completeChapter = (domainId, chapterId, score, xpEarned = 100) => {
    setProgress((prev) => {
      const alreadyCompleted = prev.completedChapters.some(
        (c) => c.domainId === domainId && c.chapterId === chapterId
      );

      if (alreadyCompleted) return prev;

      const attemptKey = `${domainId}-${chapterId}`;
      const attempts = (prev.attempts[attemptKey] || 0) + 1;

      // Bonus XP pour premier essai
      const bonusXP = attempts === 1 ? 50 : 0;
      const totalXPEarned = xpEarned + bonusXP;

      // Augmenter le streak
      const newStreak = prev.streak + 1;
      const newMaxStreak = Math.max(newStreak, prev.maxStreak);

      // Vérifier les badges
      const newBadges = [...prev.badges];

      // Badge "Premier sang"
      if (prev.completedChapters.length === 0 && !newBadges.includes('first_blood')) {
        newBadges.push('first_blood');
      }

      // Badge "Parfait"
      if (score === 100 && !newBadges.includes('perfect')) {
        newBadges.push('perfect');
      }

      // Badge "Sans erreur" (3+ chapitres d'affilée)
      if (newStreak >= 3 && !newBadges.includes('no_mistakes')) {
        newBadges.push('no_mistakes');
      }

      return {
        ...prev,
        completedChapters: [
          ...prev.completedChapters,
          {
            domainId,
            chapterId,
            score,
            date: new Date().toISOString(),
          },
        ],
        totalXP: prev.totalXP + totalXPEarned,
        userLevel: Math.floor((prev.totalXP + totalXPEarned) / 500) + 1,
        streak: newStreak,
        maxStreak: newMaxStreak,
        badges: newBadges,
        attempts: {
          ...prev.attempts,
          [attemptKey]: attempts,
        },
      };
    });
  };

  const completeDomain = (domainId, finalScore, xpEarned = 500) => {
    setProgress((prev) => {
      const alreadyCompleted = prev.completedDomains.some((d) => d.domainId === domainId);

      if (alreadyCompleted) return prev;

      return {
        ...prev,
        completedDomains: [
          ...prev.completedDomains,
          {
            domainId,
            score: finalScore,
            date: new Date().toISOString(),
          },
        ],
        totalXP: prev.totalXP + xpEarned,
        userLevel: Math.floor((prev.totalXP + xpEarned) / 500) + 1,
      };
    });
  };

  const isChapterUnlocked = (domainId, chapterId) => {
    if (!domainId || !chapterId) return false;
    if (chapterId === 1) return true;

    const previousChapter = chapterId - 1;
    return (progress.completedChapters || []).some(
      (c) =>
        c.domainId === domainId &&
        c.chapterId === previousChapter &&
        c.score >= 75
    );
  };

  const isChapterCompleted = (domainId, chapterId) => {
    return progress.completedChapters.some(
      (c) => c.domainId === domainId && c.chapterId === chapterId
    );
  };

  const isDomainCompleted = (domainId) => {
    return progress.completedDomains.some((d) => d.domainId === domainId);
  };

  const getChapterScore = (domainId, chapterId) => {
    const completed = progress.completedChapters.find(
      (c) => c.domainId === domainId && c.chapterId === chapterId
    );
    return completed ? completed.score : null;
  };

  const getDomainProgress = (domain) => {
    if (!domain.chapters || domain.chapters.length === 0) return 0;

    const completedCount = domain.chapters.filter((ch) =>
      isChapterCompleted(domain.id, ch.id)
    ).length;

    return Math.round((completedCount / domain.chapters.length) * 100);
  };

  const resetProgress = () => {
    setProgress({
      completedChapters: [],
      completedDomains: [],
      totalXP: 9500,
      userLevel: 20,
      streak: 0,
      maxStreak: 0,
      badges: ['first_blood', 'perfect', 'no_mistakes', 'crypto_master', 'stocks_master'],
      notes: {},
      attempts: {},
      selectedTheme: 'dark',
      domainsProgress: {
        crypto: 100,
        stocks: 100,
        bonds: 100,
        realestate: 100,
      },
    });
  };

  const addNote = (domainId, chapterId, noteText) => {
    setProgress((prev) => ({
      ...prev,
      notes: {
        ...prev.notes,
        [`${domainId}-${chapterId}`]: noteText,
      },
    }));
  };

  const getNote = (domainId, chapterId) => {
    return progress.notes?.[`${domainId}-${chapterId}`] || '';
  };

  const deleteNote = (domainId, chapterId) => {
    setProgress((prev) => {
      const newNotes = { ...prev.notes };
      delete newNotes[`${domainId}-${chapterId}`];
      return {
        ...prev,
        notes: newNotes,
      };
    });
  };

  const getAttempts = (domainId, chapterId) => {
    return progress.attempts[`${domainId}-${chapterId}`] || 0;
  };

  const resetStreak = () => {
    setProgress((prev) => ({
      ...prev,
      streak: 0,
    }));
  };

  const setSelectedTheme = (themeId) => {
    setProgress((prev) => ({
      ...prev,
      selectedTheme: themeId,
    }));
  };

  const value = {
    progress,
    completeChapter,
    completeDomain,
    isChapterUnlocked,
    isChapterCompleted,
    isDomainCompleted,
    getChapterScore,
    getDomainProgress,
    resetProgress,
    addNote,
    getNote,
    deleteNote,
    getAttempts,
    resetStreak,
    setSelectedTheme,
    isLoading,
  };

  return <EducationContext.Provider value={value}>{children}</EducationContext.Provider>;
}

export function useEducationProgress() {
  const context = useContext(EducationContext);
  if (!context) {
    throw new Error('useEducationProgress doit être utilisé dans EducationProvider');
  }
  return context;
}
