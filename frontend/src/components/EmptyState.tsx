import React from 'react';
import s from '../styles/EmptyState.module.css';

// ─── SVG Illustrations ──────────────────────────────────────────────────────

/** Farms: A stylised farmhouse with rolling hills and a sun */
const FarmsIllustration: React.FC = () => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Sky background */}
    <circle cx="60" cy="60" r="58" fill="#f0fdf4" />
    {/* Sun */}
    <circle cx="90" cy="28" r="10" fill="#fbbf24" opacity="0.85" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
      const rad = (angle * Math.PI) / 180;
      const x1 = 90 + Math.cos(rad) * 13;
      const y1 = 28 + Math.sin(rad) * 13;
      const x2 = 90 + Math.cos(rad) * 17;
      const y2 = 28 + Math.sin(rad) * 17;
      return (
        <line
          key={i}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" opacity="0.7"
        />
      );
    })}
    {/* Rolling hills */}
    <ellipse cx="35" cy="88" rx="38" ry="20" fill="#bbf7d0" />
    <ellipse cx="85" cy="92" rx="40" ry="18" fill="#86efac" />
    {/* Barn body */}
    <rect x="38" y="62" width="44" height="30" rx="2" fill="#15803d" />
    {/* Barn roof */}
    <polygon points="34,64 60,42 86,64" fill="#064e3b" />
    {/* Barn door */}
    <rect x="52" y="76" width="16" height="16" rx="2" fill="#052e16" />
    {/* Barn window */}
    <rect x="42" y="66" width="10" height="8" rx="1.5" fill="#bbf7d0" opacity="0.8" />
    {/* Chimney */}
    <rect x="72" y="50" width="6" height="14" rx="1" fill="#064e3b" />
    {/* Fence left */}
    <rect x="16" y="78" width="2.5" height="14" rx="1" fill="#15803d" />
    <rect x="24" y="80" width="2.5" height="12" rx="1" fill="#15803d" />
    <rect x="16" y="81" width="11" height="2" rx="1" fill="#15803d" />
    <rect x="16" y="86" width="11" height="2" rx="1" fill="#15803d" />
    {/* Fence right */}
    <rect x="100" y="78" width="2.5" height="14" rx="1" fill="#15803d" />
    <rect x="92" y="80" width="2.5" height="12" rx="1" fill="#15803d" />
    <rect x="92" y="81" width="11" height="2" rx="1" fill="#15803d" />
    <rect x="92" y="86" width="11" height="2" rx="1" fill="#15803d" />
    {/* Border ring */}
    <circle cx="60" cy="60" r="58" stroke="#bbf7d0" strokeWidth="2" />
  </svg>
);

/** Crops: A seedling sprouting from soil with roots */
const CropsIllustration: React.FC = () => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Background circle */}
    <circle cx="60" cy="60" r="58" fill="#f0fdf4" />
    {/* Soil mound */}
    <ellipse cx="60" cy="88" rx="38" ry="12" fill="#854d0e" opacity="0.25" />
    <ellipse cx="60" cy="86" rx="36" ry="10" fill="#a16207" opacity="0.2" />
    {/* Roots */}
    <path d="M60 80 Q50 88 42 92" stroke="#a16207" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
    <path d="M60 80 Q70 88 78 92" stroke="#a16207" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
    <path d="M60 84 Q55 90 52 96" stroke="#a16207" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    <path d="M60 84 Q65 90 68 96" stroke="#a16207" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    {/* Stem */}
    <path d="M60 80 Q60 60 60 38" stroke="#15803d" strokeWidth="3.5" strokeLinecap="round" />
    {/* Left leaf */}
    <path
      d="M60 55 Q44 44 38 30 Q52 32 60 47 Z"
      fill="#22c55e"
      opacity="0.9"
    />
    {/* Right leaf */}
    <path
      d="M60 62 Q76 52 82 38 Q68 40 60 55 Z"
      fill="#16a34a"
      opacity="0.9"
    />
    {/* Small top leaf / bud */}
    <path
      d="M60 38 Q54 28 58 20 Q64 26 60 38 Z"
      fill="#22c55e"
    />
    {/* Soil dots / texture */}
    <circle cx="44" cy="87" r="2" fill="#a16207" opacity="0.3" />
    <circle cx="54" cy="90" r="1.5" fill="#a16207" opacity="0.25" />
    <circle cx="66" cy="89" r="2" fill="#a16207" opacity="0.3" />
    <circle cx="76" cy="87" r="1.5" fill="#a16207" opacity="0.25" />
    {/* Sparkle dots */}
    <circle cx="30" cy="42" r="2.5" fill="#bbf7d0" />
    <circle cx="90" cy="38" r="3" fill="#bbf7d0" />
    <circle cx="26" cy="60" r="1.5" fill="#86efac" />
    {/* Border ring */}
    <circle cx="60" cy="60" r="58" stroke="#bbf7d0" strokeWidth="2" />
  </svg>
);

/** Fields: A map outline with a dashed boundary and a location pin */
const FieldsIllustration: React.FC = () => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Background */}
    <circle cx="60" cy="60" r="58" fill="#f0fdf4" />
    {/* Map base */}
    <rect x="22" y="28" width="76" height="64" rx="8" fill="white" stroke="#bbf7d0" strokeWidth="2" />
    {/* Map grid lines */}
    <line x1="22" y1="55" x2="98" y2="55" stroke="#dcfce7" strokeWidth="1" />
    <line x1="22" y1="71" x2="98" y2="71" stroke="#dcfce7" strokeWidth="1" />
    <line x1="47" y1="28" x2="47" y2="92" stroke="#dcfce7" strokeWidth="1" />
    <line x1="73" y1="28" x2="73" y2="92" stroke="#dcfce7" strokeWidth="1" />
    {/* Dashed field boundary */}
    <path
      d="M38 44 L55 36 L82 42 L88 64 L72 78 L44 76 Z"
      stroke="#10b981"
      strokeWidth="2.5"
      strokeDasharray="5 3"
      strokeLinejoin="round"
      fill="#f0fdf4"
      fillOpacity="0.6"
    />
    {/* Corner anchor dots on boundary */}
    {[
      [38, 44], [55, 36], [82, 42], [88, 64], [72, 78], [44, 76],
    ].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="3.5" fill="white" stroke="#059669" strokeWidth="2" />
    ))}
    {/* Center pin */}
    <path
      d="M60 52 C60 52 52 62 52 67 C52 71.4 55.6 75 60 75 C64.4 75 68 71.4 68 67 C68 62 60 52 60 52 Z"
      fill="#059669"
    />
    <circle cx="60" cy="67" r="3.5" fill="white" />
    {/* Compass rose (top-right corner) */}
    <circle cx="88" cy="36" r="7" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1.5" />
    <text x="88" y="34" textAnchor="middle" fill="#059669" fontSize="5" fontWeight="700" dominantBaseline="middle">N</text>
    <line x1="88" y1="30" x2="88" y2="28" stroke="#059669" strokeWidth="1.5" />
    {/* Border ring */}
    <circle cx="60" cy="60" r="58" stroke="#bbf7d0" strokeWidth="2" />
  </svg>
);

/** Tasks (all done): A clipboard with a checkmark celebration */
const TasksDoneIllustration: React.FC = () => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Background */}
    <circle cx="60" cy="60" r="58" fill="#f0fdf4" />
    {/* Clipboard body */}
    <rect x="30" y="36" width="60" height="68" rx="8" fill="white" stroke="#bbf7d0" strokeWidth="2" />
    {/* Clipboard clip */}
    <rect x="46" y="28" width="28" height="16" rx="4" fill="#e2e8f0" />
    <rect x="51" y="31" width="18" height="8" rx="2" fill="white" />
    {/* Completed rows */}
    {[50, 62, 74].map((y, i) => (
      <React.Fragment key={i}>
        {/* Check circle */}
        <circle cx="44" cy={y} r="7" fill="#dcfce7" stroke="#10b981" strokeWidth="1.5" />
        <polyline
          points={`40,${y} 43,${y + 3} 48,${y - 3}`}
          stroke="#059669"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Line text placeholder */}
        <rect x="56" y={y - 4} width={i === 2 ? 24 : 28} height="4" rx="2" fill="#e2e8f0" />
        <rect x="56" y={y + 2} width={i === 0 ? 18 : 22} height="3" rx="1.5" fill="#f1f5f9" />
      </React.Fragment>
    ))}
    {/* Big green checkmark overlay */}
    <circle cx="60" cy="86" r="14" fill="#059669" />
    <polyline
      points="53,86 58,91 67,80"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Celebration sparkles */}
    <circle cx="24" cy="40" r="3" fill="#fbbf24" opacity="0.8" />
    <circle cx="96" cy="44" r="2.5" fill="#fbbf24" opacity="0.7" />
    <circle cx="28" cy="72" r="2" fill="#22c55e" opacity="0.7" />
    <circle cx="92" cy="68" r="3" fill="#22c55e" opacity="0.6" />
    <line x1="20" y1="56" x2="24" y2="52" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    <line x1="100" y1="56" x2="96" y2="52" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    {/* Border ring */}
    <circle cx="60" cy="60" r="58" stroke="#bbf7d0" strokeWidth="2" />
  </svg>
);

// ─── Illustration map ────────────────────────────────────────────────────────

const ILLUSTRATIONS = {
  farms: FarmsIllustration,
  crops: CropsIllustration,
  fields: FieldsIllustration,
  tasks: TasksDoneIllustration,
} as const;

// ─── Plus icon for CTA ───────────────────────────────────────────────────────
const PlusIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// ─── Props ───────────────────────────────────────────────────────────────────

export type EmptyStateVariant = 'farms' | 'crops' | 'fields' | 'tasks';

interface EmptyStateProps {
  /** Which illustration and context to use */
  variant: EmptyStateVariant;
  /** Headline text */
  title: string;
  /** Supporting description text */
  description: string;
  /** CTA button label — if omitted, no button is rendered */
  ctaLabel?: string;
  /** CTA button click handler */
  onCta?: () => void;
  /** Override class for the wrapper (e.g. to constrain width inside a card) */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<EmptyStateProps> = ({
  variant,
  title,
  description,
  ctaLabel,
  onCta,
  className,
}) => {
  const Illustration = ILLUSTRATIONS[variant];

  return (
    <div className={`${s.wrapper}${className ? ` ${className}` : ''}`}>
      <div className={s.illustration}>
        <Illustration />
      </div>

      <div className={s.dots}>
        <span className={s.dot} />
        <span className={s.dot} />
        <span className={s.dot} />
      </div>

      <p className={s.title}>{title}</p>
      <p className={s.desc}>{description}</p>

      {ctaLabel && onCta && (
        <button className={s.cta} onClick={onCta} type="button">
          <span className={s.ctaIcon}>
            <PlusIcon />
          </span>
          {ctaLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
