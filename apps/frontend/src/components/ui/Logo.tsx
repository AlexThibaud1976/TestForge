import { BRAND } from './theme';

/** Props du composant Logo. */
export interface LogoProps {
  /** Taille du monogramme SVG en pixels. Défaut : 28. */
  size?: number;
  /** Affiche le wordmark "TestForge" à côté du monogramme. Défaut : true. */
  showText?: boolean;
  /** Classes CSS supplémentaires sur le conteneur. */
  className?: string;
}

/**
 * Logo SVG inline de TestForge.
 * Monogramme "T" stylisé avec accent géométrique + wordmark optionnel.
 * Couleurs : blue-500 (primary) + indigo-500 (secondary).
 */
export function Logo({ size = 28, showText = true, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="TestForge logo"
      >
        {/* Background rounded square */}
        <rect width="28" height="28" rx="6" fill={BRAND.primary} />
        {/* "T" crossbar */}
        <rect x="5" y="7" width="18" height="3" rx="1.5" fill="white" />
        {/* "T" stem */}
        <rect x="12" y="10" width="4" height="11" rx="1.5" fill="white" />
        {/* Accent triangle — bottom right */}
        <path d="M18 18 L23 23 L18 23 Z" fill={BRAND.accent} opacity="0.85" />
      </svg>

      {showText && (
        <span
          className="font-semibold tracking-tight text-gray-900"
          style={{ fontSize: size * 0.6 }}
        >
          TestForge
        </span>
      )}
    </span>
  );
}
