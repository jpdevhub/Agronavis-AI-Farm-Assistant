import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { AuthProvider } from '../auth/context/AuthContext'
import '../lib/i18n'
import '../styles/globals.css'
import 'leaflet/dist/leaflet.css'

// Load PWA install prompt only on client (uses browser APIs — no SSR)
const PWAInstallPrompt = dynamic(
  () => import('../components/PWAInstallPrompt'),
  { ssr: false }
);

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const isHighContrast = localStorage.getItem('high-contrast') === 'true';
    if (isHighContrast) {
      document.documentElement.setAttribute('data-theme', 'high-contrast');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  return (
    <AuthProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </Head>
      <Component {...pageProps} />
      {/* PWA "Add to Home Screen" banner — appears on mobile automatically */}
      <PWAInstallPrompt />
    </AuthProvider>
  )
}

export default MyApp