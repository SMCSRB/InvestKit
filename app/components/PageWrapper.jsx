'use client';

import { useEffect, useRef } from 'react';

/**
 * PageWrapper - Composant wrapper pour appliquer les animations et optimisations de page
 * Utilise ce composant pour envelopper le contenu principal de chaque page
 */
export default function PageWrapper({ children, animation = 'page-enter' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      // Appliquer l'animation
      container.classList.add(animation);

      // Précharger les liens
      const links = container.querySelectorAll('a[href^="/"]');
      links.forEach((link) => {
        link.addEventListener('mouseenter', handleLinkHover);
      });

      return () => {
        links.forEach((link) => {
          link.removeEventListener('mouseenter', handleLinkHover);
        });
        container.classList.remove(animation);
      };
    }
  }, [animation]);

  const handleLinkHover = (e) => {
    const href = e.target.getAttribute('href');
    if (href && typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
      });
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        animation: `${animation} 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
