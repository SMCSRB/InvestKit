'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const EducationContext = createContext();

export function EducationProvider({ children }) {
  const [progress, setProgress] = useState({
    completedChapters: [],
    completedDomains: [],
    totalXP: 0,
    userLevel: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedProgress = localStorage.getItem('educationProgress');
    if (savedProgress) {
      try {
        setProgress(JSON.parse(savedProgress));
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
        totalXP: prev.totalXP + xpEarned,
        userLevel: Math.floor(prev.totalXP / 500) + 1,
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
    if (chapterId === 1) return true;

    const previousChapter = chapterId - 1;
    return progress.completedChapters.some(
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
      totalXP: 0,
      userLevel: 1,
    });
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
