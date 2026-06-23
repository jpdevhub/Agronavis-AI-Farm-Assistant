/**
 * Offline Indicator
 *
 * Shows a persistent banner at the top of the screen when the user is offline.
 * This tells farmers they're viewing cached data and certain actions won't work.
 *
 * Behaviour:
 *  - Listens to navigator.onLine / offline events
 *  - Shows banner when offline, hides when back online
 *  - Uses same styling patterns as PWAInstallPrompt for consistency
 */
import { useEffect, useState } from 'react';

export default function OfflineIndicator() {
  // Check initial state on mount — if already offline, show banner immediately
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !navigator.onLine;
  });
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Small delay before hiding — gives user time to see "back online" transition
      setTimeout(() => setShow(false), 300);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShow(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't render anything if hidden (or during initial server render)
  // Only check `show` — isOffline is used for event handling, not render gating
  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '12px 16px',
        paddingTop: 'env(safe-area-inset-top, 12px)', // iPhone notch support
        transform: show ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
          border: '1px solid rgba(248, 113, 113, 0.3)',
          borderRadius: '14px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(248,113,113,0.1)',
          backdropFilter: 'blur(20px)',
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        {/* Offline icon (simple wifi-off) */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fca5a5"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fef2f2' }}>
            You&apos;re offline
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#fca5a5', lineHeight: 1.4 }}>
            Viewing cached data — some features unavailable
          </p>
        </div>
      </div>
    </div>
  );
}
