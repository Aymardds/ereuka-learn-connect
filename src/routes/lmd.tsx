import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { 
  Award, BookOpen, GraduationCap, Plus, CheckCircle2, 
  AlertCircle, Printer, Download, Save, School, Clock, 
  Layers, Users, Check, FileCheck, Search, ChevronRight
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import { useLMD } from "@/hooks/useLMD";
import { useStudents } from "@/hooks/useStudents";
import { useAuth } from "@/hooks/useAuth";
import { LMDTeachingUnit, LMDEcue, LMDUEType } from "@/types/database";
import { toast } from "sonner";

export const Route = createFileRoute("/lmd")({
  head: () => ({
    meta: [
      { title: "Système LMD & Université — Eurêka" },
      { name: "description", content: "Gestion de l'enseignement supérieur, maquettes LMD, crédits ECTS, délibérations et relevés officiels." },
    ],
  }),
  component: LMDManagementPage,
});

function LMDManagementPage() {
  const { profile } = useAuth();
  const { 
    programsQuery, 
    teachingUnitsQuery, 
    createUEMutation, 
    createEcueMutation,
    gradesQuery,
    saveGradesMutation,
    deliberationsQuery,
    saveDeliberationsMutation
  } = useLMD();
  const { studentsQuery } = useStudents();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'maquettes' | 'notes' | 'deliberations' | 'releve' | 'ufr'>('maquettes');

  // Selected filters
  const [selectedProgramId, setSelectedProgramId] = useState<string>('prog-gl-l');
  const [selectedSemester, setSelectedSemester] = useState<string>('S1');

  // Create UE Dialog
  const [isCreateUEOpen, setIsCreateUEOpen] = useState(false);
  const [ueCode, setUeCode] = useState("");
  const [ueName, setUeName] = useState("");
  const [ueType, setUeType] = useState<LMDUEType>('fondamentale');
  const [ueCredits, setUeCredits] = useState<number>(6);
  const [ueDescription, setUeDescription] = useState("");

  // Create ECUE Dialog
  const [isCreateEcueOpen, setIsCreateEcueOpen] = useState(false);
  const [targetUeId, setTargetUeId] = useState<string>("");
  const [ecueCode, setEcueCode] = useState("");
  const [ecueName, setEcueName] = useState("");
  const [ecueCredits, setEcueCredits] = useState<number>(3);
  const [ecueCoef, setEcueCoef] = useState<number>(1);
  const [ecueCM, setEcueCM] = useState<number>(20);
  const [ecueTD, setEcueTD] = useState<number>(15);
  const [ecueTP, setEcueTP] = useState<number>(10);

  // Grades entry state: Map of studentId -> { cc, exam, resit }
  const [selectedGradeEcueId, setSelectedGradeEcueId] = useState<string>('ecue-101-1');
  const [localGrades, setLocalGrades] = useState<Record<string, { cc?: string; exam?: string; resit?: string }>>({});

  // Selected student for transcript (Relevé LMD)
  const [transcriptStudentId, setTranscriptStudentId] = useState<string>('');

  const programs = programsQuery.data || [];
  const ues = (teachingUnitsQuery.data || []).filter(u => 
    (!selectedProgramId || u.program_id === selectedProgramId) &&
    (!selectedSemester || u.semester === selectedSemester)
  );

  // Calculate total credits in current semester
  const totalSemesterCredits = ues.reduce((sum, u) => sum + Number(u.credits || 0), 0);

  // Students list
  const allStudents = studentsQuery.data || [];
  const sampleStudents = allStudents.length > 0 ? allStudents : [
    { id: 'etu-01', first_name: 'Alexandre', last_name: 'KOUASSI', student_code: 'ETU-2025-0104' },
    { id: 'etu-02', first_name: 'Fatoumata', last_name: 'TRAORE', student_code: 'ETU-2025-0105' },
    { id: 'etu-03', first_name: 'Jean-Marc', last_name: 'BAMBA', student_code: 'ETU-2025-0106' },
    { id: 'etu-04', first_name: 'Esther', last_name: 'YAO', student_code: 'ETU-2025-0107' },
    { id: 'etu-05', first_name: 'David', last_name: 'CISSE', student_code: 'ETU-2025-0108' },
  ];

  // Default transcript student
  const activeStudent = sampleStudents.find(s => s.id === (transcriptStudentId || sampleStudents[0]?.id)) || sampleStudents[0];

  const handleCreateUE = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ueCode.trim() || !ueName.trim()) {
      toast.error("Veuillez renseigner le code et l'intitulé de l'UE");
      return;
    }

    await createUEMutation.mutateAsync({
      program_id: selectedProgramId,
      code: ueCode.trim().toUpperCase(),
      name: ueName.trim(),
      ue_type: ueType,
      semester: selectedSemester,
      credits: Number(ueCredits),
      description: ueDescription.trim() || null
    });

    setUeCode("");
    setUeName("");
    setUeCredits(6);
    setUeDescription("");
    setIsCreateUEOpen(false);
  };

  const handleCreateEcue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUeId || !ecueCode.trim() || !ecueName.trim()) {
      toast.error("Veuillez renseigner le code et l'intitulé de la matière");
      return;
    }

    await createEcueMutation.mutateAsync({
      ue_id: targetUeId,
      code: ecueCode.trim().toUpperCase(),
      name: ecueName.trim(),
      credits: Number(ecueCredits),
      coefficient: Number(ecueCoef),
      hours_cm: Number(ecueCM),
      hours_td: Number(ecueTD),
      hours_tp: Number(ecueTP),
    });

    setEcueCode("");
    setEcueName("");
    setIsCreateEcueOpen(false);
  };

  const handleSaveGrades = async () => {
    const gradesToSave = sampleStudents.map(st => {
      const g = localGrades[st.id] || {};
      const cc = g.cc !== undefined && g.cc !== "" ? parseFloat(g.cc) : 13;
      const exam = g.exam !== undefined && g.exam !== "" ? parseFloat(g.exam) : 12;
      const resit = g.resit !== undefined && g.resit !== "" ? parseFloat(g.resit) : undefined;

      return {
        student_id: st.id,
        ecue_id: selectedGradeEcueId,
        semester: selectedSemester,
        academic_year: '2025-2026',
        cc_score: cc,
        exam_score: exam,
        resit_score: resit,
      };
    });

    await saveGradesMutation.mutateAsync(gradesToSave);
  };

  return (
    <AppShell
      title="Système Universitaire LMD"
      subtitle="Gestion de l'enseignement supérieur, maquettes pédagogiques, crédits ECTS et délibérations"
      actions={
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Printer className="w-4 h-4" /> Imprimer
          </Button>
          <Button 
            size="sm" 
            onClick={() => {
              setActiveTab('notes');
              toast.info("Mode saisie des notes LMD activé");
            }}
            className="gap-1.5 bg-primary text-primary-foreground"
          >
            <Award className="w-4 h-4" /> Saisir des Notes LMD
          </Button>
        </div>
      }
    >
      {/* Top Banner: University & LMD Metrics */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 text-white shadow-md border border-emerald-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                <School className="w-3.5 h-3.5" /> Enseignement Supérieur Privé
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-mono font-bold text-accent">
                Norme CAMES / REESAO / ECTS
              </span>
            </div>
            <h1 className="mt-2.5 font-display text-2xl md:text-3xl font-bold tracking-tight">
              Architecture Pédagogique LMD (Licence · Master · Doctorat)
            </h1>
            <p className="mt-1 text-xs md:text-sm text-emerald-100/70 max-w-2xl">
              Structuration en Semestres, Unités d'Enseignement (UE), Éléments Constitutifs (ECUE), Capitalisation des crédits et Délibérations de jury.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-white/10 p-3.5 text-center min-w-28 backdrop-blur-sm border border-white/10">
              <div className="text-[10px] uppercase font-semibold text-emerald-200">Semestre Actuel</div>
              <div className="mt-1 font-display text-2xl font-bold text-accent">{selectedSemester}</div>
              <div className="text-[10px] text-emerald-200/80">30 ECTS cibles</div>
            </div>
            <div className="rounded-xl bg-white/10 p-3.5 text-center min-w-28 backdrop-blur-sm border border-white/10">
              <div className="text-[10px] uppercase font-semibold text-emerald-200">Crédits Configurés</div>
              <div className="mt-1 font-display text-2xl font-bold text-emerald-300">{totalSemesterCredits} / 30</div>
              <div className="text-[10px] text-emerald-200/80">
                {totalSemesterCredits === 30 ? "Conforme (100%)" : `${Math.round((totalSemesterCredits / 30) * 100)}% configuré`}
              </div>
            </div>
            <div className="rounded-xl bg-white/10 p-3.5 text-center min-w-28 backdrop-blur-sm border border-white/10">
              <div className="text-[10px] uppercase font-semibold text-emerald-200">UEs Actives</div>
              <div className="mt-1 font-display text-2xl font-bold">{ues.length}</div>
              <div className="text-[10px] text-emerald-200/80">{ues.reduce((c, u) => c + (u.elements?.length || 0), 0)} matières</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 flex border-b border-border overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('maquettes')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'maquettes'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-4 h-4" /> Maquette & Unités d'Enseignement (UEs)
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'notes'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Award className="w-4 h-4" /> Saisie des Notes & Rattrapages (CC / SN / SR)
        </button>
        <button
          onClick={() => setActiveTab('deliberations')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'deliberations'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileCheck className="w-4 h-4" /> Procès-Verbal de Délibération (Jury)
        </button>
        <button
          onClick={() => setActiveTab('releve')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'releve'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <GraduationCap className="w-4 h-4" /> Relevé de Notes Officiel LMD
        </button>
        <button
          onClick={() => setActiveTab('ufr')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'ufr'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <School className="w-4 h-4" /> Facultés, UFR & Départements
        </button>
      </div>

      {/* Global Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <Label htmlFor="program-select" className="text-xs text-muted-foreground font-semibold uppercase">Filière / Mention LMD</Label>
            <select
              id="program-select"
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="mt-1 block rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {programs.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code ? `[${p.code}] ` : ''}{p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="semester-select" className="text-xs text-muted-foreground font-semibold uppercase">Semestre Académique</Label>
            <div className="mt-1 flex gap-1">
              {['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map(sem => (
                <button
                  key={sem}
                  onClick={() => setSelectedSemester(sem)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    selectedSemester === sem
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'border border-border bg-secondary/60 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sem}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === 'maquettes' && (
          <div className="flex items-center gap-2">
            <Dialog open={isCreateUEOpen} onOpenChange={setIsCreateUEOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground">
                  <Plus className="w-4 h-4" /> Nouvelle Unité d'Enseignement (UE)
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <form onSubmit={handleCreateUE}>
                  <DialogHeader>
                    <DialogTitle>Créer une Unité d'Enseignement (UE)</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 py-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="ue_code">Code UE (ex: INF1101) *</Label>
                        <Input
                          id="ue_code"
                          placeholder="INF1101"
                          value={ueCode}
                          onChange={(e) => setUeCode(e.target.value)}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ue_credits">Crédits ECTS *</Label>
                        <Input
                          id="ue_credits"
                          type="number"
                          step="0.5"
                          min="1"
                          max="15"
                          value={ueCredits}
                          onChange={(e) => setUeCredits(parseFloat(e.target.value) || 0)}
                          required
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="ue_name">Intitulé de l'UE *</Label>
                      <Input
                        id="ue_name"
                        placeholder="Algorithmique & Structures de Données"
                        value={ueName}
                        onChange={(e) => setUeName(e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="ue_type">Type d'UE</Label>
                        <select
                          id="ue_type"
                          value={ueType}
                          onChange={(e) => setUeType(e.target.value as LMDUEType)}
                          className="mt-1 w-full rounded-md border border-border bg-background p-2 text-xs"
                        >
                          <option value="fondamentale">Fondamentale (UEF)</option>
                          <option value="complementaire">Complémentaire (UEC)</option>
                          <option value="transversale">Transversale (UET)</option>
                          <option value="optionnelle">Optionnelle (UEO)</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="ue_sem">Semestre</Label>
                        <Input
                          id="ue_sem"
                          value={selectedSemester}
                          disabled
                          className="mt-1 bg-muted"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="ue_desc">Description pédagogique & objectifs</Label>
                      <textarea
                        id="ue_desc"
                        rows={2}
                        placeholder="Objectifs et compétences visées..."
                        value={ueDescription}
                        onChange={(e) => setUeDescription(e.target.value)}
                        className="mt-1 w-full rounded-md border border-border bg-background p-2 text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateUEOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">Créer l'UE</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: MAQUETTE PÉDAGOGIQUE & UEs                                      */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'maquettes' && (
        <div className="space-y-6">
          {/* Semester Credit Status Tracker */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${totalSemesterCredits === 30 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Semestre {selectedSemester} : {totalSemesterCredits} Crédits ECTS
                </h4>
                <p className="text-xs text-muted-foreground">
                  Le système LMD impose 30 crédits par semestre (soit 60 crédits par année académique).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                totalSemesterCredits === 30 
                  ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' 
                  : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
              }`}>
                {totalSemesterCredits === 30 ? '✓ 30 ECTS Atteints' : `Écart : ${30 - totalSemesterCredits} ECTS`}
              </span>
            </div>
          </div>

          {/* List of UEs */}
          <div className="grid gap-4">
            {ues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <h3 className="font-semibold text-foreground">Aucune Unité d'Enseignement pour ce semestre</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Commencez par ajouter les Unités d'Enseignement (Fondamentales, Complémentaires ou Transversales) pour configurer la maquette LMD.
                </p>
                <Button 
                  onClick={() => setIsCreateUEOpen(true)}
                  className="mt-4 gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Créer la première UE
                </Button>
              </div>
            ) : (
              ues.map((ue) => {
                const typeColors = {
                  fondamentale: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                  complementaire: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
                  transversale: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                  optionnelle: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                };

                return (
                  <div key={ue.id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:border-primary/40 transition-all">
                    {/* UE Header */}
                    <div className="p-4 md:p-5 border-b border-border bg-secondary/30 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20">
                          {ue.code}
                        </span>
                        <div>
                          <h3 className="font-display font-bold text-base text-foreground">
                            {ue.name}
                          </h3>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {ue.description || "Unité d'enseignement du semestre"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase border ${typeColors[ue.ue_type] || typeColors.fondamentale}`}>
                          UE {ue.ue_type}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-accent text-accent-foreground shadow-sm">
                          {ue.credits} Crédits ECTS
                        </span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setTargetUeId(ue.id);
                            setIsCreateEcueOpen(true);
                          }}
                          className="gap-1 text-xs"
                        >
                          <Plus className="w-3.5 h-3.5" /> Ajouter ECUE (Matière)
                        </Button>
                      </div>
                    </div>

                    {/* Sub-table: ECUEs (Éléments Constitutifs / Matières) */}
                    <div className="p-0 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-secondary/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                          <tr>
                            <th className="px-4 py-2.5">Code ECUE</th>
                            <th className="px-4 py-2.5">Intitulé de la Matière (EC)</th>
                            <th className="px-3 py-2.5 text-center">Crédits</th>
                            <th className="px-3 py-2.5 text-center">Coef.</th>
                            <th className="px-3 py-2.5 text-center">CM (h)</th>
                            <th className="px-3 py-2.5 text-center">TD (h)</th>
                            <th className="px-3 py-2.5 text-center">TP (h)</th>
                            <th className="px-4 py-2.5">Enseignant Responsable</th>
                            <th className="px-3 py-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {(!ue.elements || ue.elements.length === 0) ? (
                            <tr>
                              <td colSpan={9} className="px-4 py-6 text-center text-xs text-muted-foreground italic">
                                Aucun élément constitutif (ECUE) configuré dans cette UE. Cliquez sur "Ajouter ECUE".
                              </td>
                            </tr>
                          ) : (
                            ue.elements.map((ecue) => (
                              <tr key={ecue.id} className="hover:bg-muted/40 transition-colors">
                                <td className="px-4 py-3 font-mono font-semibold text-primary">
                                  {ecue.code}
                                </td>
                                <td className="px-4 py-3 font-medium text-foreground">
                                  {ecue.name}
                                </td>
                                <td className="px-3 py-3 text-center font-bold text-accent">
                                  {ecue.credits ?? '-'}
                                </td>
                                <td className="px-3 py-3 text-center tabular-nums">
                                  {ecue.coefficient}
                                </td>
                                <td className="px-3 py-3 text-center tabular-nums text-muted-foreground">
                                  {ecue.hours_cm || 0} h
                                </td>
                                <td className="px-3 py-3 text-center tabular-nums text-muted-foreground">
                                  {ecue.hours_td || 0} h
                                </td>
                                <td className="px-3 py-3 text-center tabular-nums text-muted-foreground">
                                  {ecue.hours_tp || 0} h
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                  {ecue.teacher?.full_name || "Enseignant-Chercheur"}
                                </td>
                                <td className="px-3 py-3 text-right">
                                  <button
                                    onClick={() => {
                                      setSelectedGradeEcueId(ecue.id);
                                      setActiveTab('notes');
                                    }}
                                    className="text-[11px] text-primary hover:underline font-semibold"
                                  >
                                    Notes →
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal to add an ECUE */}
          <Dialog open={isCreateEcueOpen} onOpenChange={setIsCreateEcueOpen}>
            <DialogContent className="max-w-md">
              <form onSubmit={handleCreateEcue}>
                <DialogHeader>
                  <DialogTitle>Ajouter un Élément Constitutif (ECUE)</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="ecue_code">Code ECUE *</Label>
                      <Input
                        id="ecue_code"
                        placeholder="INF1101-1"
                        value={ecueCode}
                        onChange={(e) => setEcueCode(e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ecue_coef">Coefficient dans l'UE *</Label>
                      <Input
                        id="ecue_coef"
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={ecueCoef}
                        onChange={(e) => setEcueCoef(parseFloat(e.target.value) || 1)}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="ecue_name">Intitulé de la matière *</Label>
                    <Input
                      id="ecue_name"
                      placeholder="Algorithmique Avancée & Complexité"
                      value={ecueName}
                      onChange={(e) => setEcueName(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <Label htmlFor="ecue_cm">Heures CM</Label>
                      <Input
                        id="ecue_cm"
                        type="number"
                        min="0"
                        value={ecueCM}
                        onChange={(e) => setEcueCM(parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ecue_td">Heures TD</Label>
                      <Input
                        id="ecue_td"
                        type="number"
                        min="0"
                        value={ecueTD}
                        onChange={(e) => setEcueTD(parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ecue_tp">Heures TP</Label>
                      <Input
                        id="ecue_tp"
                        type="number"
                        min="0"
                        value={ecueTP}
                        onChange={(e) => setEcueTP(parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateEcueOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">Rattacher l'ECUE</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: SAISIE DES NOTES LMD (CC / EXAMEN / RATTRAPAGE)                */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* ECUE Selector */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-primary" />
              <div>
                <Label className="text-xs text-muted-foreground uppercase font-semibold">Matière / ECUE sélectionnée</Label>
                <select
                  value={selectedGradeEcueId}
                  onChange={(e) => setSelectedGradeEcueId(e.target.value)}
                  className="mt-1 block rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground"
                >
                  {ues.flatMap(u => (u.elements || []).map(e => (
                    <option key={e.id} value={e.id}>
                      [{u.code}] {e.code} — {e.name} (Coef. {e.coefficient})
                    </option>
                  )))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground bg-secondary/80 px-3 py-1.5 rounded-lg border border-border">
                Pondération LMD : <strong className="text-foreground">CC (40%)</strong> + <strong className="text-foreground">Examen SN (60%)</strong>
              </span>
              <Button 
                onClick={handleSaveGrades}
                disabled={saveGradesMutation.isPending}
                className="gap-1.5 bg-primary text-primary-foreground"
              >
                <Save className="w-4 h-4" /> Enregistrer les Notes
              </Button>
            </div>
          </div>

          {/* Grades Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-4 py-3">Matricule</th>
                    <th className="px-4 py-3">Étudiant(e)</th>
                    <th className="px-4 py-3 text-center">Contrôle Continu (40%)</th>
                    <th className="px-4 py-3 text-center">Session Normale (60%)</th>
                    <th className="px-4 py-3 text-center">Rattrapage (SR)</th>
                    <th className="px-4 py-3 text-center">Moyenne Retenue /20</th>
                    <th className="px-4 py-3 text-center">Statut Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sampleStudents.map((st, i) => {
                    const existing = localGrades[st.id] || {};
                    // Seed defaults if empty
                    const defaultCC = (12 + ((i * 3) % 6)).toFixed(1);
                    const defaultExam = (11 + ((i * 4) % 7)).toFixed(1);
                    const currentCC = existing.cc !== undefined ? existing.cc : defaultCC;
                    const currentExam = existing.exam !== undefined ? existing.exam : defaultExam;
                    const currentResit = existing.resit || "";

                    const numCC = parseFloat(currentCC) || 0;
                    const numExam = parseFloat(currentExam) || 0;
                    const numResit = parseFloat(currentResit) || null;
                    const effectiveExam = numResit !== null ? Math.max(numExam, numResit) : numExam;
                    const finalMark = Number(((numCC * 0.4) + (effectiveExam * 0.6)).toFixed(2));
                    const isValidated = finalMark >= 10.0;

                    return (
                      <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-muted-foreground">
                          {st.student_code || `ETU-2025-${i + 101}`}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {st.last_name} {st.first_name}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="20"
                            value={currentCC}
                            onChange={(e) => setLocalGrades(prev => ({
                              ...prev,
                              [st.id]: { ...(prev[st.id] || {}), cc: e.target.value }
                            }))}
                            className="mx-auto block w-20 rounded-md border border-border bg-background px-2 py-1 text-center font-mono text-xs tabular-nums focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="20"
                            value={currentExam}
                            onChange={(e) => setLocalGrades(prev => ({
                              ...prev,
                              [st.id]: { ...(prev[st.id] || {}), exam: e.target.value }
                            }))}
                            className="mx-auto block w-20 rounded-md border border-border bg-background px-2 py-1 text-center font-mono text-xs tabular-nums focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="20"
                            placeholder="Optionnel"
                            value={currentResit}
                            onChange={(e) => setLocalGrades(prev => ({
                              ...prev,
                              [st.id]: { ...(prev[st.id] || {}), resit: e.target.value }
                            }))}
                            className="mx-auto block w-20 rounded-md border border-border bg-background px-2 py-1 text-center font-mono text-xs tabular-nums focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-sm">
                          <span className={isValidated ? 'text-emerald-600' : 'text-red-500'}>
                            {finalMark.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isValidated ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Validé (V)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-bold text-red-600 border border-red-500/20">
                              <AlertCircle className="w-3 h-3" /> Non Validé (NV)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: PROCÈS-VERBAL DE DÉLIBÉRATION DU JURY                          */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'deliberations' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" /> Procès-Verbal Officiel de Délibération — Semestre {selectedSemester}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Calcul des moyennes semestrielles, application de la règle de compensation LMD et attribution des mentions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Exporter le PV
              </Button>
              <Button 
                size="sm"
                onClick={() => {
                  toast.success("Délibération de jury clôturée et signée électroniquement");
                }}
                className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                <Check className="w-3.5 h-3.5" /> Clôturer la Délibération
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/70 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-4 py-3">Matricule</th>
                    <th className="px-4 py-3">Étudiant</th>
                    {ues.map(u => (
                      <th key={u.id} className="px-2 py-3 text-center" title={u.name}>
                        {u.code}<br/>
                        <span className="text-[9px] font-normal text-muted-foreground">({u.credits} cr.)</span>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center">Crédits Validés</th>
                    <th className="px-3 py-3 text-center">Moyenne Semestre</th>
                    <th className="px-4 py-3 text-center">Décision du Jury</th>
                    <th className="px-3 py-3 text-center">Mention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sampleStudents.map((st, i) => {
                    // Compute mock averages for each UE
                    const ueMarks = ues.map((u, ui) => {
                      const base = 11 + ((i * 3 + ui * 2) % 7) + (i % 2 === 0 ? 1.5 : -1);
                      return Math.min(18.5, Math.max(7.5, Number(base.toFixed(2))));
                    });

                    const semAverage = Number((ueMarks.reduce((a, b) => a + b, 0) / (ueMarks.length || 1)).toFixed(2));
                    const isCompensated = semAverage >= 10.0;
                    
                    // Count validated credits
                    const validatedCredits = isCompensated 
                      ? 30 
                      : ues.reduce((acc, u, idx) => acc + (ueMarks[idx] >= 10.0 ? u.credits : 0), 0);

                    // Status
                    let decision = 'Ajourné (AJ)';
                    let decisionColor = 'bg-red-500/10 text-red-600 border-red-500/20';
                    if (validatedCredits === 30) {
                      if (ueMarks.every(m => m >= 10.0)) {
                        decision = 'Admis (ADM)';
                        decisionColor = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
                      } else {
                        decision = 'Admis par Compensation (ADC)';
                        decisionColor = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
                      }
                    } else if (validatedCredits >= 24) {
                      decision = 'Admis avec Dettes (ADD)';
                      decisionColor = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
                    }

                    // Mention
                    let mention = 'Passable';
                    if (semAverage >= 16) mention = 'Très Bien';
                    else if (semAverage >= 14) mention = 'Bien';
                    else if (semAverage >= 12) mention = 'Assez Bien';
                    else if (semAverage < 10) mention = 'Insuffisant';

                    return (
                      <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-muted-foreground">
                          {st.student_code || `ETU-2025-${i + 101}`}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {st.last_name} {st.first_name}
                        </td>
                        {ueMarks.map((m, idx) => (
                          <td key={idx} className="px-2 py-3 text-center font-mono">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              m >= 10.0 
                                ? 'bg-emerald-500/10 text-emerald-600' 
                                : isCompensated 
                                  ? 'bg-blue-500/10 text-blue-600' 
                                  : 'bg-red-500/10 text-red-600'
                            }`}>
                              {m.toFixed(1)}
                            </span>
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center font-mono font-bold text-accent">
                          {validatedCredits} / 30
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-sm">
                          {semAverage.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${decisionColor}`}>
                            {decision}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-medium text-muted-foreground">
                          {mention}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: RELEVÉ DE NOTES OFFICIEL LMD (FORMAT UNIVERSITAIRE)             */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'releve' && (
        <div className="space-y-6">
          {/* Student Selector */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Label htmlFor="st-releve" className="text-xs uppercase font-semibold text-muted-foreground">Sélectionner l'Étudiant(e) :</Label>
              <select
                id="st-releve"
                value={activeStudent.id}
                onChange={(e) => setTranscriptStudentId(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground"
              >
                {sampleStudents.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.last_name} {st.first_name} ({st.student_code || 'ETU'})
                  </option>
                ))}
              </select>
            </div>

            <Button 
              size="sm" 
              onClick={() => window.print()}
              className="gap-1.5 bg-primary text-primary-foreground"
            >
              <Printer className="w-4 h-4" /> Imprimer le Relevé LMD
            </Button>
          </div>

          {/* Printable Official LMD Transcript */}
          <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card shadow-lg p-8 print:p-0 print:border-none">
            {/* Header */}
            <div className="border-b-2 border-emerald-900/30 pb-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    République de Côte d'Ivoire · Enseignement Supérieur
                  </div>
                  <h2 className="mt-1 font-display text-xl md:text-2xl font-bold text-foreground">
                    UNIVERSITÉ PRIVÉE D'EXCELLENCE EURÊKA
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    UFR des Sciences & Technologies · Département d'Ingénierie Logicielle
                  </p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-900 text-accent font-display text-2xl font-bold shadow-md">
                  E
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-emerald-950/10 border border-emerald-800/20 p-3 text-center">
                <h3 className="font-display font-bold text-base md:text-lg text-emerald-900 uppercase tracking-wide">
                  RELEVÉ DE NOTES ET CRÉDITS DU SYSTÈME LMD
                </h3>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Semestre {selectedSemester} · Année Académique 2025-2026 · Session Normale & Rattrapage
                </div>
              </div>
            </div>

            {/* Student Info Box */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-secondary/40 border border-border text-xs mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Matricule Étudiant</span>
                <div className="font-mono font-bold text-sm text-primary mt-0.5">
                  {activeStudent.student_code || 'ETU-2025-0104'}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Nom & Prénoms</span>
                <div className="font-bold text-sm text-foreground mt-0.5">
                  {activeStudent.last_name} {activeStudent.first_name}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Filière / Cycle</span>
                <div className="font-medium text-foreground mt-0.5">
                  Licence 1 (Génie Logiciel)
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Régime d'Études</span>
                <div className="font-medium text-foreground mt-0.5">
                  Temps Plein (LMD)
                </div>
              </div>
            </div>

            {/* Detailed UEs and ECUEs Table */}
            <div className="border border-border rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/70 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-3 py-2.5">Code</th>
                    <th className="px-4 py-2.5">Unités d'Enseignement & Matières</th>
                    <th className="px-3 py-2.5 text-center">Crédits</th>
                    <th className="px-3 py-2.5 text-center">CC (40%)</th>
                    <th className="px-3 py-2.5 text-center">SN (60%)</th>
                    <th className="px-3 py-2.5 text-center">Moy./20</th>
                    <th className="px-3 py-2.5 text-center">Résultat</th>
                    <th className="px-3 py-2.5 text-center">Crédits Validés</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ues.map((ue) => {
                    const ueAverage = 14.25;
                    const isValidated = ueAverage >= 10.0;

                    return (
                      <React.Fragment key={ue.id}>
                        {/* UE Row */}
                        <tr className="bg-secondary/40 font-semibold text-foreground">
                          <td className="px-3 py-2 font-mono text-primary font-bold">{ue.code}</td>
                          <td className="px-4 py-2 uppercase tracking-wide text-[11px]">
                            {ue.name} <span className="text-[9px] lowercase font-normal text-muted-foreground">({ue.ue_type})</span>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-accent">{ue.credits}</td>
                          <td className="px-3 py-2 text-center">-</td>
                          <td className="px-3 py-2 text-center">-</td>
                          <td className="px-3 py-2 text-center font-bold font-mono text-emerald-600">{ueAverage.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600">
                              Validé (V)
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-emerald-600">
                            {ue.credits}
                          </td>
                        </tr>

                        {/* ECUE Rows */}
                        {(ue.elements || []).map(ec => (
                          <tr key={ec.id} className="text-muted-foreground hover:bg-muted/20">
                            <td className="px-3 py-1.5 font-mono text-[11px] pl-6">{ec.code}</td>
                            <td className="px-4 py-1.5 pl-6">{ec.name}</td>
                            <td className="px-3 py-1.5 text-center text-[11px]">{ec.credits || '-'}</td>
                            <td className="px-3 py-1.5 text-center font-mono text-[11px]">14.0</td>
                            <td className="px-3 py-1.5 text-center font-mono text-[11px]">14.5</td>
                            <td className="px-3 py-1.5 text-center font-mono text-[11px]">14.30</td>
                            <td className="px-3 py-1.5 text-center text-[10px] font-semibold text-emerald-600">Acquis</td>
                            <td className="px-3 py-1.5 text-center font-mono text-[11px]">-</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary & Deliberation Result */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-emerald-950/10 border border-emerald-800/30 text-xs mb-8">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Crédits Inscrits</span>
                <div className="font-mono font-bold text-base text-foreground mt-0.5">30.0 ECTS</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Crédits Validés</span>
                <div className="font-mono font-bold text-base text-emerald-600 mt-0.5">30.0 / 30.0 ECTS</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Moyenne Semestrielle</span>
                <div className="font-mono font-bold text-base text-primary mt-0.5">14.40 / 20.00</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Décision & Mention</span>
                <div className="font-bold text-sm text-emerald-700 mt-0.5">
                  Admis (ADM) · Bien
                </div>
              </div>
            </div>

            {/* Official Signatures */}
            <div className="grid grid-cols-2 pt-6 border-t border-border text-center text-xs">
              <div>
                <p className="font-semibold text-foreground">Le Président du Jury de Faculté</p>
                <div className="h-16 flex items-center justify-center text-muted-foreground/50 italic text-[11px]">
                  [Signature & Cachet Officiel]
                </div>
                <p className="text-[11px] text-muted-foreground">Prof. Titulaire K. N'GUESSAN</p>
              </div>

              <div>
                <p className="font-semibold text-foreground">Le Doyen de l'UFR / Le Recteur</p>
                <div className="h-16 flex items-center justify-center text-muted-foreground/50 italic text-[11px]">
                  [Sceau de l'Université]
                </div>
                <p className="text-[11px] text-muted-foreground">Fait à Abidjan, le 26 Septembre 2026</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: UFR, FACULTÉS & DÉPARTEMENTS                                   */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'ufr' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold text-sm text-foreground">Facultés, UFR et Départements Universitaires</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Organisation académique de l'établissement supérieur privé.
              </p>
            </div>
            <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground">
              <Plus className="w-4 h-4" /> Nouvelle Faculté / UFR
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <School className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-foreground">UFR Sciences & Technologies</h4>
                    <span className="text-[10px] font-mono text-muted-foreground">Code : FST</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent/20 text-accent">
                  4 Filières LMD
                </span>
              </div>
              <ul className="text-xs space-y-2 text-muted-foreground">
                <li className="flex items-center justify-between">
                  <span>Licence Génie Logiciel & Réseaux</span>
                  <span className="font-mono text-foreground font-semibold">180 ECTS</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Master Intelligence Artificielle & Big Data</span>
                  <span className="font-mono text-foreground font-semibold">120 ECTS</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Licence Cybersécurité & Systèmes</span>
                  <span className="font-mono text-foreground font-semibold">180 ECTS</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <School className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-foreground">UFR Sciences Économiques & Gestion</h4>
                    <span className="text-[10px] font-mono text-muted-foreground">Code : FSEG</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent/20 text-accent">
                  3 Filières LMD
                </span>
              </div>
              <ul className="text-xs space-y-2 text-muted-foreground">
                <li className="flex items-center justify-between">
                  <span>Licence Finance & Comptabilité</span>
                  <span className="font-mono text-foreground font-semibold">180 ECTS</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Master Audit, Contrôle & Finance de Marché</span>
                  <span className="font-mono text-foreground font-semibold">120 ECTS</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Licence Marketing Digital & E-commerce</span>
                  <span className="font-mono text-foreground font-semibold">180 ECTS</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
