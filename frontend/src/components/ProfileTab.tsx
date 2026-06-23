import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/context/AuthContext';
import { profileApi } from '../utils/farmApi';
import { farmApi } from '../utils/farmApi';
import styles from '../styles/ProfileTab.module.css';
import { useHighContrastMode } from '../hooks/useHighContrastMode';

interface FarmerProfile {
  id: string;
  full_name?: string;
  phone_number?: string;
  gender?: string;
  years_of_experience?: number;
  education_level?: string;
  created_at?: string;
}

const ProfileTab: React.FC = () => {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [farmCount, setFarmCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { highContrast, toggleHighContrast } = useHighContrastMode();

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, farmsRes] = await Promise.all([
          profileApi.getProfile(),
          farmApi.getFarms(),
        ]);
        if (profileRes?.data) setProfile(profileRes.data);
        if (Array.isArray(farmsRes)) setFarmCount(farmsRes.length);
      } catch (err) {
        console.error('Profile load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Farmer';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : new Date().getFullYear();

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingHero} />
        <div className={styles.skeletonStrip} />
      </div>
    );
  }

  return (
    <div className={styles.container} data-hc-target="true">
      {/* Hero */}
      <div className={styles.hero} data-hc-target="true">
        <div className={styles.avatarWrapper} data-hc-target="true">{initials}</div>
        <h2 className={styles.userName}>{displayName}</h2>
        <p className={styles.userEmail}>{user?.email || ''}</p>
      </div>

      {/* Stats Strip */}
      <div className={styles.statsStrip} data-hc-target="true">
        <div className={styles.statItem} data-hc-target="true">
          <div className={styles.statValue}>{farmCount}</div>
          <div className={styles.statLabel}>Farms</div>
        </div>
        <div className={styles.statItem} data-hc-target="true">
          <div className={styles.statValue}>{profile?.years_of_experience ?? '—'}</div>
          <div className={styles.statLabel}>Years Exp.</div>
        </div>
        <div className={styles.statItem} data-hc-target="true">
          <div className={styles.statValue}>{memberSince}</div>
          <div className={styles.statLabel}>Member Since</div>
        </div>
      </div>

      {/* Info Section */}
      <div className={styles.infoSection}>
        <div className={styles.infoCard} data-hc-target="true">
          <div className={styles.infoRow}>
            <div className={`${styles.infoRowIcon} ${styles.iconGreen}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className={styles.infoRowContent}>
              <div className={styles.infoRowLabel}>Full Name</div>
              <div className={profile?.full_name ? styles.infoRowValue : styles.infoRowValueMuted}>
                {profile?.full_name || 'Not set'}
              </div>
            </div>
          </div>

          <div className={styles.infoRow}>
            <div className={`${styles.infoRowIcon} ${styles.iconBlue}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div className={styles.infoRowContent}>
              <div className={styles.infoRowLabel}>Email</div>
              <div className={styles.infoRowValue}>{user?.email || '—'}</div>
            </div>
          </div>

          <div className={styles.infoRow}>
            <div className={`${styles.infoRowIcon} ${styles.iconPurple}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div className={styles.infoRowContent}>
              <div className={styles.infoRowLabel}>Phone</div>
              <div className={profile?.phone_number ? styles.infoRowValue : styles.infoRowValueMuted}>
                {profile?.phone_number || 'Not set'}
              </div>
            </div>
          </div>

          <div className={styles.infoRow}>
            <div className={`${styles.infoRowIcon} ${styles.iconOrange}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <div className={styles.infoRowContent}>
              <div className={styles.infoRowLabel}>Experience</div>
              <div className={profile?.years_of_experience != null ? styles.infoRowValue : styles.infoRowValueMuted}>
                {profile?.years_of_experience != null ? `${profile.years_of_experience} years` : 'Not set'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Section */}
      <div className={styles.menuSection}>
        <div className={styles.menuCard} data-hc-target="true">
          <button className={styles.menuItem} onClick={() => router.push('/onboarding/farm')}>
            <div className={`${styles.menuItemIcon} ${styles.iconGreen}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span className={styles.menuItemLabel}>Add New Farm</span>
            <svg className={styles.menuItemChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          <button className={styles.menuItem} onClick={() => router.push('/onboarding/crops')}>
            <div className={`${styles.menuItemIcon} ${styles.iconBlue}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22V12M12 12C12 12 6 10 6 4c3.5 0 6 2 6 2M12 12C12 12 18 10 18 4c-3.5 0-6 2-6 2"/>
              </svg>
            </div>
            <span className={styles.menuItemLabel}>Manage Crops</span>
            <svg className={styles.menuItemChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Section */}
      <div className={styles.menuSection}>
        <div className={styles.menuCard} data-hc-target="true">
          <div className={styles.settingsItem}>
            <div className={styles.settingsLabelContainer}>
              <div className={`${styles.menuItemIcon} ${styles.iconOrange}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </div>
              <div className={styles.settingsText}>
                <span id="high-contrast-label" className={styles.menuItemLabel}>High Contrast Mode</span>
                <span className={styles.settingsDesc}>Optimized for outdoor use & direct sunlight</span>
              </div>
            </div>
            <label className={styles.switch} htmlFor="high-contrast-toggle">
              <input 
                id="high-contrast-toggle"
                aria-labelledby="high-contrast-label"
                type="checkbox" 
                checked={highContrast} 
                onChange={(e) => toggleHighContrast(e.target.checked)} 
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <button className={styles.signOutButton} onClick={handleSignOut}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign Out
      </button>
    </div>
  );
};

export default ProfileTab;
