import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { useTeam } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import { UserProfile, UserRole } from '@/types/database';
import { Users, Shield, UserPlus, Mail, Calendar, Edit2, Trash2, CheckCircle2, Key, GraduationCap, BookOpen, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';
import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

export const Route = createFileRoute('/equipe')({
  component: EquipeRoute,
});

const ROLE_LABELS: Record<UserRole, { label: string; badge: string }> = {
  admin: { label: 'Administrateur', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  director: { label: 'Directeur', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  accountant: { label: 'Comptable / Économe', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cashier: { label: 'Caissier', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  teacher: { label: 'Enseignant', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  responsible: { label: 'Tuteur Légal', badge: 'bg-gray-100 text-gray-800 border-gray-200' },
  dean: { label: 'Doyen de Faculté', badge: 'bg-teal-100 text-teal-800 border-teal-200' },
  department_head: { label: 'Chef de Département', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  secretary: { label: 'Secrétariat', badge: 'bg-pink-100 text-pink-800 border-pink-200' },
  surveillance: { label: 'Surveillant Général', badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  student: { label: 'Élève / Étudiant', badge: 'bg-sky-100 text-sky-800 border-sky-200' },
  parent: { label: 'Parent d\'élève', badge: 'bg-rose-100 text-rose-800 border-rose-200' },
  superadmin: { label: 'Super Admin', badge: 'bg-red-100 text-red-800 border-red-200' },
};

function EquipeRoute() {
  const { profile } = useAuth();
  const { staff, isLoading, createStaffMutation, updateStaffMutation, deleteStaffMutation } = useTeam();
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  const canManageStaff = profile?.role === 'admin' || profile?.role === 'director';

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('teacher');
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string } | null>(null);

  // Edit Modal state
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('teacher');

  // Delete Alert state
  const [deletingMember, setDeletingMember] = useState<UserProfile | null>(null);

  // Teacher class management state
  const [managingTeacher, setManagingTeacher] = useState<UserProfile | null>(null);

  const filteredStaff = staff.filter((member) => {
    if (selectedRoleFilter === 'all') return true;
    return member.role === selectedRoleFilter;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newFullName.trim()) return;

    const res = await createStaffMutation.mutateAsync({
      email: newEmail.trim(),
      fullName: newFullName.trim(),
      role: newRole,
    });

    setIsCreateOpen(false);
    setNewEmail('');
    setNewFullName('');
    setNewRole('teacher');

    if (res?.tempPassword) {
      setCreatedCredentials({ email: res.email, pass: res.tempPassword });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editFullName.trim()) return;

    await updateStaffMutation.mutateAsync({
      userId: editingMember.id,
      fullName: editFullName.trim(),
      role: editRole,
    });

    setEditingMember(null);
  };

  const handleDelete = async () => {
    if (!deletingMember) return;
    await deleteStaffMutation.mutateAsync(deletingMember.id);
    setDeletingMember(null);
  };

  const openEdit = (member: UserProfile) => {
    setEditingMember(member);
    setEditFullName(member.full_name || '');
    setEditRole(member.role);
  };

  return (
    <AppShell
      title="Équipe & Rôles"
      subtitle="Gestion des membres du personnel et des permissions d'accès"
      actions={
        canManageStaff && (
          <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
            <UserPlus className="w-4 h-4" />
            Ajouter un collaborateur
          </Button>
        )
      }
    >
      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium">Filtrer par rôle :</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selectedRoleFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedRoleFilter('all')}
          >
            Tous ({staff.length})
          </Button>
          {['admin', 'director', 'accountant', 'cashier', 'teacher'].map((r) => (
            <Button
              key={r}
              size="sm"
              variant={selectedRoleFilter === r ? 'default' : 'outline'}
              onClick={() => setSelectedRoleFilter(r)}
            >
              {ROLE_LABELS[r as UserRole]?.label || r}
            </Button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement des membres du personnel...</div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Aucun membre trouvé pour ce filtre.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-semibold">Collaborateur</th>
                  <th className="px-6 py-3 font-semibold">Email</th>
                  <th className="px-6 py-3 font-semibold">Rôle</th>
                  <th className="px-6 py-3 font-semibold">Date d'ajout</th>
                  {canManageStaff && <th className="px-6 py-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStaff.map((member) => {
                  const roleConfig = ROLE_LABELS[member.role] || { label: member.role, badge: 'bg-gray-100 text-gray-800' };
                  return (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                            {(member.full_name || member.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">{member.full_name || 'Nom non renseigné'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 opacity-70" />
                          <span>{member.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleConfig.badge}`}>
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 opacity-60" />
                          {new Date(member.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      {canManageStaff && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {member.role === 'teacher' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                onClick={() => setManagingTeacher(member)}
                              >
                                <GraduationCap className="w-3.5 h-3.5" />
                                Classes
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(member)}>
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            {member.id !== profile?.id && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingMember(member)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" /> Ajouter un collaborateur
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Nom et Prénom *</Label>
                <Input
                  id="fullName"
                  placeholder="Ex: Jean Coulibaly"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Adresse Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ex: j.coulibaly@ecole.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rôle attribué</Label>
                <Select value={newRole} onValueChange={(val) => setNewRole(val as UserRole)}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Choisir un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="director">Directeur</SelectItem>
                    <SelectItem value="accountant">Comptable / Économe</SelectItem>
                    <SelectItem value="cashier">Caissier</SelectItem>
                    <SelectItem value="teacher">Enseignant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createStaffMutation.isPending}>
                {createStaffMutation.isPending ? "Création..." : "Ajouter le collaborateur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREDENTIALS SUCCESS MODAL */}
      <Dialog open={!!createdCredentials} onOpenChange={(open) => !open && setCreatedCredentials(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" /> Collaborateur Ajouté !
            </DialogTitle>
          </DialogHeader>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2 space-y-3">
            <p className="text-sm text-gray-600">Le compte a été généré. Transmettez ces identifiants de connexion au nouveau collaborateur :</p>
            <div className="space-y-2 text-sm bg-white p-3 rounded border">
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-gray-500">Email :</span>
                <span className="font-mono text-gray-900">{createdCredentials?.email}</span>
              </div>
              <div className="flex justify-between pt-2 items-center">
                <span className="font-semibold text-gray-500 flex items-center gap-1"><Key className="w-3.5 h-3.5"/> Mot de passe :</span>
                <span className="font-mono bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-bold">{createdCredentials?.pass}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={() => setCreatedCredentials(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Modifier le membre du personnel</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="editFullName">Nom et Prénom</Label>
                <Input
                  id="editFullName"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editEmail">Adresse Email (lecture seule)</Label>
                <Input
                  id="editEmail"
                  value={editingMember?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editRole">Rôle attribué</Label>
                <Select value={editRole} onValueChange={(val) => setEditRole(val as UserRole)}>
                  <SelectTrigger id="editRole">
                    <SelectValue placeholder="Choisir un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="director">Directeur</SelectItem>
                    <SelectItem value="accountant">Comptable / Économe</SelectItem>
                    <SelectItem value="cashier">Caissier</SelectItem>
                    <SelectItem value="teacher">Enseignant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingMember(null)}>Annuler</Button>
              <Button type="submit" disabled={updateStaffMutation.isPending}>
                {updateStaffMutation.isPending ? "Modification..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE ALERT */}
      <AlertDialog open={!!deletingMember} onOpenChange={(open) => !open && setDeletingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer le collaborateur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <b>{deletingMember?.full_name || deletingMember?.email}</b> de l'établissement ? 
              Cette action supprimera le profil du collaborateur.
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

      {/* TEACHER CLASSES MANAGEMENT DIALOG */}
      {managingTeacher && (
        <TeacherClassesDialog
          teacher={managingTeacher}
          isOpen={!!managingTeacher}
          onClose={() => setManagingTeacher(null)}
        />
      )}
    </AppShell>
  );
}

// ─── Teacher Classes Dialog ──────────────────────────────────────────────────

function TeacherClassesDialog({
  teacher,
  isOpen,
  onClose,
}: {
  teacher: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { useTeacherAssignmentsForTeacher, createAssignmentMutation, deleteAssignmentMutation } =
    useTeacherAssignments();
  const { classes } = useClasses();
  const { subjects } = useSubjects();

  const assignmentsQuery = useTeacherAssignmentsForTeacher(teacher.id);
  const assignments = assignmentsQuery.data || [];

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('none');
  const [selectedRole, setSelectedRole] = useState<'titulaire' | 'intervenant' | 'surveillant'>('intervenant');

  const roleBadge: Record<string, string> = {
    titulaire: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    intervenant: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    surveillant: 'bg-amber-100 text-amber-800 border-amber-200',
  };

  const roleLabels: Record<string, string> = {
    titulaire: 'Titulaire',
    intervenant: 'Intervenant',
    surveillant: 'Surveillant',
  };

  // Group assignments by class
  const grouped = assignments.reduce<Record<string, typeof assignments>>((acc, a) => {
    const key = a.class_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  const handleAssign = async () => {
    if (!selectedClassId) return;
    await createAssignmentMutation.mutateAsync({
      teacherId: teacher.id,
      classId: selectedClassId,
      subjectId: selectedSubjectId === 'none' ? null : selectedSubjectId,
      roleInClass: selectedRole,
    });
    setSelectedClassId('');
    setSelectedSubjectId('none');
    setSelectedRole('intervenant');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Classes de {teacher.full_name || teacher.email}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1">
          {/* Assign form */}
          <div className="p-4 bg-muted/30 rounded-xl border space-y-3">
            <h4 className="text-sm font-semibold">Assigner une classe</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Classe *</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.length === 0 && (
                      <SelectItem value="none" disabled>Aucune classe disponible</SelectItem>
                    )}
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.level_type ? `(${c.level_type})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Rôle dans la classe</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(v) => setSelectedRole(v as typeof selectedRole)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Non précisé / Toutes matières" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non précisé / Toutes matières</SelectItem>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Button
              onClick={handleAssign}
              disabled={!selectedClassId || createAssignmentMutation.isPending}
              className="w-full"
            >
              {createAssignmentMutation.isPending ? 'Assignation...' : 'Assigner à la classe'}
            </Button>
          </div>

          {/* Classes list */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Classes assignées ({Object.keys(grouped).length})
            </h4>

            {assignmentsQuery.isLoading ? (
              <div className="text-center py-4 text-sm text-muted-foreground">Chargement...</div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="text-center py-8 bg-muted/10 rounded-xl border border-dashed text-sm text-muted-foreground">
                <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Cet enseignant n'est assigné à aucune classe.
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(grouped).map(([classId, classAssignments]) => {
                  const classInfo = classAssignments[0]?.classes;
                  return (
                    <div key={classId} className="rounded-lg border bg-card overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                        <div className="font-semibold flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          {classInfo?.name}
                          {classInfo?.level_type && (
                            <span className="text-xs text-muted-foreground">({classInfo.level_type})</span>
                          )}
                        </div>
                      </div>
                      <div className="divide-y">
                        {classAssignments.map((a) => (
                          <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${roleBadge[a.role_in_class]}`}>
                                {roleLabels[a.role_in_class]}
                              </span>
                              {(a as any).subjects && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  {(a as any).subjects?.name}
                                </span>
                              )}
                              {!(a as any).subjects && (
                                <span className="text-xs text-muted-foreground">Toutes matières</span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => deleteAssignmentMutation.mutate(a.id)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
