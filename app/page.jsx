'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      {/* HEADER/NAV - À créer comme composant séparé */}
      <header>
        <nav className="navbar">
          <div className="logo">InvestKit</div>
          <div className="nav-links">
            <Link href="/outils">Outils</Link>
            <Link href="/education">Éducation</Link>
            <Link href="/login">Connexion</Link>
            <Link href="/signup" className="btn btn-primary">S'inscrire</Link>
          </div>
        </nav>
      </header>

      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-logo">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" fill="var(--primary)" opacity="0.1" />
              <path d="M30 60 L50 30 L70 55" stroke="var(--primary)" strokeWidth="3" fill="none" strokeLinecap="round" />
              <circle cx="50" cy="30" r="5" fill="var(--primary)" />
            </svg>
          </div>

          <h1>Investissez Intelligemment</h1>

          <p className="subtitle">
            Simulateurs pro • Analyses de risque • Éducation gamifiée <br />
            Tout ce qu'il vous faut pour maîtriser l'investissement
          </p>

          <div className="hero-buttons">
            <Link href="/outils" className="btn btn-primary">
              🚀 Essayer les Outils
            </Link>
            <Link href="/education" className="btn btn-secondary">
              📚 Découvrir l'Éducation
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION - À compléter */}
      <section className="features">
        <div className="container">
          <h2>Pourquoi Choisir InvestKit ?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💡</div>
              <h3>Outils Puissants</h3>
              <p>Simulateurs avancés pour tous les marchés (immobilier, crypto, bourse, etc.)</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3>Analyse de Risque</h3>
              <p>Évaluez automatiquement les risques de vos projets d'investissement</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎓</div>
              <h3>Éducation Gamifiée</h3>
              <p>Apprenez à votre rythme avec des cours, quiz et système de niveaux</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Données Temps Réel</h3>
              <p>Analyses basées sur les données économiques actualisées</p>
            </div>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">10K+</div>
              <div className="stat-label">Utilisateurs</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50+</div>
              <div className="stat-label">Simulateurs</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">100%</div>
              <div className="stat-label">Sécurisé</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="cta">
        <div className="container">
          <h2>Commencez à Investir Dès Maintenant</h2>
          <p>Rejoignez nos utilisateurs et commencez vos projections d'investissement gratuitement. Aucune carte bancaire requise.</p>
          <Link href="/outils" className="btn btn-primary">
            🚀 Essayer Gratuitement
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div>
              <h4>Produit</h4>
              <ul style={{ listStyle: 'none' }}>
                <li><Link href="/outils">Simulateurs</Link></li>
                <li><Link href="/glossaire">Glossaire</Link></li>
                <li><Link href="/quiz">Quiz</Link></li>
                <li><Link href="/pricing">Tarifs</Link></li>
              </ul>
            </div>
            <div>
              <h4>Éducation</h4>
              <ul style={{ listStyle: 'none' }}>
                <li><Link href="/guides">Guides</Link></li>
                <li><Link href="/faq">FAQ</Link></li>
                <li><Link href="/support">Support</Link></li>
                <li><Link href="/blog">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4>Entreprise</h4>
              <ul style={{ listStyle: 'none' }}>
                <li><Link href="/about">À Propos</Link></li>
                <li><Link href="/careers">Carrières</Link></li>
                <li><Link href="/contact">Contact</Link></li>
                <li><Link href="/press">Presse</Link></li>
              </ul>
            </div>
            <div>
              <h4>Légal</h4>
              <ul style={{ listStyle: 'none' }}>
                <li><Link href="/terms">CGU</Link></li>
                <li><Link href="/privacy">Confidentialité</Link></li>
                <li><Link href="/cookies">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 InvestKit. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
