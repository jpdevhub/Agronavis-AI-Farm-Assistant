import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DailyTaskReminders from '../DailyTaskReminders';

const getTodayKey = () => new Date().toISOString().slice(0, 10);
const getStorageKey = () => `agronavis:daily-tasks:${getTodayKey()}`;

describe('DailyTaskReminders', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves checked daily tasks to localStorage', () => {
    render(<DailyTaskReminders />);

    fireEvent.click(screen.getByLabelText(/water/i));
    fireEvent.click(screen.getByLabelText(/fertilize/i));

    expect(JSON.parse(window.localStorage.getItem(getStorageKey()) || '{}')).toEqual({
      water: true,
      fertilize: true,
      harvest: false,
    });
    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
  });

  it('loads checked tasks from localStorage on mount', () => {
    window.localStorage.setItem(getStorageKey(), JSON.stringify({
      water: true,
      fertilize: false,
      harvest: true,
    }));

    render(<DailyTaskReminders />);

    expect(screen.getByLabelText(/water/i)).toBeChecked();
    expect(screen.getByLabelText(/fertilize/i)).not.toBeChecked();
    expect(screen.getByLabelText(/harvest/i)).toBeChecked();
    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
  });
});
