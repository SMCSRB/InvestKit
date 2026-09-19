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
      <div style={{
        minHeight: '100vh',
        paddingTop: '80px',
        paddingBottom: '80px',
        paddingLeft: '24px',
        paddingRight: '24px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Back Link */}
          <Link href="/education">
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#60a5fa',
              textDecoration: 'none',
              marginBottom: '32px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'color 0.3s ease',
            }}
            onMouseEnter={(e) => e.target.style.color = '#93c5fd'}
            onMouseLeave={(e) => e.target.style.color = '#60a5fa'}
            >
              ← Retour
            </span>
          </Link>

          {/* Header Premium */}
          <div style={{
            marginBottom: '48px',
            paddingBottom: '32px',
            borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              marginBottom: '24px',
            }}>
              <div style={{
                fontSize: '72px',
                lineHeight: '1',
                filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3))',
              }}>
                {domain.icon}
              </div>
              <div>
                <h1 style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  margin: '0 0 8px 0',
                  background: `linear-gradient(135deg, white, ${domain.color})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {domain.name}
                </h1>
                <p style={{
                  fontSize: '18px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  margin: '0',
                }}>
                  {domain.description}
                </p>
              </div>
            </div>

            {/* Progress Card */}
            <div style={{
              background: `linear-gradient(135deg, rgba(${parseInt(domain.color.slice(1,3), 16)}, ${parseInt(domain.color.slice(3,5), 16)}, ${parseInt(domain.color.slice(5,7), 16)}, 0.1) 0%, rgba(30, 30, 30, 0.3) 100%)`,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${domain.color}30`,
              borderRadius: '20px',
              padding: '24px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                marginBottom: '16px',
              }}>
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'white',
                    margin: '0 0 4px 0',
                  }}>
                    📊 Progression
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    margin: '0',
                  }}>
                    {completedChaptersCount} / {domain.chapters.length} chapitres complétés
                  </p>
                </div>
                <div style={{
                  textAlign: 'right',
                }}>
                  <div style={{
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: domain.color,
                  }}>
                    {progressPercent}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '16px',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  borderRadius: '10px',
                  background: `linear-gradient(90deg, ${domain.color}, ${domain.color}dd)`,
                  transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: `0 0 20px ${domain.color}80`,
                }}/>
              </div>

              {isDomainDone && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginTop: '12px',
                }}>
                  <p style={{
                    color: '#86efac',
                    fontWeight: '600',
                    fontSize: '14px',
                    margin: '0',
                  }}>
                    ✨ Domaine Maîtrisé ! Vous avez déverrouillé le badge {domain.badge}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Chapitres Grid */}
          <div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '24px',
              margin: '0 0 24px 0',
            }}>
              📚 Chapitres du Domaine
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
            }}>
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
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      style={{
                        background: isUnlocked
                          ? `linear-gradient(135deg, rgba(${parseInt(domain.color.slice(1,3), 16)}, ${parseInt(domain.color.slice(3,5), 16)}, ${parseInt(domain.color.slice(5,7), 16)}, 0.08) 0%, rgba(30, 30, 30, 0.3) 100%)`
                          : 'rgba(15, 23, 42, 0.4)',
                        backdropFilter: 'blur(20px)',
                        border: isUnlocked ? `1.5px solid ${domain.color}40` : '1.5px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        padding: '24px',
                        cursor: isUnlocked ? 'pointer' : 'not-allowed',
                        opacity: isUnlocked ? 1 : 0.5,
                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                      onMouseEnter={(e) => {
                        if (isUnlocked) {
                          e.currentTarget.style.transform = 'translateY(-8px)';
                          e.currentTarget.style.borderColor = domain.color;
                          e.currentTarget.style.boxShadow = `0 20px 40px ${domain.color}20`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* Chapter Header */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '16px',
                      }}>
                        <div style={{
                          fontSize: '32px',
                        }}>
                          {isCompleted ? '✅' : isUnlocked ? '▶️' : '🔒'}
                        </div>
                        {isCompleted && (
                          <div style={{
                            fontSize: '24px',
                            animation: 'bounce 2s infinite',
                            animationDelay: `${idx * 0.1}s`,
                          }}>
                            ⭐
                          </div>
                        )}
                      </div>

                      {/* Chapter Title */}
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'white',
                        margin: '0 0 8px 0',
                        lineHeight: '1.3',
                      }}>
                        Chapitre {chapter.id}
                      </h3>

                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: domain.color,
                        margin: '0 0 8px 0',
                      }}>
                        {chapter.title}
                      </h4>

                      {/* Description */}
                      <p style={{
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        margin: '0 0 16px 0',
                        flex: '1',
                      }}>
                        {chapter.description}
                      </p>

                      {/* Footer Info */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        paddingTop: '12px',
                        borderTop: 'rgba(255, 255, 255, 0.1) 1px solid',
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.5)',
                        }}>
                          ⏱️ {chapter.duration}
                        </div>

                        {isCompleted && score && (
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#86efac',
                          }}>
                            ✨ Score: {score}%
                          </div>
                        )}

                        {!isUnlocked && (
                          <div style={{
                            fontSize: '13px',
                            color: '#fca5a5',
                            fontWeight: '500',
                          }}>
                            🔓 Complétez le chapitre {chapter.id - 1}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quiz Final Section */}
          <div style={{
            marginTop: '48px',
            paddingTop: '48px',
            borderTop: '2px solid rgba(255, 255, 255, 0.1)',
          }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '24px',
              margin: '0 0 24px 0',
            }}>
              🏆 Quiz Final du Domaine
            </h2>

            <div
              style={{
                background: `linear-gradient(135deg, rgba(${parseInt(domain.color.slice(1,3), 16)}, ${parseInt(domain.color.slice(3,5), 16)}, ${parseInt(domain.color.slice(5,7), 16)}, 0.12) 0%, rgba(30, 30, 30, 0.3) 100%)`,
                backdropFilter: 'blur(20px)',
                border: `2px solid ${domain.color}50`,
                borderRadius: '20px',
                padding: '32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '32px',
              }}
            >
              <div style={{ flex: '1' }}>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'white',
                  margin: '0 0 12px 0',
                }}>
                  Testez Vos Connaissances
                </h3>
                <p style={{
                  fontSize: '16px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  margin: '0 0 16px 0',
                  lineHeight: '1.5',
                }}>
                  Passez le quiz final après avoir complété tous les chapitres pour obtenir le badge <strong>{domain.badge}</strong> du domaine !
                </p>
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.6)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    📋 {domain.finalQuiz.questions.length} questions
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    ⭐ Score requis: {domain.finalQuiz.passingScore}%
                  </div>
                </div>
              </div>

              {completedChaptersCount === domain.chapters.length ? (
                <Link href={`/education/${domain.id}/final-quiz`} style={{ textDecoration: 'none' }}>
                  <button
                    style={{
                      background: `linear-gradient(135deg, ${domain.color}, ${domain.color}dd)`,
                      color: 'white',
                      border: 'none',
                      padding: '16px 32px',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      whiteSpace: 'nowrap',
                      boxShadow: `0 8px 24px ${domain.color}40`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 12px 32px ${domain.color}60`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `0 8px 24px ${domain.color}40`;
                    }}
                  >
                    Démarrer le Quiz →
                  </button>
                </Link>
              ) : (
                <button
                  disabled
                  style={{
                    background: 'rgba(100, 116, 139, 0.3)',
                    color: 'rgba(255, 255, 255, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '16px 32px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'not-allowed',
                    whiteSpace: 'nowrap',
                  }}
                >
                  🔒 Complétez tous les chapitres
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
