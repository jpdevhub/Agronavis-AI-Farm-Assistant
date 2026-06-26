import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import FertilizerRecommendation from './FertilizerRecommendation';
import { soilService } from '../utils/soilService';
import { getLatestRecommendation, getRecommendationHistory } from '../utils/offlineStorage';

// Mocks
jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, def: string) => def }),
}));
jest.mock('../utils/soilService', () => ({
  soilService: { getFertilizerRecommendation: jest.fn() },
}));
jest.mock('../utils/offlineStorage', () => ({
  saveRecommendation: jest.fn(),
  getLatestRecommendation: jest.fn(),
  getRecommendationHistory: jest.fn().mockResolvedValue([]),
}));

describe('FertilizerRecommendation', () => {
  const farmId = 'farm-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<FertilizerRecommendation farmId={farmId} />);
    expect(screen.getByText('Analyzing Soil & Fertilizer Data...')).toBeInTheDocument();
  });

  it('falls back to cache when API fails or offline', async () => {
    // Simulate API failure
    (soilService.getFertilizerRecommendation as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    // Simulate cache hit
    (getLatestRecommendation as jest.Mock).mockResolvedValue({
      data: {
        soilHealth: { nitrogen: 100, phosphorus: 20, potassium: 50, ph: 6.5 },
        recommendations: [],
        hasCrops: false,
        farm: { name: 'Test Farm', totalArea: 10 }
      }
    });

    render(<FertilizerRecommendation farmId={farmId} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Viewing Cached Recommendation/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText('Nitrogen (N)')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
