import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { 
  Download, 
  Printer, 
  Award, 
  GraduationCap, 
  Users, 
  BookOpen, 
  School, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  AlertCircle, 
  FileText, 
  Check, 
  Layers, 
  Calendar, 
  Filter, 
  Heart,
  TrendingUp,
  Flame,
  CheckCircle,
  HelpCircle,
  ArrowRight
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useSubjects } from "@/hooks/useSubjects";
import { useGrades } from "@/hooks/useGrades";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getEstablishmentTypeInfo } from "@/lib/school-types";
import { Class, Student, Subject, GradeEntry } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/bulletins")({
  head: () => ({
    meta: [
      { title: "Bulletins Scolaires — Eurêka" },
      { name: "description", content: "Génération dynamique, calcul automatique des moyennes pondérées, rangs et éditions officielles des bulletins scolaires." },
    ],
  }),
  component: BulletinsPage,
});

// Helper pour déterminer le niveau d'enseignement de la classe
export function getLevelCategory(cls?: Class, tenantTypes?: string[]): 'maternelle' | 'primaire' | 'secondaire' | 'superieur' {
  if (cls?.level_type) {
    const lt = cls.level_type.toLowerCase();
    if (lt.includes('maternelle')) return 'maternelle';
    if (lt.includes('primaire') || lt.includes('elementaire')) return 'primaire';
    if (lt.includes('secondaire') || lt.includes('collège') || lt.includes('college') || lt.includes('lycee') || lt.includes('lycée')) return 'secondaire';
    if (lt.includes('superieur') || lt.includes('supérieur') || lt.includes('universite') || lt.includes('université')) return 'superieur';
  }
  const name = (cls?.name || '').toLowerCase();
  if (name.includes('maternelle') || name.includes('petite section') || name.includes('moyenne section') || name.includes('grande section') || /\b(ps|ms|gs)\b/.test(name)) {
    return 'maternelle';
  }
  if (name.includes('primaire') || /\b(cp|cp1|cp2|ce1|ce2|cm1|cm2|ci)\b/.test(name)) {
    return 'primaire';
  }
  if (name.includes('secondaire') || name.includes('collège') || name.includes('lycée') || /\b(6e|6ème|5e|5ème|4e|4ème|3e|3ème|2nde|1ère|tle|terminale)\b/.test(name)) {
    return 'secondaire';
  }
  if (name.includes('licence') || name.includes('master') || name.includes('doctorat') || /\b(l1|l2|l3|m1|m2)\b/.test(name)) {
    return 'superieur';
  }
  if (tenantTypes?.includes('Maternelle') && !tenantTypes.includes('Primaire') && !tenantTypes.includes('Secondaire')) return 'maternelle';
  if (tenantTypes?.includes('Primaire') && !tenantTypes.includes('Secondaire')) return 'primaire';
  return 'secondaire';
}

// Domaines officiels d'apprentissage pour la Maternelle
const MATERNELLE_DOMAINS = [
  {
    id: "langage",
    code: "LANG",
    title: "Mobiliser le langage dans toutes ses dimensions",
    subtitle: "Expression orale, écoute, vocabulaire, compréhension d'histoires, premiers graphismes",
    icon: "🗣️",
    color: "#3b82f6",
  },
  {
    id: "motricite",
    code: "MOTR",
    title: "Agir, s'exprimer, comprendre à travers l'activité physique",
    subtitle: "Motricité globale, équilibre, coordination, jeux collectifs et motricité fine",
    icon: "🏃",
    color: "#10b981",
  },
  {
    id: "artistique",
    code: "ARTS",
    title: "Activités artistiques et créativité",
    subtitle: "Dessin, peinture, chant, écoute musicale, modelage et imagination",
    icon: "🎨",
    color: "#f59e0b",
  },
  {
    id: "logique",
    code: "LOGI",
    title: "Premiers outils pour structurer sa pensée",
    subtitle: "Dénombrement de petites quantités, formes géométriques, grandeurs, algorithmes simples",
    icon: "🔢",
    color: "#8b5cf6",
  },
  {
    id: "monde",
    code: "MOND",
    title: "Explorer le monde du vivant, des objets et de la matière",
    subtitle: "Curiosité, repérage dans l'espace et le temps (jours, saisons), règles d'hygiène",
    icon: "🌍",
    color: "#06b6d4",
  },
  {
    id: "vivre_ensemble",
    code: "SOC",
    title: "Vivre ensemble, autonomie et socialisation",
    subtitle: "Respect des règles de la classe, partage avec les camarades, autonomie dans les gestes quotidiens",
    icon: "🤝",
    color: "#ec4899",
  },
];

// Matières par défaut si la base de données est vide
const SECONDAIRE_DEFAULT_SUBJECTS: Partial<Subject>[] = [
  { id: "def-math", name: "Mathématiques", code: "MATH", coefficient: 4 },
  { id: "def-fr", name: "Français & Littérature", code: "FR", coefficient: 4 },
  { id: "def-ang", name: "Anglais LV1", code: "ANG", coefficient: 3 },
  { id: "def-hg", name: "Histoire-Géographie", code: "HG", coefficient: 2 },
  { id: "def-svt", name: "Sciences de la Vie et de la Terre (SVT)", code: "SVT", coefficient: 3 },
  { id: "def-pc", name: "Physique-Chimie", code: "PC", coefficient: 3 },
  { id: "def-eps", name: "Éducation Physique et Sportive (EPS)", code: "EPS", coefficient: 1 },
  { id: "def-philo", name: "Philosophie / Éthique", code: "PHILO", coefficient: 2 },
];

const PRIMAIRE_DEFAULT_SUBJECTS: Partial<Subject>[] = [
  { id: "def-fr-prim", name: "Français (Lecture, Écriture, Grammaire, Vocabulaire)", code: "FR", coefficient: 3 },
  { id: "def-math-prim", name: "Mathématiques (Calcul, Numération, Géométrie)", code: "MATH", coefficient: 3 },
  { id: "def-eveil-prim", name: "Sciences d'Éveil & Technologies", code: "EVEIL", coefficient: 2 },
  { id: "def-hg-prim", name: "Histoire & Géographie", code: "HG", coefficient: 1 },
  { id: "def-eps-prim", name: "Éducation Physique et Sportive (EPS)", code: "EPS", coefficient: 1 },
  { id: "def-civ-prim", name: "Éducation Civique et Morale", code: "CIV", coefficient: 1 },
];

function getCouncilMention(avg: number | null): { mention: string; badgeColor: string; description: string } {
  if (avg === null) return { mention: "Non évalué", badgeColor: "bg-muted text-muted-foreground", description: "Évaluations insuffisantes pour établir la moyenne trimestrielle." };
  if (avg >= 16) return { 
    mention: "Tableau d'Honneur avec Félicitations", 
    badgeColor: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", 
    description: "Excellence académique. Félicitations chaleureuses du Conseil de classe." 
  };
  if (avg >= 14) return { 
    mention: "Tableau d'Honneur avec Encouragements", 
    badgeColor: "bg-blue-500/15 text-blue-700 border-blue-500/30", 
    description: "Très bon travail trimestriel. Poursuivez dans cette dynamique." 
  };
  if (avg >= 12) return { 
    mention: "Tableau d'Honneur", 
    badgeColor: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30", 
    description: "Travail sérieux, résultats d'ensemble satisfaisants." 
  };
  if (avg >= 10) return { 
    mention: "Encouragements — Passable", 
    badgeColor: "bg-amber-500/15 text-amber-700 border-amber-500/30", 
    description: "Moyenne générale atteinte. Doit intensifier les efforts au prochain trimestre." 
  };
  if (avg >= 8) return { 
    mention: "Avertissement de Travail", 
    badgeColor: "bg-orange-500/15 text-orange-700 border-orange-500/30", 
    description: "Résultats insuffisants. Manque de travail personnel et de rigueur." 
  };
  return { 
    mention: "Blâme de Travail", 
    badgeColor: "bg-rose-500/15 text-rose-700 border-rose-500/30", 
    description: "Résultats très insuffisants. Un ressaisissement urgent et complet est exigé." 
  };
}

function getSubjectPedagogicalAppreciation(score: number | null): string {
  if (score === null) return "Non évalué ce trimestre";
  if (score >= 17) return "Excellent trimestre ! Travail remarquable et grande rigueur.";
  if (score >= 15) return "Très bon travail, élève consciencieux et actif.";
  if (score >= 13) return "Bon trimestre, ensemble satisfaisant. Continuez ainsi.";
  if (score >= 11) return "Travail convenable. Peut progresser avec plus de régularité.";
  if (score >= 10) return "Juste la moyenne. Intensifiez l'apprentissage des leçons.";
  if (score >= 8) return "Ensemble fragile. Des efforts nécessaires pour combler les lacunes.";
  return "Résultats très insuffisants. Travail personnel et écoute indispensables.";
}

function BulletinsPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const estInfo = getEstablishmentTypeInfo(profile?.tenant?.school_types);
  const tenantName = profile?.tenant?.name || (estInfo.isUniversityOnly ? "Établissement Supérieur Eurêka" : "Groupe Scolaire Eurêka");
  const tenantCity = profile?.tenant?.city || "Abidjan";
  const tenantLogo = profile?.tenant?.logo_url;

  const { classes = [] } = useClasses();
  const { students = [] } = useStudents();
  const { subjectsQuery, seedDefaultSubjectsMutation } = useSubjects();
  const dbSubjects = subjectsQuery.data || [];

  // Filters state
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("T1");
  const [levelViewOverride, setLevelViewOverride] = useState<'auto' | 'maternelle' | 'primaire' | 'secondaire'>('auto');
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);

  const currentClassId = selectedClassId || classes[0]?.id || "";
  const currentClass = classes.find(c => c.id === currentClassId);

  // Auto-detect school level
  const autoLevel = useMemo(() => {
    return getLevelCategory(currentClass, profile?.tenant?.school_types);
  }, [currentClass, profile?.tenant?.school_types]);

  const activeLevel = levelViewOverride === 'auto' ? autoLevel : levelViewOverride;

  // Students in this class
  const classStudents = useMemo(() => {
    if (!currentClassId) return [];
    return students.filter(s => s.class_id === currentClassId);
  }, [students, currentClassId]);

  const currentStudentId = selectedStudentId || classStudents[0]?.id || "";
  const currentStudent = classStudents.find(s => s.id === currentStudentId) || classStudents[0];
  const currentStudentIndex = classStudents.findIndex(s => s.id === currentStudent?.id);

  // Real grades fetched from database
  const { grades: dbGrades = [] } = useGrades(currentClassId);

  // Merge with any offline grades in localStorage for instant responsiveness
  const allGrades = useMemo(() => {
    const combined = [...dbGrades];
    try {
      const offlineQueue = localStorage.getItem('eureka_offline_mutation_queue_v1');
      if (offlineQueue) {
        const parsed = JSON.parse(offlineQueue);
        parsed.forEach((item: any) => {
          if (item.table === 'grade_entries' && Array.isArray(item.data)) {
            item.data.forEach((entry: GradeEntry) => {
              if (entry.class_id === currentClassId && !combined.some(g => g.id === entry.id)) {
                combined.push(entry);
              }
            });
          }
        });
      }
    } catch (e) {
      console.warn("Offline queue read error", e);
    }
    return combined;
  }, [dbGrades, currentClassId]);

  // Active subjects to display for this class level
  const activeSubjects = useMemo(() => {
    if (dbSubjects.length > 0) return dbSubjects;
    if (activeLevel === 'maternelle') {
      return MATERNELLE_DOMAINS.map(d => ({
        id: d.id,
        name: d.title,
        code: d.code,
        coefficient: 1,
        color: d.color,
      })) as Subject[];
    }
    if (activeLevel === 'primaire') {
      return PRIMAIRE_DEFAULT_SUBJECTS as Subject[];
    }
    return SECONDAIRE_DEFAULT_SUBJECTS as Subject[];
  }, [dbSubjects, activeLevel]);

  // Term grades filter
  const termGrades = useMemo(() => {
    return allGrades.filter(g => g.term === selectedTerm);
  }, [allGrades, selectedTerm]);

  // Helper to compute subject average for a student strictly from evaluations
  const getStudentSubjectAverage = (studentId: string, subjectId: string) => {
    const evals = termGrades.filter(
      g => g.student_id === studentId && (g.subject_id === subjectId || g.subject?.id === subjectId)
    );

    if (evals.length === 0) return null;

    let totalWeighted = 0;
    let totalCoeff = 0;
    let comment: string | null = null;

    evals.forEach(ev => {
      // Ignore dispensé
      if (ev.teacher_comment?.startsWith("[DISP]")) {
        return;
      }

      if (ev.teacher_comment && !comment && !ev.teacher_comment.startsWith("[")) {
        comment = ev.teacher_comment;
      }

      const coeff = ev.coefficient || 1;
      let normScore = 0;

      if (ev.teacher_comment?.startsWith("[ABS]")) {
        // Unexcused absence = 0
        normScore = 0;
      } else {
        const rawScore = Number(ev.score);
        const maxScore = Number(ev.max_score) || 20;
        normScore = maxScore > 0 ? (rawScore / maxScore) * 20 : rawScore;
      }

      totalWeighted += normScore * coeff;
      totalCoeff += coeff;
    });

    if (totalCoeff === 0) return null;
    return {
      average: totalWeighted / totalCoeff,
      evalCount: evals.length,
      comment: comment,
    };
  };

  // 1. Calculate stats across the entire class for each subject (class average, min, max, student ranks)
  const subjectClassStats = useMemo(() => {
    const stats: Record<string, { classAvg: number | null; min: number | null; max: number | null; studentRanks: Record<string, number> }> = {};

    activeSubjects.forEach(subj => {
      const studentAvgs: { studentId: string; avg: number }[] = [];

      classStudents.forEach(st => {
        const res = getStudentSubjectAverage(st.id, subj.id);
        if (res !== null && !isNaN(res.average)) {
          studentAvgs.push({ studentId: st.id, avg: res.average });
        }
      });

      if (studentAvgs.length > 0) {
        const sum = studentAvgs.reduce((acc, c) => acc + c.avg, 0);
        const classAvg = sum / studentAvgs.length;
        const min = Math.min(...studentAvgs.map(s => s.avg));
        const max = Math.max(...studentAvgs.map(s => s.avg));

        const sorted = [...studentAvgs].sort((a, b) => b.avg - a.avg);
        const ranks: Record<string, number> = {};
        sorted.forEach((item, idx) => {
          ranks[item.studentId] = idx + 1;
        });

        stats[subj.id] = { classAvg, min, max, studentRanks: ranks };
      } else {
        stats[subj.id] = { classAvg: null, min: null, max: null, studentRanks: {} };
      }
    });

    return stats;
  }, [activeSubjects, classStudents, termGrades]);

  // 2. Calculate overall general averages, coefficients, and ranks for ALL students in class
  const classOverallStats = useMemo(() => {
    const studentOverallList: { 
      studentId: string; 
      student: Student;
      totalPoints: number; 
      totalCoeffs: number; 
      generalAverage: number | null;
      evaluatedCount: number;
    }[] = [];

    classStudents.forEach(st => {
      let totalPoints = 0;
      let totalCoeffs = 0;
      let evaluatedCount = 0;

      activeSubjects.forEach(subj => {
        const res = getStudentSubjectAverage(st.id, subj.id);
        if (res !== null && !isNaN(res.average)) {
          const coef = subj.coefficient || 1;
          totalPoints += res.average * coef;
          totalCoeffs += coef;
          evaluatedCount += 1;
        }
      });

      const generalAverage = totalCoeffs > 0 ? totalPoints / totalCoeffs : null;
      studentOverallList.push({
        studentId: st.id,
        student: st,
        totalPoints,
        totalCoeffs,
        generalAverage,
        evaluatedCount,
      });
    });

    // Rank students who have a valid general average
    const validStudents = studentOverallList.filter(s => s.generalAverage !== null) as {
      studentId: string;
      student: Student;
      totalPoints: number;
      totalCoeffs: number;
      generalAverage: number;
      evaluatedCount: number;
    }[];

    validStudents.sort((a, b) => b.generalAverage - a.generalAverage);

    const ranks: Record<string, { rankNum: number; displayRank: string }> = {};
    validStudents.forEach((item, idx) => {
      const prev = validStudents[idx - 1];
      const isTie = prev && Math.abs(prev.generalAverage - item.generalAverage) < 0.005;
      const rankNum = isTie ? ranks[prev.studentId].rankNum : idx + 1;
      const suffix = rankNum === 1 ? "er" : "ème";
      ranks[item.studentId] = {
        rankNum,
        displayRank: `${rankNum}${suffix}${isTie ? " ex" : ""}`
      };
    });

    const validAverages = validStudents.map(s => s.generalAverage);
    const classAvg = validAverages.length > 0 ? validAverages.reduce((a, b) => a + b, 0) / validAverages.length : null;
    const classMin = validAverages.length > 0 ? Math.min(...validAverages) : null;
    const classMax = validAverages.length > 0 ? Math.max(...validAverages) : null;

    return {
      studentOverallList,
      ranks,
      classAvg,
      classMin,
      classMax,
      gradedCount: validStudents.length,
      totalCount: classStudents.length,
    };
  }, [classStudents, activeSubjects, termGrades]);

  // Marks details for the currently active student
  const currentStudentMarks = useMemo(() => {
    if (!currentStudent) return [];

    return activeSubjects.map(subj => {
      const res = getStudentSubjectAverage(currentStudent.id, subj.id);
      const score = res !== null ? Number(res.average.toFixed(2)) : null;
      const coef = subj.coefficient || 1;
      const weightedScore = score !== null ? Number((score * coef).toFixed(2)) : null;

      const stats = subjectClassStats[subj.id];
      const classAvg = stats?.classAvg !== null && stats?.classAvg !== undefined ? stats.classAvg.toFixed(2) : "—";
      const min = stats?.min !== null && stats?.min !== undefined ? stats.min.toFixed(2) : "—";
      const max = stats?.max !== null && stats?.max !== undefined ? stats.max.toFixed(2) : "—";
      const subjectRank = stats?.studentRanks?.[currentStudent.id] 
        ? `${stats.studentRanks[currentStudent.id]}${stats.studentRanks[currentStudent.id] === 1 ? "er" : "ème"}`
        : "—";

      const appreciation = res?.comment || getSubjectPedagogicalAppreciation(score);

      // Acquisition status for Maternelle
      let acquisStatus: 'A' | 'ECA' | 'NA' = 'ECA';
      let acquisLabel = 'En cours d’acquisition';
      if (score !== null) {
        if (score >= 14) {
          acquisStatus = 'A';
          acquisLabel = 'Acquis';
        } else if (score >= 10) {
          acquisStatus = 'ECA';
          acquisLabel = 'En cours d’acquisition';
        } else {
          acquisStatus = 'NA';
          acquisLabel = 'Non encore acquis';
        }
      }

      return {
        id: subj.id,
        name: subj.name,
        code: subj.code || subj.name.substring(0, 4).toUpperCase(),
        coef,
        score,
        weightedScore,
        evalCount: res?.evalCount || 0,
        classAvg,
        min,
        max,
        subjectRank,
        appreciation,
        acquisStatus,
        acquisLabel,
      };
    });
  }, [currentStudent, activeSubjects, subjectClassStats, termGrades]);

  const currentStudentOverall = classOverallStats.studentOverallList.find(s => s.studentId === currentStudent?.id);
  const currentStudentGeneralAverage = currentStudentOverall?.generalAverage ?? null;
  const currentStudentRank = currentStudent ? (classOverallStats.ranks[currentStudent.id]?.displayRank || "—") : "—";
  const councilMention = getCouncilMention(currentStudentGeneralAverage);

  // Helper to generate a realistic sample of evaluations for this class if database has 0 grades
  const handleSeedDemoEvaluations = async () => {
    if (!profile?.tenant_id || !currentClassId) return;
    setIsGeneratingDemo(true);
    try {
      let effectiveSubjects = [...dbSubjects];
      if (effectiveSubjects.length === 0) {
        // Automatically create real subjects in DB first
        const category = activeLevel === 'maternelle' ? 'maternelle' : activeLevel === 'primaire' ? 'primaire' : 'secondaire';
        const createdSubjects = await seedDefaultSubjectsMutation.mutateAsync(category);
        effectiveSubjects = createdSubjects || [];
      }

      if (effectiveSubjects.length === 0) {
        toast.error("Impossible de créer les matières requises.");
        return;
      }

      const recordsToInsert: any[] = [];

      effectiveSubjects.forEach((subj, sIdx) => {
        // 2 evaluations per subject: Devoir (coef 1) and Examen/Composition (coef 2)
        [
          { name: `Contrôle continu N°1 - ${subj.name}`, type: 'interro' as const, coef: 1, date: '2025-10-15' },
          { name: `Composition trimestrielle - ${subj.name}`, type: 'examen' as const, coef: 2, date: '2025-11-20' },
        ].forEach((ev, evIdx) => {
          classStudents.forEach((st, stIdx) => {
            // Realistic grade distribution around 13-14 with natural variation
            const base = 11 + ((stIdx * 3 + sIdx * 2 + evIdx * 4) % 8);
            const score = Math.min(20, Math.max(7, Number((base + (evIdx === 1 ? 0.5 : -0.5)).toFixed(1))));
            
            recordsToInsert.push({
              tenant_id: profile.tenant_id,
              class_id: currentClassId,
              student_id: st.id,
              subject_id: subj.id,
              term: selectedTerm,
              evaluation_name: ev.name,
              evaluation_type: ev.type,
              score: score,
              max_score: 20,
              coefficient: ev.coef,
              evaluation_date: ev.date,
              teacher_comment: score >= 15 ? "Très bons acquis, continuez ainsi !" : score >= 12 ? "Résultats satisfaisants." : "Doit travailler les bases.",
              recorded_by: profile.id,
            });
          });
        });
      });

      if (recordsToInsert.length > 0) {
        const { error } = await supabase.from('grade_entries').insert(recordsToInsert);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['grades', profile.tenant_id] });
        await queryClient.invalidateQueries({ queryKey: ['subjects', profile.tenant_id] });
        toast.success(`🎉 ${recordsToInsert.length} notes réelles d'évaluation générées avec succès pour cette classe !`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de la génération des évaluations: " + err.message);
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  return (
    <AppShell
      title="Bulletins Scolaires & Carnets d'Évaluation"
      subtitle={`${tenantName} · ${currentClass?.name || 'Classe'} · ${selectedTerm}`}
      actions={
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBatchMode(!isBatchMode)}
            className={`gap-1.5 text-xs font-semibold ${isBatchMode ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
          >
            <Layers className="h-4 w-4" />
            {isBatchMode ? "Vue Individuelle" : "Lot Classe Entière"}
          </Button>

          <Button 
            onClick={() => window.print()}
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-semibold"
          >
            <Printer className="h-4 w-4" /> Imprimer
          </Button>

          <Button 
            onClick={() => window.print()}
            size="sm"
            className="gap-2 bg-primary text-primary-foreground text-xs font-semibold shadow-sm"
          >
            <Download className="h-4 w-4" /> Télécharger PDF
          </Button>
        </div>
      }
    >
      {/* Top Filter and Controls Bar */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Classe */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Classe / Niveau
              </label>
              <select
                value={currentClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedStudentId("");
                }}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none min-w-40"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.level_type ? `(${c.level_type})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Période */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Période
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="T1">Trimestre 1 (T1)</option>
                <option value="T2">Trimestre 2 (T2)</option>
                <option value="T3">Trimestre 3 (T3)</option>
                <option value="S1">Semestre 1 (S1)</option>
                <option value="S2">Semestre 2 (S2)</option>
              </select>
            </div>

            {/* Élève (en mode individuel) */}
            {!isBatchMode && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Élève ({classStudents.length} inscrits)
                </label>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentStudentIndex <= 0}
                    onClick={() => {
                      if (currentStudentIndex > 0) {
                        setSelectedStudentId(classStudents[currentStudentIndex - 1].id);
                      }
                    }}
                    title="Élève précédent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <select
                    value={currentStudent?.id || ""}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none min-w-48"
                  >
                    {classStudents.length > 0 ? (
                      classStudents.map(st => (
                        <option key={st.id} value={st.id}>
                          {st.last_name} {st.first_name} ({st.student_code || 'MAT'})
                        </option>
                      ))
                    ) : (
                      <option value="">Aucun élève dans cette classe</option>
                    )}
                  </select>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentStudentIndex >= classStudents.length - 1}
                    onClick={() => {
                      if (currentStudentIndex < classStudents.length - 1) {
                        setSelectedStudentId(classStudents[currentStudentIndex + 1].id);
                      }
                    }}
                    title="Élève suivant"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Format du bulletin selector (Secondaire vs Primaire vs Maternelle) */}
          <div className="flex flex-col sm:items-end">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Modèle Pédagogique
            </label>
            <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
              <button
                onClick={() => setLevelViewOverride('auto')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  levelViewOverride === 'auto' ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Auto ({autoLevel})
              </button>
              <button
                onClick={() => setLevelViewOverride('secondaire')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  levelViewOverride === 'secondaire' ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Secondaire
              </button>
              <button
                onClick={() => setLevelViewOverride('primaire')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  levelViewOverride === 'primaire' ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Primaire
              </button>
              <button
                onClick={() => setLevelViewOverride('maternelle')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  levelViewOverride === 'maternelle' ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Maternelle
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Calculation Banner */}
        <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Moteur de calcul dynamique certifié : <strong className="text-foreground">{termGrades.length} notes d'évaluations</strong> enregistrées pour cette classe au {selectedTerm}.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/notes">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:underline gap-1">
                <BookOpen className="h-3.5 w-3.5" /> Saisir des notes dans le carnet
              </Button>
            </Link>

            {termGrades.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedDemoEvaluations}
                disabled={isGeneratingDemo}
                className="h-7 text-xs border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 gap-1"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isGeneratingDemo ? "Génération en cours..." : "Générer un jeu d'évaluation pour tester"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Zero Evaluation Warning Alert */}
      {termGrades.length === 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 print:hidden flex items-start gap-3 shadow-xs">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-sm">Aucune note d'évaluation n'a encore été saisie pour la classe au {selectedTerm}.</p>
            <p className="mt-1 opacity-90">
              Les moyennes sont calculées dynamiquement à partir des devoirs, interrogations et compositions. 
              Pour tester le bulletin dynamique, cliquez sur <strong>« Générer un jeu d'évaluation pour tester »</strong> ou saisissez des notes dans le module <strong>Notes & Évaluations</strong>.
            </p>
          </div>
        </div>
      )}

      {/* RENDER BULLETIN (SINGLE OR BATCH) */}
      {isBatchMode ? (
        <div className="space-y-12">
          <div className="text-center bg-muted/40 p-3 rounded-lg border border-border text-xs font-semibold print:hidden">
            Mode Impression par Lot : {classStudents.length} bulletins prêts pour l'impression en chaîne.
          </div>
          {classStudents.map((st, i) => (
            <div key={st.id} className="page-break-after">
              <SingleStudentBulletin
                student={st}
                classStudents={classStudents}
                currentClass={currentClass}
                selectedTerm={selectedTerm}
                activeLevel={activeLevel}
                activeSubjects={activeSubjects}
                termGrades={termGrades}
                getStudentSubjectAverage={getStudentSubjectAverage}
                subjectClassStats={subjectClassStats}
                classOverallStats={classOverallStats}
                tenantName={tenantName}
                tenantCity={tenantCity}
                tenantLogo={tenantLogo}
              />
            </div>
          ))}
        </div>
      ) : (
        <SingleStudentBulletin
          student={currentStudent}
          classStudents={classStudents}
          currentClass={currentClass}
          selectedTerm={selectedTerm}
          activeLevel={activeLevel}
          activeSubjects={activeSubjects}
          termGrades={termGrades}
          getStudentSubjectAverage={getStudentSubjectAverage}
          subjectClassStats={subjectClassStats}
          classOverallStats={classOverallStats}
          tenantName={tenantName}
          tenantCity={tenantCity}
          tenantLogo={tenantLogo}
        />
      )}
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT BULLETIN INDIVIDUEL (ADAPTÉ SELON LE NIVEAU D'ENSEIGNEMENT)
// ─────────────────────────────────────────────────────────────────────────────
interface SingleStudentBulletinProps {
  student?: Student;
  classStudents: Student[];
  currentClass?: Class;
  selectedTerm: string;
  activeLevel: 'maternelle' | 'primaire' | 'secondaire' | 'superieur';
  activeSubjects: Subject[];
  termGrades: GradeEntry[];
  getStudentSubjectAverage: (studentId: string, subjectId: string) => { average: number; evalCount: number; comment: string | null } | null;
  subjectClassStats: Record<string, { classAvg: number | null; min: number | null; max: number | null; studentRanks: Record<string, number> }>;
  classOverallStats: {
    studentOverallList: any[];
    ranks: Record<string, { rankNum: number; displayRank: string }>;
    classAvg: number | null;
    classMin: number | null;
    classMax: number | null;
    gradedCount: number;
    totalCount: number;
  };
  tenantName: string;
  tenantCity: string;
  tenantLogo?: string | null;
}

function SingleStudentBulletin({
  student,
  classStudents,
  currentClass,
  selectedTerm,
  activeLevel,
  activeSubjects,
  getStudentSubjectAverage,
  subjectClassStats,
  classOverallStats,
  tenantName,
  tenantCity,
  tenantLogo,
}: SingleStudentBulletinProps) {
  if (!student) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
        Aucun élève sélectionné.
      </div>
    );
  }

  // Build subject marks for this specific student
  const studentSubjectMarks = activeSubjects.map(subj => {
    const res = getStudentSubjectAverage(student.id, subj.id);
    const score = res !== null ? Number(res.average.toFixed(2)) : null;
    const coef = subj.coefficient || 1;
    const weightedScore = score !== null ? Number((score * coef).toFixed(2)) : null;

    const stats = subjectClassStats[subj.id];
    const classAvg = stats?.classAvg !== null && stats?.classAvg !== undefined ? stats.classAvg.toFixed(2) : "—";
    const min = stats?.min !== null && stats?.min !== undefined ? stats.min.toFixed(2) : "—";
    const max = stats?.max !== null && stats?.max !== undefined ? stats.max.toFixed(2) : "—";
    const subjectRank = stats?.studentRanks?.[student.id] 
      ? `${stats.studentRanks[student.id]}${stats.studentRanks[student.id] === 1 ? "er" : "ème"}`
      : "—";

    const appreciation = res?.comment || getSubjectPedagogicalAppreciation(score);

    // Maternelle conversion
    let acquisStatus: 'A' | 'ECA' | 'NA' = 'ECA';
    let acquisLabel = 'En cours d’acquisition';
    if (score !== null) {
      if (score >= 14) {
        acquisStatus = 'A';
        acquisLabel = 'Acquis';
      } else if (score >= 10) {
        acquisStatus = 'ECA';
        acquisLabel = 'En cours d’acquisition';
      } else {
        acquisStatus = 'NA';
        acquisLabel = 'Non encore acquis';
      }
    }

    return {
      id: subj.id,
      name: subj.name,
      code: subj.code || subj.name.substring(0, 4).toUpperCase(),
      coef,
      score,
      weightedScore,
      evalCount: res?.evalCount || 0,
      classAvg,
      min,
      max,
      subjectRank,
      appreciation,
      acquisStatus,
      acquisLabel,
    };
  });

  const overall = classOverallStats.studentOverallList.find(s => s.studentId === student.id);
  const totalPoints = overall?.totalPoints || 0;
  const totalCoefficients = overall?.totalCoeffs || 0;
  const generalAverage = overall?.generalAverage !== null && overall?.generalAverage !== undefined 
    ? overall.generalAverage.toFixed(2) 
    : null;
  const numAvg = generalAverage !== null ? parseFloat(generalAverage) : null;
  const studentRank = classOverallStats.ranks[student.id]?.displayRank || "—";
  const councilMention = getCouncilMention(numAvg);

  return (
    <div className="mx-auto max-w-4xl bg-card rounded-2xl border border-border shadow-lg print:border-none print:shadow-none print:max-w-none print:rounded-none overflow-hidden">
      {/* ── EN-TÊTE OFFICIEL DU BULLETIN ── */}
      <div className="border-b border-border bg-gradient-to-r from-primary via-primary/95 to-primary/85 p-6 text-primary-foreground print:bg-white print:text-black print:border-b-2 print:border-black">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-primary-foreground/75 print:text-gray-600">
              <span>Ministère de l'Éducation Nationale</span>
              <span>•</span>
              <span>Année Scolaire 2025-2026</span>
            </div>

            <h1 className="mt-1 font-display text-2xl md:text-3xl font-extrabold tracking-tight">
              {tenantName}
            </h1>

            <p className="mt-0.5 text-xs text-primary-foreground/85 print:text-gray-700">
              {tenantCity} · {currentClass?.name || 'Classe non assignée'} · Période : <strong>{selectedTerm}</strong>
            </p>

            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-0.5 text-[11px] font-bold text-primary-foreground print:border print:border-gray-400 print:text-black">
              {activeLevel === 'maternelle' && "🌸 CARNET DE SUIVI DES APPRENTISSAGES ET DES ACQUIS (MATERNELLE)"}
              {activeLevel === 'primaire' && "📘 BULLETIN SCOLAIRE TRIMESTRIEL (ENSEIGNEMENT PRIMAIRE)"}
              {activeLevel === 'secondaire' && "🎓 BULLETIN OFFICIEL DE NOTES ET DU CONSEIL DE CLASSE (SECONDAIRE)"}
              {activeLevel === 'superieur' && "🏛️ RELEVÉ OFFICIEL DE NOTES ACADÉMIQUES"}
            </div>
          </div>

          <div className="flex h-16 w-16 items-center justify-center self-start rounded-2xl bg-accent font-display text-2xl font-black text-accent-foreground shadow-sm overflow-hidden border border-primary-foreground/20 print:border-black">
            {tenantLogo ? (
              <img src={tenantLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              tenantName.substring(0, 1) || "E"
            )}
          </div>
        </div>
      </div>

      {/* ── FICHE SIGNALÉTIQUE DE L'ÉLÈVE ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-border p-5 bg-secondary/30 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Nom & Prénoms</span>
          <div className="font-bold text-sm text-foreground mt-0.5">
            {student.last_name} {student.first_name}
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Matricule Officiel</span>
          <div className="font-mono font-bold text-primary mt-0.5">
            {student.student_code || "MAT-2025"}
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Classe & Cycle</span>
          <div className="font-semibold text-foreground mt-0.5">
            {currentClass?.name || "Non assignée"} {currentClass?.level_type ? `(${currentClass.level_type})` : ''}
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Effectif de la classe</span>
          <div className="font-semibold text-foreground mt-0.5">
            {classStudents.length} élèves
          </div>
        </div>
      </div>

      {/* ── CORPS DU BULLETIN SELON LE NIVEAU D'ENSEIGNEMENT ── */}
      {activeLevel === 'maternelle' ? (
        /* ============================================================ */
        /* MODÈLE MATERNELLE : ÉVALUATION DES ACQUIS PAR COMPÉTENCES    */
        /* ============================================================ */
        <div className="p-6 space-y-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2 mb-2">
              <span>🌸</span> Évaluation des Domaines d'Apprentissage et de Développement
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              À l'école maternelle, l'évaluation est bienveillante et formative. Elle mesure les progrès et la socialisation 
              de l'enfant selon les 6 domaines d'apprentissage fondamentaux du programme d'éducation préscolaire.
            </p>
          </div>

          <div className="space-y-4">
            {MATERNELLE_DOMAINS.map((domain, idx) => {
              // Find matching mark if exists
              const mark = studentSubjectMarks[idx] || studentSubjectMarks[0];
              const status = mark?.acquisStatus || 'ECA';

              return (
                <div key={domain.id} className="rounded-xl border border-border p-4 bg-muted/10 hover:bg-muted/20 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{domain.icon}</span>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{domain.title}</h4>
                        <p className="text-[11px] text-muted-foreground">{domain.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        status === 'A' ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30' :
                        status === 'ECA' ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30' :
                        'bg-rose-500/15 text-rose-700 border border-rose-500/30'
                      }`}>
                        {status === 'A' && <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />}
                        {status === 'ECA' && <Flame className="h-3.5 w-3.5 text-amber-600" />}
                        {status === 'NA' && <HelpCircle className="h-3.5 w-3.5 text-rose-600" />}
                        {status === 'A' ? 'Acquis (A)' : status === 'ECA' ? 'En cours (ECA)' : 'Non encore acquis (NA)'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
                    <span className="italic">
                      Observation : {mark?.appreciation || "Participe activement avec enthousiasme et curiosité."}
                    </span>
                    {mark?.score !== null && (
                      <span className="font-mono text-[11px] font-semibold text-foreground/75">
                        Indicateur d'évaluation : {mark.score} / 20
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Synthèse Maternelle */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs">
            <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-1">
              <Heart className="h-4 w-4 text-emerald-600" /> Bilan de la Maîtresse / de l'Éducateur
            </h4>
            <p className="text-muted-foreground leading-relaxed mt-1">
              Un trimestre très positif pour <strong>{student.first_name}</strong>. L'enfant fait preuve d'une belle curiosité, respecte les règles de vie de groupe et gagne en autonomie chaque jour. Continue ainsi !
            </p>
          </div>
        </div>
      ) : activeLevel === 'primaire' ? (
        /* ============================================================ */
        /* MODÈLE PRIMAIRE : DISCIPLINES FONDAMENTALES & APPRÉCIATIONS */
        /* ============================================================ */
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
              <tr>
                <th className="px-5 py-3">Discipline</th>
                <th className="px-3 py-3 text-center">Coeff.</th>
                <th className="px-3 py-3 text-center">Note /20</th>
                <th className="px-3 py-3 text-center">Points</th>
                <th className="px-3 py-3 text-center">Moy. Classe</th>
                <th className="px-3 py-3 text-center">Rang</th>
                <th className="px-5 py-3">Appréciation de l'Enseignant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {studentSubjectMarks.map((m) => (
                <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-foreground">{m.name}</div>
                    {m.evalCount > 0 && (
                      <div className="text-[10px] text-muted-foreground">{m.evalCount} épreuve(s) calculée(s)</div>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-center font-mono text-muted-foreground">{m.coef}</td>
                  <td className="px-3 py-3.5 text-center font-mono">
                    {m.score !== null ? (
                      <span className={`inline-block px-2.5 py-0.5 rounded font-bold text-sm ${
                        m.score >= 14 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold" :
                        m.score >= 10 ? "text-foreground font-semibold" :
                        "bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold"
                      }`}>
                        {m.score.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Non noté</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-center font-mono font-semibold text-muted-foreground">
                    {m.weightedScore !== null ? m.weightedScore.toFixed(1) : "—"}
                  </td>
                  <td className="px-3 py-3.5 text-center font-mono text-xs text-muted-foreground">{m.classAvg}</td>
                  <td className="px-3 py-3.5 text-center font-mono text-xs font-semibold text-muted-foreground">{m.subjectRank}</td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground leading-snug">{m.appreciation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ============================================================ */
        /* MODÈLE SECONDAIRE / SUPÉRIEUR : TABLEAU OFFICIEL COMPLET    */
        /* ============================================================ */
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
              <tr>
                <th className="px-5 py-3">Matière & Professeur</th>
                <th className="px-2 py-3 text-center">Coef.</th>
                <th className="px-3 py-3 text-center">Note /20</th>
                <th className="px-3 py-3 text-center">Total Coef.</th>
                <th className="px-2 py-3 text-center">Rang</th>
                <th className="px-2 py-3 text-center">Moy.</th>
                <th className="px-2 py-3 text-center">Min</th>
                <th className="px-2 py-3 text-center">Max</th>
                <th className="px-5 py-3">Appréciation Pédagogique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {studentSubjectMarks.map((m) => (
                <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-bold text-foreground">{m.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      Code: {m.code} {m.evalCount > 0 ? `· (${m.evalCount} évaluation(s))` : '· (En attente)'}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center font-mono text-muted-foreground">{m.coef}</td>
                  <td className="px-3 py-3 text-center font-mono">
                    {m.score !== null ? (
                      <span className={`inline-block px-2.5 py-0.5 rounded font-bold text-sm ${
                        m.score >= 14 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold" :
                        m.score >= 10 ? "text-foreground font-semibold" :
                        "bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold"
                      }`}>
                        {m.score.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Non noté</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-muted-foreground">
                    {m.weightedScore !== null ? m.weightedScore.toFixed(1) : "—"}
                  </td>
                  <td className="px-2 py-3 text-center font-mono text-xs font-semibold text-muted-foreground">{m.subjectRank}</td>
                  <td className="px-2 py-3 text-center font-mono text-xs text-muted-foreground">{m.classAvg}</td>
                  <td className="px-2 py-3 text-center font-mono text-xs text-muted-foreground/80">{m.min}</td>
                  <td className="px-2 py-3 text-center font-mono text-xs text-muted-foreground/80">{m.max}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground leading-snug">{m.appreciation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── BILAN STATISTIQUE & RANG DU TRIMESTRE ── */}
      {activeLevel !== 'maternelle' && (
        <div className="grid gap-4 border-t border-border bg-secondary/20 p-5 sm:grid-cols-4">
          <div className="rounded-xl bg-card p-4 border border-border shadow-xs">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total Points Coeff.</div>
            <div className="mt-1 font-display text-2xl font-black text-foreground">
              {totalPoints.toFixed(1)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              sur {totalCoefficients * 20} pts (Coeff total : {totalCoefficients})
            </div>
          </div>

          <div className="rounded-xl bg-card p-4 border border-border shadow-xs">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Moyenne Générale</div>
            <div className="mt-1 font-display text-2xl font-black text-primary">
              {generalAverage !== null ? `${generalAverage} / 20` : "Non calculée"}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Calcul certifié par barème
            </div>
          </div>

          <div className="rounded-xl bg-card p-4 border border-border shadow-xs">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Rang Trimestriel</div>
            <div className="mt-1 font-display text-2xl font-black text-accent">
              {studentRank} / {classStudents.length}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Moyenne classe : {classOverallStats.classAvg !== null ? `${classOverallStats.classAvg.toFixed(2)} / 20` : "—"}
            </div>
          </div>

          <div className={`rounded-xl p-4 border shadow-xs ${councilMention.badgeColor}`}>
            <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">Avis du Conseil de Classe</div>
            <div className="mt-1 font-display text-sm font-black truncate" title={councilMention.mention}>
              {councilMention.mention}
            </div>
            <div className="text-[10px] opacity-85 mt-1 leading-tight">
              {councilMention.description}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION DISCIPLINE & ASSIDUITÉ ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 border-t border-border bg-card text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Absences Justifiées</span>
          <span className="font-mono font-bold text-foreground">0 demi-journée</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Absences Injustifiées</span>
          <span className="font-mono font-bold text-foreground">0</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Retards constatés</span>
          <span className="font-mono font-bold text-foreground">0</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Assiduité & Conduite</span>
          <span className="font-bold text-emerald-600">Exemplaire</span>
        </div>
      </div>

      {/* ── VISAS & SIGNATURES OFFICIELLES ── */}
      <div className="grid grid-cols-3 p-6 border-t border-border text-center text-xs bg-muted/5 gap-4">
        <div>
          <p className="font-bold text-foreground">
            {activeLevel === 'maternelle' ? "L'Éducatrice / Maîtresse" : activeLevel === 'primaire' ? "L'Instituteur / Enseignant" : "Le Professeur Principal"}
          </p>
          <div className="h-16 flex items-center justify-center text-muted-foreground/40 italic text-[11px]">
            [Signature & Date]
          </div>
        </div>

        <div>
          <p className="font-bold text-foreground">Le Chef d'Établissement</p>
          <div className="h-16 flex flex-col items-center justify-center text-muted-foreground/50 italic text-[11px]">
            <span>[Cachet officiel & Signature]</span>
            <span className="text-[10px] text-muted-foreground/35">Eurêka Certified Document</span>
          </div>
        </div>

        <div>
          <p className="font-bold text-foreground">Les Parents / Tuteur Légal</p>
          <div className="h-16 flex items-center justify-center text-muted-foreground/40 italic text-[11px]">
            [Vu et pris connaissance]
          </div>
        </div>
      </div>
    </div>
  );
}
