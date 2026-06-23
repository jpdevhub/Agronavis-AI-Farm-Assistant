import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/context/AuthContext';
import ProtectedRoute from '../auth/components/ProtectedRoute';
import { farmApi, profileApi } from '../utils/farmApi';
import DashboardContent from '../components/Dashboard';
import AgronomyChatbot from '../components/AgronomyChatbot';
import LanguageSwitcher from '../components/LanguageSwitcher';
import s from '../styles/AppShell.module.css';

interface Profile {
  id: string;
  full_name: string;
  phone_number?: string;
}

// Sidebar nav maps directly to dashboard tab IDs
const NAV = [
  {
    id: 'overview',
    labelKey: 'dashboard.shell.nav.dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    id: 'farms',
    labelKey: 'dashboard.shell.nav.myFarms',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'crops',
    labelKey: 'dashboard.shell.nav.myCrops',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12"/>
        <path d="M12 12C12 12 8 9 8 5a4 4 0 0 1 8 0c0 4-4 7-4 7Z"/>
        <path d="M12 12C12 12 16 9 16 5"/>
        <path d="M6 22h12"/>
      </svg>
    ),
  },
  {
    id: 'map',
    labelKey: 'dashboard.shell.nav.fieldMap',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
        <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
      </svg>
    ),
  },
  {
    id: 'fertilizer',
    labelKey: 'dashboard.shell.nav.fertilizer',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
      </svg>
    ),
  },
  {
    id: 'resources',
    labelKey: 'dashboard.shell.nav.inventory',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
  },
  {
    id: 'analytics',
    labelKey: 'dashboard.shell.nav.analytics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
  },
  {
    id: 'cropscan',
    labelKey: 'dashboard.shell.nav.cropScan',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 18h8"/><path d="M3 22h18"/>
        <path d="M14 22a7 7 0 1 0 0-14h-1"/>
        <path d="M9 14h2"/>
        <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/>
        <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>
      </svg>
    ),
  },
  {
    id: 'chatbot',
    labelKey: 'chatbot.title',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    id: 'profile',
    labelKey: 'dashboard.shell.nav.profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const [profileRes] = await Promise.all([
          profileApi.getProfile().catch(() => null),
          farmApi.getFarms().catch(() => []),
        ]);
        if (profileRes?.data) setProfile(profileRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  const displayName = profile?.full_name || user?.email?.split('@')[0] || t('dashboard.shell.defaultFarmer');

  return (
    <ProtectedRoute>
      <div className={s.shell}>
        {/* Sidebar */}
        <aside className={s.sidebar}>
          <div className={s.sidebarBrand}>
            <div className={s.brandName}>Agronavis</div>
            <div className={s.brandSub}>{t('dashboard.shell.brandSub')}</div>
          </div>

          <nav className={s.sidebarNav}>
            {NAV.map(item => (
              <button
                key={item.id}
                className={`${s.navItem} ${activeTab === item.id ? s.navItemActive : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className={s.navIcon}>{item.icon}</span>
                {t(item.labelKey)}
              </button>
            ))}
          </nav>

          <div className={s.sidebarCta}>
            <button className={s.ctaBtn} onClick={() => setActiveTab('map')}>
              {t('dashboard.shell.newAnalysis')}
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className={s.main}>
          <header className={s.header}>
            <div className={s.headerLeft}>
              <div className={s.searchBar}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" placeholder={t('dashboard.shell.searchPlaceholder')} />
              </div>
            </div>

            <div className={s.headerRight}>
              <LanguageSwitcher />
              <button className={s.iconBtn} aria-label={t('dashboard.shell.notifications')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </button>
              <button className={s.iconBtn} aria-label={t('dashboard.shell.settings')} onClick={() => setActiveTab('profile')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>

              <div className={s.dropdownWrap} ref={menuRef}>
                <div className={s.avatar} onClick={() => setMenuOpen(v => !v)} title={displayName}>
                  {initials}
                </div>
                {menuOpen && (
                  <div className={s.dropdown}>
                    <button className={s.dropdownItem} onClick={() => { setMenuOpen(false); setActiveTab('profile'); }}>
                      {t('dashboard.shell.profileSettings')}
                    </button>
                    <div className={s.dropdownDivider} />
                    <button
                      className={`${s.dropdownItem} ${s.dropdownDanger}`}
                      onClick={async () => { setMenuOpen(false); await signOut(); }}
                    >
                      {t('dashboard.signOut')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className={s.content}>
  {loading ? (
    <div className={s.loadingState}>
      <div className={s.spinner} />
      {t('dashboard.shell.loadingFarmData')}
    </div>
  ) : (
    <>
      {activeTab === 'chatbot' && <AgronomyChatbot />}
      {activeTab !== 'chatbot' && <DashboardContent activeTab={activeTab} setActiveTab={setActiveTab} />}
    </>
  )}
</div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;
