import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { 
  LMDTeachingUnit, 
  LMDEcue, 
  LMDStudentGrade, 
  LMDDeliberation,
  Department,
  Program 
} from '../types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Default initial mock data for LMD if database tables are still being deployed
const DEFAULT_LMD_PROGRAMS: (Program & { department?: Department })[] = [
  {
    id: 'prog-gl-l',
    tenant_id: 'default',
    name: 'Licence Informatique & Génie Logiciel',
    code: 'LIC-GL',
    duration_years: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prog-fin-l',
    tenant_id: 'default',
    name: 'Licence Sciences Économiques & Gestion (Finance)',
    code: 'LIC-SEG',
    duration_years: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prog-ia-m',
    tenant_id: 'default',
    name: 'Master Intelligence Artificielle & Big Data',
    code: 'MAS-IA',
    duration_years: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prog-droit-l',
    tenant_id: 'default',
    name: 'Licence Droit Privé des Affaires',
    code: 'LIC-DROIT',
    duration_years: 3,
    created_at: new Date().toISOString(),
  }
];

const DEFAULT_LMD_UES: LMDTeachingUnit[] = [
  {
    id: 'ue-101',
    tenant_id: 'default',
    program_id: 'prog-gl-l',
    code: 'INF1101',
    name: 'Algorithmique & Programmation Fondamentale',
    ue_type: 'fondamentale',
    semester: 'S1',
    credits: 6,
    description: 'Bases de l’algorithmique, structures de données linéaires et langage C',
    elements: [
      {
        id: 'ecue-101-1',
        tenant_id: 'default',
        ue_id: 'ue-101',
        code: 'INF1101-1',
        name: 'Algorithmique Avancée & Complexité',
        credits: 3,
        coefficient: 2,
        hours_cm: 24,
        hours_td: 18,
        hours_tp: 12,
      },
      {
        id: 'ecue-101-2',
        tenant_id: 'default',
        ue_id: 'ue-101',
        code: 'INF1101-2',
        name: 'Atelier de Programmation Langage C',
        credits: 3,
        coefficient: 1,
        hours_cm: 12,
        hours_td: 12,
        hours_tp: 24,
      }
    ]
  },
  {
    id: 'ue-102',
    tenant_id: 'default',
    program_id: 'prog-gl-l',
    code: 'INF1102',
    name: 'Architecture & Systèmes Informatiques',
    ue_type: 'fondamentale',
    semester: 'S1',
    credits: 6,
    description: 'Composants matériels, assembleur, logique combinatoire et systèmes Linux',
    elements: [
      {
        id: 'ecue-102-1',
        tenant_id: 'default',
        ue_id: 'ue-102',
        code: 'INF1102-1',
        name: 'Architecture des Ordinateurs & Microprocesseurs',
        credits: 3,
        coefficient: 1.5,
        hours_cm: 20,
        hours_td: 16,
        hours_tp: 8,
      },
      {
        id: 'ecue-102-2',
        tenant_id: 'default',
        ue_id: 'ue-102',
        code: 'INF1102-2',
        name: 'Systèmes d’Exploitation UNIX / Linux',
        credits: 3,
        coefficient: 1.5,
        hours_cm: 16,
        hours_td: 12,
        hours_tp: 20,
      }
    ]
  },
  {
    id: 'ue-103',
    tenant_id: 'default',
    program_id: 'prog-gl-l',
    code: 'MAT1103',
    name: 'Mathématiques pour l’Ingénieur',
    ue_type: 'complementaire',
    semester: 'S1',
    credits: 6,
    description: 'Algèbre linéaire, analyse et probabilités discrètes',
    elements: [
      {
        id: 'ecue-103-1',
        tenant_id: 'default',
        ue_id: 'ue-103',
        code: 'MAT1103-1',
        name: 'Algèbre Linéaire & Calcul Matriciel',
        credits: 3,
        coefficient: 1.5,
        hours_cm: 24,
        hours_td: 20,
        hours_tp: 0,
      },
      {
        id: 'ecue-103-2',
        tenant_id: 'default',
        ue_id: 'ue-103',
        code: 'MAT1103-2',
        name: 'Analyse & Suites Numériques',
        credits: 3,
        coefficient: 1.5,
        hours_cm: 24,
        hours_td: 20,
        hours_tp: 0,
      }
    ]
  },
  {
    id: 'ue-104',
    tenant_id: 'default',
    program_id: 'prog-gl-l',
    code: 'TEC1104',
    name: 'Langues & Méthodologie Universitaire',
    ue_type: 'transversale',
    semester: 'S1',
    credits: 6,
    description: 'Anglais technique pour informaticiens, communication écrite et méthodologie de recherche documentaire',
    elements: [
      {
        id: 'ecue-104-1',
        tenant_id: 'default',
        ue_id: 'ue-104',
        code: 'TEC1104-1',
        name: 'Anglais Technique & Préparation Certification',
        credits: 3,
        coefficient: 1,
        hours_cm: 15,
        hours_td: 25,
        hours_tp: 0,
      },
      {
        id: 'ecue-104-2',
        tenant_id: 'default',
        ue_id: 'ue-104',
        code: 'TEC1104-2',
        name: 'Communication Professionnelle & Expression',
        credits: 3,
        coefficient: 1,
        hours_cm: 15,
        hours_td: 20,
        hours_tp: 0,
      }
    ]
  },
  {
    id: 'ue-105',
    tenant_id: 'default',
    program_id: 'prog-gl-l',
    code: 'ECO1105',
    name: 'Initiation à l’Économie & Gestion d’Entreprise',
    ue_type: 'optionnelle',
    semester: 'S1',
    credits: 6,
    description: 'Comprendre l’écosystème d’entreprise, comptabilité de base et entrepreneuriat',
    elements: [
      {
        id: 'ecue-105-1',
        tenant_id: 'default',
        ue_id: 'ue-105',
        code: 'ECO1105-1',
        name: 'Économie Générale & Notions d’Entreprise',
        credits: 3,
        coefficient: 1,
        hours_cm: 20,
        hours_td: 15,
        hours_tp: 0,
      },
      {
        id: 'ecue-105-2',
        tenant_id: 'default',
        ue_id: 'ue-105',
        code: 'ECO1105-2',
        name: 'Comptabilité Fondamentale pour Managers',
        credits: 3,
        coefficient: 1,
        hours_cm: 20,
        hours_td: 15,
        hours_tp: 0,
      }
    ]
  }
];

export function useLMD() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  // Local storage cache keys for offline / fallback state
  const UES_STORAGE_KEY = `eureka_lmd_ues_${tenantId || 'global'}`;
  const GRADES_STORAGE_KEY = `eureka_lmd_grades_${tenantId || 'global'}`;
  const DELIBERATIONS_STORAGE_KEY = `eureka_lmd_deliberations_${tenantId || 'global'}`;

  // Helper to read localStorage
  const getStored = <T>(key: string, defaultVal: T): T => {
    if (typeof window === 'undefined') return defaultVal;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
    } catch {
      return defaultVal;
    }
  };

  // Helper to save localStorage
  const setStored = <T>(key: string, val: T) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error(e);
    }
  };

  // 1. PROGRAMS (Filières LMD)
  const programsQuery = useQuery({
    queryKey: ['lmd_programs', tenantId],
    queryFn: async () => {
      if (!tenantId) return DEFAULT_LMD_PROGRAMS;
      try {
        const { data, error } = await supabase
          .from('programs')
          .select('*, department:department_id(*)')
          .eq('tenant_id', tenantId);

        if (error || !data || data.length === 0) {
          return DEFAULT_LMD_PROGRAMS;
        }
        return data as (Program & { department?: Department })[];
      } catch {
        return DEFAULT_LMD_PROGRAMS;
      }
    },
    enabled: true,
  });

  // 2. TEACHING UNITS (UEs) WITH ECUEs
  const teachingUnitsQuery = useQuery({
    queryKey: ['lmd_teaching_units', tenantId],
    queryFn: async () => {
      if (!tenantId) return getStored<LMDTeachingUnit[]>(UES_STORAGE_KEY, DEFAULT_LMD_UES);

      try {
        const { data: ues, error } = await supabase
          .from('lmd_teaching_units')
          .select('*, elements:lmd_ecue(*, teacher:teacher_id(full_name, email))')
          .eq('tenant_id', tenantId)
          .order('code', { ascending: true });

        if (error || !ues || ues.length === 0) {
          return getStored<LMDTeachingUnit[]>(UES_STORAGE_KEY, DEFAULT_LMD_UES);
        }
        return ues as LMDTeachingUnit[];
      } catch {
        return getStored<LMDTeachingUnit[]>(UES_STORAGE_KEY, DEFAULT_LMD_UES);
      }
    },
  });

  // CREATE UE
  const createUEMutation = useMutation({
    mutationFn: async (newUe: Omit<LMDTeachingUnit, 'id' | 'created_at' | 'elements'>) => {
      const id = crypto.randomUUID();
      const ueToSave: LMDTeachingUnit = {
        ...newUe,
        id,
        tenant_id: tenantId || 'default',
        elements: []
      };

      try {
        if (tenantId) {
          const { data, error } = await supabase
            .from('lmd_teaching_units')
            .insert([{
              id,
              tenant_id: tenantId,
              program_id: newUe.program_id,
              code: newUe.code,
              name: newUe.name,
              ue_type: newUe.ue_type,
              semester: newUe.semester,
              credits: newUe.credits,
              description: newUe.description
            }])
            .select()
            .single();

          if (!error && data) {
            queryClient.invalidateQueries({ queryKey: ['lmd_teaching_units', tenantId] });
            return data;
          }
        }
      } catch (err) {
        console.warn('DB table might be pending, saving locally:', err);
      }

      // Fallback local save
      const current = getStored<LMDTeachingUnit[]>(UES_STORAGE_KEY, DEFAULT_LMD_UES);
      const updated = [ueToSave, ...current];
      setStored(UES_STORAGE_KEY, updated);
      queryClient.setQueryData(['lmd_teaching_units', tenantId], updated);
      return ueToSave;
    },
    onSuccess: () => {
      toast.success("Unité d'Enseignement (UE) créée avec succès");
      queryClient.invalidateQueries({ queryKey: ['lmd_teaching_units'] });
    },
    onError: (err) => {
      toast.error("Erreur lors de la création de l'UE");
      console.error(err);
    }
  });

  // CREATE ECUE (Matière d'une UE)
  const createEcueMutation = useMutation({
    mutationFn: async (newEcue: Omit<LMDEcue, 'id' | 'created_at'>) => {
      const id = crypto.randomUUID();
      const ecueToSave: LMDEcue = {
        ...newEcue,
        id,
        tenant_id: tenantId || 'default'
      };

      try {
        if (tenantId) {
          const { data, error } = await supabase
            .from('lmd_ecue')
            .insert([{ ...ecueToSave, tenant_id: tenantId }])
            .select()
            .single();

          if (!error && data) {
            queryClient.invalidateQueries({ queryKey: ['lmd_teaching_units', tenantId] });
            return data;
          }
        }
      } catch (err) {
        console.warn('DB table might be pending, saving locally:', err);
      }

      // Fallback local update
      const current = getStored<LMDTeachingUnit[]>(UES_STORAGE_KEY, DEFAULT_LMD_UES);
      const updated = current.map(u => {
        if (u.id === newEcue.ue_id) {
          const elems = u.elements || [];
          return { ...u, elements: [...elems, ecueToSave] };
        }
        return u;
      });
      setStored(UES_STORAGE_KEY, updated);
      queryClient.setQueryData(['lmd_teaching_units', tenantId], updated);
      return ecueToSave;
    },
    onSuccess: () => {
      toast.success("Élément Constitutif (ECUE) rattaché à l'UE");
      queryClient.invalidateQueries({ queryKey: ['lmd_teaching_units'] });
    },
    onError: (err) => {
      toast.error("Erreur lors de l'ajout de l'ECUE");
      console.error(err);
    }
  });

  // 3. GRADES (Notes d'évaluations LMD)
  const gradesQuery = useQuery({
    queryKey: ['lmd_grades', tenantId],
    queryFn: async () => {
      if (!tenantId) return getStored<LMDStudentGrade[]>(GRADES_STORAGE_KEY, []);
      try {
        const { data, error } = await supabase
          .from('lmd_student_grades')
          .select('*')
          .eq('tenant_id', tenantId);

        if (error || !data || data.length === 0) {
          return getStored<LMDStudentGrade[]>(GRADES_STORAGE_KEY, []);
        }
        return data as LMDStudentGrade[];
      } catch {
        return getStored<LMDStudentGrade[]>(GRADES_STORAGE_KEY, []);
      }
    }
  });

  // SAVE GRADES MUTATION
  const saveGradesMutation = useMutation({
    mutationFn: async (gradesToSave: Partial<LMDStudentGrade>[]) => {
      const computedGrades = gradesToSave.map(g => {
        const cc = g.cc_score ?? 0;
        const exam = g.exam_score ?? 0;
        const resit = g.resit_score;
        // LMD standard formula: CC 40% + Max(SN, SR) 60%
        const effectiveExam = resit != null && !isNaN(resit) ? Math.max(exam, resit) : exam;
        const finalScore = Number(((cc * 0.4) + (effectiveExam * 0.6)).toFixed(2));
        const isValidated = finalScore >= 10.0;

        return {
          ...g,
          id: g.id || crypto.randomUUID(),
          tenant_id: tenantId || 'default',
          final_score: finalScore,
          is_validated: isValidated,
          academic_year: g.academic_year || '2025-2026',
        };
      });

      try {
        if (tenantId) {
          const { error } = await supabase
            .from('lmd_student_grades')
            .upsert(computedGrades, { onConflict: 'student_id,ecue_id,semester,academic_year' });
          if (!error) {
            queryClient.invalidateQueries({ queryKey: ['lmd_grades', tenantId] });
            return computedGrades;
          }
        }
      } catch (err) {
        console.warn('DB upsert fallback to local storage:', err);
      }

      // Local fallback
      const current = getStored<LMDStudentGrade[]>(GRADES_STORAGE_KEY, []);
      const updatedMap = new Map<string, LMDStudentGrade>();
      current.forEach(g => updatedMap.set(`${g.student_id}_${g.ecue_id}_${g.semester}`, g));
      computedGrades.forEach(g => updatedMap.set(`${g.student_id}_${g.ecue_id}_${g.semester}`, g as LMDStudentGrade));
      const updatedList = Array.from(updatedMap.values());
      setStored(GRADES_STORAGE_KEY, updatedList);
      queryClient.setQueryData(['lmd_grades', tenantId], updatedList);
      return computedGrades;
    },
    onSuccess: () => {
      toast.success("Notes LMD et crédits enregistrés avec succès !");
      queryClient.invalidateQueries({ queryKey: ['lmd_grades'] });
    },
    onError: (err) => {
      toast.error("Erreur lors de l'enregistrement des notes LMD");
      console.error(err);
    }
  });

  // 4. DELIBERATIONS (PV de Jury de Faculté)
  const deliberationsQuery = useQuery({
    queryKey: ['lmd_deliberations', tenantId],
    queryFn: async () => {
      if (!tenantId) return getStored<LMDDeliberation[]>(DELIBERATIONS_STORAGE_KEY, []);
      try {
        const { data, error } = await supabase
          .from('lmd_deliberations')
          .select('*, student:student_id(first_name, last_name, student_code)')
          .eq('tenant_id', tenantId);

        if (error || !data || data.length === 0) {
          return getStored<LMDDeliberation[]>(DELIBERATIONS_STORAGE_KEY, []);
        }
        return data as LMDDeliberation[];
      } catch {
        return getStored<LMDDeliberation[]>(DELIBERATIONS_STORAGE_KEY, []);
      }
    }
  });

  // SAVE DELIBERATIONS MUTATION
  const saveDeliberationsMutation = useMutation({
    mutationFn: async (deliberations: Partial<LMDDeliberation>[]) => {
      const items = deliberations.map(d => ({
        ...d,
        id: d.id || crypto.randomUUID(),
        tenant_id: tenantId || 'default',
        created_at: new Date().toISOString()
      }));

      try {
        if (tenantId) {
          const { error } = await supabase
            .from('lmd_deliberations')
            .upsert(items, { onConflict: 'student_id,semester,academic_year' });
          if (!error) {
            queryClient.invalidateQueries({ queryKey: ['lmd_deliberations', tenantId] });
            return items;
          }
        }
      } catch (err) {
        console.warn('DB upsert deliberations fallback:', err);
      }

      const current = getStored<LMDDeliberation[]>(DELIBERATIONS_STORAGE_KEY, []);
      const map = new Map<string, LMDDeliberation>();
      current.forEach(d => map.set(`${d.student_id}_${d.semester}`, d));
      items.forEach(d => map.set(`${d.student_id}_${d.semester}`, d as LMDDeliberation));
      const res = Array.from(map.values());
      setStored(DELIBERATIONS_STORAGE_KEY, res);
      queryClient.setQueryData(['lmd_deliberations', tenantId], res);
      return res;
    },
    onSuccess: () => {
      toast.success("Procès-verbal de délibération LMD validé et enregistré");
      queryClient.invalidateQueries({ queryKey: ['lmd_deliberations'] });
    },
    onError: (err) => {
      toast.error("Erreur lors de la validation du PV de délibération");
      console.error(err);
    }
  });

  return {
    programsQuery,
    teachingUnitsQuery,
    createUEMutation,
    createEcueMutation,
    gradesQuery,
    saveGradesMutation,
    deliberationsQuery,
    saveDeliberationsMutation,
    defaultUes: DEFAULT_LMD_UES,
    defaultPrograms: DEFAULT_LMD_PROGRAMS,
  };
}
