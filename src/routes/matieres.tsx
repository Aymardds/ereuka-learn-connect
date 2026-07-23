import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Plus, Edit2, Trash2, MoreHorizontal } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSubjects } from "@/hooks/useSubjects";
import { useState } from "react";
import { Subject } from "@/types/database";

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

export const Route = createFileRoute("/matieres")({
  head: () => ({
    meta: [
      { title: "Matières — Ereuka" },
      { name: "description", content: "Matières, coefficients et programmation pédagogique." },
    ],
  }),
  component: MatieresPage,
});

function MatieresPage() {
  const { subjectsQuery, createSubjectMutation, updateSubjectMutation, deleteSubjectMutation } = useSubjects();

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newCoef, setNewCoef] = useState(1);
  const [newColor, setNewColor] = useState("#3b82f6");

  // Edit Modal
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editCoef, setEditCoef] = useState(1);
  const [editColor, setEditColor] = useState("#3b82f6");

  // Delete Alert
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createSubjectMutation.mutateAsync({ 
      name: newName, 
      code: newCode || null, 
      coefficient: newCoef,
      color: newColor
    });
    setNewName("");
    setNewCode("");
    setNewCoef(1);
    setNewColor("#3b82f6");
    setIsCreateOpen(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editName.trim()) return;
    await updateSubjectMutation.mutateAsync({ 
      id: editingSubject.id, 
      name: editName,
      code: editCode || null,
      coefficient: editCoef,
      color: editColor
    });
    setEditingSubject(null);
  };

  const handleDelete = async () => {
    if (!deletingSubject) return;
    await deleteSubjectMutation.mutateAsync(deletingSubject.id);
    setDeletingSubject(null);
  };

  const openEdit = (s: Subject) => {
    setEditingSubject(s);
    setEditName(s.name);
    setEditCode(s.code || "");
    setEditCoef(s.coefficient);
    setEditColor(s.color || "#3b82f6");
  };

  if (subjectsQuery.isLoading) {
    return <AppShell title="Matières"><div className="p-8">Chargement des matières...</div></AppShell>;
  }

  const subjectsList = subjectsQuery.data || [];

  return (
    <AppShell 
      title="Matières" 
      subtitle={`${subjectsList.length} matières définies au catalogue`}
      actions={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95">
              <Plus className="h-4 w-4" /> Nouvelle matière
            </button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Créer une matière</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom de la matière</Label>
                  <Input 
                    id="name" 
                    placeholder="Ex: Mathématiques" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="code">Code (optionnel)</Label>
                    <Input 
                      id="code" 
                      placeholder="Ex: MATHS" 
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="coef">Coefficient</Label>
                    <Input 
                      id="coef" 
                      type="number"
                      min="1"
                      value={newCoef}
                      onChange={(e) => setNewCoef(parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createSubjectMutation.isPending}>
                  {createSubjectMutation.isPending ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {subjectsList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Aucune matière n'a été créée pour le moment.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subjectsList.map((s, i) => {
            const exec = 55 + ((i * 13) % 40); // Placeholder progress
            return (
              <div key={s.id} className="group rounded-2xl border border-border bg-card p-5 relative transition-shadow hover:shadow-md">
                <div className="absolute top-4 right-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-secondary">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(s)} className="cursor-pointer">
                        <Edit2 className="h-4 w-4 mr-2" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeletingSubject(s)} 
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-start justify-between pr-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      {s.code && <div className="font-mono text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded w-fit mb-0.5">{s.code}</div>}
                      <div className="font-display text-lg font-semibold leading-tight">{s.name}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                   <span className="rounded-md bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                    Coef. {s.coefficient}
                  </span>
                </div>
                
                <div className="mt-5 border-t pt-4">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Exécution du programme (Global)</span>
                    <span className={`font-semibold ${exec < 65 ? "text-destructive" : "text-primary"}`}>{exec}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full" style={{ width: `${exec}%`, background: exec < 65 ? "var(--color-destructive)" : "var(--gradient-warm)" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingSubject} onOpenChange={(open) => !open && setEditingSubject(null)}>
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Modifier la matière</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nom de la matière</Label>
                <Input 
                  id="edit-name" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-code">Code (optionnel)</Label>
                  <Input 
                    id="edit-code" 
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-coef">Coefficient</Label>
                  <Input 
                    id="edit-coef" 
                    type="number"
                    min="1"
                    value={editCoef}
                    onChange={(e) => setEditCoef(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingSubject(null)}>Annuler</Button>
              <Button type="submit" disabled={updateSubjectMutation.isPending}>
                {updateSubjectMutation.isPending ? "Modification..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={!!deletingSubject} onOpenChange={(open) => !open && setDeletingSubject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la matière</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la matière <b>{deletingSubject?.name}</b> ? 
              Cette action supprimera également toutes les liaisons avec les classes (professeurs assignés).
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