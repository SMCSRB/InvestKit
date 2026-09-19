'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEducationProgress } from '@/app/context/EducationContext';
import { educationDomains } from '@/data/education';
import PageWrapper from '@/app/components/PageWrapper';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const { progress, isChapterCompleted, getChapterScore, isDomainCompleted, isLoading } = useEducationProgress();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated || isLoading) {
    return (
      <PageWrapper>
        <div className="min-h-screen pt-32 pb-20 px-6">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-700 rounded w-64 mb-4" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  const badgeInfo = {
    first_blood: { name: 'Premier Sang', emoji: '🩸', description: 'Premier chapitre complété' },
    perfect: { name: 'Parfait', emoji: '💯', description: 'Obtenu un score de 100%' },
    no_mistakes: { name: 'Sans Erreurs', emoji: '⭐', description: '3+ chapitres d\'affilée' },
  };

  const totalChaptersCompleted = progress.completedChapters.length;
  const totalDomainsCompleted = progress.completedDomains.length;

  const copyProfileLink = () => {
    const profileUrl = `${window.location.origin}/profile`;
    navigator.clipboard.writeText(profileUrl).then(() => {
      alert('Lien du profil copié! 📋');
    });
  };

  const shareProfile = () => {
    const message = `Viens rejoindre moi sur InvestKit! J'ai déjà atteint le niveau ${progress.userLevel} avec ${progress.totalXP} XP! 🚀`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://twitter.com/intent/tweet?text=${encodedMessage}`, '_blank', 'width=600,height=400');
  };

  return (
    <PageWrapper animation="fade-in-up">
      <div className="min-h-screen pt-32 pb-20 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto">
          {/* Header with back link */}
          <Link
            href="/dashboard"
            className="text-blue-400 hover:text-blue-300 mb-8 inline-flex items-center gap-2"
          >
            ← Retour
          </Link>

          {/* Profile Header */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Mon Profil</h1>
                <p className="text-gray-400">Tableau de bord personnalisé</p>
              </div>
              <div className="text-6xl">👤</div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-900/30 border border-blue-400/30 rounded-lg p-4">
                <p className="text-blue-300 text-sm font-semibold">Niveau</p>
                <p className="text-white text-3xl font-bold">{progress.userLevel}</p>
              </div>
              <div className="bg-yellow-900/30 border border-yellow-400/30 rounded-lg p-4">
                <p className="text-yellow-300 text-sm font-semibold">XP Total</p>
                <p className="text-white text-3xl font-bold">{progress.totalXP}</p>
              </div>
              <div className="bg-orange-900/30 border border-orange-400/30 rounded-lg p-4">
                <p className="text-orange-300 text-sm font-semibold">Racha Actuelle</p>
                <p className="text-white text-3xl font-bold">🔥 {progress.streak}</p>
              </div>
              <div className="bg-purple-900/30 border border-purple-400/30 rounded-lg p-4">
                <p className="text-purple-300 text-sm font-semibold">Max Racha</p>
                <p className="text-white text-3xl font-bold">⭐ {progress.maxStreak}</p>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">📈 Progression</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300 font-semibold">Chapitres complétés</span>
                  <span className="text-blue-400 font-bold">{totalChaptersCompleted}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-400 h-full transition-all duration-500"
                    style={{
                      width: `${Math.min((totalChaptersCompleted / 50) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300 font-semibold">Domaines maîtrisés</span>
                  <span className="text-green-400 font-bold">{totalDomainsCompleted}/{educationDomains.length}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-400 h-full transition-all duration-500"
                    style={{
                      width: `${(totalDomainsCompleted / educationDomains.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Badges Section */}
          {progress.badges.length > 0 && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">🏆 Badges Gagnés ({progress.badges.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {progress.badges.map((badgeId) => {
                  const badge = badgeInfo[badgeId];
                  return (
                    <div
                      key={badgeId}
                      className="p-6 rounded-lg bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-400/50 text-center hover:border-purple-400 transition-all duration-300"
                    >
                      <div className="text-5xl mb-3">{badge.emoji}</div>
                      <h3 className="text-white font-bold mb-1">{badge.name}</h3>
                      <p className="text-purple-300 text-sm">{badge.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Domains Progress */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">📚 Domaines</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {educationDomains.map((domain) => {
                const isCompleted = isDomainCompleted(domain.id);
                const chaptersCompleted = domain.chapters.filter((ch) =>
                  isChapterCompleted(domain.id, ch.id)
                ).length;
                const progressPercent = Math.round((chaptersCompleted / domain.chapters.length) * 100);

                return (
                  <Link
                    key={domain.id}
                    href={`/education/${domain.id}`}
                    className="block"
                  >
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 cursor-pointer hover:translate-y-[-4px]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{domain.icon}</span>
                          <div>
                            <h4 className="text-white font-semibold">{domain.name}</h4>
                            <p className="text-gray-400 text-xs">{chaptersCompleted}/{domain.chapters.length} chapitres</p>
                          </div>
                        </div>
                        {isCompleted && <span className="text-2xl">✅</span>}
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r h-full transition-all duration-300"
                          style={{
                            background: `linear-gradient(90deg, ${domain.color}, ${domain.color}80)`,
                            width: `${progressPercent}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">{progressPercent}% complet</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Share Section */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50">
            <h2 className="text-2xl font-bold text-white mb-6">🤝 Partager mon Profil</h2>
            <p className="text-gray-400 mb-6">Invite tes amis à rejoindre InvestKit et à progresser ensemble!</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={copyProfileLink}
                className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex-1"
                style={{
                  background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                  color: 'white',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                📋 Copier le lien
              </button>
              <button
                onClick={shareProfile}
                className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex-1"
                style={{
                  background: 'linear-gradient(135deg, #a78bfa, #c084fc)',
                  color: 'white',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                𝕏 Partager sur Twitter
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
