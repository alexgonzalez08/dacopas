import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MyScore FootApp',
    short_name: 'MyScore',
    description: 'Predecí los resultados del Mundial 2026 con tus amigos',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0a0f1e',
    theme_color: '#eab308',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
