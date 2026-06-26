import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import styles from '../styles/FertilizerRecommendation.module.css';
import { soilService } from '../utils/soilService';
import { 
  saveRecommendation, 
  getLatestRecommendation, 
  getRecommendationHistory, 
  CachedRecommendation 
} from '../utils/offlineStorage';

interface FertilizerRecommendationProps {
  farmId: string;
}

interface SoilHealthData {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  testedDate: string;
}

interface Recommendation {
  cropType: string;
  variety: string;
  areaAcres: number;
  ureaBags: number;
  sspBags: number;
  mopBags: number;
  phAlert: string | null;
}

const FertilizerRecommendation: React.FC<FertilizerRecommendationProps> = ({ farmId }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soilHealth, setSoilHealth] = useState<SoilHealthData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [hasCrops, setHasCrops] = useState(false);
  const [farmData, setFarmData] = useState<{name: string; totalArea: number; district?: string} | null>(null);

  // New offline state
  const [isOffline, setIsOffline] = useState(false);
  const [isCachedView, setIsCachedView] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<CachedRecommendation[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchFertilizerData = async () => {
      if (!farmId) return;
      
      setLoading(true);
      setError(null);
      setIsCachedView(false);
      
      try {
        if (!navigator.onLine) {
          throw new Error('Offline');
        }

        const response = await soilService.getFertilizerRecommendation(farmId);
        
        if (isMounted) {
          if (response.success && response.data) {
            setSoilHealth(response.data.soilHealth);
            setRecommendations(response.data.recommendations || []);
            setHasCrops(response.data.hasCrops);
            setFarmData(response.data.farm);

            // Save to cache (isolate failure)
            try {
              await saveRecommendation(farmId, response.data);
              const updatedHistory = await getRecommendationHistory(farmId);
              setHistoryList(updatedHistory);
            } catch (cacheWriteErr) {
              console.error('Failed to write to cache', cacheWriteErr);
            }
          } else {
            throw new Error('Failed to load fertilizer recommendations.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          // Attempt fallback to cache
          try {
            const cached = await getLatestRecommendation(farmId);
            if (cached && cached.data) {
              setSoilHealth(cached.data.soilHealth);
              setRecommendations(cached.data.recommendations || []);
              setHasCrops(cached.data.hasCrops);
              setFarmData(cached.data.farm);
              setIsCachedView(true);

              // Update history list
              const history = await getRecommendationHistory(farmId);
              setHistoryList(history);
              setLoading(false);
              return;
            }
          } catch(cacheErr) {
            console.error('Cache fallback failed', cacheErr);
          }

          if (err.message === 'Offline') {
             setError('You are offline and no cached recommendation is available.');
          } else {
             // If 404, it probably means no soil data yet (polygon not drawn)
             setError(err?.response?.data?.error || err.message || 'Draw your farm boundary to analyze soil health.');
          }
          setSoilHealth(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchFertilizerData();

    return () => {
      isMounted = false;
    };
  }, [farmId, isOffline]); // Re-fetch or load cache if network changes

  const loadHistoricalRecommendation = (cached: CachedRecommendation) => {
    setSoilHealth(cached.data.soilHealth);
    setRecommendations(cached.data.recommendations || []);
    setHasCrops(cached.data.hasCrops);
    setFarmData(cached.data.farm);
    setIsCachedView(true);
    setShowHistory(false);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSpinner}></div>
        <p className={styles.loadingText}>{t('dashboard.fertilizer.analyzing', 'Analyzing Soil & Fertilizer Data...')}</p>
      </div>
    );
  }

  if (error || !soilHealth) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrapper}>🧮</div>
            <h3 className={styles.title}>{t('dashboard.fertilizer.title', 'Fertilizer Calculator')}</h3>
          </div>
        </div>
        <div className={styles.emptyState}>
          <p>{error || 'Draw your farm boundary to analyze regional soil health.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {isCachedView && (
        <div className={styles.offlineBanner}>
          ⚠️ {isOffline ? 'You are offline. ' : ''}Viewing Cached Recommendation
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconWrapper}>🧮</div>
          <div>
            <h3 className={styles.title}>{t('dashboard.fertilizer.title', 'Fertilizer & Soil Health')}</h3>
            <p className={styles.subtitle}>
              {farmData?.district ? `Regional data for ${farmData.district}` : 'Estimated regional soil data'} 
            </p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={styles.historyButton} 
            onClick={() => setShowHistory(!showHistory)}
            disabled={historyList.length === 0}
          >
            {showHistory ? 'Hide History' : 'History'}
          </button>
        </div>
      </div>

      {showHistory ? (
        <div className={styles.historySection}>
          <h4 className={styles.sectionTitle}>Previous Recommendations</h4>
          {historyList.map(item => (
            <button key={item.id} className={styles.historyItem} onClick={() => loadHistoricalRecommendation(item)}>
              <span className={styles.historyDate}>
                {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}
              </span>
              <span className={styles.historyDetails}>
                {item.data.hasCrops ? `${item.data.recommendations?.length || 0} Crops Analyzed` : 'No Crops'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className={styles.soilGrid}>
            <div className={styles.nutrientCard}>
              <div className={styles.nutrientHeader}>
                <span className={styles.nutrientLabel}>Nitrogen (N)</span>
                <span className={styles.nutrientValue}>{soilHealth.nitrogen} <small>kg/ac</small></span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={`${styles.progressFill} ${soilHealth.nitrogen < 150 ? styles.bgDanger : styles.bgSuccess}`} 
                  style={{ width: `${Math.min((soilHealth.nitrogen / 250) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className={styles.nutrientCard}>
              <div className={styles.nutrientHeader}>
                <span className={styles.nutrientLabel}>Phosphorus (P)</span>
                <span className={styles.nutrientValue}>{soilHealth.phosphorus} <small>kg/ac</small></span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={`${styles.progressFill} ${soilHealth.phosphorus < 12 ? styles.bgDanger : styles.bgSuccess}`} 
                  style={{ width: `${Math.min((soilHealth.phosphorus / 30) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className={styles.nutrientCard}>
              <div className={styles.nutrientHeader}>
                <span className={styles.nutrientLabel}>Potassium (K)</span>
                <span className={styles.nutrientValue}>{soilHealth.potassium} <small>kg/ac</small></span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={`${styles.progressFill} ${soilHealth.potassium < 60 ? styles.bgDanger : styles.bgSuccess}`} 
                  style={{ width: `${Math.min((soilHealth.potassium / 150) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className={styles.nutrientCard}>
              <div className={styles.nutrientHeader}>
                <span className={styles.nutrientLabel}>Soil pH</span>
                <span className={styles.nutrientValue}>{soilHealth.ph}</span>
              </div>
              <div className={styles.phScale}>
                <div className={styles.phIndicator} style={{ left: `${Math.min(Math.max((soilHealth.ph - 4) / 6 * 100, 0), 100)}%` }}></div>
              </div>
            </div>
          </div>

          <div className={styles.recommendationsSection}>
            <h4 className={styles.sectionTitle}>Required Fertilizer Bags</h4>
            
            {!hasCrops ? (
              <div className={styles.noCropWarning}>
                <p>Add a crop to calculate your exact fertilizer bag requirements.</p>
                <button 
                  className={styles.addCropButtonPrimary}
                  onClick={() => router.push(`/onboarding/crops?farmId=${farmId}`)}
                >
                  + Add Crop
                </button>
              </div>
            ) : recommendations.length === 0 ? (
              <div className={styles.noCropWarning}>
                <p>No fertilizer needed for your current crop growth stage, or crop is ready for harvest.</p>
              </div>
            ) : (
              <div className={styles.recommendationList}>
                {recommendations.map((rec, idx) => (
                  <div key={idx} className={styles.recommendationCard}>
                    <div className={styles.cropContext}>
                      {rec.cropType} ({rec.variety}) — {rec.areaAcres} Acres
                    </div>
                    
                    {rec.phAlert && (
                      <div className={styles.alertBox}>
                        ⚠️ {rec.phAlert}
                      </div>
                    )}
                    
                    <div className={styles.bagsGrid}>
                      <div className={styles.bagItem}>
                        <div className={styles.bagIcon}>🎒</div>
                        <div className={styles.bagDetails}>
                          <span className={styles.bagCount}>{rec.ureaBags}</span>
                          <span className={styles.bagName}>Bags Urea (50kg)</span>
                        </div>
                      </div>
                      
                      <div className={styles.bagItem}>
                        <div className={styles.bagIcon}>🎒</div>
                        <div className={styles.bagDetails}>
                          <span className={styles.bagCount}>{rec.sspBags}</span>
                          <span className={styles.bagName}>Bags SSP (50kg)</span>
                        </div>
                      </div>
                      
                      <div className={styles.bagItem}>
                        <div className={styles.bagIcon}>🎒</div>
                        <div className={styles.bagDetails}>
                          <span className={styles.bagCount}>{rec.mopBags}</span>
                          <span className={styles.bagName}>Bags MOP (50kg)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FertilizerRecommendation;
