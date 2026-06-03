/**
 * PWA Install Prompt
 * Shows a native-style "Add to Home Screen" banner on mobile devices
 * when the app is not already installed as a PWA.
 *
 * Behaviour:
 *  - Listens for the browser's `beforeinstallprompt` event
 *  - Renders only on devices where the event fires (Android Chrome, Edge, etc.)
 *  - On iOS Safari: the manifest + apple-mobile-web-app-capable meta tags
 *    in _document.tsx handle native "Add to Home Screen" natively
 *  - Dismissed once per session (stored in sessionStorage)
 */
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already running as installed PWA or user dismissed this session
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      sessionStorage.getItem('pwa-prompt-dismissed')
    ) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa-prompt-dismissed', '1');
    setDismissed(true);
    setTimeout(() => setShow(false), 300);
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '16px',
        transform: dismissed ? 'translateY(110%)' : 'translateY(0)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #0d2137 0%, #0a3d2e 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '20px',
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.1)',
          backdropFilter: 'blur(20px)',
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        {/* App Icon */}
        <img
          src="/images/icon.png"
          alt="AgroNavis"
          style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0 }}
        />

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f0fdf4' }}>
            Add AgroNavis to Home Screen
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6ee7b7', lineHeight: 1.4 }}>
            Works offline · Instant access · No app store needed
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button
            onClick={handleInstall}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              color: '#6ee7b7',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 10,
              padding: '6px 14px',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
