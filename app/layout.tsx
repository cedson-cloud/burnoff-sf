import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Burnoff',
  description: "Clear the fog at will, not on Karl's time.",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Burnoff',
  },
  icons: {
    icon: '/icon.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f172a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  )
}
