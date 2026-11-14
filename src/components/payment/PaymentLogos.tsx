/**
 * PaymentLogos — vrais logos SVG des moyens de paiement utilisés en Afrique de l'Ouest
 */

import React from 'react';

export type PaymentMethodId =
  | 'WAVE' | 'ORANGE_MONEY_CI' | 'MTN_CI' | 'MOOV_CI' | 'CARD'
  | 'Espèces' | 'Wave' | 'Orange Money' | 'MTN Mobile Money'
  | 'Moov Money' | 'Chèque' | 'Virement bancaire' | 'Carte Bancaire';

export interface PaymentMethod {
  id: string;
  name: string;
  shortName: string;
  color: string;
  bg: string;
  border: string;
  textColor: string;
}

export const PAYMENT_METHODS_CONFIG: Record<string, PaymentMethod> = {
  WAVE: { id: 'WAVE', name: 'Wave Mobile Money', shortName: 'Wave', color: '#1EC6F0', bg: '#E8F9FE', border: '#1EC6F0', textColor: '#0A7A99' },
  'Wave': { id: 'Wave', name: 'Wave Mobile Money', shortName: 'Wave', color: '#1EC6F0', bg: '#E8F9FE', border: '#1EC6F0', textColor: '#0A7A99' },
  ORANGE_MONEY_CI: { id: 'ORANGE_MONEY_CI', name: 'Orange Money', shortName: 'Orange Money', color: '#FF6600', bg: '#FFF3EB', border: '#FF6600', textColor: '#B34700' },
  'Orange Money': { id: 'Orange Money', name: 'Orange Money', shortName: 'Orange Money', color: '#FF6600', bg: '#FFF3EB', border: '#FF6600', textColor: '#B34700' },
  MTN_CI: { id: 'MTN_CI', name: 'MTN MoMo', shortName: 'MTN', color: '#FFCC00', bg: '#FFFBE6', border: '#E6B800', textColor: '#7A5F00' },
  'MTN Mobile Money': { id: 'MTN Mobile Money', name: 'MTN MoMo', shortName: 'MTN', color: '#FFCC00', bg: '#FFFBE6', border: '#E6B800', textColor: '#7A5F00' },
  MOOV_CI: { id: 'MOOV_CI', name: 'Moov Money', shortName: 'Moov', color: '#0075BF', bg: '#EBF5FF', border: '#0075BF', textColor: '#004F80' },
  'Moov Money': { id: 'Moov Money', name: 'Moov Money', shortName: 'Moov', color: '#0075BF', bg: '#EBF5FF', border: '#0075BF', textColor: '#004F80' },
  CARD: { id: 'CARD', name: 'Carte Bancaire', shortName: 'Carte', color: '#1A1A2E', bg: '#F0F0F5', border: '#1A1A2E', textColor: '#1A1A2E' },
  'Carte Bancaire': { id: 'Carte Bancaire', name: 'Carte Bancaire (Visa/MC)', shortName: 'Carte', color: '#1A1A2E', bg: '#F0F0F5', border: '#1A1A2E', textColor: '#1A1A2E' },
  'Espèces': { id: 'Espèces', name: 'Espèces (Caisse guichet)', shortName: 'Espèces', color: '#059669', bg: '#ECFDF5', border: '#059669', textColor: '#065F46' },
  'Chèque': { id: 'Chèque', name: 'Chèque bancaire', shortName: 'Chèque', color: '#4F46E5', bg: '#EEF2FF', border: '#4F46E5', textColor: '#3730A3' },
  'Virement bancaire': { id: 'Virement bancaire', name: 'Virement bancaire', shortName: 'Virement', color: '#7C3AED', bg: '#F5F3FF', border: '#7C3AED', textColor: '#5B21B6' },
};

function WaveLogo({ size = 32 }: { size?: number }) {
  const [error, setError] = React.useState(false);
  if (!error) {
    return (
      <img
        src="/Wave.jpg"
        alt="Wave"
        width={size}
        height={size}
        className="rounded-xl object-cover shadow-xs inline-block"
        style={{ width: size, height: size }}
        onError={() => setError(true)}
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#1EC6F0"/>
      <text x="24" y="27" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="22" fill="white">W</text>
      <path d="M9 36 Q13 32 17 36 Q21 40 25 36 Q29 32 33 36 Q37 40 41 36" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function OrangeMoneyLogo({ size = 32 }: { size?: number }) {
  const [error, setError] = React.useState(false);
  if (!error) {
    return (
      <img
        src="/Orange.png"
        alt="Orange Money"
        width={size}
        height={size}
        className="rounded-xl object-contain bg-white shadow-xs inline-block p-0.5"
        style={{ width: size, height: size }}
        onError={() => setError(true)}
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#FF6600"/>
      <circle cx="24" cy="21" r="11" fill="white"/>
      <circle cx="24" cy="21" r="6.5" fill="#FF6600"/>
      <circle cx="24" cy="21" r="2.5" fill="white"/>
      <rect x="9" y="35" width="30" height="4" rx="2" fill="white"/>
    </svg>
  );
}

function MtnLogo({ size = 32 }: { size?: number }) {
  const [error, setError] = React.useState(false);
  if (!error) {
    return (
      <img
        src="/MoMo.png"
        alt="MTN MoMo"
        width={size}
        height={size}
        className="rounded-xl object-contain bg-[#FFCC00] shadow-xs inline-block p-0.5"
        style={{ width: size, height: size }}
        onError={() => setError(true)}
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#FFCC00"/>
      <path d="M6 26 L12 16 L24 28 L36 16 L42 26" stroke="#1A1A1A" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="24" y="41" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="10" fill="#1A1A1A">MTN</text>
    </svg>
  );
}

function MoovLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#0075BF"/>
      <circle cx="24" cy="18" r="7" fill="#00B4E0"/>
      <circle cx="24" cy="18" r="3.5" fill="white"/>
      <text x="24" y="37" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="10" fill="white">MOOV</text>
    </svg>
  );
}

function CardLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#1A1A2E"/>
      <rect x="6" y="13" width="36" height="22" rx="4" fill="#2D2D4E"/>
      <rect x="6" y="20" width="36" height="7" fill="#3D3D6E"/>
      <rect x="10" y="30" width="14" height="3" rx="1.5" fill="#6B6B9E"/>
      <circle cx="33" cy="31.5" r="4" fill="#EB001B" opacity="0.9"/>
      <circle cx="38" cy="31.5" r="4" fill="#F79E1B" opacity="0.9"/>
    </svg>
  );
}

function EspecesLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#059669"/>
      <rect x="6" y="14" width="36" height="20" rx="4" stroke="white" strokeWidth="2" fill="none"/>
      <circle cx="24" cy="24" r="7" stroke="white" strokeWidth="2" fill="none"/>
      <text x="24" y="28" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="10" fill="white">F</text>
      <circle cx="11" cy="24" r="2" fill="white" opacity="0.6"/>
      <circle cx="37" cy="24" r="2" fill="white" opacity="0.6"/>
    </svg>
  );
}

function ChequeLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#4F46E5"/>
      <rect x="7" y="12" width="34" height="24" rx="3" stroke="white" strokeWidth="1.5" fill="white" fillOpacity="0.1"/>
      <line x1="12" y1="20" x2="30" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="25" x2="22" y2="25" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="30" x2="18" y2="30" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M31 28 L35 24 L40 31" stroke="#A5F3FC" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function VirementLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#7C3AED"/>
      <path d="M8 24 H40" stroke="white" strokeWidth="2.5" strokeOpacity="0.4" strokeLinecap="round"/>
      <path d="M28 14 L40 24 L28 34" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 14 L8 24 L20 34" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  );
}

interface PaymentLogoProps {
  method: string;
  size?: number;
  className?: string;
}

export function PaymentLogo({ method, size = 32, className }: PaymentLogoProps) {
  const logoProps = { size };
  const normalized = (method || '').toLowerCase().trim();

  if (normalized.includes('wave')) return <span className={className}><WaveLogo {...logoProps} /></span>;
  if (normalized.includes('orange')) return <span className={className}><OrangeMoneyLogo {...logoProps} /></span>;
  if (normalized.includes('mtn')) return <span className={className}><MtnLogo {...logoProps} /></span>;
  if (normalized.includes('moov')) return <span className={className}><MoovLogo {...logoProps} /></span>;
  if (normalized.includes('card') || normalized.includes('carte') || normalized.includes('visa')) return <span className={className}><CardLogo {...logoProps} /></span>;
  if (normalized.includes('espèce') || normalized.includes('espece') || normalized.includes('cash') || normalized.includes('caisse')) return <span className={className}><EspecesLogo {...logoProps} /></span>;
  if (normalized.includes('chèque') || normalized.includes('cheque')) return <span className={className}><ChequeLogo {...logoProps} /></span>;
  if (normalized.includes('virement')) return <span className={className}><VirementLogo {...logoProps} /></span>;

  const config = PAYMENT_METHODS_CONFIG[method];
  const color = config?.color || '#6B7280';
  const letter = (config?.shortName || method || '?')[0].toUpperCase();
  return (
    <span className={className}>
      <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="12" fill={color}/>
        <text x="24" y="31" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="22" fill="white">{letter}</text>
      </svg>
    </span>
  );
}

interface PaymentBadgeProps {
  method: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export function PaymentBadge({ method, size = 'md', showName = true }: PaymentBadgeProps) {
  const config = PAYMENT_METHODS_CONFIG[method];
  const logoSize = size === 'sm' ? 18 : size === 'md' ? 22 : 28;
  const name = config?.shortName || method;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg font-semibold"
      style={{
        backgroundColor: config?.bg || '#F3F4F6',
        color: config?.textColor || '#374151',
        border: `1px solid ${config?.border || '#E5E7EB'}`,
        fontSize: size === 'sm' ? '11px' : size === 'md' ? '12px' : '13px',
        padding: size === 'sm' ? '2px 7px 2px 4px' : '3px 9px 3px 5px',
      }}
    >
      <PaymentLogo method={method} size={logoSize} />
      {showName && <span>{name}</span>}
    </span>
  );
}

interface PaymentMethodCardProps {
  method: PaymentMethod;
  selected: boolean;
  onClick: () => void;
}

export function PaymentMethodCard({ method, selected, onClick }: PaymentMethodCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 hover:scale-[1.03] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1"
      style={{
        borderColor: selected ? method.border : '#E5E7EB',
        backgroundColor: selected ? method.bg : 'white',
        boxShadow: selected ? `0 0 0 1px ${method.border}20` : undefined,
      } as React.CSSProperties}
    >
      {selected && (
        <span
          className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: method.color }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
      <PaymentLogo method={method.id} size={36} />
      <span className="text-[11px] font-semibold text-gray-800 text-center leading-tight">
        {method.shortName}
      </span>
    </button>
  );
}
