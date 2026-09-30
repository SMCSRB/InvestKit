import localFont from 'next/font/local';
import './globals.css';
import { themeInitScript } from '@/app/lib/designRoutes';
import ClientLayoutWrapper from '@/app/components/ClientLayoutWrapper';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'InvestKit',
  description: 'Plateforme éducative et outils de simulation financière',
  inLanguage: 'fr',
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { url: process.env.NEXT_PUBLIC_SITE_URL } : {}),
};

// Police auto-hébergée (licence OFL) : préchargée, affichage immédiat avec une police de secours ajustée (pas de saut de mise en page).
const jakarta = localFont({
  src: '../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2',
  variable: '--font-jakarta',
  weight: '200 800',
  display: 'swap',
  adjustFontFallback: 'Arial',
});

export const metadata = {
  title: 'InvestKit - Investissez Intelligemment',
  description: 'Plateforme éducative et outils de simulation financière pour investir intelligemment',
  keywords: 'investissement, simulation, PEA, ETF, éducation financière, France',
  openGraph: {
    title: 'InvestKit - Investissez Intelligemment',
    description: 'Simulateurs pro, éducation gamifiée, et analyses de risque pour vos investissements',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" data-theme="dark" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Performance & Optimization */}
        <meta httpEquiv="X-UA-Compatible" content="ie=edge" />

      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <noscript>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#0f172a',
            color: '#fff',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            padding: '20px',
          }}>
            <div>
              <h1>JavaScript est désactivé</h1>
              <p>InvestKit nécessite JavaScript pour fonctionner correctement.</p>
            </div>
          </div>
        </noscript>
        <ClientLayoutWrapper>
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
