const PUBLIC_PAGES = ['', '/demo', '/glossaire', '/changelog', '/education', '/signup', '/login', '/privacy', '/conditions', '/legal', '/cookies', '/contact', '/support'];

export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return PUBLIC_PAGES.map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly', priority: p === '' ? 1 : 0.6 }));
}
