import { createFileRoute } from "@tanstack/react-router";
import { Users, ArrowUpRight, Plus, Edit2, Trash2, MoreHorizontal, UserCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useClasses, ClassWithTeacher } from "@/hooks/useClasses";
import { useSubjects, useClassSubjects } from "@/hooks/useSubjects";
import { useState, useEffect } from "react";
import { Class, UserProfile, Tenant } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/classes")({
  head: () => ({
    meta: [
      { title: "Classes — Ereuka" },
      { name: "description", content: "Vue d'ensemble des classes, titulaires et effectifs." },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  const { classesQuery, createClassMutation, updateClassMutation, deleteClassMutation } = useClasses();
  const { profile } = useAuth();
  
  // Teachers and Tenant info
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    
    // Fetch teachers
    supabase
      .from('user_profiles')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('role', 'teacher')
      .then(({ data }) => {
        if (data) setTeachers(data as UserProfile[]);
      });

    // Fetch tenant to get school_types
    supabase
      .from('tenants')
      .select('*')
      .eq('id', profile.tenant_id)
      .single()
      .then(({ data }) => {
        if (data) setTenant(data as Tenant);
      });
  }, [profile?.tenant_id]);

  const schoolTypes = tenant?.school_types || ['Primaire']; // fallback

  // State for Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newLevelType, setNewLevelType] = useState<string>("");
  const [newTeacherId, setNewTeacherId] = useState<string | undefined>();

  // Set default level type when modal opens
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

  // State for Manage Subjects Modal
  const [managingClass, setManagingClass] = useState<ClassWithTeacher | null>(null);

  // State for Delete Alert
  const [deletingClass, setDeletingClass] = useState<Class | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newLevelType) return;
    await createClassMutation.mutateAsync({ name: newClassName, level_type: newLevelType, teacher_id: newTeacherId || null });
    setNewClassName("");
    setNewTeacherId(undefined);
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
  };

  if (classesQuery.isLoading) {
    return <AppShell title="Classes"><div className="p-8">Chargement des classes...</div></AppShell>;
  }

  const classesList = classesQuery.data || [];

  return (
    <AppShell
      title="Classes"
      subtitle={`${classesList.length} classes enregistrées`}
      actions={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95">
              <Plus className="h-4 w-4" /> Créer une classe
            </button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Nouvelle classe</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom de la classe</Label>
                  <Input 
                    id="name" 
                    placeholder="Ex: 6ème A" 
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    required
                  />
                </div>
                {schoolTypes.length > 0 && (
                  <div className="grid gap-2">
                    <Label htmlFor="level_type">Niveau d'enseignement</Label>
                    <Select value={newLevelType} onValueChange={setNewLevelType}>
                      <SelectTrigger id="level_type">
                        <SelectValue placeholder="Sélectionner le niveau" />
                      </SelectTrigger>
                      <SelectContent>
                        {schoolTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {newLevelType !== 'Secondaire' && (
                  <div className="grid gap-2">
                    <Label htmlFor="teacher">Enseignant titulaire (optionnel)</Label>
                    <Select value={newTeacherId} onValueChange={setNewTeacherId}>
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
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createClassMutation.isPending}>
                  {createClassMutation.isPending ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {classesList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Aucune classe trouvée. Créez votre première classe !
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classesList.map((c) => (
            <div key={c.id} className="group rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md relative">
              <div className="absolute top-4 right-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-secondary">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(c)} className="cursor-pointer">
                      <Edit2 className="h-4 w-4 mr-2" /> Modifier
                    </DropdownMenuItem>
                    {c.level_type === 'Secondaire' && (
                      <DropdownMenuItem onClick={() => setManagingClass(c)} className="cursor-pointer text-blue-600 focus:text-blue-700">
                        <UserCheck className="h-4 w-4 mr-2" /> Gérer les matières
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => setDeletingClass(c)} 
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mt-2 font-display text-2xl font-semibold pr-8">{c.name}</h3>
                  <div className="mt-2 flex flex-col gap-1.5 text-xs text-muted-foreground">
                    {c.level_type && (
                      <span className="inline-flex w-fit items-center rounded-md bg-secondary/50 px-2 py-0.5 font-medium text-secondary-foreground">
                        {c.level_type}
                      </span>
                    )}
                    {c.level_type !== 'Secondaire' && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <UserCheck className="w-3.5 h-3.5 text-primary" />
                        <span>Titulaire : <b className="text-foreground">{c.user_profiles?.full_name || 'Non assigné'}</b></span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex h-10 w-10 mt-2 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
              </div>

              <button className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80">
                Ouvrir la classe <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingClass} onOpenChange={(open) => !open && setEditingClass(null)}>
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
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editLevelType !== 'Secondaire' && (
                <div className="grid gap-2">
                  <Label htmlFor="edit-teacher">Enseignant titulaire</Label>
                  <Select value={editTeacherId || "none"} onValueChange={(val) => setEditTeacherId(val === "none" ? undefined : val)}>
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
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingClass(null)}>Annuler</Button>
              <Button type="submit" disabled={updateClassMutation.isPending}>
                {updateClassMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!deletingClass} onOpenChange={(open) => !open && setDeletingClass(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette classe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Elle supprimera définitivement la classe "{deletingClass?.name}" ainsi que tous les élèves et présences associés.
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
      {managingClass && (
        <ManageSubjectsDialog 
          isOpen={!!managingClass} 
          onClose={() => setManagingClass(null)} 
          classData={managingClass}
          teachers={teachers}
        />
      )}
    </AppShell>
  );
}

function ManageSubjectsDialog({ isOpen, onClose, classData, teachers }: { isOpen: boolean, onClose: () => void, classData: ClassWithTeacher, teachers: UserProfile[] }) {
  const { subjectsQuery } = useSubjects();
  const { classSubjectsQuery, assignSubjectMutation, removeSubjectMutation, updateAssignmentMutation } = useClassSubjects(classData.id);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | undefined>();

  const subjects = subjectsQuery.data || [];
  const assignedSubjects = classSubjectsQuery.data || [];
  
  // Filter out already assigned subjects for the select
  const unassignedSubjects = subjects.filter(s => !assignedSubjects.find(as => as.subject_id === s.id));

  const handleAssign = async () => {
    if (!selectedSubjectId) return;
    await assignSubjectMutation.mutateAsync({ subjectId: selectedSubjectId, teacherId: selectedTeacherId || null });
    setSelectedSubjectId("");
    setSelectedTeacherId(undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Matières et Enseignants — {classData.name}</DialogTitle>
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
                  {unassignedSubjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                  {unassignedSubjects.length === 0 && (
                    <SelectItem value="none" disabled>Toutes les matières sont assignées</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 flex-1">
              <Label>Enseignant (optionnel)</Label>
              <Select value={selectedTeacherId || "none"} onValueChange={(val) => setSelectedTeacherId(val === "none" ? undefined : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un enseignant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">À définir</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name || t.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAssign} disabled={!selectedSubjectId || assignSubjectMutation.isPending}>
              Ajouter
            </Button>
          </div>

          {/* Assigned Subjects List */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Matières assignées ({assignedSubjects.length})</h4>
            {classSubjectsQuery.isLoading ? (
              <div className="text-center py-4 text-sm text-muted-foreground">Chargement...</div>
            ) : assignedSubjects.length === 0 ? (
              <div className="text-center py-8 bg-muted/10 rounded-xl border border-dashed text-sm text-muted-foreground">
                Aucune matière assignée pour le moment.
              </div>
            ) : (
              <div className="space-y-2">
                {assignedSubjects.map((as) => (
                  <div key={as.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <div className="font-semibold">{as.subjects?.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] font-mono">Coeff. {as.subjects?.coefficient}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3"/>
                          {as.user_profiles?.full_name || 'Enseignant non défini'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select 
                        value={as.teacher_id || "none"} 
                        onValueChange={(val) => updateAssignmentMutation.mutate({ id: as.id, teacherId: val === "none" ? null : val })}
                      >
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue placeholder="Changer d'enseignant" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">À définir</SelectItem>
                          {teachers.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.full_name || t.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeSubjectMutation.mutate(as.id)}>
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
          <Button onClick={onClose} variant="outline">Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}