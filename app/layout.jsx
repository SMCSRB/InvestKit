import ClientLayoutWrapper from '@/app/components/ClientLayoutWrapper';

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
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Performance & Optimization */}
        <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />

        {/* CSS Stylesheets */}
        <link rel="stylesheet" href="/css/global.css" />
        <link rel="stylesheet" href="/css/design-system.css" />
        <link rel="stylesheet" href="/css/performance-optimizations.css" />
      </head>
      <body>
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
