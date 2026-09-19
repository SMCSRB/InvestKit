import '../css/design-system.css';
import '../css/performance-optimizations.css';
import { EducationProvider } from '@/app/context/EducationContext';

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

        {/* Preload Critical Resources */}
        <link rel="preload" as="style" href="../css/design-system.css" />

        <style>{`
          * {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          html {
            scroll-behavior: smooth;
            overflow-x: hidden;
          }

          body {
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            background: #0f172a;
            color: #1e293b;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }

          /* Page Transitions */
          @keyframes pageEnter {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          /* Global animation class */
          .page-transition {
            animation: pageEnter 0.4s ease-out;
          }

          /* Link hover effect optimization */
          a {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }

          /* Button optimization */
          button {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            will-change: transform, box-shadow;
          }

          button:active {
            transform: scale(0.95);
          }

          /* Input optimization */
          input, select, textarea {
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }

          /* Scroll optimization */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          ::-webkit-scrollbar-track {
            background: transparent;
          }

          ::-webkit-scrollbar-thumb {
            background: rgba(59, 130, 246, 0.3);
            border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: rgba(59, 130, 246, 0.5);
          }

          /* Performance: reduce motion for users who prefer it */
          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          }

          /* Network information awareness */
          @media (prefers-color-scheme: dark) {
            body {
              background: #0f172a;
            }
          }
        `}</style>
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
        <EducationProvider>
          {children}
        </EducationProvider>
      </body>
    </html>
  );
}
