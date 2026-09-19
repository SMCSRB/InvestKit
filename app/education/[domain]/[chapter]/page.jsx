'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { educationDomains } from '@/data/education';
import { useEducationProgress } from '@/app/context/EducationContext';
import PageWrapper from '@/app/components/PageWrapper';

export default function ChapterPage() {
  const router = useRouter();
  const params = useParams();
  const domainId = params?.domain;
  const chapterId = params?.chapter ? parseInt(params.chapter) : null;
  const { isLoading } = useEducationProgress();

  const domain = domainId ? educationDomains.find((d) => d.id === domainId) : null;
  const chapter = domain && chapterId ? domain.chapters.find((c) => c.id === chapterId) : null;

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  if (isLoading) {
    return <PageWrapper><div>Chargement...</div></PageWrapper>;
  }

  if (!domain || !chapter) {
    return <PageWrapper><div>Données manquantes</div></PageWrapper>;
  }

  return (
    <PageWrapper>
      <div className="min-h-screen pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4">{chapter.title}</h1>
          <p className="text-gray-400 mb-8">{chapter.description}</p>
          
          <div className="bg-slate-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Leçon</h2>
            <p className="text-gray-300">Contenu du chapitre chargé avec succès!</p>
          </div>

          <Link href={`/education/${domainId}`} className="text-blue-400 hover:text-blue-300">
            ← Retour
          </Link>
        </div>
      </div>
    </PageWrapper>
  );
}
