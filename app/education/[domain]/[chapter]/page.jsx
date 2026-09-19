'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { educationDomains } from '@/data/education';
import { useEducationProgress } from '@/app/context/EducationContext';
import PageWrapper from '@/app/components/PageWrapper';

export default function ChapterPage() {
  const router = useRouter();
  const params = useParams();
  const domainId = params.domain;
  const chapterId = parseInt(params.chapter);
  const { completeChapter, isChapterUnlocked, getChapterScore, isLoading } =
    useEducationProgress();

  const domain = educationDomains.find((d) => d.id === domainId);
  const chapter = domain?.chapters.find((c) => c.id === chapterId);
  const isUnlocked = isChapterUnlocked(domain?.id, chapterId);

  const [showLesson, setShowLesson] = useState(true);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [quizScore, setQuizScore] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
    }

    if (!isLoading && !isUnlocked) {
      router.push(`/education/${domainId}`);
    }
  }, [router, isLoading, isUnlocked, domainId]);

  if (isLoading || !domain || !chapter) {
    return (
      <PageWrapper>
        <div className="min-h-screen pt-32 pb-20 px-6">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-700 rounded w-64 mb-4" />
            <div className="h-6 bg-gray-700 rounded w-96" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!isUnlocked) {
    return (
      <PageWrapper>
        <div className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">
              Ce chapitre est verrouillé
            </h1>
            <p className="text-gray-400 mb-6">
              Complétez le chapitre précédent avec une note d'au moins 75%
            </p>
            <Link
              href={`/education/${domainId}`}
              className="text-blue-400 hover:text-blue-300"
            >
              ← Retour aux chapitres
            </Link>
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
    const questions = chapter.quiz.questions;
    let correctCount = 0;

    questions.forEach((q) => {
      const userAnswer = quizAnswers[q.id];
      if (userAnswer === q.correct) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    setQuizScore(score);

    if (score >= chapter.quiz.passingScore) {
      completeChapter(domain.id, chapter.id, score);
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

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">{domain.icon}</div>
              <div>
                <h1 className="text-4xl font-bold text-white">
                  {chapter.title}
                </h1>
                <p className="text-gray-400 mt-1">{chapter.description}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>⏱️ {chapter.duration}</span>
              <span>📚 Chapitre {chapter.id} sur {domain.chapters.length}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-gray-700">
            <button
              onClick={() => setShowLesson(true)}
              className={`px-6 py-3 font-semibold transition-all duration-300 ${
                showLesson
                  ? 'text-white border-b-2'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              style={{
                borderColor: showLesson ? domain.color : 'transparent',
              }}
            >
              📖 Leçon
            </button>
            <button
              onClick={() => setShowLesson(false)}
              className={`px-6 py-3 font-semibold transition-all duration-300 ${
                !showLesson
                  ? 'text-white border-b-2'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              style={{
                borderColor: !showLesson ? domain.color : 'transparent',
              }}
            >
              🎯 Quiz ({chapter.quiz.questions.length} questions)
            </button>
          </div>

          {/* Leçon */}
          {showLesson && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50 mb-8">
              <div className="prose prose-invert max-w-none">
                <div
                  dangerouslySetInnerHTML={{
                    __html: chapter.content
                      .replace(/^# /gm, '<h1 class="text-3xl font-bold mt-8 mb-4 text-white">')
                      .replace(/^## /gm, '<h2 class="text-2xl font-bold mt-6 mb-3 text-white">')
                      .replace(/^### /gm, '<h3 class="text-xl font-semibold mt-4 mb-2 text-white">')
                      .replace(/\n/g, '</p><p>')
                      .replace(/<p><\/p>/g, '')
                      .replace(/<p>/g, '<p class="text-gray-300 leading-relaxed mb-4">')
                      .replace(/- /gm, '<li class="ml-6 text-gray-300 mb-2">•</li>')
                      .replace(/```\n/g, '<pre class="bg-slate-800 p-4 rounded mb-4 overflow-x-auto"><code class="text-sm text-green-400">')
                      .replace(/```/g, '</code></pre>')
                      .replace(/\*\*/g, '<strong class="font-bold">')
                      .replace(/_/g, '<em class="italic">'),
                  }}
                  className="text-gray-300"
                />
              </div>

              {/* Vocabulaire */}
              <div className="mt-12 pt-8 border-t border-gray-700">
                <h3 className="text-2xl font-bold text-white mb-6">📚 Vocabulaire du Chapitre</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {chapter.vocabulary.map((vocab, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-slate-800/50 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300"
                      style={{
                        borderLeft: `3px solid ${domain.color}`,
                      }}
                    >
                      <div className="font-semibold text-white mb-1">
                        {vocab.term}
                      </div>
                      <div className="text-sm text-gray-400">
                        {vocab.definition}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="mt-12 flex gap-4">
                <button
                  onClick={() => setShowLesson(false)}
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
                  Continuer vers le Quiz →
                </button>
              </div>
            </div>
          )}

          {/* Quiz */}
          {!showLesson && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-gray-700/50">
              {!showResults ? (
                <>
                  <div className="mb-8 pb-6 border-b border-gray-700">
                    <p className="text-gray-400">
                      Vous devez obtenir au minimum{' '}
                      <span className="font-bold" style={{ color: domain.color }}>
                        {chapter.quiz.passingScore}%
                      </span>{' '}
                      pour débloquer le prochain chapitre.
                    </p>
                  </div>

                  <div className="space-y-8">
                    {chapter.quiz.questions.map((question, idx) => (
                      <div key={question.id} className="pb-8 border-b border-gray-700 last:border-b-0">
                        <h4 className="text-lg font-semibold text-white mb-4">
                          <span style={{ color: domain.color }}>Question {idx + 1}:</span> {question.text}
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

                  <div className="mt-8 flex gap-4">
                    <button
                      onClick={handleSubmitQuiz}
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
                      Soumettre le Quiz
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div
                    className="text-6xl mb-6"
                    style={{
                      color:
                        quizScore >= chapter.quiz.passingScore
                          ? '#10b981'
                          : '#ef4444',
                    }}
                  >
                    {quizScore >= chapter.quiz.passingScore ? '✓' : '✗'}
                  </div>

                  <h3 className="text-3xl font-bold text-white mb-2">
                    Score: {quizScore}%
                  </h3>

                  <p className="text-gray-400 mb-8">
                    {quizScore >= chapter.quiz.passingScore
                      ? `Excellent ! Vous avez réussi ce chapitre ! Le prochain chapitre est maintenant déverrouillé.`
                      : `Vous n'avez pas atteint ${chapter.quiz.passingScore}%. Réessayez pour continuer.`}
                  </p>

                  <div className="flex gap-4 justify-center">
                    {quizScore >= chapter.quiz.passingScore ? (
                      <>
                        <Link href={`/education/${domainId}`}>
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
                            Retour aux chapitres →
                          </button>
                        </Link>
                      </>
                    ) : (
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
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
