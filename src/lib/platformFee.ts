/**
 * Configuration et calcul des frais de plateforme Eurêka / INEXIUMUS
 * Modèle économique :
 * - Gratuit pour les écoles (0 FCFA de retenue sur la scolarité)
 * - 5 000 FCFA / an par élève payé par le parent, dispatché selon les échéances de l'établissement
 * - Conversion multi-devises automatique selon le pays / devise de l'école
 */

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  annualFee: number;
  flag: string;
  exchangeRateToXOF: number; // Taux de change indicatif par rapport au XOF
}

export const BASE_ANNUAL_FEE_XOF = 5000;

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  XOF: {
    code: 'XOF',
    name: 'Franc CFA (UEMOA)',
    symbol: 'FCFA',
    annualFee: 5000,
    flag: '🇨🇮',
    exchangeRateToXOF: 1,
  },
  XAF: {
    code: 'XAF',
    name: 'Franc CFA (CEMAC)',
    symbol: 'FCFA',
    annualFee: 5000,
    flag: '🇨🇲',
    exchangeRateToXOF: 1,
  },
  GNF: {
    code: 'GNF',
    name: 'Franc Guinéen',
    symbol: 'GNF',
    annualFee: 70000,
    flag: '🇬🇳',
    exchangeRateToXOF: 0.071,
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    annualFee: 8,
    flag: '🇪🇺',
    exchangeRateToXOF: 655.957,
  },
  USD: {
    code: 'USD',
    name: 'Dollar US',
    symbol: '$',
    annualFee: 8.5,
    flag: '🇺🇸',
    exchangeRateToXOF: 610,
  },
  NGN: {
    code: 'NGN',
    name: 'Naira Nigérian',
    symbol: '₦',
    annualFee: 12000,
    flag: '🇳🇬',
    exchangeRateToXOF: 0.42,
  },
  GHS: {
    code: 'GHS',
    name: 'Cedi Ghanéen',
    symbol: 'GH₵',
    annualFee: 110,
    flag: '🇬🇭',
    exchangeRateToXOF: 45,
  },
  CDF: {
    code: 'CDF',
    name: 'Franc Congolais',
    symbol: 'CDF',
    annualFee: 23000,
    flag: '🇨🇩',
    exchangeRateToXOF: 0.22,
  },
  MAD: {
    code: 'MAD',
    name: 'Dirham Marocain',
    symbol: 'MAD',
    annualFee: 80,
    flag: '🇲🇦',
    exchangeRateToXOF: 62,
  },
};

export function getCurrencyConfig(currencyCode = 'XOF'): CurrencyConfig {
  const normalized = (currencyCode || 'XOF').trim().toUpperCase();
  return SUPPORTED_CURRENCIES[normalized] || SUPPORTED_CURRENCIES.XOF;
}

export interface PlatformFeeCalculation {
  annualFee: number;
  currencyCode: string;
  currencySymbol: string;
  totalSchedules: number;
  feePerSchedule: number;
  description: string;
  shortLabel: string;
}

/**
 * Calcule la quote-part des frais de service de 5 000 FCFA/an (ou équivalent devise)
 * répartie sur le nombre d'échéances de paiement de l'établissement (ex: 3 trimestres, 4 tranches, 10 mensualités).
 */
export function calculatePlatformFee({
  currency = 'XOF',
  totalSchedules = 3,
}: {
  currency?: string;
  totalSchedules?: number;
}): PlatformFeeCalculation {
  const config = getCurrencyConfig(currency);
  const count = Math.max(1, totalSchedules || 3);
  
  // Frais arrondi par tranche
  const feePerSchedule = Math.round(config.annualFee / count);

  return {
    annualFee: config.annualFee,
    currencyCode: config.code,
    currencySymbol: config.symbol,
    totalSchedules: count,
    feePerSchedule,
    description: `${config.annualFee.toLocaleString('fr-FR')} ${config.symbol}/an réparti sur ${count} échéance${count > 1 ? 's' : ''}`,
    shortLabel: `${feePerSchedule.toLocaleString('fr-FR')} ${config.symbol} / échéance`,
  };
}
