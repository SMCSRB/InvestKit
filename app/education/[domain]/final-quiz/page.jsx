'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { educationDomains } from '@/data/education';
import { useEducationProgress } from '@/app/context/EducationContext';
import PageWrapper from '@/app/components/PageWrapper';

export default function FinalQuizPage() {
  const router = useRouter();
  const params = useParams();
  const domainId = params.domain;
  const { completeDomain, isDomainCompleted, isLoading } = useEducationProgress();

  const domain = educationDomains.find((d) => d.id === domainId);
  const finalQuiz = domain?.finalQuiz;

  const [quizAnswers, setQuizAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  const [badgeUnlocked, setBadgeUnlocked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  if (isLoading || !domain || !finalQuiz) {
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

  const handleQuizAnswer = (questionId, answerIndex) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: answerIndex,
    }));
  };

  const handleSubmitQuiz = () => {
    const questions = finalQuiz.questions;
    let correctCount = 0;

    questions.forEach((q) => {
      const userAnswer = quizAnswers[q.id];
      if (userAnswer === q.correct) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    setQuizScore(score);

    if (score >= finalQuiz.passingScore) {
      completeDomain(domain.id, score, 500);
      setBadgeUnlocked(true);
    }

    setShowResults(true);
  };

  return (
    <PageWrapper animation="fade-in-up">
      <div className="min-h-screen pt-32 pb-20 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Link
            href={`/education/${domainId}`}
            className="text-blue-400 hover:text-blue-300 mb-8 inline-flex items-center gap-2"
          >
            ← Retour
          </Link>

          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-6xl">🏆</div>
              <div>
                <h1 className="text-4xl font-bold text-white">
                  Quiz Final - {domain.name}
                </h1>
                <p className="text-gray-400 mt-2">
                  Dernier test avant d'obtenir le badge {domain.badge} !
                </p>
              </div>
            </div>

            {!showResults && (
              <div
                className="p-4 rounded-lg mb-8"
                style={{
                  background: `${domain.color}15`,
                  borderLeft: `3px solid ${domain.color}`,
                }}
              >
                <p className="text-sm text-gray-300">
                  ⚠️ Vous devez obtenir au minimum{' '}
                  <span className="font-bold" style={{ color: domain.color }}>
                    {finalQuiz.passingScore}%
                  </span>{' '}
                  pour débloquer le badge et maîtriser ce domaine.
                </p>
              </div>
            )}
          </div>

          {!showResults ? (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50">
              <div className="space-y-8">
                {finalQuiz.questions.map((question, idx) => (
                  <div
                    key={question.id}
                    className="pb-8 border-b border-gray-700 last:border-b-0"
                  >
                    <h4 className="text-lg font-semibold text-white mb-4">
                      <span style={{ color: domain.color }}>Question {idx + 1}:</span>{' '}
                      {question.text}
                    </h4>

                    <div className="space-y-3">
                      {question.options.map((option, optionIdx) => (
                        <label
                          key={optionIdx}
                          className="flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-300"
                          style={{
                            borderColor:
                              quizAnswers[question.id] === optionIdx
                                ? domain.color
                                : 'rgba(107, 114, 128, 0.3)',
                            backgroundColor:
                              quizAnswers[question.id] === optionIdx
                                ? `${domain.color}15`
                                : 'transparent',
                          }}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={optionIdx}
                            checked={quizAnswers[question.id] === optionIdx}
                            onChange={() => handleQuizAnswer(question.id, optionIdx)}
                            className="mr-3"
                            style={{
                              accentColor: domain.color,
                            }}
                          />
                          <span className="text-gray-300">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <button
                  onClick={handleSubmitQuiz}
                  className="px-8 py-3 rounded-lg font-semibold transition-all duration-300 w-full"
                  style={{
                    background: `linear-gradient(135deg, ${domain.color}, ${domain.color}dd)`,
                    color: 'white',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  Soumettre et Obtenir le Badge 🏆
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-12 rounded-2xl border border-gray-700/50 text-center">
              {badgeUnlocked ? (
                <div className="animate-pulse">
                  <div className="text-9xl mb-8 inline-block" style={{
                    animation: 'bounce 2s infinite',
                  }}>
                    {domain.badge}
                  </div>

                  <h2 className="text-4xl font-bold text-white mb-4">
                    Félicitations !
                  </h2>

                  <p
                    className="text-2xl font-bold mb-8"
                    style={{
                      background: `linear-gradient(135deg, ${domain.color}, ${domain.color}dd)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Vous avez maîtrisé {domain.name} !
                  </p>

                  <p className="text-gray-400 mb-4">
                    Score: {quizScore}%
                  </p>

                  <div className="bg-slate-800 p-6 rounded-lg mb-8 max-w-md mx-auto">
                    <p className="text-gray-300 mb-3 font-semibold">Badge Déverrouillé</p>
                    <div className="text-6xl mb-3">{domain.badge}</div>
                    <p className="text-white font-bold">
                      Maître {domain.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      +500 XP gagnés
                    </p>
                  </div>

                  <p className="text-gray-400 mb-8">
                    Ce badge a été ajouté à votre profil et est visible sur votre tableau de bord !
                  </p>

                  <div className="flex gap-4 justify-center flex-wrap">
                    <Link href="/education">
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
                        Continuer l'Apprentissage →
                      </button>
                    </Link>

                    <Link href="/dashboard">
                      <button
                        className="px-8 py-3 rounded-lg font-semibold transition-all duration-300 border-2"
                        style={{
                          borderColor: domain.color,
                          color: domain.color,
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = `${domain.color}15`;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                        }}
                      >
                        Voir Dashboard
                      </button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-6xl mb-8" style={{ color: '#ef4444' }}>
                    ✗
                  </div>

                  <h2 className="text-3xl font-bold text-white mb-4">
                    Pas encore réussi
                  </h2>

                  <p className="text-gray-400 mb-8 text-lg">
                    Score: <span className="font-bold">{quizScore}%</span>
                  </p>

                  <p className="text-gray-400 mb-8">
                    Vous avez besoin d'au minimum {finalQuiz.passingScore}% pour débloquer
                    le badge. Réessayez !
                  </p>

                  <button
                    onClick={() => {
                      setShowResults(false);
                      setQuizAnswers({});
                      setQuizScore(null);
                    }}
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
                    🔄 Réessayer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </PageWrapper>
  );
}
