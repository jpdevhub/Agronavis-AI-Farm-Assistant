import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AnalyticsDashboard from '../AnalyticsDashboard';
import { yieldApi } from '../../utils/yieldApi';
import { farmApi } from '../../utils/farmApi';
import { soilHealthApi } from '../../utils/soilHealthApi';

// Mock recharts ResponsiveContainer to avoid jsdom width/height issues
jest.mock('recharts', () => {
  const React = require('react');
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    LineChart: ({ children, data }: { children: React.ReactNode; data: any[] }) => (
      <div data-testid="line-chart" data-chartdata={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Line: () => <div data-testid="chart-line" />,
    XAxis: () => <div data-testid="chart-xaxis" />,
    YAxis: () => <div data-testid="chart-yaxis" />,
    CartesianGrid: () => <div data-testid="chart-grid" />,
    Tooltip: () => <div data-testid="chart-tooltip" />,
    Legend: () => <div data-testid="chart-legend" />,
  };
});

// Mock api utilities
jest.mock('../../utils/yieldApi', () => ({
  yieldApi: {
    getYields: jest.fn(),
    createYield: jest.fn(),
  },
}));

jest.mock('../../utils/farmApi', () => ({
  farmApi: {
    getFarms: jest.fn(),
  },
}));

jest.mock('../../utils/soilHealthApi', () => ({
  soilHealthApi: {
    getFarmSoilHealth: jest.fn(),
  },
}));

describe('AnalyticsDashboard YoY Chart', () => {
  const mockYields = [
    { id: '1', crop_type: 'rice', quantity: 100, unit: 'quintal', year: 2024, farm_id: 'farm-1' },
    { id: '2', crop_type: 'Rice', quantity: 150, unit: 'quintal', year: 2025, farm_id: 'farm-1' },
    { id: '3', crop_type: 'rice', quantity: 50, unit: 'quintal', year: 2024, farm_id: 'farm-1' }, // multi-season in same year
    { id: '4', crop_type: 'wheat', quantity: 80, unit: 'quintal', year: 2024, farm_id: 'farm-1' },
  ];

  const mockFarms = [
    { id: 'farm-1', name: 'Farm Alpha' },
  ];

  const mockSoil = {
    nitrogen: 150,
    phosphorus: 25,
    potassium: 120,
    ph: 6.5,
    farm_id: 'farm-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (yieldApi.getYields as jest.Mock).mockResolvedValue(mockYields);
    (farmApi.getFarms as jest.Mock).mockResolvedValue(mockFarms);
    (soilHealthApi.getFarmSoilHealth as jest.Mock).mockResolvedValue({ data: mockSoil });
  });

  it('renders the YoY Yield Trend chart card when yield records are present', async () => {
    render(<AnalyticsDashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('YoY Yield Trend')).toBeInTheDocument();
    });

    // Check that select dropdown renders with the correct normalized crop options
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Rice' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Wheat' })).toBeInTheDocument();
  });

  it('processes and groups YoY chart data correctly for selected crop', async () => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    const chart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chartdata') || '[]');

    // 'Rice' should be selected by default (first normalized crop alphabetically/extracted order)
    // 2024 total yield: 100 + 50 = 150
    // 2025 total yield: 150
    expect(chartData).toEqual([
      { year: 2024, quantity: 150, unit: 'quintal' },
      { year: 2025, quantity: 150, unit: 'quintal' },
    ]);
  });

  it('updates the YoY chart data when a different crop is selected', async () => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Wheat' } });

    const chart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chartdata') || '[]');

    expect(chartData).toEqual([
      { year: 2024, quantity: 80, unit: 'quintal' },
    ]);
  });

  it('correctly normalizes and aggregates same-year records with mixed units', async () => {
    const mixedUnitYields = [
      { id: '1', crop_type: 'rice', quantity: 100, unit: 'quintal', year: 2024, farm_id: 'farm-1' },
      { id: '2', crop_type: 'rice', quantity: 500, unit: 'kg', year: 2024, farm_id: 'farm-1' }, // 500 kg = 5 quintals
      { id: '3', crop_type: 'rice', quantity: 1, unit: 'ton', year: 2024, farm_id: 'farm-1' }, // 1 ton = 10 quintals
      { id: '4', crop_type: 'rice', quantity: 4, unit: 'bags', year: 2024, farm_id: 'farm-1' }, // 4 bags = 2 quintals
    ];
    (yieldApi.getYields as jest.Mock).mockResolvedValue(mixedUnitYields);

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    const chart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chartdata') || '[]');

    // 2024 total yield:
    // First record: 100 quintals (unit: quintal, which sets the target unit to quintal)
    // Second record: 500 kg = 5 quintals
    // Third record: 1 ton = 10 quintals
    // Fourth record: 4 bags = 2 quintals
    // Expected sum: 100 + 5 + 10 + 2 = 117 quintals
    expect(chartData).toEqual([
      { year: 2024, quantity: 117, unit: 'quintal' },
    ]);
  });
});

