import PublicShell from '@/app/components/landing/PublicShell';
import HeroPreview from '@/app/components/landing/HeroPreview';
import { DomainStrip, Domains, Education, Facts, Faq, Features, FinalCta, HeroActions, HeroDomains, HowItWorks, InviteNote, Pricing, Trust } from '@/app/components/landing/LandingSections';
import Icon from '@/app/components/ui/Icon';
import { Reveal } from '@/app/components/ui/motion';
import TiltScope from '@/app/components/landing/TiltScope';
import { AVAILABLE_DOMAINS, countWord } from '@/app/lib/siteFacts';

const SEO_OPEN = process.env.NEXT_PUBLIC_SEO_ENABLED === 'true';

export const metadata = {
  title: 'InvestKit : apprends à investir sans risque',
  description: 'Simulateur d\'investissement et éducation financière : immobilier, crypto, Bourse et PEA, avec une monnaie virtuelle. Aucun argent réel.',
  // Référencement fermé tant que NEXT_PUBLIC_SEO_ENABLED n'est pas « true » (voir app/robots.js).
  robots: SEO_OPEN ? undefined : { index: false, follow: false },
};

const Head = ({ eyebrow, title, lead, center = true }) => (
  <Reveal className={center ? 'lp-center' : ''}>
    <span className="lp-eyebrow">{eyebrow}</span>
    <h2 className="lp-h2">{title}</h2>
    {lead && <p className="lp-lead">{lead}</p>}
  </Reveal>
);

export default function HomePage() {
  return (
    <PublicShell>
      <TiltScope />
      <section className="lp-hero" aria-labelledby="lp-title">
        <span className="lp-glow" style={{ left: '-160px', top: '-120px' }} aria-hidden="true" />
        <span className="lp-glow" style={{ right: '-200px', top: '80px', opacity: 0.35 }} aria-hidden="true" />
        <div className="lp-wrap lp-hero__grid">
          <div>
            <span className="lp-eyebrow"><Icon name="shield" size={14} />Simulation pédagogique · aucun argent réel</span>
            <h1 id="lp-title">Apprends à investir, <span className="lp-grad">sans risquer un centime.</span></h1>
            <p className="lp-hero__sub">
              Entraîne-toi à l&apos;immobilier, à la crypto et à la Bourse avec les InvestCoins, une monnaie virtuelle. Crédits, impôts, krachs, loyers impayés : les règles s&apos;inspirent de la vraie vie, en version simplifiée, et les pertes restent virtuelles.
            </p>
            <HeroDomains />
            <HeroActions />
            <InviteNote />
          </div>
          <HeroPreview />
        </div>
      </section>

      <section className="lp-wrap" aria-label="Domaines disponibles"><DomainStrip /></section>

      <section className="lp-wrap" style={{ marginTop: 28 }} aria-label="Chiffres clés"><Facts /></section>

      <section className="lp-section" id="comment">
        <div className="lp-wrap">
          <Head eyebrow="C'est quoi InvestKit ?" title="Un terrain d'entraînement, pas un casino." lead="Tu joues avec une monnaie virtuelle, mais avec les mécanismes réels : crédit, frais, fiscalité, événements de marché. Et tu apprends à chaque étape." />
          <HowItWorks />
        </div>
      </section>

      <section className="lp-section" id="domaines">
        <div className="lp-wrap">
          <Head eyebrow="Les domaines" title={`${countWord(AVAILABLE_DOMAINS.length).replace(/^./, (c) => c.toUpperCase())} domaines ouverts, d'autres en route.`} lead="Choisis ton domaine gratuit, ou ouvre-les tous avec le plan Pro. Chaque domaine a ses propres règles et son propre calendrier." />
          <Domains />
        </div>
      </section>

      <section className="lp-section" id="fonctionnalites">
        <div className="lp-wrap">
          <Head eyebrow="Fonctionnalités" title="De vrais outils, pour de vraies notions." lead="Des outils de niveau professionnel, pensés pour qu'un débutant comprenne ce qu'il voit." />
          <Features />
        </div>
      </section>

      <section className="lp-section" id="education">
        <div className="lp-wrap"><Education /></div>
      </section>

      <section className="lp-section" id="confiance">
        <div className="lp-wrap">
          <Head eyebrow="Sécurité et confiance" title="Clair sur ce qui est simulé, rigoureux sur ce qui est réel." lead="Pas de faux chiffres d'utilisateurs, pas de promesse de gains : seulement ce que le site fait vraiment." />
          <Trust />
        </div>
      </section>

      <section className="lp-section" id="tarifs">
        <div className="lp-wrap">
          <Head eyebrow="Tarifs" title="Gratuit pour apprendre, Pro pour tout simuler." lead="Les prix et avantages ci-dessous sont les mêmes que dans ton compte." />
          <Pricing />
        </div>
      </section>

      <section className="lp-section" id="faq">
        <div className="lp-wrap">
          <Head eyebrow="FAQ" title="Les questions qu'on nous pose." />
          <Faq />
        </div>
      </section>

      <section className="lp-wrap" style={{ marginTop: 24 }}><FinalCta /></section>
    </PublicShell>
  );
}
