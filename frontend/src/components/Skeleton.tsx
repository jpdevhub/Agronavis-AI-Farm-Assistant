import React from 'react';
import styles from '../styles/Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius = '8px',
  className = '',
  style,
}) => {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
};

export const FarmCardSkeleton: React.FC = () => (
  <div className={styles['farm-card-skeleton']}>
    <div className={styles['farm-card-image-skeleton']} />
    <div className={styles['farm-card-body']}>
      <Skeleton width="70%" height="18px" borderRadius="6px" />
      <Skeleton width="40%" height="14px" borderRadius="4px" style={{ marginTop: '8px' }} />
      <div className={styles['npk-row']}>
        <Skeleton width="60px" height="60px" borderRadius="8px" />
        <Skeleton width="60px" height="60px" borderRadius="8px" />
        <Skeleton width="60px" height="60px" borderRadius="8px" />
      </div>
      <div className={styles['farm-card-footer']}>
        <Skeleton width="80px" height="12px" borderRadius="4px" />
        <Skeleton width="50px" height="12px" borderRadius="4px" />
      </div>
    </div>
  </div>
);

export const CropCardSkeleton: React.FC = () => (
  <div className={styles['crop-card-skeleton']}>
    <Skeleton width="50px" height="50px" borderRadius="50%" />
    <div className={styles['crop-card-body']}>
      <Skeleton width="60%" height="16px" borderRadius="6px" />
      <Skeleton width="80%" height="12px" borderRadius="4px" style={{ marginTop: '6px' }} />
      <Skeleton width="40%" height="12px" borderRadius="4px" style={{ marginTop: '4px' }} />
    </div>
  </div>
);

export const WeatherSkeleton: React.FC = () => (
  <div className={styles['weather-skeleton']}>
    <div className={styles['weather-header-skeleton']}>
      <div>
        <Skeleton width="120px" height="16px" borderRadius="6px" />
        <Skeleton width="80px" height="12px" borderRadius="4px" style={{ marginTop: '6px' }} />
      </div>
      <Skeleton width="40px" height="40px" borderRadius="50%" />
    </div>
    <div className={styles['weather-main-skeleton']}>
      <Skeleton width="80px" height="48px" borderRadius="8px" />
      <Skeleton width="100px" height="16px" borderRadius="6px" style={{ marginTop: '8px' }} />
    </div>
    <div className={styles['weather-details-skeleton']}>
      <Skeleton width="100px" height="14px" borderRadius="4px" />
      <Skeleton width="110px" height="14px" borderRadius="4px" />
    </div>
  </div>
);

export const MarketPriceSkeleton: React.FC = () => (
  <div className={styles['market-price-skeleton']}>
    <Skeleton width="140px" height="20px" borderRadius="6px" />
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className={styles['market-price-row']}>
        <Skeleton width={`${60 + i * 10}px`} height="14px" borderRadius="4px" />
        <Skeleton width="90px" height="14px" borderRadius="4px" />
      </div>
    ))}
  </div>
);

export const MapSkeleton: React.FC = () => (
  <div className={styles['map-skeleton']}>
    <Skeleton width="100%" height="100%" borderRadius="16px" />
  </div>
);
