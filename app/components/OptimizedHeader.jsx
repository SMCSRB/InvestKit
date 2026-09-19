'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function OptimizedHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    setIsLoading(true);
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    router.push('/');
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleNavigation = (e) => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
  };

  return (
    <header style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      <nav style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.3s ease',
      }}>
        <Link
          href="/"
          onClick={handleNavigation}
          style={{
            fontSize: '24px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          💎 InvestKit
        </Link>

        <div style={{
          display: 'flex',
          gap: '32px',
          alignItems: 'center',
        }}>
          {[
            { href: '/', label: 'Accueil' },
            { href: '/outils', label: 'Outils' },
            { href: '/education', label: 'Éducation' },
            { href: '/pricing', label: 'Tarifs' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={handleNavigation}
              style={{
                fontSize: '14px',
                fontWeight: '500',
                color: pathname === link.href ? '#3b82f6' : 'rgba(255, 255, 255, 0.7)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#3b82f6';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = pathname === link.href ? '#3b82f6' : 'rgba(255, 255, 255, 0.7)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              {link.label}
            </Link>
          ))}

          <div style={{ width: '1px', height: '20px', background: 'rgba(59, 130, 246, 0.2)' }} />

          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                onClick={handleNavigation}
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'rgba(255, 255, 255, 0.7)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                📊 Dashboard
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoading}
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'rgba(255, 255, 255, 0.7)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  opacity: isLoading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => e.target.style.color = '#ec4899'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={handleNavigation}
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'rgba(255, 255, 255, 0.7)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                Connexion
              </Link>
              <Link
                href="/signup"
                onClick={handleNavigation}
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  padding: '8px 20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  display: 'inline-block',
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-3px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
