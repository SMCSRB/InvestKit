'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { educationDomains } from '@/data/education';
import { glossaryById } from '@/app/lib/glossaire';
import { shuffleOptions } from '@/app/lib/quiz';
import { useEducationProgress } from '@/app/context/EducationContext';
import PageWrapper from '@/app/components/PageWrapper';
import AppShell from '@/app/components/shell/AppShell';
import Coin from '@/app/components/ui/Coin';
import Icon from '@/app/components/ui/Icon';

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
  const { isLoading, submitQuiz } = useEducationProgress();
  const [answers, setAnswers] = useState({});          // { idQuestion: identifiant de l'option choisie }
  const [result, setResult] = useState(null);          // réponse du SERVEUR (score, réussite, bonnes réponses si réussi)
  const [orders, setOrders] = useState(null);          // ordre des options mélangé (calculé dans le navigateur, une fois monté)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const domain = domainId ? educationDomains.find((d) => d.id === domainId) : null;
  const chapter = domain && chapterId ? domain.chapters.find((c) => c.id === chapterId) : null;
  const next = useMemo(() => (domain && chapter ? domain.chapters.find((c) => c.id === chapter.id + 1) : null), [domain, chapter]);

  // Ordre des réponses mélangé à chaque ouverture et à chaque nouvelle tentative (jamais « la bonne est toujours la première »).
  useEffect(() => {
    if (domain && chapter && orders === null) setOrders(shuffleOptions(domain.id, chapter.id, chapter.quiz.questions));
  }, [domain, chapter, orders]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token') && !localStorage.getItem('authToken')) router.push('/login');
  }, [router]);

  if (isLoading) return <AppShell><PageWrapper><div>Chargement...</div></PageWrapper></AppShell>;
  if (!domain || !chapter) return <AppShell><PageWrapper><div>Données manquantes</div></PageWrapper></AppShell>;

  const quiz = chapter.quiz;
  // Le navigateur ne corrige pas : il envoie les identifiants choisis, le serveur répond.
  const submit = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { setResult(await submitQuiz(domain.id, chapter.id, answers)); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };
  const retry = () => { setAnswers({}); setResult(null); setError(''); setOrders(null); };
  const box = { background: 'var(--ik-surface-2)', border: '1px solid color-mix(in srgb, var(--ik-text) 12%, transparent)', borderRadius: 14, padding: 20, marginBottom: 20 };

  return (
    <AppShell><PageWrapper>
      <div className="pb-12 px-6">
        <div className="max-w-4xl mx-auto" data-testid="chapter">
          <Link href={`/education/${domainId}`} className="text-blue-400 hover:text-blue-300">← Retour au parcours</Link>
          <h1 className="text-4xl font-bold text-white mb-2 mt-4">{chapter.title}</h1>
          <p className="text-gray-400 mb-6">{chapter.description} ·{chapter.duration}</p>

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
            <p style={{ color: 'var(--ik-text-3)', fontSize: 14, marginTop: 0 }}>Il faut au moins {quiz.passingScore} % de bonnes réponses ; la première réussite de chaque chapitre rapporte des <Coin />.</p>
            {orders === null ? <p style={{ color: 'var(--ik-text-3)' }}>Préparation du quiz…</p> : quiz.questions.map((q) => {
              const r = result?.results?.find((x) => x.questionId === String(q.id));
              return (
              <fieldset key={q.id} style={{ border: 'none', padding: 0, margin: '0 0 18px' }}>
                <legend style={{ color: 'var(--ik-text)', fontWeight: 700, marginBottom: 6 }}>{q.id}. {q.text}</legend>
                {orders[q.id].map((o) => {
                  const shown = result !== null;
                  const right = shown && result.passed && o.id === r?.correctOptionId;
                  const wrong = shown && answers[q.id] === o.id && r && !r.correct;
                  return (
                    <label key={o.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 8px', borderRadius: 8, cursor: shown ? 'default' : 'pointer', color: 'var(--ik-text-2)', background: right ? 'color-mix(in srgb, var(--ik-positive) 15%, transparent)' : wrong ? 'color-mix(in srgb, var(--ik-negative) 15%, transparent)' : 'transparent' }}>
                      <input type="radio" name={`q${q.id}`} value={o.id} disabled={shown || busy} checked={answers[q.id] === o.id} onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))} style={{ marginTop: 4 }} />
                      <span>{o.text}</span>
                    </label>
                  );
                })}
                {result?.passed && <div style={{ color: 'var(--ik-warning)', fontSize: 13, margin: '4px 0 0 8px' }}><Icon name="lightbulb" size={18} /> {q.explanation}</div>}
                {result && !result.passed && r && !r.correct && <div style={{ color: 'var(--ik-negative)', fontSize: 13, margin: '4px 0 0 8px' }}>À revoir dans le chapitre.</div>}
              </fieldset>
              );
            })}
            {error && <p role="alert" style={{ color: 'var(--ik-negative)', fontWeight: 600 }}>{error}</p>}
            {result === null ? (
              <button data-testid="quiz-submit" onClick={submit} disabled={busy || orders === null || Object.keys(answers).length < quiz.questions.length}
                style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--ik-primary)', color: 'var(--ik-text-on-primary)', fontWeight: 700, cursor: 'pointer', opacity: busy || Object.keys(answers).length < quiz.questions.length ? 0.5 : 1 }}>{busy ? 'Correction…' : 'Valider mes réponses'}</button>
            ) : (
              <div data-testid="quiz-result">
                <p style={{ color: result.passed ? 'var(--ik-positive)' : 'var(--ik-negative)', fontWeight: 800, fontSize: 18 }}>{result.passed ? `Réussi : ${result.score} % ${result.rewarded ? ` · +${result.coinsEarned} InvestCoins` : ''}` : `${result.score} % : il faut ${result.passingScore} % pour valider. Relis le chapitre et réessaie.`}</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {!result.passed && <button onClick={retry} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--ik-primary) 60%, transparent)', background: 'color-mix(in srgb, var(--ik-primary) 15%, transparent)', color: 'var(--ik-text)', fontWeight: 700, cursor: 'pointer' }}>Réessayer</button>}
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
