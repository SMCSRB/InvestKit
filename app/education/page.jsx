'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { educationDomains } from '@/data/education';
import { useEducationProgress } from '@/app/context/EducationContext';
import PageWrapper from '@/app/components/PageWrapper';

export default function EducationPage() {
  const router = useRouter();
  const { progress, isDomainCompleted, getDomainProgress, isLoading } = useEducationProgress();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="min-h-screen pt-32 pb-20 px-6 lg:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="text-center animate-pulse">
              <div className="h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded w-64 mx-auto mb-4" />
              <div className="h-6 bg-gray-700 rounded w-96 mx-auto" />
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const completedDomainsCount = progress.completedDomains.length;
  const totalDomainsCount = educationDomains.length;

  return (
    <PageWrapper animation="fade-in-up">
      <div className="min-h-screen pt-32 pb-20 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16 stagger-container">
            <h1
              className="text-5xl md:text-6xl font-bold mb-6"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              📚 Académie InvestKit
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Maîtrisez l'investissement avec nos formations complètes. Obtenez des badges pour chaque domaine maîtrisé.
            </p>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-8 mb-16 stagger-container">
            <div
              className="p-6 rounded-2xl border border-blue-500/20"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
              }}
            >
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {progress.userLevel}
              </div>
              <div className="text-gray-400">Niveau</div>
              <div className="text-sm text-gray-500 mt-2">
                {progress.totalXP} XP
              </div>
            </div>

            <div
              className="p-6 rounded-2xl border border-purple-500/20"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.borderColor = '#8b5cf6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)';
              }}
            >
              <div className="text-4xl font-bold text-purple-400 mb-2">
                {completedDomainsCount}
              </div>
              <div className="text-gray-400">Domaines Maîtrisés</div>
              <div className="text-sm text-gray-500 mt-2">
                sur {totalDomainsCount}
              </div>
            </div>

            <div
              className="p-6 rounded-2xl border border-pink-500/20"
              style={{
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.borderColor = '#ec4899';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.2)';
              }}
            >
              <div className="text-4xl font-bold text-pink-400 mb-2">
                {progress.completedChapters.length}
              </div>
              <div className="text-gray-400">Chapitres Complétés</div>
              <div className="text-sm text-gray-500 mt-2">
                Continue d'apprendre !
              </div>
            </div>
          </div>

          {/* Domaines */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold mb-8 text-white">Mes Domaines</h2>

            <div className="grid md:grid-cols-2 gap-6 stagger-container">
              {educationDomains.map((domain, idx) => {
                const isCompleted = isDomainCompleted(domain.id);
                const progressPercent = getDomainProgress(domain);
                const isLocked = domain.locked;

                return (
                  <Link
                    key={domain.id}
                    href={!isLocked ? `/education/${domain.id}` : '#'}
                    style={{
                      animationDelay: `${idx * 0.05}s`,
                    }}
                  >
                    <div
                      className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer
                        ${
                          isLocked
                            ? 'border-gray-700/30 opacity-60 cursor-not-allowed'
                            : 'border-gray-700/50 hover:border-opacity-100'
                        }
                      `}
                      style={{
                        background: isLocked
                          ? 'rgba(30, 30, 30, 0.4)'
                          : `linear-gradient(135deg, ${domain.color}15 0%, ${domain.color}05 100%)`,
                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isLocked) {
                          e.currentTarget.style.transform = 'translateY(-8px)';
                          e.currentTarget.style.borderColor = domain.color;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-4xl">{domain.icon}</div>
                          <div>
                            <h3 className="text-xl font-bold text-white">{domain.name}</h3>
                            <p className="text-sm text-gray-400">{domain.description}</p>
                          </div>
                        </div>
                        <div className="text-3xl">
                          {isCompleted ? domain.badge : '🔒'}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-400">Progression</span>
                          <span
                            className="text-sm font-semibold"
                            style={{ color: domain.color }}
                          >
                            {progressPercent}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${progressPercent}%`,
                              background: `linear-gradient(90deg, ${domain.color}, ${domain.color}80)`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Chapitres */}
                      {domain.chapters && domain.chapters.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500">
                            {progress.completedChapters.filter(
                              (c) => c.domainId === domain.id
                            ).length}{' '}
                            / {domain.chapters.length} chapitres
                          </p>
                        </div>
                      )}

                      {/* Status */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-700/30">
                        {isLocked ? (
                          <span className="text-xs text-gray-500">{domain.lockReason}</span>
                        ) : isCompleted ? (
                          <span className="text-xs text-green-400 font-semibold">✓ Maîtrisé</span>
                        ) : progressPercent > 0 ? (
                          <span className="text-xs text-blue-400">En cours...</span>
                        ) : (
                          <span className="text-xs text-gray-500">Non commencé</span>
                        )}
                        {!isLocked && (
                          <span className="text-xs text-gray-500">→</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Badges Section */}
          {progress.completedDomains.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold mb-8 text-white">Mes Badges</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {educationDomains
                  .filter((d) => isDomainCompleted(d.id))
                  .map((domain) => (
                    <div
                      key={domain.id}
                      className="text-center p-6 rounded-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${domain.color}20 0%, ${domain.color}10 100%)`,
                        border: `2px solid ${domain.color}40`,
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
                        e.currentTarget.style.borderColor = domain.color;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                      }}
                    >
                      <div className="text-5xl mb-2">{domain.badge}</div>
                      <h4 className="font-bold text-white mb-1">
                        Maître {domain.name}
                      </h4>
                      <p className="text-xs text-gray-400">
                        Obtenu le{' '}
                        {new Date(
                          progress.completedDomains.find((d) => d.domainId === domain.id)
                            .date
                        ).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
