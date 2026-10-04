'use client';

import Link from 'next/link';
import { PageHeader } from '@/app/components/shell/AppShell';
import { Card } from '@/app/components/ui/primitives';
import Icon from '@/app/components/ui/Icon';
import { TourChecklist } from '@/app/components/tour/TourChecklist';

const item = { display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 };

// Aide et support : « Mon parcours de découverte » (relancer / reprendre la visite guidée), glossaire, cours et contact. Aucune règle n'est répétée ici.
export default function SupportContent() {
  return (
    <>
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 16, minWidth: 0 }}>
        <PageHeader title="Aide et support" subtitle="Tu es perdu ? Commence ici." />
        <Card>
          <div style={item}>
            <Icon name="sparkles" size={24} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 'var(--ik-fs-lg)' }}>Mon parcours de découverte</h2>
              <p style={{ margin: '0 0 12px' }}>Une visite guidée qui t&apos;emmène sur les vraies pages du site et te montre chaque bouton. Tu peux la quitter, la reprendre ou la refaire quand tu veux. Sur chaque page, le bouton « ? Guide de cette page » lance une visite de quelques étapes.</p>
              <TourChecklist />
            </div>
          </div>
        </Card>
        <Card>
          <div style={item}>
            <Icon name="book" size={24} />
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: 'var(--ik-fs-lg)' }}>Comprendre un mot, apprendre un domaine</h2>
              <p style={{ margin: '0 0 10px' }}>Le glossaire explique chaque terme technique ; les cours et leurs quiz t&apos;apprennent chaque domaine.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Link href="/glossaire" className="ik-btn ik-btn--sm">Glossaire</Link>
                <Link href="/education" className="ik-btn ik-btn--sm">Cours et quiz</Link>
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div style={item}>
            <Icon name="mail" size={24} />
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: 'var(--ik-fs-lg)' }}>Un bug, une idée, un avis ?</h2>
              <p style={{ margin: '0 0 10px' }}>Le site est en bêta. Utilise le bouton « Un retour ? » en bas à droite de l&apos;écran, ou écris-nous.</p>
              <Link href="/contact" className="ik-btn ik-btn--sm">Nous contacter</Link>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
