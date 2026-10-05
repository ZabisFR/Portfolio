import type { NextConfig } from 'next';

/* En-têtes de sécurité, repris de l'ancienne version statique.
   La caméra n'est volontairement pas bloquée : la page « Expérience
   gestuelle » en a besoin pour suivre la main. */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      /* Un jour seulement : les CV et les couvertures sont remplacés sous le même
         nom, un cache plus long servirait l'ancienne version. */
      { source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
    ];
  },
};

export default nextConfig;
