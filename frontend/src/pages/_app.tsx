import type { AppProps } from 'next/app'
import Head from 'next/head'
import { AuthProvider } from '../auth/context/AuthContext'
import '../lib/i18n' // Import i18n configuration
import '../styles/globals.css'
// This import is needed for the Leaflet styles to be included in the application
import 'leaflet/dist/leaflet.css'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  )
}

export default MyApp