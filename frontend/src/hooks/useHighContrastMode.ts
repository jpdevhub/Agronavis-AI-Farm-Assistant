import { useState, useEffect } from 'react';

export function useHighContrastMode() {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('high-contrast') === 'true';
      if (stored !== highContrast) {
        setHighContrast(stored);
      }
    } catch (err) {
      console.error('Failed to read high-contrast from localStorage:', err);
    }
  }, []); // Run once on mount

  useEffect(() => {
    if (highContrast) {
      document.documentElement.setAttribute('data-theme', 'high-contrast');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [highContrast]);

  const toggleHighContrast = (checked: boolean) => {
    setHighContrast(checked);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('high-contrast', checked ? 'true' : 'false');
      }
    } catch (err) {
      console.error('Failed to write high-contrast to localStorage:', err);
    }
  };

  return { highContrast, toggleHighContrast };
}
