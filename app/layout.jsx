import '../css/design-system.css';

export const metadata = {
  title: 'InvestKit - Investissez Intelligemment',
  description: 'Plateforme éducative et outils de simulation financière pour investir intelligemment',
  keywords: 'investissement, simulation, PEA, ETF, éducation financière, France',
  openGraph: {
    title: 'InvestKit - Investissez Intelligemment',
    description: 'Simulateurs pro, éducation gamifiée, et analyses de risque pour vos investissements',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
