import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook pour gérer les transitions de page fluides
 * Améliore l'expérience utilisateur en ajoutant des animations
 */
export function usePageTransition() {
  const router = useRouter();
  const pageRef = useRef(null);

  useEffect(() => {
    // Ajouter la classe de transition au montage
    const element = pageRef.current;
    if (element) {
      element.classList.add('page-enter');

      // Précharger les liens de navigation
      const links = document.querySelectorAll('a[href^="/"]');
      links.forEach((link) => {
        link.addEventListener('mouseenter', () => {
          const href = link.getAttribute('href');
          if (href) {
            router.prefetch(href);
          }
        });
      });
    }

    return () => {
      if (element) {
        element.classList.remove('page-enter');
      }
    };
  }, [router]);

  return pageRef;
}

/**
 * Hook pour gérer le chargement des pages avec skeleton loading
 */
export function useSuspense(loadingDelay = 300) {
  const [isLoading, setIsLoading] = useState(false);

  const showLoading = () => setIsLoading(true);
  const hideLoading = () => setTimeout(() => setIsLoading(false), loadingDelay);

  return { isLoading, showLoading, hideLoading };
}

/**
 * Hook pour optimiser le scroll vers un élément
 */
export function useScrollToElement(elementId, behavior = 'smooth') {
  const scrollToElement = () => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior, block: 'start' });
    }
  };

  return scrollToElement;
}

/**
 * Hook pour gérer les préchargements optimisés
 */
export function usePrefetch() {
  const router = useRouter();

  const prefetch = (href) => {
    if (router.prefetch) {
      router.prefetch(href);
    }
  };

  return { prefetch };
}
