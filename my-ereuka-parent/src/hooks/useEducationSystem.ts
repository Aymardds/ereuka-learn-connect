/**
 * Hook : useEducationSystem
 * Charge le système éducatif du tenant (pays) depuis Supabase
 * et expose les classes officielles du Ministère de l'Éducation.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  getEducationSystem,
  getClassesByLevel,
  CountryEducationSystem,
  ClassItem,
  SchoolLevel,
} from '@/constants/educationSystems';

interface UseEducationSystemResult {
  system: CountryEducationSystem;
  classes: ClassItem[];
  classesForPicker: { label: string; value: string; level: SchoolLevel }[];
  classesByLevel: Record<SchoolLevel, ClassItem[]>;
  countryCode: string;
  loading: boolean;
}

export function useEducationSystem(): UseEducationSystemResult {
  const [countryCode, setCountryCode] = useState<string>('CI');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('tenant_id')
          .eq('id', session.user.id)
          .single();

        if (profile?.tenant_id) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('country_code, country')
            .eq('id', profile.tenant_id)
            .single();

          // Priorité : country_code ISO > country (nom textuel legacy)
          const code = tenant?.country_code
            ?? legacyCountryNameToCode(tenant?.country)
            ?? 'CI';

          setCountryCode(code.toUpperCase());
        }
      } catch (e) {
        console.warn('[useEducationSystem] fallback CI', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const system = getEducationSystem(countryCode);
  const classes = system.classes;

  const classesForPicker = classes.map(c => ({
    label: c.label,
    value: c.id,
    level: c.level,
  }));

  const classesByLevel: Record<SchoolLevel, ClassItem[]> = {
    maternelle: getClassesByLevel('maternelle', countryCode),
    primaire:   getClassesByLevel('primaire',   countryCode),
    college:    getClassesByLevel('college',    countryCode),
    lycee:      getClassesByLevel('lycee',      countryCode),
    universite: getClassesByLevel('universite', countryCode),
  };

  return { system, classes, classesForPicker, classesByLevel, countryCode, loading };
}

/** Convertit un nom de pays (legacy) en code ISO */
function legacyCountryNameToCode(country?: string | null): string | null {
  if (!country) return null;
  const map: Record<string, string> = {
    "côte d'ivoire": 'CI', 'cote d ivoire': 'CI', 'ivory coast': 'CI', 'ci': 'CI',
    'sénégal': 'SN', 'senegal': 'SN', 'sn': 'SN',
    'cameroun': 'CM', 'cameroon': 'CM', 'cm': 'CM',
    'burkina faso': 'BF', 'bf': 'BF',
    'mali': 'ML', 'ml': 'ML',
    'guinée': 'GN', 'guinea': 'GN', 'gn': 'GN',
    'togo': 'TG', 'tg': 'TG',
    'bénin': 'BJ', 'benin': 'BJ', 'bj': 'BJ',
    'niger': 'NE', 'ne': 'NE',
    'gabon': 'GA', 'ga': 'GA',
    'congo': 'CG', 'cg': 'CG',
    'rdc': 'CD', 'rd congo': 'CD', 'cd': 'CD',
  };
  return map[country.toLowerCase().trim()] ?? null;
}
