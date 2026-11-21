import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Save, Check, Award, Calculator, BookOpen, Users, AlertCircle,
  TrendingUp, BarChart3, FileSpreadsheet, Printer, Download, Sparkles,
  Filter, ChevronRight, AlertTriangle, Eye, Plus, Trash2, CheckCircle2,
  Clock, ArrowUpDown, FileText, Share2, HelpCircle
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useClasses } from "@/hooks/useClasses";
import { useSubjects } from "@/hooks/useSubjects";
import { useStudents } from "@/hooks/useStudents";
import { useGrades } from "@/hooks/useGrades";
import { useTeacherAssignments } from "@/hooks/useTeacherAssignments";
import { useAuth } from "@/hooks/useAuth";
import { getEstablishmentTypeInfo } from "@/lib/school-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { offlineSyncManager } from "@/lib/offline-sync";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Notes & Évaluations — Eurêka" },
      { name: "description", content: "Saisie des notes, coefficients, carnet de notes et calcul automatique des moyennes." },
    ],
  }),
  component: NotesPage,
});

// Appréciations pédagogiques types
const QUICK_APPRECIATIONS = [
  "Excellent travail, très bonne rigueur.",
  "Très bon trimestre, élève sérieux et appliqué.",
  "Résultats satisfaisants, ensemble encourageant.",
  "Travail régulier, poursuivre ainsi les efforts.",
  "En progrès ce trimestre, continuez.",
  "Doit intensifier ses efforts et participer davantage.",
  "Manque d'attention et d'assiduité en classe.",
  "Résultats insuffisants, travail personnel insuffisant.",
];

function NotesPage() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const estInfo = getEstablishmentTypeInfo(profile?.tenant?.school_types);
  const tenantId = profile?.tenant_id;
  const isTeacher = profile?.role === "teacher";

  // Hooks de données réelles
  const { classes = [], isLoading: isLoadingClasses } = useClasses();
  const { subjectsQuery, seedDefaultSubjectsMutation } = useSubjects();
  const { students = [], isLoading: isLoadingStudents } = useStudents();
  const { assignments = [] } = useTeacherAssignments();

  const subjects = subjectsQuery.data || [];

  // Filtrage des classes pour les enseignants
  const teacherClasses = useMemo(() => {
    if (!isTeacher || !user?.id) return classes;
    const assignedClassIds = new Set(
      assignments.filter(a => a.teacher_id === user.id).map(a => a.class_id)
    );
    if (assignedClassIds.size === 0) return classes;
    return classes.filter(c => assignedClassIds.has(c.id));
  }, [isTeacher, user?.id, classes, assignments]);

  // États des filtres principaux
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>(estInfo.isUniversityOnly ? "S1" : "T1");
  const [activeTab, setActiveTab] = useState<string>("entry");

  // Définition de l'évaluation active
  const [evaluationType, setEvaluationType] = useState<string>("devoir");
  const [evaluationName, setEvaluationName] = useState<string>("Devoir Surveillé N°1");
  const [evaluationDate, setEvaluationDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [maxScore, setMaxScore] = useState<number>(20);
  const [coefficient, setCoefficient] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Recherche d'élève dans la table
  const [studentSearch, setStudentSearch] = useState("");

  // Modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isQuickFillModalOpen, setIsQuickFillModalOpen] = useState(false);
  const [quickFillScore, setQuickFillScore] = useState("12");

  // Identifiants actifs
  const currentClassId = selectedClassId || teacherClasses[0]?.id || "";
  const currentSubjectId = selectedSubjectId || subjects[0]?.id || "";

  const currentClassObj = classes.find(c => c.id === currentClassId);
  const currentSubjectObj = subjects.find(s => s.id === currentSubjectId);

  // Synchroniser le coefficient initial de la matière
  useEffect(() => {
    if (currentSubjectObj?.coefficient) {
      setCoefficient(currentSubjectObj.coefficient);
    }
  }, [currentSubjectId, currentSubjectObj?.coefficient]);

  // Notes réelles de Supabase pour cette classe et matière
  const { grades = [], isLoadingGrades } = useGrades(currentClassId, currentSubjectId);

  // Élèves de la classe sélectionnée
  const classStudents = useMemo(() => {
    if (!currentClassId) return [];
    return students
      .filter(s => s.class_id === currentClassId)
      .sort((a, b) => a.last_name.localeCompare(b.last_name));
  }, [students, currentClassId]);

  // État local des notes pour l'évaluation en cours : studentId -> score string ("14.5", "ABS", "DISP", "")
  const [scores, setScores] = useState<Record<string, string>>({});
  const [appreciations, setAppreciations] = useState<Record<string, string>>({});

  // Fonction pour charger les notes d'une évaluation existante
  const loadEvaluationGrades = (targetEvalName: string, targetEvalType: string) => {
    const initialScores: Record<string, string> = {};
    const initialAppreciations: Record<string, string> = {};

    classStudents.forEach(st => {
      const existing = grades.find(
        g => g.student_id === st.id &&
             g.term === selectedTerm &&
             (g.evaluation_name === targetEvalName || (!targetEvalName && g.evaluation_type === targetEvalType))
      );
      if (existing) {
        if (existing.teacher_comment?.startsWith("[ABS]")) {
          initialScores[st.id] = "ABS";
        } else if (existing.teacher_comment?.startsWith("[DISP]")) {
          initialScores[st.id] = "DISP";
        } else {
          initialScores[st.id] = String(existing.score);
        }
        initialAppreciations[st.id] = existing.teacher_comment?.replace(/^\[(ABS|DISP)\]\s*/, "") || "";
      }
    });

    setScores(initialScores);
    setAppreciations(initialAppreciations);
  };

  // Recharger lors du changement de classe, matière, période ou quand la base change
  useEffect(() => {
    loadEvaluationGrades(evaluationName, evaluationType);
  }, [currentClassId, currentSubjectId, selectedTerm, grades]);

  // Élèves filtrés par la recherche
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return classStudents;
    const q = studentSearch.toLowerCase();
    return classStudents.filter(
      s => s.first_name.toLowerCase().includes(q) ||
           s.last_name.toLowerCase().includes(q) ||
           (s.student_code && s.student_code.toLowerCase().includes(q))
    );
  }, [classStudents, studentSearch]);

  // Liste des évaluations existantes détectées dans la base pour cette classe, matière et période
  const existingEvaluations = useMemo(() => {
    const map = new Map<string, {
      name: string;
      type: string;
      date: string;
      coefficient: number;
      maxScore: number;
      gradesCount: number;
      sum: number;
    }>();

    grades
      .filter(g => g.term === selectedTerm)
      .forEach(g => {
        const key = g.evaluation_name || `${g.evaluation_type} du ${g.evaluation_date}`;
        if (!map.has(key)) {
          map.set(key, {
            name: key,
            type: g.evaluation_type,
            date: g.evaluation_date,
            coefficient: g.coefficient || 1,
            maxScore: g.max_score || 20,
            gradesCount: 0,
            sum: 0,
          });
        }
        const item = map.get(key)!;
        if (g.score !== null && !isNaN(Number(g.score))) {
          item.gradesCount += 1;
          item.sum += Number(g.score);
        }
      });

    return Array.from(map.values()).map(e => ({
      ...e,
      average: e.gradesCount > 0 ? (e.sum / e.gradesCount).toFixed(2) : "—",
    }));
  }, [grades, selectedTerm]);

  // Statistiques en direct de l'évaluation en cours
  const evaluationStats = useMemo(() => {
    const validScores: number[] = [];
    let absCount = 0;
    let dispCount = 0;

    classStudents.forEach(st => {
      const val = scores[st.id];
      if (val === "ABS") {
        absCount += 1;
      } else if (val === "DISP") {
        dispCount += 1;
      } else if (val !== undefined && val !== "" && !isNaN(parseFloat(val))) {
        validScores.push(parseFloat(val));
      }
    });

    const count = validScores.length;
    if (count === 0) {
      return {
        average: "—",
        min: "—",
        max: "—",
        passRate: 0,
        gradedCount: 0,
        absCount,
        dispCount,
        completionRate: 0,
      };
    }

    const sum = validScores.reduce((acc, v) => acc + v, 0);
    const avg = sum / count;
    const min = Math.min(...validScores);
    const max = Math.max(...validScores);
    const passCount = validScores.filter(s => s >= 10).length;
    const passRate = Math.round((passCount / count) * 100);
    const completionRate = Math.round(((count + absCount + dispCount) / Math.max(1, classStudents.length)) * 100);

    return {
      average: avg.toFixed(2),
      min: min.toFixed(1),
      max: max.toFixed(1),
      passRate,
      gradedCount: count,
      absCount,
      dispCount,
      completionRate,
    };
  }, [scores, classStudents]);

  // Calcul du Carnet de Notes Matriciel (Gradebook pour tous les élèves)
  const gradebookData = useMemo(() => {
    return classStudents.map(st => {
      let totalWeighted = 0;
      let totalCoeff = 0;
      const studentEvalScores: Record<string, { score: number | string; coeff: number }> = {};

      existingEvaluations.forEach(ev => {
        const found = grades.find(
          g => g.student_id === st.id &&
               g.term === selectedTerm &&
               (g.evaluation_name === ev.name || `${g.evaluation_type} du ${g.evaluation_date}` === ev.name)
        );

        if (found) {
          if (found.teacher_comment?.startsWith("[ABS]")) {
            studentEvalScores[ev.name] = { score: "ABS", coeff: ev.coefficient };
            totalWeighted += 0;
            totalCoeff += ev.coefficient;
          } else if (found.teacher_comment?.startsWith("[DISP]")) {
            studentEvalScores[ev.name] = { score: "DISP", coeff: ev.coefficient };
          } else {
            studentEvalScores[ev.name] = { score: Number(found.score), coeff: ev.coefficient };
            totalWeighted += Number(found.score) * ev.coefficient;
            totalCoeff += ev.coefficient;
          }
        }
      });

      const average = totalCoeff > 0 ? totalWeighted / totalCoeff : null;

      let mention = "—";
      if (average !== null) {
        if (average >= 16) mention = "Très Bien";
        else if (average >= 14) mention = "Bien";
        else if (average >= 12) mention = "Assez Bien";
        else if (average >= 10) mention = "Passable";
        else mention = "Insuffisant";
      }

      return {
        student: st,
        evalScores: studentEvalScores,
        average: average !== null ? average.toFixed(2) : "—",
        rawAverage: average !== null ? average : -1,
        mention,
      };
    })
    .sort((a, b) => b.rawAverage - a.rawAverage) // Tri par moyenne décroissante
    .map((item, index) => ({
      ...item,
      rank: item.rawAverage >= 0 ? `${index + 1}${index === 0 ? "er" : "e"}` : "—",
    }));
  }, [classStudents, existingEvaluations, grades, selectedTerm]);

  // ── ENREGISTREMENT DES NOTES ──
  const handleSaveAll = async () => {
    if (!currentClassId || !currentSubjectId || !tenantId) {
      toast.error(`Veuillez sélectionner une classe et une matière valides`);
      return;
    }

    if (classStudents.length === 0) {
      toast.error(`Aucun élève inscrit dans cette classe`);
      return;
    }

    setIsSaving(true);
    try {
      const recordsToInsert = classStudents
        .map(st => {
          const val = scores[st.id];
          const comment = appreciations[st.id] || "";

          // Si rien de saisi, on ignore l'élève (pas de fausse note forcée)
          if (val === undefined || val === "") return null;

          let finalScore = 0;
          let finalComment = comment;

          if (val === "ABS") {
            finalScore = 0;
            finalComment = comment ? `[ABS] ${comment}` : "[ABS] Absent à l'épreuve";
          } else if (val === "DISP") {
            finalScore = 0;
            finalComment = comment ? `[DISP] ${comment}` : "[DISP] Dispensé d'épreuve";
          } else {
            const num = parseFloat(val);
            if (isNaN(num)) return null;
            finalScore = Math.max(0, Math.min(maxScore, num));
          }

          return {
            tenant_id: tenantId,
            student_id: st.id,
            class_id: currentClassId,
            subject_id: currentSubjectId,
            evaluation_name: evaluationName.trim() || `${evaluationType.toUpperCase()} du ${evaluationDate}`,
            evaluation_type: evaluationType as any,
            term: selectedTerm as any,
            score: finalScore,
            max_score: maxScore,
            coefficient: coefficient,
            evaluation_date: evaluationDate,
            teacher_comment: finalComment || null,
            recorded_by: profile?.id || null,
          };
        })
        .filter(Boolean);

      if (recordsToInsert.length === 0) {
        toast.info("Aucune note renseignée à enregistrer.");
        setIsSaving(false);
        return;
      }

      // Offline First fallback
      if (!navigator.onLine) {
        await offlineSyncManager.enqueue({
          table: "grade_entries",
          action: "upsert",
          data: recordsToInsert,
          options: { onConflict: "id" },
          description: `Saisie de ${recordsToInsert.length} notes (${evaluationName} - ${currentSubjectObj?.name || 'Matière'})`,
        });
        toast.success(`Mode Hors-ligne : ${recordsToInsert.length} notes sauvegardées localement !`);
      } else {
        // Supprimer d'abord les entrées existantes pour cette évaluation précise
        // (évite les doublons : pas de contrainte UNIQUE dans le schéma actuel)
        const evalNameFinal = evaluationName.trim() || `${evaluationType.toUpperCase()} du ${evaluationDate}`;
        await supabase
          .from("grade_entries")
          .delete()
          .eq("tenant_id", tenantId!)
          .eq("class_id", currentClassId)
          .eq("subject_id", currentSubjectId)
          .eq("term", selectedTerm)
          .eq("evaluation_name", evalNameFinal);

        // Insérer les nouvelles notes proprement
        const { error } = await supabase
          .from("grade_entries")
          .insert(recordsToInsert);

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["grades", tenantId] });
        toast.success(`✅ ${recordsToInsert.length} notes de l'épreuve « ${evalNameFinal} » enregistrées avec succès !`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement des notes : " + (err.message || "Erreur réseau"));
    } finally {
      setIsSaving(false);
    }
  };

  // ── ACTION RAPIDE : REMPLIR LES VIDES ──
  const handleApplyQuickFill = () => {
    const val = quickFillScore.trim();
    if (!val) return;
    setScores(prev => {
      const next = { ...prev };
      classStudents.forEach(st => {
        if (!next[st.id] || next[st.id] === "") {
          next[st.id] = val;
        }
      });
      return next;
    });
    setIsQuickFillModalOpen(false);
    toast.success(`Note de ${val} appliquée aux élèves non notés`);
  };

  // ── EXPORT CSV DU CARNET DE NOTES ──
  const handleExportCSV = () => {
    if (gradebookData.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const headers = [
      "Rang",
      "Matricule",
      "Nom",
      "Prénoms",
      ...existingEvaluations.map(e => `${e.name} (Coef ${e.coefficient})`),
      "Moyenne Matière",
      "Mention",
    ];

    const rows = gradebookData.map(item => [
      item.rank,
      item.student.student_code || "",
      item.student.last_name,
      item.student.first_name,
      ...existingEvaluations.map(e => item.evalScores[e.name]?.score ?? "—"),
      item.average,
      item.mention,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Carnet_Notes_${currentClassObj?.name}_${currentSubjectObj?.name}_${selectedTerm}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Carnet de notes exporté au format CSV !");
  };

  return (
    <AppShell
      title="Notes & Évaluations Pédagogiques"
      subtitle={`${currentClassObj?.name || estInfo.classTerm} · ${currentSubjectObj?.name || 'Matière'} · ${selectedTerm} (Année Scolaire 2025-2026)`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrintModalOpen(true)}
            className="gap-1.5 text-xs h-8 border-border"
          >
            <Printer className="w-3.5 h-3.5" /> PV Officiel
          </Button>

          <Button
            onClick={handleSaveAll}
            disabled={isSaving || classStudents.length === 0}
            className="gap-2 bg-primary text-primary-foreground shadow-sm h-8 text-xs font-bold"
          >
            <Save className="h-3.5 w-3.5" /> {isSaving ? "Enregistrement..." : "Enregistrer les notes"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* ── BANDEAU SÉLECTEURS PRINCIPAUX ── */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Classe / Filière */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold uppercase text-muted-foreground">
                {estInfo.classTerm} ({teacherClasses.length})
              </Label>
              <select
                value={currentClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {teacherClasses.length === 0 ? (
                  <option value="">Aucune classe disponible</option>
                ) : (
                  teacherClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.level_type ? `(${c.level_type})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Matière / ECUE */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold uppercase text-muted-foreground">
                {estInfo.isUniversityOnly ? "Matière / ECUE" : "Matière"} ({subjects.length})
              </Label>
              <select
                value={currentSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {subjects.length === 0 ? (
                  <option value="">Aucune matière créée</option>
                ) : (
                  subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Coef {s.coefficient || 1})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Période / Trimestre / Semestre */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold uppercase text-muted-foreground">
                Période Pédagogique
              </Label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {!estInfo.isUniversityOnly ? (
                  <>
                    <option value="T1">Trimestre 1</option>
                    <option value="T2">Trimestre 2</option>
                    <option value="T3">Trimestre 3</option>
                  </>
                ) : (
                  <>
                    <option value="S1">Semestre 1 (Session Normale)</option>
                    <option value="S2">Semestre 2 (Session Normale)</option>
                  </>
                )}
              </select>
            </div>

            {/* Badge de synchronisation */}
            <div className="flex items-end">
              <div className="w-full flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 border border-emerald-500/20">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" /> Supabase Connecté
                </span>
                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono">
                  {classStudents.length} {estInfo.studentTerm.toLowerCase()}s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── ALERTE MATIÈRES MANQUANTES AVEC INITIALISATION EN 1 CLIC ── */}
        {subjects.length === 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-xs">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <div className="font-bold text-sm">Catalogue de matières vide</div>
                <div className="text-xs text-amber-800">
                  Votre établissement n'a pas encore de matières configurées. Cliquez sur le bouton ci-contre pour générer automatiquement le programme officiel ou créez vos matières manuellement.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                disabled={seedDefaultSubjectsMutation.isPending}
                onClick={() => {
                  const category = estInfo.isUniversityOnly 
                    ? 'superieur' 
                    : (currentClassObj?.level_type?.toLowerCase().includes('maternelle') 
                      ? 'maternelle' 
                      : (currentClassObj?.level_type?.toLowerCase().includes('primaire') ? 'primaire' : 'secondaire'));
                  seedDefaultSubjectsMutation.mutate(category);
                }}
                className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> {seedDefaultSubjectsMutation.isPending ? "Initialisation..." : "Initialiser les matières standard"}
              </Button>
              <Link to="/matieres" className="text-xs text-amber-900 underline font-semibold px-2">
                Gérer
              </Link>
            </div>
          </div>
        )}

        {/* ── ALERTE CLASSE INTROUVABLE ── */}
        {teacherClasses.length === 0 && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3 text-blue-900 shadow-xs">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="text-xs">
              <strong className="block text-sm font-bold">Aucune classe disponible</strong>
              {isTeacher
                ? "Vous n'avez pas encore été assigné à une classe par la direction. Veuillez contacter l'administrateur de votre établissement."
                : "Aucune classe n'a été créée dans l'établissement. Rendez-vous dans le menu « Classes & Niveaux » pour configurer votre première classe."}
            </div>
          </div>
        )}

        {/* ── ONGLETS DE NAVIGATION ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-border pb-3">
            <TabsList className="bg-muted/70 p-1 rounded-xl">
              <TabsTrigger value="entry" className="gap-2 text-xs font-bold py-1.5 px-3">
                <Calculator className="w-3.5 h-3.5" /> Saisie de l'Évaluation
              </TabsTrigger>
              <TabsTrigger value="gradebook" className="gap-2 text-xs font-bold py-1.5 px-3">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Carnet Récapitulatif ({existingEvaluations.length} épreuves)
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2 text-xs font-bold py-1.5 px-3">
                <BarChart3 className="w-3.5 h-3.5" /> Statistiques & Distribution
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2 text-xs font-bold py-1.5 px-3">
                <BookOpen className="w-3.5 h-3.5" /> Historique des Épreuves
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              ONGLET 1 : SAISIE DE L'ÉVALUATION
              ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="entry" className="mt-6 space-y-4">
            
            {/* Configuration détaillée de l'épreuve à saisir */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-white font-bold text-xs">
                    <Award className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Paramètres de l'Évaluation en Cours</h4>
                    <p className="text-[11px] text-muted-foreground">Précisez le type, le barème et le coefficient de l'épreuve</p>
                  </div>
                </div>

                {existingEvaluations.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Ou charger une épreuve existante :</span>
                    <select
                      onChange={(e) => {
                        const target = existingEvaluations.find(ev => ev.name === e.target.value);
                        if (target) {
                          setEvaluationName(target.name);
                          setEvaluationType(target.type);
                          setCoefficient(target.coefficient);
                          setMaxScore(target.maxScore);
                          if (target.date) setEvaluationDate(target.date);
                          loadEvaluationGrades(target.name, target.type);
                        }
                      }}
                      className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold"
                    >
                      <option value="">Sélectionner une épreuve...</option>
                      {existingEvaluations.map((ev, i) => (
                        <option key={i} value={ev.name}>{ev.name} ({ev.date || 'Sans date'})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 text-xs border-t border-amber-200/60">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Titre de l'évaluation *</Label>
                  <Input
                    value={evaluationName}
                    onChange={(e) => setEvaluationName(e.target.value)}
                    placeholder="Ex: Interro N°2, Devoir 1..."
                    className="h-8 text-xs bg-white font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Type d'évaluation</Label>
                  <select
                    value={evaluationType}
                    onChange={(e) => setEvaluationType(e.target.value)}
                    className="w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none"
                  >
                    <option value="interro">Interrogation écrite</option>
                    <option value="devoir">Devoir surveillé</option>
                    <option value="tp">Travaux pratiques (TP)</option>
                    <option value="partiel">Examen partiel</option>
                    <option value="examen">Composition / Examen final</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Date de passation</Label>
                  <Input
                    type="date"
                    value={evaluationDate}
                    onChange={(e) => setEvaluationDate(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Coefficient épreuve *</Label>
                  <Input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={coefficient}
                    onChange={(e) => setCoefficient(parseFloat(e.target.value) || 1)}
                    className="h-8 text-xs bg-white font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Barème Max (/20)</Label>
                  <select
                    value={maxScore}
                    onChange={(e) => setMaxScore(parseInt(e.target.value) || 20)}
                    className="w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none"
                  >
                    <option value="20">Note sur 20</option>
                    <option value="10">Note sur 10</option>
                    <option value="40">Note sur 40</option>
                    <option value="100">Note sur 100</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Barre d'outils de saisie rapide & indicateurs */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-2xl border border-border">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative w-64">
                  <Input
                    placeholder="Filtrer par nom ou matricule..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="h-8 text-xs pl-3"
                  />
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsQuickFillModalOpen(true)}
                  className="h-8 text-xs gap-1 border-dashed"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Remplissage Rapide
                </Button>
              </div>

              {/* KPIs de l'évaluation */}
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg">
                  <span className="text-muted-foreground">Progression :</span>
                  <strong className="text-foreground">{evaluationStats.gradedCount}/{classStudents.length} noté(s)</strong>
                  <span className="text-[10px] text-emerald-700 font-bold">({evaluationStats.completionRate}%)</span>
                </div>

                <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg">
                  <span className="text-muted-foreground">Moyenne :</span>
                  <strong className="text-primary font-bold">{evaluationStats.average} /{maxScore}</strong>
                </div>

                <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg">
                  <span className="text-muted-foreground">Min :</span>
                  <strong className="text-rose-600">{evaluationStats.min}</strong>
                  <span className="text-muted-foreground">· Max :</span>
                  <strong className="text-emerald-600">{evaluationStats.max}</strong>
                </div>
              </div>
            </div>

            {/* Tableau ergonomique de saisie des notes */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
              {filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aucun élève trouvé dans cette classe.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                        <th className="py-3 px-4 w-12 text-center">N°</th>
                        <th className="py-3 px-4">Élève & Matricule</th>
                        <th className="py-3 px-3 text-center w-40">Actions Rapides</th>
                        <th className="py-3 px-3 text-center w-36">Note /{maxScore}</th>
                        <th className="py-3 px-4">Appréciation de l'Enseignant</th>
                        <th className="py-3 px-4 text-center w-32">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredStudents.map((st, i) => {
                        const currentScore = scores[st.id] ?? "";
                        const currentAppreciation = appreciations[st.id] ?? "";

                        const isAbsent = currentScore === "ABS";
                        const isDisp = currentScore === "DISP";
                        const numScore = parseFloat(currentScore);
                        const isGraded = !isNaN(numScore) && !isAbsent && !isDisp;

                        return (
                          <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 text-center font-mono text-[11px] text-muted-foreground font-semibold">
                              {i + 1}
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                  {st.first_name[0]}{st.last_name[0]}
                                </div>
                                <div>
                                  <div className="font-bold text-foreground text-xs">{st.last_name} {st.first_name}</div>
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    {st.student_code || 'ID:' + st.id.slice(0, 6)}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isAbsent ? "default" : "outline"}
                                  onClick={() => {
                                    setScores(prev => ({ ...prev, [st.id]: isAbsent ? "" : "ABS" }));
                                  }}
                                  className={`h-6 px-2 text-[10px] font-bold ${
                                    isAbsent ? "bg-rose-600 hover:bg-rose-700 text-white" : "border-border text-muted-foreground hover:text-foreground"
                                  }`}
                                  title="Marquer absent"
                                >
                                  ABS
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isDisp ? "default" : "outline"}
                                  onClick={() => {
                                    setScores(prev => ({ ...prev, [st.id]: isDisp ? "" : "DISP" }));
                                  }}
                                  className={`h-6 px-2 text-[10px] font-bold ${
                                    isDisp ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-border text-muted-foreground hover:text-foreground"
                                  }`}
                                  title="Marquer dispensé"
                                >
                                  DISP
                                </Button>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={currentScore}
                                disabled={isAbsent || isDisp}
                                placeholder="—"
                                onChange={(e) => {
                                  const rawVal = e.target.value.replace(',', '.').trim();
                                  if (rawVal === "" || /^\d*\.?\d*$/.test(rawVal)) {
                                    const num = parseFloat(rawVal);
                                    if (!isNaN(num) && num > maxScore) {
                                      toast.error(`La note ne peut pas dépasser le barème de ${maxScore}`);
                                      return;
                                    }
                                    setScores(prev => ({ ...prev, [st.id]: rawVal }));
                                  }
                                }}
                                className={`w-24 mx-auto block rounded-lg border px-2 py-1.5 text-center font-mono font-bold text-sm tabular-nums outline-none transition-colors ${
                                  isAbsent ? "bg-rose-50 border-rose-300 text-rose-700" :
                                  isDisp ? "bg-blue-50 border-blue-300 text-blue-700" :
                                  isGraded && numScore >= 10 ? "bg-emerald-50/50 border-emerald-300 text-emerald-800 focus:ring-1 focus:ring-emerald-500" :
                                  isGraded && numScore < 10 ? "bg-rose-50/50 border-rose-300 text-rose-700 focus:ring-1 focus:ring-rose-500" :
                                  "bg-background border-border text-foreground focus:border-primary"
                                }`}
                              />
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <input
                                  placeholder="Observation personnalisée..."
                                  value={currentAppreciation}
                                  onChange={(e) => setAppreciations(prev => ({ ...prev, [st.id]: e.target.value }))}
                                  className="w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs outline-none focus:border-primary"
                                />
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setAppreciations(prev => ({ ...prev, [st.id]: e.target.value }));
                                    }
                                  }}
                                  className="rounded border border-border bg-muted/40 px-1 py-1 text-[10px] text-muted-foreground hover:text-foreground w-20 truncate"
                                  title="Choisir une phrase type"
                                >
                                  <option value="">Types...</option>
                                  {QUICK_APPRECIATIONS.map((ap, idx) => (
                                    <option key={idx} value={ap}>{ap}</option>
                                  ))}
                                </select>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-center">
                              {isAbsent ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                                  Absent
                                </span>
                              ) : isDisp ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                                  Dispensé
                                </span>
                              ) : isGraded && numScore >= 10 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                  <Check className="w-3 h-3" /> Validé
                                </span>
                              ) : isGraded && numScore < 10 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                                  &lt; 10 / 20
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">Non noté</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-muted/40 text-xs border-t border-border font-bold">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 text-foreground">
                          Moyenne de l'Épreuve ({evaluationStats.gradedCount} élèves notés sur {classStudents.length})
                        </td>
                        <td className="py-3 px-3 text-center text-primary font-display font-black text-sm">
                          {evaluationStats.average} /{maxScore}
                        </td>
                        <td colSpan={2} className="py-3 px-4 text-right text-muted-foreground font-normal">
                          Coefficient {coefficient} appliqué · Taux de réussite : <strong className="text-emerald-700">{evaluationStats.passRate}%</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Bouton d'action d'enregistrement en bas de page */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveAll}
                disabled={isSaving || classStudents.length === 0}
                className="gap-2 bg-primary text-primary-foreground font-bold text-xs h-9 px-5 shadow-sm"
              >
                <Save className="h-4 w-4" /> {isSaving ? "Enregistrement en cours..." : "Enregistrer cette Évaluation"}
              </Button>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              ONGLET 2 : CARNET RÉCAPITULATIF DE LA CLASSE (GRADEBOOK)
              ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="gradebook" className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-card p-4 rounded-2xl border border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Carnet Récapitulatif des Notes — {currentSubjectObj?.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Tableau matriciel de toutes les épreuves du {selectedTerm} avec calcul automatique de la moyenne pondérée et classement.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportCSV}
                  className="gap-1.5 text-xs h-8 border-border"
                >
                  <Download className="w-3.5 h-3.5" /> Exporter en CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="gap-1.5 text-xs h-8 border-border"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimer le Carnet
                </Button>
              </div>
            </div>

            {/* Tableau Matriciel */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                      <th className="py-3 px-3 w-16 text-center">Rang</th>
                      <th className="py-3 px-4">Élève</th>
                      {existingEvaluations.map((ev, i) => (
                        <th key={i} className="py-3 px-3 text-center min-w-24">
                          <div className="font-bold text-foreground truncate max-w-[120px]" title={ev.name}>{ev.name}</div>
                          <span className="text-[9px] text-amber-800 font-mono font-normal">Coef {ev.coefficient}</span>
                        </th>
                      ))}
                      <th className="py-3 px-4 text-center font-bold text-foreground bg-primary/5">
                        Moyenne Pondérée
                      </th>
                      <th className="py-3 px-4 text-center">Mention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {gradebookData.length === 0 ? (
                      <tr>
                        <td colSpan={4 + existingEvaluations.length} className="py-12 text-center text-muted-foreground">
                          Aucun élève trouvé pour cette classe.
                        </td>
                      </tr>
                    ) : (
                      gradebookData.map((item, idx) => (
                        <tr key={item.student.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${
                              idx === 0 ? "bg-amber-100 text-amber-900 border border-amber-300 font-black" :
                              idx === 1 ? "bg-slate-200 text-slate-800 font-bold" :
                              idx === 2 ? "bg-orange-100 text-orange-900 font-bold" :
                              "text-muted-foreground"
                            }`}>
                              {item.rank}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-foreground">{item.student.last_name} {item.student.first_name}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">{item.student.student_code}</div>
                          </td>

                          {existingEvaluations.map((ev, i) => {
                            const scoreData = item.evalScores[ev.name];
                            const scoreVal = scoreData?.score;
                            return (
                              <td key={i} className="py-3 px-3 text-center font-mono font-bold">
                                {scoreVal === undefined ? (
                                  <span className="text-muted-foreground/40 font-normal">—</span>
                                ) : scoreVal === "ABS" ? (
                                  <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">ABS</span>
                                ) : scoreVal === "DISP" ? (
                                  <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">DISP</span>
                                ) : (
                                  <span className={Number(scoreVal) >= 10 ? "text-emerald-700" : "text-rose-600"}>
                                    {Number(scoreVal).toFixed(1)}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          <td className="py-3 px-4 text-center font-display font-black text-sm text-primary bg-primary/5">
                            {item.average !== "—" ? `${item.average} /20` : "—"}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.mention === "Très Bien" ? "bg-emerald-100 text-emerald-800" :
                              item.mention === "Bien" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                              item.mention === "Assez Bien" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                              item.mention === "Passable" ? "bg-amber-100 text-amber-800" :
                              item.mention === "Insuffisant" ? "bg-rose-100 text-rose-800" :
                              "text-muted-foreground"
                            }`}>
                              {item.mention}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              ONGLET 3 : STATISTIQUES & DISTRIBUTION
              ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="analytics" className="mt-6 space-y-4">
            {/* 4 KPIs de la classe */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Moyenne de la Matière</span>
                <div className="font-display text-2xl font-black text-primary mt-1">
                  {evaluationStats.average !== "—" ? `${evaluationStats.average} /20` : "—"}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Calculée sur l'épreuve active</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Taux de Réussite</span>
                <div className="font-display text-2xl font-black text-emerald-600 mt-1">
                  {evaluationStats.passRate} %
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Élèves ayant une note &gt;= 10/20</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Note Maximale</span>
                <div className="font-display text-2xl font-black text-emerald-700 mt-1">
                  {evaluationStats.max !== "—" ? `${evaluationStats.max} /20` : "—"}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Meilleure performance</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Note Minimale</span>
                <div className="font-display text-2xl font-black text-rose-600 mt-1">
                  {evaluationStats.min !== "—" ? `${evaluationStats.min} /20` : "—"}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Seuil d'alerte pédagogique</p>
              </div>
            </div>

            {/* Distribution des notes en barres */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
              <div>
                <h4 className="font-bold text-sm text-foreground">Distribution Pédagogique des Résultats</h4>
                <p className="text-xs text-muted-foreground">Répartition des élèves par tranche de niveau académique</p>
              </div>

              {(() => {
                const total = Math.max(1, classStudents.length);
                const scoresList = classStudents
                  .map(st => parseFloat(scores[st.id]))
                  .filter(n => !isNaN(n));

                const b1 = scoresList.filter(s => s >= 16).length;
                const b2 = scoresList.filter(s => s >= 14 && s < 16).length;
                const b3 = scoresList.filter(s => s >= 12 && s < 14).length;
                const b4 = scoresList.filter(s => s >= 10 && s < 12).length;
                const b5 = scoresList.filter(s => s < 10).length;

                const bars = [
                  { label: "Très Bien (>= 16)", count: b1, color: "bg-emerald-600", text: "text-emerald-700" },
                  { label: "Bien (14 à 15.9)", count: b2, color: "bg-emerald-500", text: "text-emerald-600" },
                  { label: "Assez Bien (12 à 13.9)", count: b3, color: "bg-blue-500", text: "text-blue-600" },
                  { label: "Passable (10 à 11.9)", count: b4, color: "bg-amber-500", text: "text-amber-700" },
                  { label: "Insuffisant (< 10)", count: b5, color: "bg-rose-500", text: "text-rose-600" },
                ];

                return (
                  <div className="space-y-3">
                    {bars.map((bar, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-foreground">{bar.label}</span>
                          <span className={`font-bold ${bar.text}`}>
                            {bar.count} élève(s) · {Math.round((bar.count / total) * 100)}%
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className={`h-full ${bar.color} transition-all duration-500`}
                            style={{ width: `${(bar.count / total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              ONGLET 4 : HISTORIQUE DES ÉPREUVES
              ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="history" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Évaluations Archivées pour cette Classe</h3>
                <p className="text-xs text-muted-foreground">Historique des épreuves passées en {currentSubjectObj?.name} pour le {selectedTerm}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {existingEvaluations.length === 0 ? (
                <div className="col-span-3 p-12 text-center text-muted-foreground rounded-2xl border border-dashed">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aucune évaluation passée enregistrée pour cette période.
                </div>
              ) : (
                existingEvaluations.map((ev, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="px-2 py-0.5 text-[10px] font-bold font-mono uppercase rounded bg-amber-100 text-amber-900 border border-amber-200">
                        {ev.type}
                      </span>
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        Coef {ev.coefficient}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-foreground">{ev.name}</h4>
                      <p className="text-[11px] text-muted-foreground">Date : {ev.date || 'Non renseignée'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2.5 rounded-xl text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Notes Saisies</span>
                        <p className="font-bold text-foreground">{ev.gradesCount} / {classStudents.length}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Moyenne</span>
                        <p className="font-bold text-primary">{ev.average} /{ev.maxScore}</p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEvaluationName(ev.name);
                        setEvaluationType(ev.type);
                        setCoefficient(ev.coefficient);
                        setMaxScore(ev.maxScore);
                        if (ev.date) setEvaluationDate(ev.date);
                        setActiveTab("entry");
                      }}
                      className="w-full text-xs h-7 border-border hover:bg-muted"
                    >
                      Ouvrir & Modifier cette épreuve
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* ── MODAL : REMPLISSAGE RAPIDE ── */}
        <Dialog open={isQuickFillModalOpen} onOpenChange={setIsQuickFillModalOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Sparkles className="w-5 h-5 text-amber-600" />
                Remplissage Rapide des Notes
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Attribue une note automatique à tous les élèves n'ayant pas encore de note saisie.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Note par défaut (sur {maxScore})</Label>
                <Input
                  type="number"
                  min="0"
                  max={maxScore}
                  step="0.5"
                  value={quickFillScore}
                  onChange={(e) => setQuickFillScore(e.target.value)}
                  className="text-xs h-9 font-mono font-bold"
                />
              </div>

              <div className="flex gap-2">
                {[10, 12, 14, 15].map(val => (
                  <Button
                    key={val}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setQuickFillScore(String(val))}
                    className="flex-1 text-xs h-7"
                  >
                    {val}
                  </Button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsQuickFillModalOpen(false)}>
                Annuler
              </Button>
              <Button type="button" size="sm" onClick={handleApplyQuickFill} className="bg-primary text-primary-foreground font-bold">
                Appliquer aux non notés
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── MODAL : PROCÈS-VERBAL OFFICIEL D'ÉVALUATION (IMPRIMABLE) ── */}
        <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Printer className="w-5 h-5 text-primary" />
                Procès-Verbal Officiel des Notes d'Évaluation
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Relevé certifié conforme prêt pour archivage et signature du corps professoral.
              </DialogDescription>
            </DialogHeader>

            <div className="p-5 rounded-2xl border border-border bg-slate-50 space-y-4 my-2 text-xs">
              {/* En-tête officiel de l'école */}
              <div className="flex justify-between items-start pb-4 border-b border-border">
                <div>
                  <h3 className="font-bold text-base text-foreground uppercase tracking-wide">
                    {(profile?.tenant as any)?.name || "Eurêka Établissement Scolaire"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Année Académique 2025-2026 · {selectedTerm}</p>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <span className="font-bold text-primary block">{evaluationName}</span>
                  <span className="text-muted-foreground">Passé le : {evaluationDate}</span>
                </div>
              </div>

              {/* Détails épreuve */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white p-3 rounded-xl border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Classe</span>
                  <strong>{currentClassObj?.name}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Matière</span>
                  <strong>{currentSubjectObj?.name}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Coefficient</span>
                  <strong>{coefficient}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Moyenne Classe</span>
                  <strong className="text-primary">{evaluationStats.average} /{maxScore}</strong>
                </div>
              </div>

              {/* Table des notes pour signature */}
              <div className="border border-border rounded-xl bg-white overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="p-2 w-10 text-center">N°</th>
                      <th className="p-2">Matricule</th>
                      <th className="p-2">Nom & Prénoms</th>
                      <th className="p-2 text-center w-24">Note /{maxScore}</th>
                      <th className="p-2">Appréciation Pédagogique</th>
                      <th className="p-2 text-center w-24">Mention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {classStudents.map((st, i) => {
                      const scoreVal = scores[st.id] ?? "—";
                      const appVal = appreciations[st.id] || "—";
                      const num = parseFloat(scoreVal);
                      const mention = isNaN(num) ? "—" :
                        num >= 16 ? "Très Bien" : num >= 14 ? "Bien" : num >= 12 ? "Assez Bien" : num >= 10 ? "Passable" : "Insuffisant";

                      return (
                        <tr key={st.id}>
                          <td className="p-2 text-center font-mono text-[10px]">{i + 1}</td>
                          <td className="p-2 font-mono text-[10px]">{st.student_code}</td>
                          <td className="p-2 font-semibold text-foreground">{st.last_name} {st.first_name}</td>
                          <td className="p-2 text-center font-mono font-bold">
                            {scoreVal === "ABS" ? <span className="text-rose-600">ABS</span> :
                             scoreVal === "DISP" ? <span className="text-blue-600">DISP</span> :
                             scoreVal !== "—" ? Number(scoreVal).toFixed(1) : "—"}
                          </td>
                          <td className="p-2 text-[11px] text-muted-foreground italic truncate max-w-[200px]">{appVal}</td>
                          <td className="p-2 text-center text-[10px] font-semibold">{mention}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Signatures officielles */}
              <div className="grid grid-cols-2 gap-8 pt-6 pb-2 text-xs">
                <div className="border-t border-dashed border-border pt-2 text-center">
                  <p className="font-bold text-foreground">Signature du Professeur</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{profile?.full_name || "Enseignant responsable"}</p>
                  <div className="h-12 mt-2" />
                </div>
                <div className="border-t border-dashed border-border pt-2 text-center">
                  <p className="font-bold text-foreground">Visa de la Direction des Études</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Le Directeur / Doyen</p>
                  <div className="h-12 mt-2" />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 flex justify-between sm:justify-between items-center">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsPrintModalOpen(false)}>
                Fermer
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => window.print()}
                className="gap-2 bg-primary text-primary-foreground font-bold"
              >
                <Printer className="w-4 h-4" /> Imprimer le Procès-Verbal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppShell>
  );
}
