'use client';

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px', lineHeight: '1.6', color: '#333' }}>
      <h1>Politique de Confidentialité</h1>
      <p style={{ color: '#999', fontSize: '14px', marginBottom: '20px' }}>Dernière mise à jour : 2026-09-19</p>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>1. Introduction</h2>
        <p>
          InvestKit ("nous", "notre" ou "nos") s'engage à protéger votre vie privée.
          Cette politique explique comment nous collectons, utilisons et protégeons vos données personnelles.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>2. Données Collectées</h2>
        <p>Nous collectons les informations suivantes :</p>
        <ul style={{ marginLeft: '20px' }}>
          <li><strong>Informations d'inscription :</strong> Email, nom, prénom, mot de passe</li>
          <li><strong>Données de profil :</strong> Préférences, historique d'utilisation, projets d'investissement</li>
          <li><strong>Données techniques :</strong> Adresse IP, type de navigateur, pages visitées, durée des sessions</li>
          <li><strong>Données de paiement :</strong> Informations de transaction (traitées de manière sécurisée)</li>
        </ul>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>3. Utilisation des Données</h2>
        <p>Nous utilisons vos données pour :</p>
        <ul style={{ marginLeft: '20px' }}>
          <li>Créer et gérer votre compte</li>
          <li>Fournir et améliorer nos services</li>
          <li>Communiquer avec vous concernant votre compte et les mises à jour</li>
          <li>Analyser l'utilisation et améliorer l'expérience utilisateur</li>
          <li>Respecter nos obligations légales</li>
        </ul>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>4. Protection des Données</h2>
        <p>
          Nous utilisons le chiffrement SSL/TLS pour protéger vos données en transit.
          Vos mots de passe sont hashés avec bcrypt. Nous ne partageons jamais vos données sensibles
          avec des tiers sans votre consentement explicite.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>5. Cookies et Suivi</h2>
        <p>
          Nous utilisons les cookies pour :</p>
        <ul style={{ marginLeft: '20px' }}>
          <li>Maintenir votre session authentifiée</li>
          <li>Mémoriser vos préférences</li>
          <li>Analyser le trafic du site (outils anonymisés)</li>
        </ul>
        <p>Vous pouvez désactiver les cookies dans les paramètres de votre navigateur.</p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>6. Vos Droits</h2>
        <p>Vous avez le droit de :</p>
        <ul style={{ marginLeft: '20px' }}>
          <li>Accéder à vos données personnelles</li>
          <li>Rectifier les informations inexactes</li>
          <li>Demander la suppression de vos données</li>
          <li>Vous opposer au traitement de vos données</li>
          <li>Demander la portabilité de vos données</li>
        </ul>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>7. Partage de Données</h2>
        <p>
          Nous ne vendons jamais vos données. Nous partageons vos informations uniquement avec :
        </p>
        <ul style={{ marginLeft: '20px' }}>
          <li>Les prestataires de services (hébergement, email, paiement) sous contrats stricts</li>
          <li>Les autorités légales si requis par la loi</li>
          <li>Vos contacts si vous le demandez explicitement</li>
        </ul>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>8. Conservation des Données</h2>
        <p>
          Nous conservons vos données aussi longtemps que votre compte est actif.
          Après la suppression du compte, nous conservons les données minimum requises par la loi pendant 90 jours,
          puis nous les supprimons définitivement.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>9. Modifications</h2>
        <p>
          Nous pouvons modifier cette politique de confidentialité. Les modifications seront publiées ici
          et nous vous notifierons des changements majeurs par email.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>10. Contact</h2>
        <p>
          Pour toute question concernant cette politique ou vos données, contactez-nous :
        </p>
        <p>
          Email : <a href="mailto:privacy@investkit.com" style={{ color: '#ff6b6b', textDecoration: 'none' }}>privacy@investkit.com</a>
        </p>
      </section>

      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
        <a href="/signup" style={{ color: '#ff6b6b', textDecoration: 'none', fontSize: '14px' }}>← Retour à l'inscription</a>
      </div>
    </div>
  );
}
