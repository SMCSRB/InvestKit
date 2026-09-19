'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { educationDomains } from '@/data/education';
import { useEducationProgress } from '@/app/context/EducationContext';
import PageWrapper from '@/app/components/PageWrapper';

export default function DomainPage() {
  const params = useParams();
  const domainId = params?.domain;
  const { isChapterUnlocked, isChapterCompleted, getChapterScore, isDomainCompleted, isLoading } =
    useEducationProgress();

  const domain = domainId ? educationDomains.find((d) => d.id === domainId) : null;

  if (!domainId || isLoading) {
    return (
      <PageWrapper>
        <div className="min-h-screen pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="h-12 bg-gray-700 rounded w-64 mb-4 animate-pulse" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!domain) {
    return (
      <PageWrapper>
        <div className="min-h-screen pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-red-400">Domaine non trouvé</h1>
            <Link href="/education" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
              ← Retour à l'académie
            </Link>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const completedChaptersCount = domain.chapters.filter((ch) =>
    isChapterCompleted(domain.id, ch.id)
  ).length;

  const progressPercent = Math.round((completedChaptersCount / domain.chapters.length) * 100);
  const isDomainDone = isDomainCompleted(domain.id);

  return (
    <PageWrapper animation="fade-in-up">
      <div className="min-h-screen pt-32 pb-20 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Link href="/education" className="text-blue-400 hover:text-blue-300 mb-8 inline-flex items-center gap-2">
            ← Retour
          </Link>

          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-6xl">{domain.icon}</div>
              <div>
                <h1 className="text-5xl font-bold text-white mb-2">{domain.name}</h1>
                <p className="text-xl text-gray-400">{domain.description}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl border border-gray-700/50 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Progression</h3>
                  <p className="text-sm text-gray-400">
                    {completedChaptersCount} / {domain.chapters.length} chapitres complétés
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className="text-3xl font-bold"
                    style={{ color: domain.color }}
                  >
                    {progressPercent}%
                  </div>
                </div>
              </div>

              <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progressPercent}%`,
                    background: `linear-gradient(90deg, ${domain.color}, ${domain.color}80)`,
                  }}
                />
              </div>

              {isDomainDone && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 font-semibold text-sm">
                    ✓ Domaine Maîtrisé ! Vous avez déverrouillé le badge {domain.badge}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Chapitres */}
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">Chapitres du Domaine</h2>

            <div className="space-y-4">
              {domain.chapters.map((chapter, idx) => {
                const isCompleted = isChapterCompleted(domain.id, chapter.id);
                const isUnlocked = isChapterUnlocked(domain.id, chapter.id);
                const score = getChapterScore(domain.id, chapter.id);

                return (
                  <Link
                    key={chapter.id}
                    href={
                      isUnlocked
                        ? `/education/${domain.id}/${chapter.id}`
                        : '#'
                    }
                  >
                    <div
                      className={`p-6 rounded-2xl border transition-all duration-300
                        ${
                          isUnlocked
                            ? 'border-gray-700/50 hover:border-opacity-100 cursor-pointer'
                            : 'border-gray-800 opacity-60 cursor-not-allowed'
                        }
                      `}
                      style={{
                        background: isUnlocked
                          ? `linear-gradient(135deg, ${domain.color}10 0%, ${domain.color}05 100%)`
                          : 'rgba(30, 30, 30, 0.4)',
                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                      onMouseEnter={(e) => {
                        if (isUnlocked) {
                          e.currentTarget.style.transform = 'translateX(8px)';
                          e.currentTarget.style.borderColor = domain.color;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-2xl">
                              {isCompleted ? '✓' : isUnlocked ? '▶' : '🔒'}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-white">
                                Chapitre {chapter.id}: {chapter.title}
                              </h3>
                              <p className="text-sm text-gray-400">{chapter.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                            <span>⏱️ {chapter.duration}</span>
                            {isCompleted && score && (
                              <span className="text-green-400">
                                Score: {score}%
                              </span>
                            )}
                            {!isUnlocked && (
                              <span className="text-red-400">
                                Débloquez en complétant le chapitre {chapter.id - 1}
                              </span>
                            )}
                          </div>
                        </div>

                        {isCompleted && (
                          <div
                            className="text-3xl ml-4 animate-bounce"
                            style={{
                              color: domain.color,
                              animationDelay: `${idx * 0.1}s`,
                            }}
                          >
                            ⭐
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quiz Final */}
          <div
            className="mt-12 p-8 rounded-2xl border-2"
            style={{
              background: `linear-gradient(135deg, ${domain.color}15 0%, ${domain.color}05 100%)`,
              borderColor: `${domain.color}50`,
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  🏆 Quiz Final du Domaine
                </h3>
                <p className="text-gray-400 mb-4">
                  Passez le quiz final après avoir complété tous les chapitres pour
                  obtenir le badge {domain.badge} du domaine !
                </p>
                <p className="text-sm text-gray-500">
                  Score requis: {domain.finalQuiz.passingScore}%
                </p>
              </div>

              {completedChaptersCount === domain.chapters.length ? (
                <Link href={`/education/${domain.id}/final-quiz`}>
                  <button
                    className="px-8 py-3 rounded-lg font-semibold transition-all duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${domain.color}, ${domain.color}dd)`,
                      color: 'white',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    Passer le Quiz Final →
                  </button>
                </Link>
              ) : (
                <button
                  disabled
                  className="px-8 py-3 rounded-lg font-semibold opacity-50 cursor-not-allowed"
                  style={{
                    background: `linear-gradient(135deg, ${domain.color}, ${domain.color}dd)`,
                    color: 'white',
                  }}
                >
                  Débloquez en complétant tous les chapitres
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
