import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { AuthProvider } from '../auth/context/AuthContext'
import '../lib/i18n'
import '../styles/globals.css'
import 'leaflet/dist/leaflet.css'

import { useHighContrastMode } from '../hooks/useHighContrastMode'

// Load PWA components only on client (uses browser APIs — no SSR)
const PWAInstallPrompt = dynamic(
  () => import('../components/PWAInstallPrompt'),
  { ssr: false }
);

const OfflineIndicator = dynamic(
  () => import('../components/OfflineIndicator'),
  { ssr: false }
);

function MyApp({ Component, pageProps }: AppProps) {
  useHighContrastMode();

  return (
    <AuthProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </Head>
      <Component {...pageProps} />
      {/* PWA "Add to Home Screen" banner — appears on mobile automatically */}
      <PWAInstallPrompt />
      {/* Offline indicator — shows red banner when user loses connectivity */}
      <OfflineIndicator />
    </AuthProvider>
  )
}

export default MyApp
