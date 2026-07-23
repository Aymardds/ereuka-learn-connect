import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useTeam } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import { UserProfile, UserRole } from '@/types/database';
import { Users, Shield, UserPlus, Mail, Calendar, Edit2, Trash2, CheckCircle2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  responsible: { label: 'Parent / Tuteur', badge: 'bg-gray-100 text-gray-800 border-gray-200' },
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
    </AppShell>
  );
}
