import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/LanguageSwitcher.module.css';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const languages = useMemo(() => [
    { code: 'en', name: t('language.english'), shortLabel: 'EN' },
    { code: 'hi', name: t('language.hindi'), shortLabel: 'HI' },
    { code: 'bn', name: t('language.bengali'), shortLabel: 'BN' },
  ], [t]);

  const currentLanguageCode = i18n.resolvedLanguage || i18n.language.split('-')[0];
  const currentLanguage = languages.find(lang => lang.code === currentLanguageCode) || languages[0];

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
  };

  return (
    <div className={styles.languageSwitcher} ref={switcherRef}>
      <button
        type="button"
        className={styles.languageButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('language.selectLanguage')}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className={styles.languageCode}>{currentLanguage.shortLabel}</span>
        <span className={styles.languageName}>{currentLanguage.name}</span>
        <svg
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="menu">
          <div className={styles.dropdownContent}>
            {languages.map((language) => (
              <button
                type="button"
                key={language.code}
                className={`${styles.dropdownItem} ${
                  currentLanguageCode === language.code ? styles.active : ''
                }`}
                onClick={() => handleLanguageChange(language.code)}
                role="menuitemradio"
                aria-checked={currentLanguageCode === language.code}
              >
                <span className={styles.languageCode}>{language.shortLabel}</span>
                <span className={styles.languageName}>{language.name}</span>
                {currentLanguageCode === language.code && (
                  <svg
                    className={styles.checkmark}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
