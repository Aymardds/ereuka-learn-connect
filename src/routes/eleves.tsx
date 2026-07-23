import { createFileRoute } from "@tanstack/react-router";
import { Search, Filter, Plus, MoreHorizontal, Edit2, Trash2, Mail, Link as LinkIcon, UserPlus, CheckCircle2, Copy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStudents, StudentWithClass } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useState } from "react";
import { Student, ParentInvitation } from "@/types/database";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
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
  DropdownMenuSeparator,
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

import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/eleves")({
  head: () => ({
    meta: [
      { title: "Élèves — Ereuka" },
      { name: "description", content: "Dossiers élèves, inscriptions et suivi individuel dans Ereuka." },
    ],
  }),
  component: ElevesPage,
});

function ElevesPage() {
  const { studentsQuery, createStudent, updateStudent, deleteStudent, validateStudent, invitations, createInvitation } = useStudents();
  const { classesQuery } = useClasses();
  const { profile } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active'>('all');

  // State for Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ first_name: "", last_name: "", class_id: "" });

  // State for Edit Modal
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // State for Delete Alert
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // State for Invite Modal
  const [inviteStudent, setInviteStudent] = useState<Student | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [generatedInvite, setGeneratedInvite] = useState<ParentInvitation | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.first_name || !newStudent.last_name || !newStudent.class_id) return;
    
    await createStudent({ 
      first_name: newStudent.first_name,
      last_name: newStudent.last_name,
      class_id: newStudent.class_id,
      status: 'pending' // Les nouvelles inscriptions par défaut sont en attente de validation
    });
    
    setNewStudent({ first_name: "", last_name: "", class_id: "" });
    setIsCreateOpen(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    
    await updateStudent({ 
      id: editingStudent.id, 
      first_name: editingStudent.first_name,
      last_name: editingStudent.last_name,
      class_id: editingStudent.class_id
    });
    
    setEditingStudent(null);
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;
    await deleteStudent(deletingStudent.id);
    setDeletingStudent(null);
  };

  const openEdit = (s: Student) => {
    setEditingStudent(s);
  };

  const handleInviteParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteStudent || !inviteEmail) return;

    try {
      const invite = await createInvitation({
        studentId: inviteStudent.id,
        email: inviteEmail
      });
      setGeneratedInvite(invite);
    } catch (error) {
      console.error(error);
    }
  };

  const copyInviteLink = () => {
    if (!generatedInvite) return;
    const link = `${window.location.origin}/invite?token=${generatedInvite.token}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien copié dans le presse-papiers");
  };

  const closeInviteDialog = () => {
    setInviteStudent(null);
    setInviteEmail("");
    setGeneratedInvite(null);
  };

  if (studentsQuery.isLoading) {
    return <AppShell title="Élèves"><div className="p-8 flex items-center justify-center h-full">Chargement des élèves...</div></AppShell>;
  }

  const studentsList = studentsQuery.data || [];
  const classesList = classesQuery.data || [];
  const invitationsList = invitations || [];

  const filteredStudents = studentsList.filter(s => {
    const matchesSearch = 
      s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && s.status === statusFilter;
  });

  return (
    <AppShell
      title="Élèves"
      subtitle={`${studentsList.length} dossiers actifs`}
      actions={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95">
              <Plus className="h-4 w-4" /> Nouvelle inscription
            </button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Nouvel Élève</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="first_name">Prénom</Label>
                  <Input 
                    id="first_name" 
                    value={newStudent.first_name}
                    onChange={(e) => setNewStudent({...newStudent, first_name: e.target.value})}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last_name">Nom de famille</Label>
                  <Input 
                    id="last_name" 
                    value={newStudent.last_name}
                    onChange={(e) => setNewStudent({...newStudent, last_name: e.target.value})}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="class_id">Classe</Label>
                  <Select 
                    value={newStudent.class_id} 
                    onValueChange={(val) => setNewStudent({...newStudent, class_id: val})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {classesList.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createStudentMutation.isPending}>
                  {createStudentMutation.isPending ? "Inscription..." : "Inscrire"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input 
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground" 
              placeholder="Rechercher par nom..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
            >
              Tous ({studentsList.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('pending')}
              className={statusFilter === 'pending' ? '' : 'text-amber-600 border-amber-200 hover:bg-amber-50'}
            >
              En attente ({studentsList.filter(s => s.status === 'pending').length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('active')}
            >
              Actifs ({studentsList.filter(s => s.status === 'active').length})
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Élève</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Classe</th>
                <th className="px-4 py-3 font-medium">Statut Inscription</th>
                <th className="px-4 py-3 font-medium">Parent / Responsable</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Aucun élève trouvé.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const initials = (s.first_name[0] + s.last_name[0]).toUpperCase();
                  
                  // Parent/Responsible Logic
                  const hasParentLinked = !!s.responsible_id;
                  const parentInfo = s.user_profiles;
                  // Look for pending invitation
                  const pendingInvite = invitationsList.find(inv => inv.student_id === s.id && inv.status === 'pending');
                  const isPending = s.status === 'pending';

                  return (
                    <tr key={s.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold`}>
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{s.first_name} {s.last_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.id.split('-')[0]}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                          {s.classes?.name || 'Inconnue'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
                            En attente de validation
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200">
                            Validée
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hasParentLinked ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md inline-flex text-xs font-medium border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {parentInfo?.full_name || parentInfo?.email || 'Compte lié'}
                          </div>
                        ) : pendingInvite ? (
                          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-1 rounded-md inline-flex text-xs font-medium border border-amber-100">
                            <Mail className="w-3.5 h-3.5" />
                            Invitation en attente ({pendingInvite.email})
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Aucun parent lié</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isPending && ['accountant', 'admin', 'director', 'superadmin'].includes(profile?.role || '') && (
                              <DropdownMenuItem 
                                onClick={() => validateStudent(s.id)} 
                                className="cursor-pointer font-semibold text-emerald-600 focus:text-emerald-700"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Valider l'inscription
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEdit(s)} className="cursor-pointer">
                              <Edit2 className="h-4 w-4 mr-2" /> Modifier l'élève
                            </DropdownMenuItem>
                            {!hasParentLinked && (
                              <DropdownMenuItem onClick={() => setInviteStudent(s)} className="cursor-pointer">
                                <UserPlus className="h-4 w-4 mr-2 text-primary" /> Inviter un parent
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeletingStudent(s)} 
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Modifier l'élève</DialogTitle>
            </DialogHeader>
            {editingStudent && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-firstname">Prénom</Label>
                  <Input 
                    id="edit-firstname" 
                    value={editingStudent.first_name}
                    onChange={(e) => setEditingStudent({...editingStudent, first_name: e.target.value})}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-lastname">Nom de famille</Label>
                  <Input 
                    id="edit-lastname" 
                    value={editingStudent.last_name}
                    onChange={(e) => setEditingStudent({...editingStudent, last_name: e.target.value})}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-class">Classe</Label>
                  <Select 
                    value={editingStudent.class_id} 
                    onValueChange={(val) => setEditingStudent({...editingStudent, class_id: val})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {classesList.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingStudent(null)}>Annuler</Button>
              <Button type="submit" disabled={updateStudentMutation.isPending}>
                {updateStudentMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Parent Dialog */}
      <Dialog open={!!inviteStudent} onOpenChange={(open) => !open && closeInviteDialog()}>
        <DialogContent className="sm:max-w-[450px]">
          {!generatedInvite ? (
            <form onSubmit={handleInviteParent}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" /> Inviter un parent
                </DialogTitle>
                <DialogDescription>
                  Générez un lien d'invitation pour permettre au parent de suivre la scolarité de 
                  <strong> {inviteStudent?.first_name} {inviteStudent?.last_name}</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="invite-email">Email du parent *</Label>
                  <Input 
                    id="invite-email" 
                    type="email"
                    placeholder="parent@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeInviteDialog}>Annuler</Button>
                <Button type="submit" disabled={createInvitationMutation.isPending}>
                  {createInvitationMutation.isPending ? "Génération..." : "Générer le lien d'invitation"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-6 py-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" /> Invitation générée !
                </DialogTitle>
                <DialogDescription>
                  Envoyez ce lien sécurisé au parent (par ex: via WhatsApp ou email). Il lui permettra de créer son compte et d'accéder au dossier de l'élève.
                </DialogDescription>
              </DialogHeader>
              
              <div className="bg-muted p-4 rounded-xl border relative">
                <p className="text-sm font-mono break-all pr-8 text-foreground">
                  {window.location.origin}/invite?token={generatedInvite.token}
                </p>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute top-2 right-2 hover:bg-background"
                  onClick={copyInviteLink}
                  title="Copier le lien"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg">
                <strong>Attention :</strong> Ce lien est unique et expire dans 7 jours. Il donnera directement accès au dossier de {inviteStudent?.first_name}.
              </div>

              <DialogFooter>
                <Button onClick={closeInviteDialog} className="w-full">J'ai copié le lien, terminer</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!deletingStudent} onOpenChange={(open) => !open && setDeletingStudent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer définitivement le dossier de {deletingStudent?.first_name} {deletingStudent?.last_name} ?
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