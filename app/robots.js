// Tant que NEXT_PUBLIC_SEO_ENABLED n'est pas "true", le site demande aux moteurs
// de recherche de ne RIEN indexer (phase d'invitation, pages légales à valider).
export default function robots() {
  const enabled = process.env.NEXT_PUBLIC_SEO_ENABLED === 'true';
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  if (!enabled) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/profile', '/mes-donnees', '/banque', '/immobilier', '/api/'] },
    sitemap: `${base}/sitemap.xml`,
  };
}
