import type { Metadata, Viewport } from 'next'
import { Red_Hat_Display } from 'next/font/google'
import './globals.css'

// The display face for headlines and the score. Self-hosted at build by next/font.
const display = Red_Hat_Display({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-red-hat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Burnoff',
  description: "Clear the fog at will, not on Karl's time.",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
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
  themeColor: '#e6e4df',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={display.variable}>
      <body className="bg-fog font-sans text-ink antialiased">{children}</body>
    </html>
  )
}
