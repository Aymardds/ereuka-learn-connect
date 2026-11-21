import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Users,
  ArrowUpRight,
  Plus,
  Edit2,
  Trash2,
  MoreHorizontal,
  UserCheck,
  GraduationCap,
  BookOpen,
  X,
  Award,
  School,
  Building2,
  CheckSquare,
  Square,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useClasses, ClassWithTeacher } from "@/hooks/useClasses";
import { useCampuses } from "@/hooks/useCampuses";
import { useSubjects, useClassSubjects } from "@/hooks/useSubjects";
import { useTeacherAssignments, TeacherClassAssignmentWithDetails } from "@/hooks/useTeacherAssignments";
import { useState, useEffect } from "react";
import { Class, UserProfile, Tenant } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getEstablishmentTypeInfo } from "@/lib/school-types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/classes")({
  head: () => ({
    meta: [
      { title: "Classes — Eurêka" },
      {
        name: "description",
        content: "Vue d'ensemble des classes, titulaires et effectifs.",
      },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  const { classesQuery, createClassMutation, updateClassMutation, deleteClassMutation } =
    useClasses();
  const { profile } = useAuth();
  const canManageClasses = Boolean(profile?.role && ['admin', 'director', 'accountant', 'dean', 'department_head', 'superadmin'].includes(profile.role));

  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    if (!profile?.tenant_id) return;

    supabase
      .from("user_profiles")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .eq("role", "teacher")
      .then(({ data }) => {
        if (data) setTeachers(data as UserProfile[]);
      });

    supabase
      .from("tenants")
      .select("*")
      .eq("id", profile.tenant_id)
      .single()
      .then(({ data }) => {
        if (data) setTenant(data as Tenant);
      });
  }, [profile?.tenant_id]);

  const estInfo = getEstablishmentTypeInfo(tenant?.school_types || profile?.tenant?.school_types);
  const schoolTypes = estInfo.schoolTypes;

  const { campuses = [], createCampus } = useCampuses();
  const [activeLevelTab, setActiveLevelTab] = useState<string>('all');
  const [activeCampusFilter, setActiveCampusFilter] = useState<string>('all');

  // Sub-establishment (Campus) modal state
  const [isCreateCampusOpen, setIsCreateCampusOpen] = useState(false);
  const [campusName, setCampusName] = useState('');
  const [campusCity, setCampusCity] = useState('');
  const [campusCode, setCampusCode] = useState('');
  const [campusSchoolTypes, setCampusSchoolTypes] = useState<string[]>([]);
  const [isSubmittingCampus, setIsSubmittingCampus] = useState(false);

  // State for Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newLevelType, setNewLevelType] = useState<string>("");
  const [newTeacherId, setNewTeacherId] = useState<string | undefined>();
  const [newCampusId, setNewCampusId] = useState<string | undefined>();

  useEffect(() => {
    if (isCreateOpen && !newLevelType && schoolTypes.length > 0) {
      setNewLevelType(schoolTypes[0]);
    }
  }, [isCreateOpen, schoolTypes]);

  // State for Edit Modal
  const [editingClass, setEditingClass] = useState<ClassWithTeacher | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editLevelType, setEditLevelType] = useState<string>("");
  const [editTeacherId, setEditTeacherId] = useState<string | undefined>();
  const [editCampusId, setEditCampusId] = useState<string | undefined>();

  // State for Manage Subjects (secondaire)
  const [managingClass, setManagingClass] = useState<ClassWithTeacher | null>(null);

  // State for Manage Teachers (all levels)
  const [managingTeachersClass, setManagingTeachersClass] = useState<ClassWithTeacher | null>(null);

  // State for Batch Assign Teacher to Classes Modal
  const { batchAssignMutation } = useTeacherAssignments();
  const { subjectsQuery } = useSubjects();
  const allSubjects = subjectsQuery.data || [];
  const [isBatchAssignTeacherOpen, setIsBatchAssignTeacherOpen] = useState(false);
  const [batchTeacherId, setBatchTeacherId] = useState('');
  const [batchRole, setBatchRole] = useState<'titulaire' | 'intervenant' | 'surveillant'>('intervenant');
  const [batchSubjectId, setBatchSubjectId] = useState<string>('none');
  const [batchSelectedClassIds, setBatchSelectedClassIds] = useState<string[]>([]);
  const [batchSetAsTitulaire, setBatchSetAsTitulaire] = useState(false);
  const [batchLevelFilter, setBatchLevelFilter] = useState<string>('all');

  const handleBatchAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchTeacherId) {
      return;
    }
    if (batchSelectedClassIds.length === 0) {
      return;
    }

    await batchAssignMutation.mutateAsync({
      teacherId: batchTeacherId,
      classIds: batchSelectedClassIds,
      subjectId: batchSubjectId === 'none' ? null : batchSubjectId,
      roleInClass: batchRole,
      setAsTitulaire: batchSetAsTitulaire || batchRole === 'titulaire',
    });

    setIsBatchAssignTeacherOpen(false);
    setBatchTeacherId('');
    setBatchSelectedClassIds([]);
    setBatchSubjectId('none');
    setBatchRole('intervenant');
    setBatchSetAsTitulaire(false);
  };

  // State for Delete Alert
  const [deletingClass, setDeletingClass] = useState<Class | null>(null);

  const handleCreateCampusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusName.trim()) return;
    setIsSubmittingCampus(true);
    try {
      await createCampus({
        name: campusName.trim(),
        city: campusCity.trim() || null,
        code: campusCode.trim().toUpperCase() || null,
        school_types: campusSchoolTypes.length > 0 ? campusSchoolTypes : schoolTypes,
      });
      setCampusName('');
      setCampusCity('');
      setCampusCode('');
      setCampusSchoolTypes([]);
      setIsCreateCampusOpen(false);
    } finally {
      setIsSubmittingCampus(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newLevelType) return;
    await createClassMutation.mutateAsync({
      name: newClassName,
      level_type: newLevelType,
      teacher_id: newTeacherId || null,
      campus_id: newCampusId || null,
    });
    setNewClassName("");
    setNewTeacherId(undefined);
    setNewCampusId(undefined);
    setIsCreateOpen(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editClassName.trim() || !editLevelType) return;
    await updateClassMutation.mutateAsync({
      id: editingClass.id,
      name: editClassName,
      level_type: editLevelType,
      teacher_id: editTeacherId || null,
      campus_id: editCampusId || null,
    });
    setEditingClass(null);
  };

  const handleDelete = async () => {
    if (!deletingClass) return;
    await deleteClassMutation.mutateAsync(deletingClass.id);
    setDeletingClass(null);
  };

  const openEdit = (c: ClassWithTeacher) => {
    setEditingClass(c);
    setEditClassName(c.name);
    setEditLevelType(c.level_type || schoolTypes[0] || "");
    setEditTeacherId(c.teacher_id || undefined);
    setEditCampusId(c.campus_id || undefined);
  };

  if (classesQuery.isLoading) {
    return (
      <AppShell title="Classes">
        <div className="p-8">Chargement des classes...</div>
      </AppShell>
    );
  }

  const rawClassesList = classesQuery.data || [];

  // Filtrer strictement selon le type d'établissement :
  // Les classes universitaires (Supérieur) ne doivent JAMAIS apparaître dans un Groupe Scolaire
  const allFilteredClasses = rawClassesList.filter(c => {
    if (!estInfo.hasSuperieur && c.level_type === 'Supérieur') return false;
    if (estInfo.isUniversityOnly && c.level_type && ['Maternelle', 'Primaire', 'Secondaire'].includes(c.level_type)) return false;
    return true;
  });

  const classesList = allFilteredClasses
    .filter(c => activeLevelTab === 'all' || c.level_type === activeLevelTab)
    .filter(c => activeCampusFilter === 'all' || c.campus_id === activeCampusFilter);

  // Group by level_type
  const grouped = classesList.reduce<Record<string, ClassWithTeacher[]>>(
    (acc, c) => {
      const key = c.level_type || "Autre";
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
      return acc;
    },
    {}
  );

  const pageTitle = estInfo.isUniversityOnly ? "Filières & Niveaux" : (estInfo.isMixed ? "Classes & Filières" : "Classes & Niveaux");
  const createButtonText = estInfo.isUniversityOnly ? "Créer une filière / promotion" : "Créer une classe";

  return (
    <AppShell
      title={pageTitle}
      subtitle={`${classesList.length} ${estInfo.classesTerm} enregistrée${classesList.length > 1 ? "s" : ""} • ${estInfo.badgeLabel}`}
      actions={
        canManageClasses ? (
          <div className="flex items-center gap-2">
            {teachers.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBatchSelectedClassIds([]);
                  setIsBatchAssignTeacherOpen(true);
                }}
                className="gap-1.5 text-xs font-semibold bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300"
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Affecter un Enseignant
              </Button>
            )}

            {(schoolTypes.length >= 2 || campuses.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCampusSchoolTypes(schoolTypes);
                  setIsCreateCampusOpen(true);
                }}
                className="gap-1.5 text-xs font-semibold"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Sous-Établissement (Campus)
              </Button>
            )}

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95">
                <Plus className="h-4 w-4" /> {createButtonText}
              </button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>
                    {estInfo.isUniversityOnly ? "Nouvelle filière ou promotion" : "Nouvelle classe"}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">
                      {estInfo.isUniversityOnly ? "Intitulé de la filière / promotion" : "Nom de la classe"}
                    </Label>
                    <Input
                      id="name"
                      placeholder={estInfo.isUniversityOnly ? "Ex: Licence 1 Informatique (L1-INFO)" : "Ex: 6ème A, CM2 B"}
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      required
                    />
                  </div>
                  {campuses.length > 0 && (
                    <div className="grid gap-2">
                      <Label htmlFor="new-campus">Sous-établissement / Campus (optionnel)</Label>
                      <Select value={newCampusId || "none"} onValueChange={(val) => setNewCampusId(val === "none" ? undefined : val)}>
                        <SelectTrigger id="new-campus">
                          <SelectValue placeholder="Siège principal (aucun)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Siège principal (aucun)</SelectItem>
                          {campuses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}{c.city ? ` — ${c.city}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                {schoolTypes.length > 0 && (
                  <div className="grid gap-2">
                    <Label htmlFor="level_type">Niveau d'enseignement</Label>
                    <Select value={newLevelType} onValueChange={setNewLevelType}>
                      <SelectTrigger id="level_type">
                        <SelectValue placeholder="Sélectionner le niveau" />
                      </SelectTrigger>
                      <SelectContent>
                        {schoolTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type === 'Supérieur' ? 'Supérieur (Université / LMD)' : type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {newLevelType === "Supérieur" && (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-300 space-y-1.5">
                    <div className="font-semibold flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-600" /> Promotion Universitaire (Système LMD)
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {['Licence 1 (L1)', 'Licence 2 (L2)', 'Licence 3 (L3)', 'Master 1 (M1)', 'Master 2 (M2)', 'Doctorat'].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setNewClassName(sug)}
                          className="px-2 py-0.5 rounded bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-200 text-[11px] font-medium border border-emerald-500/20"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="teacher">
                    {newLevelType === "Secondaire" ? "Professeur Principal (optionnel)" : "Enseignant titulaire (optionnel)"}
                  </Label>
                  <Select value={newTeacherId || "none"} onValueChange={(val) => setNewTeacherId(val === "none" ? undefined : val)}>
                    <SelectTrigger id="teacher">
                      <SelectValue placeholder="Sélectionner un enseignant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun titulaire</SelectItem>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.full_name || t.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createClassMutation.isPending}>
                  {createClassMutation.isPending ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
        ) : null
      }
    >
      {/* ── PILLS DE NIVEAU ── */}
      {schoolTypes.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setActiveLevelTab('all')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
              activeLevelTab === 'all'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary'
            }`}
          >
            Tous les niveaux
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeLevelTab === 'all' ? 'bg-white/20' : 'bg-muted'}`}>
              {allFilteredClasses.length}
            </span>
          </button>
          {schoolTypes.map(type => {
            const count = allFilteredClasses.filter(c => c.level_type === type).length;
            if (count === 0) return null;
            const icons: Record<string, string> = {
              'Maternelle': '🌸', 'Primaire': '📚', 'Secondaire': '🏫', 'Supérieur': '🎓'
            };
            return (
              <button
                key={type}
                onClick={() => setActiveLevelTab(type)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  activeLevelTab === type
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary'
                }`}
              >
                <span>{icons[type] || '📋'}</span>
                {type}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeLevelTab === type ? 'bg-white/20' : 'bg-muted'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── PILLS CAMPUS / SOUS-ÉTABLISSEMENTS ── */}
      {campuses.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Campus :</span>
          <button
            onClick={() => setActiveCampusFilter('all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              activeCampusFilter === 'all'
                ? 'bg-secondary text-secondary-foreground border-primary/40 font-bold'
                : 'bg-background text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            Tous les campus ({campuses.length})
          </button>
          {campuses.map(camp => (
            <button
              key={camp.id}
              onClick={() => setActiveCampusFilter(camp.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                activeCampusFilter === camp.id
                  ? 'bg-secondary text-secondary-foreground border-primary/40 font-bold'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              <Building2 className="w-3 h-3 text-emerald-600" />
              {camp.name} {camp.city ? `(${camp.city})` : ''}
            </button>
          ))}
        </div>
      )}
      {classesList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Aucune classe trouvée. Créez votre première classe !
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([levelType, classes]) => (
            <div key={levelType}>
              {/* Level header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <h2 className="font-semibold text-lg">{levelType}</h2>
                <span className="text-sm text-muted-foreground">
                  ({classes.length} classe{classes.length !== 1 ? "s" : ""})
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {classes.map((c) => {
                  const campusName = campuses.find((cp) => cp.id === c.campus_id)?.name;
                  return (
                    <ClassCard
                      key={c.id}
                      c={c}
                      campusName={campusName}
                      canManage={canManageClasses}
                      onEdit={openEdit}
                      onDelete={setDeletingClass}
                      onManageSubjects={setManagingClass}
                      onManageTeachers={setManagingTeachersClass}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editingClass}
        onOpenChange={(open) => !open && setEditingClass(null)}
      >
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Modifier la classe</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nom de la classe</Label>
                <Input
                  id="edit-name"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  required
                />
              </div>
              {schoolTypes.length > 0 && (
                <div className="grid gap-2">
                  <Label htmlFor="edit-level_type">Niveau d'enseignement</Label>
                  <Select value={editLevelType} onValueChange={setEditLevelType}>
                    <SelectTrigger id="edit-level_type">
                      <SelectValue placeholder="Sélectionner le niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="edit-teacher">
                  {editLevelType === "Secondaire" ? "Professeur Principal" : "Enseignant titulaire"}
                </Label>
                <Select
                  value={editTeacherId || "none"}
                  onValueChange={(val) =>
                    setEditTeacherId(val === "none" ? undefined : val)
                  }
                >
                  <SelectTrigger id="edit-teacher">
                    <SelectValue placeholder="Sélectionner un enseignant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun titulaire</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name || t.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {campuses.length > 0 && (
                <div className="grid gap-2">
                  <Label htmlFor="edit-campus">Sous-établissement / Campus</Label>
                  <Select
                    value={editCampusId || "none"}
                    onValueChange={(val) => setEditCampusId(val === "none" ? undefined : val)}
                  >
                    <SelectTrigger id="edit-campus">
                      <SelectValue placeholder="Siège principal (aucun)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Siège principal (aucun)</SelectItem>
                      {campuses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.city ? ` — ${c.city}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingClass(null)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={updateClassMutation.isPending}>
                {updateClassMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog
        open={!!deletingClass}
        onOpenChange={(open) => !open && setDeletingClass(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Êtes-vous sûr de vouloir supprimer cette classe ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Elle supprimera définitivement la
              classe "{deletingClass?.name}" ainsi que tous les élèves et
              présences associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Subjects (Secondaire) */}
      {managingClass && (
        <ManageSubjectsDialog
          isOpen={!!managingClass}
          onClose={() => setManagingClass(null)}
          classData={managingClass}
          teachers={teachers}
        />
      )}

      {/* Manage Teachers (all levels) */}
      {managingTeachersClass && (
        <ManageTeachersDialog
          isOpen={!!managingTeachersClass}
          onClose={() => setManagingTeachersClass(null)}
          classData={managingTeachersClass}
          teachers={teachers}
        />
      )}

      {/* ── DIALOG DE CRÉATION DE SOUS-ÉTABLISSEMENT (CAMPUS) ── */}
      <Dialog open={isCreateCampusOpen} onOpenChange={setIsCreateCampusOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateCampusSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" /> Créer un Sous-Établissement (Campus)
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-3 text-xs">
              <div className="grid gap-1.5">
                <Label htmlFor="camp_name">Nom du sous-établissement *</Label>
                <Input
                  id="camp_name"
                  required
                  placeholder="Ex: Campus Primaire Plateau, Annexe Supérieur"
                  value={campusName}
                  onChange={(e) => setCampusName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="camp_city">Ville / Commune</Label>
                  <Input
                    id="camp_city"
                    placeholder="Ex: Abidjan - Cocody"
                    value={campusCity}
                    onChange={(e) => setCampusCity(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="camp_code">Code abrégé</Label>
                  <Input
                    id="camp_code"
                    placeholder="Ex: CAMP-02"
                    value={campusCode}
                    onChange={(e) => setCampusCode(e.target.value)}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid gap-2 pt-1">
                <Label className="font-bold text-foreground">
                  Niveaux d'enseignement dispensés dans ce sous-établissement :
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Sélectionnez les niveaux qui seront gérés au sein de cette entité :
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {schoolTypes.map((type) => {
                    const isSelected = campusSchoolTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setCampusSchoolTypes((prev) =>
                            isSelected ? prev.filter((t) => t !== type) : [...prev, type]
                          );
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                            : "bg-white border-border text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] text-white font-bold ${isSelected ? 'bg-emerald-600' : 'border border-gray-300'}`}>
                          {isSelected ? '✓' : ''}
                        </span>
                        <span className="truncate">{type}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateCampusOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isSubmittingCampus} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {isSubmittingCampus ? "Création..." : "Enregistrer le sous-établissement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG D'AFFECTATION D'UN ENSEIGNANT À DES CLASSES ── */}
      <Dialog open={isBatchAssignTeacherOpen} onOpenChange={setIsBatchAssignTeacherOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col">
          <form onSubmit={handleBatchAssignSubmit} className="flex flex-col flex-1 overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-700">
                <UserCheck className="w-5 h-5 text-indigo-600" /> Affecter un Enseignant à des Classes
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3 overflow-y-auto flex-1 pr-1 text-xs">
              {/* Enseignant & Rôle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/20 p-3 rounded-xl border">
                <div className="grid gap-1.5">
                  <Label className="font-bold">Enseignant concerné *</Label>
                  <Select value={batchTeacherId} onValueChange={setBatchTeacherId}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="Choisir un enseignant" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.full_name || t.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label className="font-bold">Rôle dans la/les classe(s)</Label>
                  <Select value={batchRole} onValueChange={(val) => setBatchRole(val as any)}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="titulaire">Prof. Principal / Titulaire</SelectItem>
                      <SelectItem value="intervenant">Enseignant de matière (Intervenant)</SelectItem>
                      <SelectItem value="surveillant">Surveillant / Répétiteur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Matière optionnelle */}
                {allSubjects.length > 0 && (
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label className="font-bold">Matière enseignée (optionnel)</Label>
                    <Select value={batchSubjectId} onValueChange={setBatchSubjectId}>
                      <SelectTrigger className="h-9 bg-background">
                        <SelectValue placeholder="Toutes matières / non précisé" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Toutes matières / Enseignant polyvalent</SelectItem>
                        {allSubjects.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Sélection des classes */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="font-bold text-foreground">
                    Sélectionner les classes à attribuer ({batchSelectedClassIds.length} sélectionnée{batchSelectedClassIds.length > 1 ? 's' : ''}) *
                  </Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const targetClasses = batchLevelFilter === 'all'
                          ? classesList
                          : classesList.filter(c => c.level_type === batchLevelFilter);
                        setBatchSelectedClassIds(targetClasses.map(c => c.id));
                      }}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Tout cocher
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={() => setBatchSelectedClassIds([])}
                      className="text-[11px] text-muted-foreground hover:text-foreground font-semibold"
                    >
                      Tout décocher
                    </button>
                  </div>
                </div>

                {/* Filtre par niveau pour sélection rapide */}
                {schoolTypes.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBatchLevelFilter('all')}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                        batchLevelFilter === 'all'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      Toutes
                    </button>
                    {schoolTypes.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setBatchLevelFilter(t)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                          batchLevelFilter === t
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}

                {/* Grille des classes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1 border rounded-xl bg-background">
                  {classesList
                    .filter(c => batchLevelFilter === 'all' || c.level_type === batchLevelFilter)
                    .map(c => {
                      const isSelected = batchSelectedClassIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setBatchSelectedClassIds(prev =>
                              isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-left text-xs transition-all ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold'
                              : 'bg-card border-border text-muted-foreground hover:bg-muted/40'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded shrink-0 mt-0.5 flex items-center justify-center text-[10px] text-white font-bold ${isSelected ? 'bg-indigo-600' : 'border border-gray-300'}`}>
                            {isSelected ? '✓' : ''}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold text-foreground">{c.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{c.level_type || 'Général'}</div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Option définir titulaire */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-200/60 text-xs">
                <input
                  id="set-titulaire-chk"
                  type="checkbox"
                  checked={batchSetAsTitulaire || batchRole === 'titulaire'}
                  onChange={e => setBatchSetAsTitulaire(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="set-titulaire-chk" className="cursor-pointer font-medium text-indigo-950">
                  Définir également cet enseignant comme titulaire / prof. principal sur ces classes
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsBatchAssignTeacherOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!batchTeacherId || batchSelectedClassIds.length === 0 || batchAssignMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {batchAssignMutation.isPending ? "Affectation en cours..." : `Affecter à ${batchSelectedClassIds.length} classe(s)`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

// ─── Class Card Component ────────────────────────────────────────────────────

function ClassCard({
  c,
  campusName,
  canManage = true,
  onEdit,
  onDelete,
  onManageSubjects,
  onManageTeachers,
}: {
  c: ClassWithTeacher;
  campusName?: string;
  canManage?: boolean;
  onEdit: (c: ClassWithTeacher) => void;
  onDelete: (c: ClassWithTeacher) => void;
  onManageSubjects: (c: ClassWithTeacher) => void;
  onManageTeachers: (c: ClassWithTeacher) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="group rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md relative">
      {canManage && (
        <div className="absolute top-4 right-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-secondary">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onEdit(c)}
                className="cursor-pointer"
              >
                <Edit2 className="h-4 w-4 mr-2" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onManageTeachers(c)}
                className="cursor-pointer text-indigo-600 focus:text-indigo-700"
              >
                <Users className="h-4 w-4 mr-2" /> Gérer les enseignants
              </DropdownMenuItem>
              {c.level_type === "Secondaire" && (
                <DropdownMenuItem
                  onClick={() => onManageSubjects(c)}
                  className="cursor-pointer text-blue-600 focus:text-blue-700"
                >
                  <BookOpen className="h-4 w-4 mr-2" /> Gérer les matières
                </DropdownMenuItem>
              )}
              {c.level_type === "Supérieur" && (
                <DropdownMenuItem
                  onClick={() => navigate({ to: '/lmd' })}
                  className="cursor-pointer text-emerald-600 focus:text-emerald-700"
                >
                  <Award className="h-4 w-4 mr-2" /> Maquette LMD & UEs
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDelete(c)}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h3 className="mt-2 font-display text-2xl font-semibold pr-8">
            {c.name}
          </h3>
          <div className="mt-2 flex flex-col gap-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 flex-wrap">
              {c.level_type && (
                <span className="inline-flex w-fit items-center rounded-md bg-secondary/50 px-2 py-0.5 font-medium text-secondary-foreground">
                  {c.level_type}
                </span>
              )}
              {campusName && (
                <span className="inline-flex w-fit items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 border border-amber-500/20 text-[11px]">
                  <Building2 className="w-3 h-3 text-amber-600" /> {campusName}
                </span>
              )}
            </div>
            {c.level_type === "Supérieur" && (
              <span className="inline-flex w-fit items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-600 border border-emerald-500/20">
                <Award className="w-3 h-3" /> Système LMD (ECTS)
              </span>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <UserCheck className="w-3.5 h-3.5 text-primary" />
              <span>
                {c.level_type === "Secondaire" ? "Prof. Principal : " : "Titulaire : "}
                <b className="text-foreground">
                  {c.user_profiles?.full_name || "Non assigné"}
                </b>
              </span>
            </div>
          </div>
        </div>
        <div className="flex h-10 w-10 mt-2 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Users className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={() => onManageTeachers(c)}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80"
        >
          <Users className="h-3.5 w-3.5" /> Enseignants
        </button>
        <span className="text-muted-foreground">·</span>
        <button className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          Voir la classe <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Manage Teachers Dialog ──────────────────────────────────────────────────

function ManageTeachersDialog({
  isOpen,
  onClose,
  classData,
  teachers,
}: {
  isOpen: boolean;
  onClose: () => void;
  classData: ClassWithTeacher;
  teachers: UserProfile[];
}) {
  const { useClassAssignments, createAssignmentMutation, deleteAssignmentMutation } =
    useTeacherAssignments();
  const { subjectsQuery } = useSubjects();

  const classAssignmentsQuery = useClassAssignments(classData.id);
  const assignments = classAssignmentsQuery.data || [];
  const subjects = subjectsQuery.data || [];

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("none");
  const [selectedRole, setSelectedRole] = useState<"titulaire" | "intervenant" | "surveillant">("intervenant");

  // Teachers not yet assigned (at all) to this class
  const assignedTeacherIds = new Set(assignments.map((a) => a.teacher_id));

  const handleAssign = async () => {
    if (!selectedTeacherId) return;
    await createAssignmentMutation.mutateAsync({
      teacherId: selectedTeacherId,
      classId: classData.id,
      subjectId: selectedSubjectId === "none" ? null : selectedSubjectId,
      roleInClass: selectedRole,
    });
    setSelectedTeacherId("");
    setSelectedSubjectId("none");
    setSelectedRole("intervenant");
  };

  const roleLabels = {
    titulaire: "Titulaire",
    intervenant: "Intervenant",
    surveillant: "Surveillant",
  };

  const roleBadge = {
    titulaire: "bg-indigo-100 text-indigo-800 border-indigo-200",
    intervenant: "bg-emerald-100 text-emerald-800 border-emerald-200",
    surveillant: "bg-amber-100 text-amber-800 border-amber-200",
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Enseignants — {classData.name}
            {classData.level_type && (
              <span className="text-sm font-normal text-muted-foreground">
                ({classData.level_type})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1">
          {/* Add teacher form */}
          <div className="p-4 bg-muted/30 rounded-xl border space-y-3">
            <h4 className="text-sm font-semibold">Assigner un enseignant</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Enseignant *</Label>
                <Select
                  value={selectedTeacherId}
                  onValueChange={setSelectedTeacherId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un enseignant" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.length === 0 && (
                      <SelectItem value="none" disabled>
                        Aucun enseignant disponible
                      </SelectItem>
                    )}
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name || t.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Rôle</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(v) =>
                    setSelectedRole(v as typeof selectedRole)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="titulaire">Titulaire</SelectItem>
                    <SelectItem value="intervenant">Intervenant</SelectItem>
                    <SelectItem value="surveillant">Surveillant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {subjects.length > 0 && (
                <div className="grid gap-2 col-span-2">
                  <Label>Matière enseignée (optionnel)</Label>
                  <Select
                    value={selectedSubjectId}
                    onValueChange={setSelectedSubjectId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes matières / non précisé" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        Non précisé / Toutes matières
                      </SelectItem>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Button
              onClick={handleAssign}
              disabled={!selectedTeacherId || createAssignmentMutation.isPending}
              className="w-full"
            >
              {createAssignmentMutation.isPending ? "Assignation..." : "Assigner à la classe"}
            </Button>
          </div>

          {/* Assigned teachers list */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Enseignants assignés ({assignments.length})
            </h4>

            {classAssignmentsQuery.isLoading ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Chargement...
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-8 bg-muted/10 rounded-xl border border-dashed text-sm text-muted-foreground">
                <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Aucun enseignant assigné à cette classe pour le moment.
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                        {(
                          (a as any).user_profiles?.full_name ||
                          (a as any).user_profiles?.email ||
                          "?"
                        )[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">
                          {(a as any).user_profiles?.full_name || (a as any).user_profiles?.email}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${roleBadge[a.role_in_class]}`}
                          >
                            {roleLabels[a.role_in_class]}
                          </span>
                          {(a as any).subjects && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {(a as any).subjects?.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteAssignmentMutation.mutate(a.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manage Subjects Dialog (Secondaire) ────────────────────────────────────

function ManageSubjectsDialog({
  isOpen,
  onClose,
  classData,
  teachers,
}: {
  isOpen: boolean;
  onClose: () => void;
  classData: ClassWithTeacher;
  teachers: UserProfile[];
}) {
  const { subjectsQuery } = useSubjects();
  const {
    classSubjectsQuery,
    assignSubjectMutation,
    removeSubjectMutation,
    updateAssignmentMutation,
  } = useClassSubjects(classData.id);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<
    string | undefined
  >();

  const subjects = subjectsQuery.data || [];
  const assignedSubjects = classSubjectsQuery.data || [];

  const unassignedSubjects = subjects.filter(
    (s) => !assignedSubjects.find((as) => as.subject_id === s.id)
  );

  const handleAssign = async () => {
    if (!selectedSubjectId) return;
    await assignSubjectMutation.mutateAsync({
      subjectId: selectedSubjectId,
      teacherId: selectedTeacherId || null,
    });
    setSelectedSubjectId("");
    setSelectedTeacherId(undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Matières et Enseignants — {classData.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Add Subject form */}
          <div className="flex items-end gap-3 p-4 bg-muted/30 rounded-xl border">
            <div className="grid gap-2 flex-1">
              <Label>Matière</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une matière" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                  {unassignedSubjects.length === 0 && (
                    <SelectItem value="none" disabled>
                      Toutes les matières sont assignées
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 flex-1">
              <Label>Enseignant (optionnel)</Label>
              <Select
                value={selectedTeacherId || "none"}
                onValueChange={(val) =>
                  setSelectedTeacherId(val === "none" ? undefined : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un enseignant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">À définir</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name || t.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAssign}
              disabled={!selectedSubjectId || assignSubjectMutation.isPending}
            >
              Ajouter
            </Button>
          </div>

          {/* Assigned Subjects List */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Matières assignées ({assignedSubjects.length})
            </h4>
            {classSubjectsQuery.isLoading ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Chargement...
              </div>
            ) : assignedSubjects.length === 0 ? (
              <div className="text-center py-8 bg-muted/10 rounded-xl border border-dashed text-sm text-muted-foreground">
                Aucune matière assignée pour le moment.
              </div>
            ) : (
              <div className="space-y-2">
                {assignedSubjects.map((as) => (
                  <div
                    key={as.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div>
                      <div className="font-semibold">{as.subjects?.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] font-mono">
                          Coeff. {as.subjects?.coefficient}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          {as.user_profiles?.full_name || "Enseignant non défini"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={as.teacher_id || "none"}
                        onValueChange={(val) =>
                          updateAssignmentMutation.mutate({
                            id: as.id,
                            teacherId: val === "none" ? null : val,
                          })
                        }
                      >
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue placeholder="Changer d'enseignant" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">À définir</SelectItem>
                          {teachers.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.full_name || t.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeSubjectMutation.mutate(as.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}