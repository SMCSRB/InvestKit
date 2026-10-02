'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { educationDomains } from '@/data/education';
import { useEducationProgress } from '@/app/context/EducationContext';
import PageWrapper from '@/app/components/PageWrapper';
import AppShell from '@/app/components/shell/AppShell';
import Icon, { Glyph } from '@/app/components/ui/Icon';

// Couleur de domaine lisible comme texte dans les deux thèmes (la couleur pure d'un domaine, ex. orange, est trop claire en thème clair)
const readable = (c) => `color-mix(in srgb, ${c} 55%, var(--ik-text))`;

export default function DomainPage() {
  const params = useParams();
  const domainId = params?.domain;
  const { isChapterUnlocked, isChapterCompleted, getChapterScore, isDomainCompleted, isLoading } =
    useEducationProgress();

  const domain = domainId ? educationDomains.find((d) => d.id === domainId) : null;

  if (!domainId || isLoading) {
    return (
      <AppShell><PageWrapper>
        <div className="pb-12 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="h-12 bg-gray-700 rounded w-64 mb-4 animate-pulse" />
          </div>
        </div>
      </PageWrapper></AppShell>
    );
  }

  if (!domain) {
    return (
      <AppShell><PageWrapper>
        <div className="pb-12 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-red-400">Domaine non trouvé</h1>
            <Link href="/education" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
              ← Retour à l'académie
            </Link>
          </div>
        </div>
      </PageWrapper></AppShell>
    );
  }

  const completedChaptersCount = domain.chapters.filter((ch) =>
    isChapterCompleted(domain.id, ch.id)
  ).length;

  const progressPercent = Math.round((completedChaptersCount / domain.chapters.length) * 100);
  const isDomainDone = isDomainCompleted(domain.id);

  // Calcul des recommandations
  const getRecommendations = () => {
    const recommendations = [];

    // Premier chapitre non terminé et débloqué
    for (let i = 0; i < domain.chapters.length; i++) {
      const chapter = domain.chapters[i];
      if (!isChapterCompleted(domain.id, chapter.id) && isChapterUnlocked(domain.id, chapter.id)) {
        recommendations.push({
          type: 'continue',
          chapter,
          reason: 'Reprendre là où tu t\'es arrêté'
        });
        break;
      }
    }

    // Chapitres terminés avec un score inférieur à 85 %
    domain.chapters.forEach((chapter) => {
      if (isChapterCompleted(domain.id, chapter.id)) {
        const score = getChapterScore(domain.id, chapter.id);
        if (score && score < 85) {
          recommendations.push({
            type: 'improve',
            chapter,
            score,
            reason: `Améliorer ton score (${score} %)`
          });
        }
      }
    });

    return recommendations.slice(0, 2); // 2 recommandations au maximum
  };

  const recommendations = getRecommendations();

  return (
    <AppShell><PageWrapper animation="fade-in-up">
      <div style={{
        paddingTop: '8px',
        paddingBottom: '48px',
        paddingLeft: '24px',
        paddingRight: '24px',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Back Link */}
          <Link href="/education">
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--ik-accent)',
              textDecoration: 'none',
              marginBottom: '32px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'color 0.3s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ik-text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ik-accent)'; }}
            >
              ← Retour
            </span>
          </Link>

          {/* Header Premium */}
          <div style={{
            marginBottom: '48px',
            paddingBottom: '32px',
            borderBottom: '2px solid color-mix(in srgb, var(--ik-text) 10%, transparent)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              marginBottom: '24px',
            }}>
              <div style={{
                fontSize: 'clamp(44px, 14vw, 72px)',
                lineHeight: '1',
                filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3))',
              }}>
                <Glyph g={domain.icon} size={32} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h1 style={{
                  fontSize: 'clamp(26px, 8vw, 48px)',
                  overflowWrap: 'anywhere',
                  fontWeight: 'bold',
                  margin: '0 0 8px 0',
                  background: `linear-gradient(135deg, var(--ik-text), ${domain.color})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {domain.name}
                </h1>
                <p style={{
                  fontSize: '18px',
                  color: 'var(--ik-text-3)',
                  margin: '0',
                }}>
                  {domain.description}
                </p>
              </div>
            </div>

            {/* Progress Card */}
            <div style={{
              background: `linear-gradient(135deg, rgba(${parseInt(domain.color.slice(1,3), 16)}, ${parseInt(domain.color.slice(3,5), 16)}, ${parseInt(domain.color.slice(5,7), 16)}, 0.1) 0%, color-mix(in srgb, var(--ik-text) 4%, transparent) 100%)`,
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
                    color: 'var(--ik-text)',
                    margin: '0 0 4px 0',
                  }}> Progression
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: 'var(--ik-text-3)',
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
                    color: readable(domain.color),
                  }}>
                    {progressPercent}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{
                width: '100%',
                height: '8px',
                background: 'color-mix(in srgb, var(--ik-text) 10%, transparent)',
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
                  background: 'color-mix(in srgb, var(--ik-positive) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--ik-positive) 30%, transparent)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginTop: '12px',
                }}>
                  <p style={{
                    color: 'var(--ik-positive)',
                    fontWeight: '600',
                    fontSize: '14px',
                    margin: '0',
                  }}> Domaine Maîtrisé ! Vous avez déverrouillé le badge <Glyph g={domain.badge} size={18} />
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recommandations */}
          {recommendations.length > 0 && (
            <div style={{
              marginBottom: '48px',
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--ik-text)',
                marginBottom: '16px',
              }}> Recommandations Personnalisées
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px',
              }}>
                {recommendations.map((rec, idx) => (
                  <Link
                    key={idx}
                    href={`/education/${domain.id}/${rec.chapter.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      style={{
                        background: `linear-gradient(135deg, ${domain.color}15 0%, color-mix(in srgb, var(--ik-text) 5%, transparent) 100%)`,
                        backdropFilter: 'blur(20px)',
                        border: `2px solid ${domain.color}60`,
                        borderRadius: '12px',
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        height: '100%',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = domain.color;
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = `0 12px 24px ${domain.color}20`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = `${domain.color}60`;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                      }}>
                        <span style={{
                          fontSize: '20px',
                        }}>
                          <Icon name={rec.type === 'continue' ? 'rocket' : 'trendingUp'} size={18} />
                        </span>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: readable(domain.color),
                          textTransform: 'uppercase',
                        }}>
                          {rec.reason}
                        </span>
                      </div>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: 'var(--ik-text)',
                        margin: '0 0 4px 0',
                      }}>
                        Chapitre {rec.chapter.id}: {rec.chapter.title}
                      </h4>
                      <p style={{
                        fontSize: '13px',
                        color: 'var(--ik-text-3)',
                        margin: '0',
                      }}>
                        {rec.chapter.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Chapitres Grid */}
          <div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: 'var(--ik-text)',
              marginBottom: '24px',
              margin: '0 0 24px 0',
            }}> Chapitres du Domaine
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
                          ? `linear-gradient(135deg, rgba(${parseInt(domain.color.slice(1,3), 16)}, ${parseInt(domain.color.slice(3,5), 16)}, ${parseInt(domain.color.slice(5,7), 16)}, 0.08) 0%, color-mix(in srgb, var(--ik-text) 4%, transparent) 100%)`
                          : 'var(--ik-surface-2)',
                        backdropFilter: 'blur(20px)',
                        border: isUnlocked ? `1.5px solid ${domain.color}40` : '1.5px solid color-mix(in srgb, var(--ik-text) 10%, transparent)',
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
                          <Icon name={isCompleted ? 'circleCheck' : isUnlocked ? 'chevronRight' : 'lock'} size={20} />
                        </div>
                        {isCompleted && (
                          <div style={{
                            fontSize: '24px',
                            animation: 'bounce 2s infinite',
                            animationDelay: `${idx * 0.1}s`,
                          }}>
                            <Icon name="star" size={18} />
                          </div>
                        )}
                      </div>

                      {/* Chapter Title */}
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'var(--ik-text)',
                        margin: '0 0 8px 0',
                        lineHeight: '1.3',
                      }}>
                        Chapitre {chapter.id}
                      </h3>

                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: readable(domain.color),
                        margin: '0 0 8px 0',
                      }}>
                        {chapter.title}
                      </h4>

                      {/* Description */}
                      <p style={{
                        fontSize: '14px',
                        color: 'var(--ik-text-3)',
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
                        borderTop: 'color-mix(in srgb, var(--ik-text) 10%, transparent) 1px solid',
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          color: 'var(--ik-text-3)',
                        }}>
                          <Icon name="timer" size={18} /> {chapter.duration}
                        </div>

                        {isCompleted && score && (
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: 'var(--ik-positive)',
                          }}> Score: {score}%
                          </div>
                        )}

                        {!isUnlocked && (
                          <div style={{
                            fontSize: '13px',
                            color: 'var(--ik-negative)',
                            fontWeight: '500',
                          }}> Complétez le chapitre {chapter.id - 1}
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
            borderTop: '2px solid color-mix(in srgb, var(--ik-text) 10%, transparent)',
          }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: 'var(--ik-text)',
              marginBottom: '24px',
              margin: '0 0 24px 0',
            }}> Quiz Final du Domaine
            </h2>

            <div
              style={{
                background: `linear-gradient(135deg, rgba(${parseInt(domain.color.slice(1,3), 16)}, ${parseInt(domain.color.slice(3,5), 16)}, ${parseInt(domain.color.slice(5,7), 16)}, 0.12) 0%, color-mix(in srgb, var(--ik-text) 4%, transparent) 100%)`,
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
                  color: 'var(--ik-text)',
                  margin: '0 0 12px 0',
                }}>
                  Testez Vos Connaissances
                </h3>
                <p style={{
                  fontSize: '16px',
                  color: 'var(--ik-text-2)',
                  margin: '0 0 16px 0',
                  lineHeight: '1.5',
                }}>
                  Passez le quiz final après avoir complété tous les chapitres pour obtenir le badge <strong>{domain.badge}</strong> du domaine !
                </p>
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  fontSize: '14px',
                  color: 'var(--ik-text-3)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <Icon name="clipboardList" size={18} /> {domain.finalQuiz.questions.length} questions
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}> Score requis: {domain.finalQuiz.passingScore}%
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
                    background: 'color-mix(in srgb, var(--ik-text) 15%, transparent)',
                    color: 'var(--ik-text-3)',
                    border: '1px solid color-mix(in srgb, var(--ik-text) 10%, transparent)',
                    padding: '16px 32px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'not-allowed',
                    whiteSpace: 'nowrap',
                  }}
                > Complétez tous les chapitres
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper></AppShell>
  );
}
