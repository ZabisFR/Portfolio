import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Evan Pouteau — Portfolio',
    short_name: 'EvanOS',
    description: "Portfolio interactif d'Evan Pouteau, développeur web et étudiant en BUT MMI.",
    lang: 'fr',
    start_url: '/',
    display: 'standalone',
    background_color: '#15100e',
    theme_color: '#15100e',
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/assets/icon-180.png', sizes: '180x180', type: 'image/png' },
      { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
