import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Burnoff',
    short_name: 'Burnoff',
    description: "Clear the fog at will, not on Karl's time.",
    start_url: '/',
    display: 'standalone',
    background_color: '#e6e4df',
    theme_color: '#e6e4df',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      // The mark sits inside the maskable safe circle, so the same files serve both.
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
