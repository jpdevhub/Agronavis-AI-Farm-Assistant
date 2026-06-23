import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon */}
        <link rel="icon" href="/images/favicon.png" />
        <link rel="apple-touch-icon" href="/images/icon.png" />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AgroNavis" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* SEO */}
        <meta name="description" content="AgroNavis — AI-powered smart farm monitoring. Crop disease detection, farm management, and weather intelligence." />
        <meta property="og:title" content="AgroNavis" />
        <meta property="og:description" content="AI-powered smart farm monitoring platform." />
        <meta property="og:type" content="website" />
        <meta name="application-name" content="AgroNavis" />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('high-contrast') === 'true') {
                  document.documentElement.setAttribute('data-theme', 'high-contrast');
                }
              } catch (e) {}
            `,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}