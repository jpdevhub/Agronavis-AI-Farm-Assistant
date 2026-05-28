import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import styles from '../styles/FertilizerRecommendation.module.css';
import { soilService } from '../utils/soilService';

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

  useEffect(() => {
    let isMounted = true;

    const fetchFertilizerData = async () => {
      if (!farmId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await soilService.getFertilizerRecommendation(farmId);
        
        if (isMounted) {
          if (response.success && response.data) {
            setSoilHealth(response.data.soilHealth);
            setRecommendations(response.data.recommendations || []);
            setHasCrops(response.data.hasCrops);
            setFarmData(response.data.farm);
          } else {
            setError('Failed to load fertilizer recommendations.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          // If 404, it probably means no soil data yet (polygon not drawn)
          setError(err?.response?.data?.error || 'Draw your farm boundary to analyze soil health.');
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
  }, [farmId]);

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
          <div className={styles.iconWrapper}>🧮</div>
          <h3 className={styles.title}>{t('dashboard.fertilizer.title', 'Fertilizer Calculator')}</h3>
        </div>
        <div className={styles.emptyState}>
          <p>{error || 'Draw your farm boundary to analyze regional soil health.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
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
      </div>

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
    </div>
  );
};

export default FertilizerRecommendation;
