'use client';

export default function ConditionsPage() {
  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px', lineHeight: '1.6', color: '#333' }}>
      <h1>Conditions d'Utilisation</h1>
      <p style={{ color: '#999', fontSize: '14px', marginBottom: '20px' }}>Dernière mise à jour : 2026-09-19</p>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>1. Acceptation des Conditions</h2>
        <p>
          En accédant et en utilisant InvestKit, vous acceptez d'être lié par ces conditions d'utilisation.
          Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser ce service.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>2. Licence d'Utilisation</h2>
        <p>
          InvestKit vous accorde une licence limitée, non-exclusive et révocable pour utiliser ce service
          à des fins personnelles et non-commerciales.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>3. Restrictions d'Utilisation</h2>
        <p>Vous ne pouvez pas :</p>
        <ul style={{ marginLeft: '20px' }}>
          <li>Utiliser le service de manière illégale ou non autorisée</li>
          <li>Modifier, adapter ou hacker le service</li>
          <li>Vendre, louer ou transférer l'accès au service</li>
          <li>Héberger, afficher, uploader ou télécharger le contenu sans permission</li>
          <li>Utiliser des outils automatisés ou des scripts</li>
        </ul>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>4. Contenu Utilisateur</h2>
        <p>
          Vous êtes responsable de tout contenu que vous fournissez ou téléchargez.
          Vous accordez à InvestKit le droit d'utiliser ce contenu pour améliorer le service.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>5. Disclaimer</h2>
        <p>
          InvestKit fournit des outils de simulation et d'éducation à titre informatif uniquement.
          Les informations ne constituent pas des conseils financiers professionnels.
          Consultez toujours un professionnel avant de prendre des décisions d'investissement.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>6. Limitation de Responsabilité</h2>
        <p>
          InvestKit et ses propriétaires ne seront pas responsables des dommages indirects,
          accidentels ou consécutifs résultant de votre utilisation du service.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>7. Modifications</h2>
        <p>
          InvestKit se réserve le droit de modifier ces conditions à tout moment.
          Les modifications seront effectives dès leur publication.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>8. Contact</h2>
        <p>
          Pour toute question concernant ces conditions, veuillez nous contacter à :
          <a href="mailto:contact@investkit.com" style={{ color: '#ff6b6b', textDecoration: 'none' }}> contact@investkit.com</a>
        </p>
      </section>

      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
        <a href="/signup" style={{ color: '#ff6b6b', textDecoration: 'none', fontSize: '14px' }}>← Retour à l'inscription</a>
      </div>
    </div>
  );
}
