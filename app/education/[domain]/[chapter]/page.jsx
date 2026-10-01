'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { educationDomains } from '@/data/education';
import { glossaryById } from '@/app/lib/glossaire';
import { useEducationProgress } from '@/app/context/EducationContext';
import PageWrapper from '@/app/components/PageWrapper';
import AppShell from '@/app/components/shell/AppShell';

// Affichage minimal du texte des chapitres (titres, listes, gras) : tout est rendu comme du TEXTE, jamais comme du HTML.
const inline = (t) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <strong key={i} style={{ color: 'var(--ik-text)' }}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>));

function Lesson({ text }) {
  const blocks = [];
  let list = [];
  const flush = () => { if (list.length) { blocks.push(<ul key={`l${blocks.length}`} style={{ margin: '6px 0 14px 20px', color: 'var(--ik-text-2)', lineHeight: 1.7 }}>{list.map((x, i) => <li key={i}>{inline(x)}</li>)}</ul>); list = []; } };
  text.split('\n').forEach((line) => {
    if (/^- /.test(line)) { list.push(line.slice(2)); return; }
    flush();
    if (/^### /.test(line)) blocks.push(<h4 key={blocks.length} style={{ color: 'var(--ik-accent)', margin: '14px 0 4px', fontSize: 16 }}>{line.slice(4)}</h4>);
    else if (/^## /.test(line)) blocks.push(<h3 key={blocks.length} style={{ color: 'var(--ik-accent)', margin: '22px 0 6px', fontSize: 20 }}>{line.slice(3)}</h3>);
    else if (/^# /.test(line)) return;     // le titre est déjà affiché par la page
    else if (line.trim()) blocks.push(<p key={blocks.length} style={{ color: 'var(--ik-text-2)', lineHeight: 1.7, margin: '6px 0' }}>{inline(line)}</p>);
  });
  flush();
  return <>{blocks}</>;
}

export default function ChapterPage() {
  const router = useRouter();
  const params = useParams();
  const domainId = params?.domain;
  const chapterId = params?.chapter ? parseInt(params.chapter, 10) : null;
  const { isLoading, completeChapter } = useEducationProgress();
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const domain = domainId ? educationDomains.find((d) => d.id === domainId) : null;
  const chapter = domain && chapterId ? domain.chapters.find((c) => c.id === chapterId) : null;
  const next = useMemo(() => (domain && chapter ? domain.chapters.find((c) => c.id === chapter.id + 1) : null), [domain, chapter]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token') && !localStorage.getItem('authToken')) router.push('/login');
  }, [router]);

  if (isLoading) return <AppShell><PageWrapper><div>Chargement...</div></PageWrapper></AppShell>;
  if (!domain || !chapter) return <AppShell><PageWrapper><div>Données manquantes</div></PageWrapper></AppShell>;

  const quiz = chapter.quiz;
  const submit = () => {
    const qs = quiz.questions;
    const good = qs.filter((q) => answers[q.id] === q.correct).length;
    const score = Math.round((good / qs.length) * 100);
    const passed = score >= quiz.passingScore;
    if (passed) completeChapter(domain.id, chapter.id, score, 100);
    setResult({ score, passed });
  };
  const box = { background: 'var(--ik-surface-2)', border: '1px solid color-mix(in srgb, var(--ik-text) 12%, transparent)', borderRadius: 14, padding: 20, marginBottom: 20 };

  return (
    <AppShell><PageWrapper>
      <div className="pb-12 px-6">
        <div className="max-w-4xl mx-auto" data-testid="chapter">
          <Link href={`/education/${domainId}`} className="text-blue-400 hover:text-blue-300">← Retour au parcours</Link>
          <h1 className="text-4xl font-bold text-white mb-2 mt-4">{chapter.title}</h1>
          <p className="text-gray-400 mb-6">{chapter.description} · ⏱️ {chapter.duration}</p>

          <div style={box}><Lesson text={chapter.content} /></div>

          {chapter.vocabulary?.length > 0 && (
            <div style={box}>
              <h2 className="text-2xl font-bold text-white mb-3">Mots à retenir</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                {chapter.vocabulary.map((v) => (
                  <li key={v.term} style={{ color: 'var(--ik-text-2)' }}>
                    <strong style={{ color: 'var(--ik-text)' }}>{v.term}</strong> — {v.definition}
                    {v.glossaryId && glossaryById[v.glossaryId] && <> · <Link href={`/glossaire#${v.glossaryId}`} style={{ color: 'var(--ik-accent)', fontSize: 13 }}>explication complète →</Link></>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={box} data-testid="chapter-quiz">
            <h2 className="text-2xl font-bold text-white mb-1">Quiz</h2>
            <p style={{ color: 'var(--ik-text-3)', fontSize: 14, marginTop: 0 }}>Il faut au moins {quiz.passingScore} % de bonnes réponses ; la première réussite de chaque chapitre rapporte des 🪙.</p>
            {quiz.questions.map((q) => (
              <fieldset key={q.id} style={{ border: 'none', padding: 0, margin: '0 0 18px' }}>
                <legend style={{ color: 'var(--ik-text)', fontWeight: 700, marginBottom: 6 }}>{q.id}. {q.text}</legend>
                {q.options.map((o, i) => {
                  const shown = result !== null;
                  const right = shown && i === q.correct;
                  const wrong = shown && answers[q.id] === i && i !== q.correct;
                  return (
                    <label key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 8px', borderRadius: 8, cursor: shown ? 'default' : 'pointer', color: 'var(--ik-text-2)', background: right ? 'color-mix(in srgb, var(--ik-positive) 15%, transparent)' : wrong ? 'color-mix(in srgb, var(--ik-negative) 15%, transparent)' : 'transparent' }}>
                      <input type="radio" name={`q${q.id}`} disabled={shown} checked={answers[q.id] === i} onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))} style={{ marginTop: 4 }} />
                      <span>{o}</span>
                    </label>
                  );
                })}
                {result !== null && <div style={{ color: 'var(--ik-warning)', fontSize: 13, margin: '4px 0 0 8px' }}>💡 {q.explanation}</div>}
              </fieldset>
            ))}
            {result === null ? (
              <button data-testid="quiz-submit" onClick={submit} disabled={Object.keys(answers).length < quiz.questions.length}
                style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--ik-primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: Object.keys(answers).length < quiz.questions.length ? 0.5 : 1 }}>Valider mes réponses</button>
            ) : (
              <div data-testid="quiz-result">
                <p style={{ color: result.passed ? 'var(--ik-positive)' : 'var(--ik-negative)', fontWeight: 800, fontSize: 18 }}>{result.passed ? `Réussi : ${result.score} % 🎉` : `${result.score} % : il faut ${quiz.passingScore} % pour valider. Relis le chapitre et réessaie.`}</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {!result.passed && <button onClick={() => { setAnswers({}); setResult(null); }} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--ik-primary) 60%, transparent)', background: 'color-mix(in srgb, var(--ik-primary) 15%, transparent)', color: 'var(--ik-text)', fontWeight: 700, cursor: 'pointer' }}>Réessayer</button>}
                  {result.passed && next && <Link href={`/education/${domainId}/${next.id}`} className="text-blue-400 hover:text-blue-300" style={{ alignSelf: 'center' }}>Chapitre suivant →</Link>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper></AppShell>
  );
}
