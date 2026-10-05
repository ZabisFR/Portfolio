import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalContent } from '@/components/os/windows';
import '@/components/os/os.css';
import '@/components/page-shell.css';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales, politique de confidentialité et crédits du portfolio d’Evan Pouteau.',
  alternates: { canonical: '/mentions-legales' },
};

export default function LegalPage() {
  return (
    <div className="page">
      <nav className="page-top">
        <Link href="/" className="page-brand"><span className="winlogo"><i /><i /><i /><i /></span>Evan Pouteau</Link>
        <Link href="/" className="btn">Retour au portfolio</Link>
      </nav>
      <article className="page-article page-legal">
        <header><span className="page-kicker">evanpouteau.vercel.app</span><h1>Mentions légales</h1></header>
        <div className="win-body page-body legal">
          <LegalContent tab="legal" lang="fr" />
          <h2 className="h1" style={{ marginTop: 48 }}>Confidentialité</h2>
          <LegalContent tab="privacy" lang="fr" />
          <h2 className="h1" style={{ marginTop: 48 }}>Crédits</h2>
          <LegalContent tab="credits" lang="fr" />
        </div>
      </article>
    </div>
  );
}
