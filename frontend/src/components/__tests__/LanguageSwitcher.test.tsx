import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LanguageSwitcher from '../LanguageSwitcher';
import i18n from '../../lib/i18n';

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('changes the active language and stores the selection', async () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: 'Select Language' }));
    fireEvent.click(screen.getByText('HI'));

    await waitFor(() => {
      expect(i18n.language).toBe('hi');
      expect(window.localStorage.getItem('i18nextLng')).toBe('hi');
    });
  });
});
