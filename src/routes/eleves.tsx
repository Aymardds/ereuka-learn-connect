import { createFileRoute } from "@tanstack/react-router";
import { 
  Search, Plus, MoreHorizontal, Edit2, Trash2, Mail, UserPlus, 
  CheckCircle2, Copy, Users, Phone, UserCheck, Key, AlertCircle, Unlink,
  ExternalLink, UserX, Globe, Loader2, Building2, Link2
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStudents, StudentWithClass } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useParents, ParentWithChildren } from "@/hooks/useParents";
import { useParentSearch } from "@/hooks/useParentSearch";
import { InvitationSuccessDialog, InvitationSuccessData } from "@/components/InvitationSuccessDialog";
import { useState } from "react";
import { Student } from "@/types/database";
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
      { title: "Élèves & Parents — Eurêka" },
      { name: "description", content: "Dossiers élèves, inscriptions et gestion des parents dans Eurêka." },
    ],
  }),
  component: ElevesPage,
});

function ElevesPage() {
  const { 
    studentsQuery, 
    createStudent, 
    updateStudent, 
    deleteStudent, 
    validateStudent, 
    createStudentMutation,
    updateStudentMutation,
  } = useStudents();
  const { classesQuery } = useClasses();
  const { parents, createParentMutation, linkParentMutation, unlinkParentMutation } = useParents();
  const { profile } = useAuth();
  const { results: globalParents, isSearching: isGlobalSearching, search: searchGlobal, clear: clearGlobalSearch, inviteExistingParent, linkExistingParentDirectly } = useParentSearch();
  
  // State for Invitation Success Share Dialog
  const [invitationSuccessData, setInvitationSuccessData] = useState<InvitationSuccessData | null>(null);
  const [isInvitationSuccessOpen, setIsInvitationSuccessOpen] = useState(false);

  // Active Tab: 'students' or 'parents'
  const [activeTab, setActiveTab] = useState<'students' | 'parents'>('students');

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  // State for Create Student Modal
  const [isCreateStudentOpen, setIsCreateStudentOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    first_name: "",
    last_name: "",
    class_id: "",
    date_of_birth: "",
    gender: "M" as 'M' | 'F' | 'other',
    parent_mode: "none" as "none" | "existing" | "new",
    existing_parent_id: "",
    new_parent_name: "",
    new_parent_email: "",
    new_parent_phone: "",
  });

  // State for Edit Student Modal
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // State for Delete Alert
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // State for Link Parent to Student Modal
  const [linkStudentTarget, setLinkStudentTarget] = useState<StudentWithClass | null>(null);
  const [linkParentMode, setLinkParentMode] = useState<"existing" | "new" | "global">("existing");
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [quickParentName, setQuickParentName] = useState("");
  const [quickParentEmail, setQuickParentEmail] = useState("");
  const [quickParentPhone, setQuickParentPhone] = useState("");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [isInvitingGlobal, setIsInvitingGlobal] = useState(false);
  // Also for the standalone create parent modal global search
  const [createParentMode, setCreateParentMode] = useState<"new" | "global">("new");
  const [cpGlobalSearchQuery, setCpGlobalSearchQuery] = useState("");
  const [cpGlobalSelectedStudentId, setCpGlobalSelectedStudentId] = useState(""); // élève cible pour l'invitation

  // State for Standalone Create Parent Modal
  const [isCreateParentOpen, setIsCreateParentOpen] = useState(false);
  const [parentFormData, setParentFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    associateStudentId: "",
  });

  // State for showing newly created parent credentials
  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string; fullName: string } | null>(null);

  // ── Handlers ──

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.first_name || !newStudent.last_name || !newStudent.class_id) {
      toast.error("Veuillez renseigner le prénom, nom et la classe");
      return;
    }

    try {
      let linkedResponsibleId: string | null = null;
      let guardianName = "";
      let guardianPhone = "";
      let guardianEmail = "";

      // 1. If "new parent" selected, create parent first
      if (newStudent.parent_mode === "new" && newStudent.new_parent_email && newStudent.new_parent_name) {
        const created = await createParentMutation.mutateAsync({
          fullName: newStudent.new_parent_name,
          email: newStudent.new_parent_email,
          phone: newStudent.new_parent_phone,
        });
        linkedResponsibleId = created.userId || null;
        guardianName = newStudent.new_parent_name;
        guardianPhone = newStudent.new_parent_phone;
        guardianEmail = newStudent.new_parent_email;

        // Save credentials to show popup
        setNewCredentials({
          fullName: created.fullName,
          email: created.email,
          password: created.password,
        });
      } else if (newStudent.parent_mode === "existing" && newStudent.existing_parent_id) {
        const p = parents.find(x => x.id === newStudent.existing_parent_id);
        if (p) {
          linkedResponsibleId = p.id;
          guardianName = p.full_name || "";
          guardianPhone = p.phone || "";
          guardianEmail = p.email || "";
        }
      }

      // 2. Insert Student
      await createStudent({
        first_name: newStudent.first_name,
        last_name: newStudent.last_name,
        class_id: newStudent.class_id,
        date_of_birth: newStudent.date_of_birth || null,
        gender: newStudent.gender,
        responsible_id: linkedResponsibleId,
        guardian_name: guardianName || null,
        guardian_phone: guardianPhone || null,
        guardian_email: guardianEmail || null,
        status: 'active', // Inscription faite par l'admin = active
      });

      // Reset
      setNewStudent({
        first_name: "",
        last_name: "",
        class_id: "",
        date_of_birth: "",
        gender: "M",
        parent_mode: "none",
        existing_parent_id: "",
        new_parent_name: "",
        new_parent_email: "",
        new_parent_phone: "",
      });
      setIsCreateStudentOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'inscription de l'élève");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    
    await updateStudent({ 
      id: editingStudent.id, 
      first_name: editingStudent.first_name,
      last_name: editingStudent.last_name,
      class_id: editingStudent.class_id,
      date_of_birth: editingStudent.date_of_birth,
      gender: editingStudent.gender,
      guardian_name: editingStudent.guardian_name,
      guardian_phone: editingStudent.guardian_phone,
    });
    
    setEditingStudent(null);
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;
    await deleteStudent(deletingStudent.id);
    setDeletingStudent(null);
  };

  // Submit Link Parent Modal
  const handleLinkParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkStudentTarget) return;

    try {
      if (linkParentMode === "existing") {
        if (!selectedParentId) {
          toast.error("Veuillez sélectionner un parent existant");
          return;
        }
        const p = parents.find(x => x.id === selectedParentId);
        await linkParentMutation.mutateAsync({
          studentId: linkStudentTarget.id,
          parentId: selectedParentId,
          parentName: p?.full_name || undefined,
          parentPhone: p?.phone || undefined,
          parentEmail: p?.email || undefined,
        });
      } else {
        // Create new parent and link
        if (!quickParentEmail || !quickParentName) {
          toast.error("Veuillez renseigner le nom et l'email du parent");
          return;
        }
        const created = await createParentMutation.mutateAsync({
          fullName: quickParentName,
          email: quickParentEmail,
          phone: quickParentPhone,
          studentId: linkStudentTarget.id,
        });

        setNewCredentials({
          fullName: created.fullName,
          email: created.email,
          password: created.password,
        });
      }

      setLinkStudentTarget(null);
      setSelectedParentId("");
      setQuickParentName("");
      setQuickParentEmail("");
      setQuickParentPhone("");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'association du parent");
    }
  };

  // Submit Standalone Create Parent Modal
  const handleCreateParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentFormData.email || !parentFormData.fullName) {
      toast.error("Veuillez renseigner le nom complet et l'email");
      return;
    }

    try {
      const created = await createParentMutation.mutateAsync({
        fullName: parentFormData.fullName,
        email: parentFormData.email,
        phone: parentFormData.phone,
        password: parentFormData.password || undefined,
        studentId: parentFormData.associateStudentId || undefined,
      });

      setNewCredentials({
        fullName: created.fullName,
        email: created.email,
        password: created.password,
      });

      setParentFormData({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        associateStudentId: "",
      });
      setIsCreateParentOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement du parent");
    }
  };

  const copyCredentials = () => {
    if (!newCredentials) return;
    const text = `Identifiants Espace Parent Eurêka :\nEmail : ${newCredentials.email}\nMot de passe : ${newCredentials.password}\nLien : ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    toast.success("Identifiants copiés dans le presse-papiers !");
  };

  const studentsList = studentsQuery.data || [];
  const classesList = classesQuery.data || [];

  // Filter students
  const filteredStudents = studentsList.filter(s => {
    const matchesSearch = 
      s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.guardian_name && s.guardian_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesClass = classFilter === 'all' || s.class_id === classFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  // Filter parents
  const filteredParents = parents.filter(p => {
    const matchesSearch = 
      (p.full_name && p.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone && p.phone.includes(searchTerm));
    return matchesSearch;
  });

  return (
    <AppShell
      title="Élèves & Parents"
      subtitle={`${studentsList.length} élèves inscrits • ${parents.length} comptes parents enregistrés`}
      actions={
        <div className="flex items-center gap-2">
          {/* Action 1 : Inscrire un parent */}
          <Button 
            variant="outline" 
            onClick={() => setIsCreateParentOpen(true)}
            className="gap-2 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold"
          >
            <UserPlus className="w-4 h-4" /> Inscrire un Parent
          </Button>

          {/* Action 2 : Nouvelle inscription élève */}
          <Button 
            onClick={() => setIsCreateStudentOpen(true)}
            className="gap-2 bg-primary font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nouvelle Inscription Élève
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* Top Tab Bar: Élèves vs Parents */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'students' 
                  ? 'bg-white shadow text-gray-900' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4 text-primary" />
              Élèves Inscrits ({studentsList.length})
            </button>
            <button
              onClick={() => setActiveTab('parents')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'parents' 
                  ? 'bg-white shadow text-gray-900' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Parents & Tuteurs ({parents.length})
            </button>
          </div>

          <div className="text-xs text-muted-foreground hidden sm:block">
            {activeTab === 'students' 
              ? `${filteredStudents.length} élève(s) affiché(s)` 
              : `${filteredParents.length} parent(s) affiché(s)`}
          </div>
        </div>

        {/* TAB 1: ÉLÈVES */}
        {activeTab === 'students' && (
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 bg-gray-50/50">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm max-w-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input 
                  className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-xs" 
                  placeholder="Rechercher par élève ou parent..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Class */}
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-44 h-8 text-xs bg-white">
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classesList.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filter Status */}
                <Button
                  size="sm"
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('all')}
                  className="h-8 text-xs"
                >
                  Tous ({studentsList.length})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('pending')}
                  className={`h-8 text-xs ${statusFilter === 'pending' ? '' : 'text-amber-700 border-amber-300 hover:bg-amber-50'}`}
                >
                  En attente ({studentsList.filter(s => s.status === 'pending').length})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('active')}
                  className="h-8 text-xs"
                >
                  Validés ({studentsList.filter(s => s.status === 'active').length})
                </Button>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Élève</th>
                    <th className="px-4 py-3 font-semibold">Classe</th>
                    <th className="px-4 py-3 font-semibold">Statut Inscription</th>
                    <th className="px-4 py-3 font-semibold">Parent / Tuteur Associé</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                        <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <p className="font-semibold text-gray-700">Aucun élève trouvé</p>
                        <p className="text-xs text-gray-400 mt-1">Créez une nouvelle inscription ou ajustez vos filtres.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => {
                      const initials = (s.first_name[0] + s.last_name[0]).toUpperCase();
                      const isPending = s.status === 'pending';
                      const hasParent = !!s.responsible_id;
                      const parentProfile = s.user_profiles;

                      return (
                        <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary text-xs font-bold">
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-foreground">
                                  {s.first_name} {s.last_name}
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono">
                                  ID: {s.id.split('-')[0]} {s.gender ? `• ${s.gender === 'M' ? 'Garçon' : 'Fille'}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="inline-flex rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800 border">
                              {s.classes?.name || 'Non assigné'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            {isPending ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                                  En attente de validation
                                </span>
                                {['admin', 'director', 'accountant', 'superadmin'].includes(profile?.role || '') && (
                                  <Button
                                    size="sm"
                                    onClick={() => validateStudent(s.id)}
                                    className="h-6 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Valider
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Validée (Actif)
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            {hasParent ? (
                              <div className="flex items-center justify-between max-w-xs p-2 rounded-xl bg-emerald-50 border border-emerald-200/80">
                                <div className="min-w-0 pr-2">
                                  <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 truncate">
                                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span className="truncate">{parentProfile?.full_name || s.guardian_name || 'Parent rattaché'}</span>
                                  </div>
                                  <div className="text-[11px] text-emerald-800/80 truncate flex items-center gap-2 mt-0.5">
                                    {parentProfile?.phone || s.guardian_phone ? (
                                      <span className="flex items-center gap-1 font-mono">
                                        <Phone className="w-2.5 h-2.5" /> {parentProfile?.phone || s.guardian_phone}
                                      </span>
                                    ) : null}
                                    <span className="truncate">{parentProfile?.email || s.guardian_email}</span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Changer ou dissocier le parent"
                                  onClick={() => setLinkStudentTarget(s)}
                                  className="h-7 w-7 text-emerald-700 hover:bg-emerald-100 shrink-0"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLinkStudentTarget(s)}
                                className="h-7 px-2.5 text-xs gap-1.5 border-dashed border-gray-300 text-gray-600 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                                Associer un parent
                              </Button>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => setLinkStudentTarget(s)} className="cursor-pointer">
                                  <UserPlus className="h-4 w-4 mr-2 text-emerald-600" /> 
                                  {hasParent ? "Modifier le parent" : "Associer un parent"}
                                </DropdownMenuItem>
                                {hasParent && (
                                  <DropdownMenuItem 
                                    onClick={() => unlinkParentMutation.mutate({ studentId: s.id })} 
                                    className="cursor-pointer text-amber-700 focus:text-amber-800"
                                  >
                                    <Unlink className="h-4 w-4 mr-2" /> Dissocier le parent
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => setEditingStudent(s)} className="cursor-pointer">
                                  <Edit2 className="h-4 w-4 mr-2 text-blue-600" /> Modifier l'élève
                                </DropdownMenuItem>
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
        )}

        {/* TAB 2: PARENTS & TUTEURS */}
        {activeTab === 'parents' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border shadow-sm">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm max-w-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input 
                  className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-xs" 
                  placeholder="Rechercher un parent (nom, email, téléphone)..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Button 
                onClick={() => setIsCreateParentOpen(true)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 font-semibold text-xs h-9"
              >
                <UserPlus className="w-4 h-4" /> Inscrire un Nouveau Parent
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredParents.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed">
                  <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-bold text-gray-800">Aucun compte parent enregistré</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    Inscrivez des parents pour leur donner un accès direct à leur portail et leur permettre de suivre et payer la scolarité de leurs enfants.
                  </p>
                  <Button 
                    onClick={() => setIsCreateParentOpen(true)}
                    className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold"
                  >
                    <UserPlus className="w-4 h-4" /> Inscrire le premier parent
                  </Button>
                </div>
              ) : (
                filteredParents.map((p) => {
                  const linkedStudents = p.students || [];

                  return (
                    <div 
                      key={p.id}
                      className="bg-white rounded-2xl border shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow relative flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                              {(p.full_name ? p.full_name[0] : p.email[0]).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm leading-tight">
                                {p.full_name || 'Parent sans nom'}
                              </h4>
                              <p className="text-xs text-gray-500 font-mono mt-0.5">{p.email}</p>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Parent
                          </span>
                        </div>

                        {p.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded-lg">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{p.phone}</span>
                          </div>
                        )}

                        {/* Children List */}
                        <div className="pt-2 border-t">
                          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Enfant(s) rattaché(s) ({linkedStudents.length})
                          </div>
                          {linkedStudents.length === 0 ? (
                            <p className="text-xs text-amber-600 italic">Aucun élève encore rattaché</p>
                          ) : (
                            <div className="space-y-1.5">
                              {linkedStudents.map((child: any) => (
                                <div key={child.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  <span className="font-bold text-gray-900 truncate">
                                    {child.first_name} {child.last_name}
                                  </span>
                                  <span className="text-[10px] font-semibold bg-white px-2 py-0.5 rounded border text-gray-600">
                                    {child.classes?.name || 'Classe'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLinkParentMode("existing");
                            setSelectedParentId(p.id);
                            // Open associate to any student dialog
                            setIsCreateStudentOpen(false);
                            setActiveTab('students');
                            toast.info("Sélectionnez l'élève auquel associer ce parent via le bouton 'Associer un parent'");
                          }}
                          className="w-full text-xs font-semibold gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-emerald-600" /> Rapprocher un élève
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── MODAL 1 : NOUVELLE INSCRIPTION ÉLÈVE (AVEC GESTION PARENT) ── */}
      <Dialog open={isCreateStudentOpen} onOpenChange={setIsCreateStudentOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleCreateStudent}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Nouvelle Inscription d'Élève
              </DialogTitle>
              <DialogDescription>
                Renseignez les informations de l'élève et liez un compte parent tuteur.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
              
              {/* Infos Élève */}
              <div className="bg-gray-50 p-3.5 rounded-xl border space-y-3">
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wide">
                  1. État Civil de l'Élève
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="first_name">Prénom *</Label>
                    <Input 
                      id="first_name" 
                      required
                      placeholder="Ex: Kouamé"
                      value={newStudent.first_name}
                      onChange={(e) => setNewStudent({...newStudent, first_name: e.target.value})}
                      className="bg-white h-9 text-xs"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="last_name">Nom de famille *</Label>
                    <Input 
                      id="last_name" 
                      required
                      placeholder="Ex: Konan"
                      value={newStudent.last_name}
                      onChange={(e) => setNewStudent({...newStudent, last_name: e.target.value})}
                      className="bg-white h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Classe d'affectation *</Label>
                    <Select 
                      value={newStudent.class_id} 
                      onValueChange={(val) => setNewStudent({...newStudent, class_id: val})}
                      required
                    >
                      <SelectTrigger className="bg-white h-9 text-xs">
                        <SelectValue placeholder="Choisir la classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classesList.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Genre</Label>
                    <Select 
                      value={newStudent.gender} 
                      onValueChange={(val: any) => setNewStudent({...newStudent, gender: val})}
                    >
                      <SelectTrigger className="bg-white h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculin (Garçon)</SelectItem>
                        <SelectItem value="F">Féminin (Fille)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="dob">Date de naissance</Label>
                  <Input 
                    id="dob" 
                    type="date"
                    value={newStudent.date_of_birth}
                    onChange={(e) => setNewStudent({...newStudent, date_of_birth: e.target.value})}
                    className="bg-white h-9 text-xs"
                  />
                </div>
              </div>

              {/* Infos Parent */}
              <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80 space-y-3">
                <h4 className="font-bold text-emerald-950 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  2. Responsable Légal / Parent Tuteur
                </h4>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStudent({...newStudent, parent_mode: "existing"})}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      newStudent.parent_mode === "existing" 
                        ? 'bg-emerald-600 text-white font-bold border-emerald-600' 
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Parent existant
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStudent({...newStudent, parent_mode: "new"})}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      newStudent.parent_mode === "new" 
                        ? 'bg-emerald-600 text-white font-bold border-emerald-600' 
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Inscrire un parent
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStudent({...newStudent, parent_mode: "none"})}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      newStudent.parent_mode === "none" 
                        ? 'bg-emerald-600 text-white font-bold border-emerald-600' 
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Plus tard
                  </button>
                </div>

                {newStudent.parent_mode === "existing" && (
                  <div className="grid gap-1.5 pt-1">
                    <Label>Sélectionner le parent dans l'annuaire</Label>
                    <Select 
                      value={newStudent.existing_parent_id} 
                      onValueChange={(val) => setNewStudent({...newStudent, existing_parent_id: val})}
                    >
                      <SelectTrigger className="bg-white h-9 text-xs">
                        <SelectValue placeholder="Choisir parmi les parents existants" />
                      </SelectTrigger>
                      <SelectContent>
                        {parents.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.full_name || p.email} {p.phone ? `(${p.phone})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {newStudent.parent_mode === "new" && (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid gap-1.5">
                      <Label htmlFor="parent_name">Nom complet du parent *</Label>
                      <Input 
                        id="parent_name"
                        placeholder="Ex: M. Konan Paul"
                        value={newStudent.new_parent_name}
                        onChange={(e) => setNewStudent({...newStudent, new_parent_name: e.target.value})}
                        className="bg-white h-9 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1.5">
                        <Label htmlFor="parent_email">Email du parent *</Label>
                        <Input 
                          id="parent_email"
                          type="email"
                          placeholder="parent@gmail.com"
                          value={newStudent.new_parent_email}
                          onChange={(e) => setNewStudent({...newStudent, new_parent_email: e.target.value})}
                          className="bg-white h-9 text-xs"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="parent_phone">Téléphone Mobile Money</Label>
                        <Input 
                          id="parent_phone"
                          placeholder="Ex: 0708091011"
                          value={newStudent.new_parent_phone}
                          onChange={(e) => setNewStudent({...newStudent, new_parent_phone: e.target.value})}
                          className="bg-white h-9 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Un compte portail parent sécurisé sera automatiquement créé et associé.
                    </p>
                  </div>
                )}
              </div>

            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateStudentOpen(false)}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                size="sm"
                disabled={createStudentMutation.isPending || createParentMutation.isPending}
                className="bg-primary font-bold"
              >
                {createStudentMutation.isPending || createParentMutation.isPending ? "Inscription en cours..." : "Valider l'Inscription"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2 : INSCRIRE UN PARENT DIRECTEMENT ── */}
      <Dialog open={isCreateParentOpen} onOpenChange={(open) => { setIsCreateParentOpen(open); if (!open) { setCreateParentMode('new'); setCpGlobalSearchQuery(''); clearGlobalSearch(); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <UserPlus className="w-5 h-5 text-emerald-600" /> Inscrire un Parent
            </DialogTitle>
            <DialogDescription>
              Créez un nouveau compte ou recherchez un parent déjà sur Eurêka pour l'inviter dans votre école.
            </DialogDescription>
          </DialogHeader>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-1.5 mb-1">
            <button
              type="button"
              onClick={() => setCreateParentMode('new')}
              className={`p-2.5 rounded-xl border text-center font-bold transition-all text-xs ${
                createParentMode === 'new'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5 mx-auto mb-0.5" />
              Nouveau Parent
            </button>
            <button
              type="button"
              onClick={() => setCreateParentMode('global')}
              className={`p-2.5 rounded-xl border text-center font-bold transition-all text-xs ${
                createParentMode === 'global'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Globe className="w-3.5 h-3.5 mx-auto mb-0.5" />
              Rechercher sur Eurêka
            </button>
          </div>

          {createParentMode === 'new' ? (
            <form onSubmit={handleCreateParentSubmit}>
              <div className="grid gap-3.5 py-2 text-xs">
                <div className="grid gap-1.5">
                  <Label htmlFor="parent_fullname">Nom et Prénom du parent *</Label>
                  <Input 
                    id="parent_fullname"
                    required
                    placeholder="Ex: Kouamé Affoué Marie"
                    value={parentFormData.fullName}
                    onChange={(e) => setParentFormData({...parentFormData, fullName: e.target.value})}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="p_email">Email du parent *</Label>
                    <Input 
                      id="p_email"
                      type="email"
                      required
                      placeholder="email@example.com"
                      value={parentFormData.email}
                      onChange={(e) => setParentFormData({...parentFormData, email: e.target.value})}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="p_phone">Téléphone Mobile Money</Label>
                    <Input 
                      id="p_phone"
                      placeholder="0708091011"
                      value={parentFormData.phone}
                      onChange={(e) => setParentFormData({...parentFormData, phone: e.target.value})}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="p_pass">Mot de passe temporaire (laisser vide pour auto-génération)</Label>
                  <Input 
                    id="p_pass"
                    type="text"
                    placeholder="Ex: Eureka2026!"
                    value={parentFormData.password}
                    onChange={(e) => setParentFormData({...parentFormData, password: e.target.value})}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="grid gap-1.5 pt-1">
                  <Label>Associer immédiatement un élève (optionnel)</Label>
                  <Select 
                    value={parentFormData.associateStudentId} 
                    onValueChange={(val) => setParentFormData({...parentFormData, associateStudentId: val})}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Aucun pour le moment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucun pour le moment</SelectItem>
                      {studentsList.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.first_name} {s.last_name} ({s.classes?.name || 'Classe'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateParentOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={createParentMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  {createParentMutation.isPending ? "Création en cours..." : "Créer le Compte Parent"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            /* ── Recherche globale dans modal "Inscrire Parent" ── */
            <div className="space-y-3 py-2 text-xs">

              {/* Sélection de l'élève cible — OBLIGATOIRE car student_id est NOT NULL */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <Label className="text-amber-800 font-semibold mb-1.5 block">
                  📌 Élève à rattacher au parent *
                </Label>
                <Select
                  value={cpGlobalSelectedStudentId}
                  onValueChange={setCpGlobalSelectedStudentId}
                >
                  <SelectTrigger className="h-9 text-xs bg-white border-amber-300">
                    <SelectValue placeholder="Sélectionner un élève..." />
                  </SelectTrigger>
                  <SelectContent>
                    {studentsList.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} — {s.classes?.name || 'Classe non assignée'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!cpGlobalSelectedStudentId && (
                  <p className="text-[10px] text-amber-700 mt-1">L'invitation sera liée à cet élève.</p>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-blue-400" />
                {isGlobalSearching && <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 text-blue-400 animate-spin" />}
                <input
                  type="text"
                  placeholder="Nom, email ou téléphone du parent..."
                  value={cpGlobalSearchQuery}
                  onChange={(e) => { setCpGlobalSearchQuery(e.target.value); searchGlobal(e.target.value); }}
                  className="w-full pl-9 pr-9 py-2 border border-blue-200 rounded-lg bg-blue-50 text-xs outline-none focus:border-blue-400 transition-colors"
                />
              </div>

              {cpGlobalSearchQuery.length >= 2 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {globalParents.length === 0 && !isGlobalSearching ? (
                    <div className="text-center py-6 text-gray-400">
                      <UserX className="w-7 h-7 mx-auto mb-1.5 text-gray-300" />
                      <p>Aucun parent trouvé pour « {cpGlobalSearchQuery} »</p>
                    </div>
                  ) : (
                    globalParents.map(gp => (
                      <div
                        key={gp.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border ${
                          gp.already_in_school ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                            gp.already_in_school ? 'bg-emerald-200 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {(gp.full_name || gp.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 leading-tight">{gp.full_name || '—'}</p>
                            <p className="text-gray-500 font-mono text-[10px]">{gp.email}</p>
                            {gp.phone && <p className="text-gray-400 text-[10px]">{gp.phone}</p>}
                            <div className="flex items-center gap-1 mt-0.5">
                              <Building2 className="w-2.5 h-2.5 text-gray-400" />
                              <span className="text-[10px] text-gray-400">{gp.tenant_name || 'Autre école'}</span>
                              {gp.children_count > 0 && (
                                <span className="text-[10px] text-gray-400">• {gp.children_count} enfant(s)</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          {gp.already_in_school ? (
                            <span className="px-2 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-lg">
                              Déjà inscrit
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isInvitingGlobal || !cpGlobalSelectedStudentId}
                                title={!cpGlobalSelectedStudentId ? "Sélectionnez d'abord un élève" : "Lier directement sans délai d'attente"}
                                onClick={async () => {
                                  if (!cpGlobalSelectedStudentId) {
                                    toast.error("Veuillez sélectionner un élève à rattacher au parent.");
                                    return;
                                  }
                                  setIsInvitingGlobal(true);
                                  try {
                                    await linkExistingParentDirectly(gp.id, cpGlobalSelectedStudentId);
                                    toast.success(`Élève rattaché avec succès au parent ${gp.full_name} !`);
                                    await studentsQuery.refetch();
                                    setIsCreateParentOpen(false);
                                    clearGlobalSearch();
                                    setCpGlobalSearchQuery('');
                                    setCpGlobalSelectedStudentId('');
                                  } catch (err: any) {
                                    toast.error(err.message || "Erreur lors de la liaison directe");
                                  } finally {
                                    setIsInvitingGlobal(false);
                                  }
                                }}
                                className="px-2 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {isInvitingGlobal ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                                Lier
                              </button>

                              <button
                                type="button"
                                disabled={isInvitingGlobal || !cpGlobalSelectedStudentId}
                                title={!cpGlobalSelectedStudentId ? "Sélectionnez d'abord un élève" : "Générer une invitation avec lien & WhatsApp"}
                                onClick={async () => {
                                  if (!cpGlobalSelectedStudentId) {
                                    toast.error("Veuillez sélectionner un élève à rattacher au parent.");
                                    return;
                                  }
                                  setIsInvitingGlobal(true);
                                  try {
                                    const res = await inviteExistingParent(gp.id, cpGlobalSelectedStudentId);
                                    const targetStudent = studentsList.find(s => s.id === cpGlobalSelectedStudentId);
                                    const stName = targetStudent ? `${targetStudent.first_name} ${targetStudent.last_name}` : res.studentName;

                                    setInvitationSuccessData({
                                      token: res.token,
                                      parentName: gp.full_name,
                                      parentEmail: res.email,
                                      parentPhone: gp.phone,
                                      studentName: stName,
                                      schoolName: res.schoolName,
                                      isExistingUser: true,
                                    });
                                    setIsInvitationSuccessOpen(true);
                                    setIsCreateParentOpen(false);
                                    clearGlobalSearch();
                                    setCpGlobalSearchQuery('');
                                    setCpGlobalSelectedStudentId('');
                                  } catch (err: any) {
                                    toast.error(err.message || "Erreur lors de l'invitation");
                                  } finally {
                                    setIsInvitingGlobal(false);
                                  }
                                }}
                                className="px-2 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {isInvitingGlobal ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                                Inviter
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-[11px]">
                  <Globe className="w-7 h-7 mx-auto mb-1.5 text-gray-300" />
                  <p>Recherchez un parent par son <strong>nom</strong>, son <strong>email</strong> ou son <strong>numéro de téléphone</strong>.</p>
                  <p className="mt-1">La recherche s'effectue sur l'ensemble des comptes parents Eurêka.</p>
                </div>
              )}

              <DialogFooter className="mt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => { setIsCreateParentOpen(false); clearGlobalSearch(); setCpGlobalSearchQuery(''); setCpGlobalSelectedStudentId(''); }}>
                  Fermer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3 : ASSOCIER UN PARENT À UN ÉLÈVE CIBLÉ ── */}
      <Dialog open={!!linkStudentTarget} onOpenChange={(open) => { if (!open) { setLinkStudentTarget(null); clearGlobalSearch(); setGlobalSearchQuery(''); }}}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleLinkParentSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Associer un Parent à {linkStudentTarget?.first_name} {linkStudentTarget?.last_name}
              </DialogTitle>
              <DialogDescription>
                Liez cet élève à un parent de votre école, créez un nouveau compte, ou recherchez un parent déjà inscrit dans une autre école Eurêka.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {/* Mode selector: 3 tabs */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setLinkParentMode("existing")}
                  className={`p-2 rounded-xl border text-center font-bold transition-all text-[11px] ${
                    linkParentMode === "existing"
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 mx-auto mb-1" />
                  Dans cette école
                </button>
                <button
                  type="button"
                  onClick={() => { setLinkParentMode("global"); }}
                  className={`p-2 rounded-xl border text-center font-bold transition-all text-[11px] ${
                    linkParentMode === "global"
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 mx-auto mb-1" />
                  Rechercher sur Eurêka
                </button>
                <button
                  type="button"
                  onClick={() => setLinkParentMode("new")}
                  className={`p-2 rounded-xl border text-center font-bold transition-all text-[11px] ${
                    linkParentMode === "new"
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 mx-auto mb-1" />
                  Nouveau parent
                </button>
              </div>

              {/* ─── Tab: parents existants dans l'école ─── */}
              {linkParentMode === "existing" && (
                <div className="space-y-2">
                  <Label>Parent responsable</Label>
                  <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Sélectionner le parent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {parents.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name || p.email} {p.phone ? `(${p.phone})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* ─── Tab: Recherche globale cross-école ─── */}
              {linkParentMode === "global" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-blue-400" />
                    {isGlobalSearching && <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 text-blue-400 animate-spin" />}
                    <input
                      type="text"
                      placeholder="Nom, email ou téléphone du parent..."
                      value={globalSearchQuery}
                      onChange={(e) => { setGlobalSearchQuery(e.target.value); searchGlobal(e.target.value); }}
                      className="w-full pl-9 pr-9 py-2 border border-blue-200 rounded-lg bg-blue-50 text-xs outline-none focus:border-blue-400 transition-colors"
                    />
                  </div>

                  {globalSearchQuery.length >= 2 && (
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {globalParents.length === 0 && !isGlobalSearching ? (
                        <div className="text-center py-6 text-gray-400">
                          <UserX className="w-7 h-7 mx-auto mb-1.5 text-gray-300" />
                          <p>Aucun parent trouvé pour « {globalSearchQuery} »</p>
                        </div>
                      ) : (
                        globalParents.map(gp => (
                          <div
                            key={gp.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                              gp.already_in_school
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                gp.already_in_school ? 'bg-emerald-200 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {(gp.full_name || gp.email)[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 leading-tight">{gp.full_name || '—'}</p>
                                <p className="text-gray-500 font-mono text-[10px]">{gp.email}</p>
                                {gp.phone && <p className="text-gray-400 text-[10px]">{gp.phone}</p>}
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Building2 className="w-2.5 h-2.5 text-gray-400" />
                                  <span className="text-[10px] text-gray-400">{gp.tenant_name || 'Autre école'}</span>
                                  {gp.children_count > 0 && (
                                    <span className="text-[10px] text-gray-400">• {gp.children_count} enfant(s)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div>
                              {gp.already_in_school ? (
                                <button
                                  type="button"
                                  onClick={() => { setSelectedParentId(gp.id); setLinkParentMode('existing'); }}
                                  className="px-2 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                                >
                                  Choisir
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={isInvitingGlobal}
                                    title="Lier directement sans délai d'attente"
                                    onClick={async () => {
                                      if (!linkStudentTarget) return;
                                      setIsInvitingGlobal(true);
                                      try {
                                        await linkExistingParentDirectly(gp.id, linkStudentTarget.id);
                                        toast.success(`Élève ${linkStudentTarget.first_name} rattaché avec succès au parent ${gp.full_name} !`);
                                        await studentsQuery.refetch();
                                        setLinkStudentTarget(null);
                                        clearGlobalSearch();
                                        setGlobalSearchQuery('');
                                      } catch (err: any) {
                                        toast.error(err.message || "Erreur lors de la liaison directe");
                                      } finally {
                                        setIsInvitingGlobal(false);
                                      }
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 disabled:opacity-60"
                                  >
                                    {isInvitingGlobal ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                                    Lier
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isInvitingGlobal}
                                    title="Générer une invitation avec lien & WhatsApp"
                                    onClick={async () => {
                                      if (!linkStudentTarget) return;
                                      setIsInvitingGlobal(true);
                                      try {
                                        const res = await inviteExistingParent(gp.id, linkStudentTarget.id);
                                        const stName = `${linkStudentTarget.first_name} ${linkStudentTarget.last_name}`;

                                        setInvitationSuccessData({
                                          token: res.token,
                                          parentName: gp.full_name,
                                          parentEmail: res.email,
                                          parentPhone: gp.phone,
                                          studentName: stName,
                                          schoolName: res.schoolName,
                                          isExistingUser: true,
                                        });
                                        setIsInvitationSuccessOpen(true);
                                        setLinkStudentTarget(null);
                                        clearGlobalSearch();
                                        setGlobalSearchQuery('');
                                      } catch (err: any) {
                                        toast.error(err.message || "Erreur lors de l'invitation");
                                      } finally {
                                        setIsInvitingGlobal(false);
                                      }
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 disabled:opacity-60"
                                  >
                                    {isInvitingGlobal ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                                    Inviter
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {globalSearchQuery.length < 2 && (
                    <div className="text-center py-4 text-gray-400 text-[11px]">
                      <Globe className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                      Tapez au moins 2 caractères pour lancer la recherche sur toute la plateforme Eurêka
                    </div>
                  )}
                </div>
              )}

              {/* ─── Tab: Nouveau parent ─── */}
              {linkParentMode === "new" && (
                <div className="space-y-3 bg-gray-50 p-3.5 rounded-xl border">
                  <div className="grid gap-1.5">
                    <Label htmlFor="quick_name">Nom complet du parent *</Label>
                    <Input 
                      id="quick_name"
                      required
                      placeholder="Ex: M. Yao Kouadio"
                      value={quickParentName}
                      onChange={(e) => setQuickParentName(e.target.value)}
                      className="bg-white h-9 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="quick_email">Email *</Label>
                      <Input 
                        id="quick_email"
                        type="email"
                        required
                        placeholder="parent@gmail.com"
                        value={quickParentEmail}
                        onChange={(e) => setQuickParentEmail(e.target.value)}
                        className="bg-white h-9 text-xs"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="quick_phone">Téléphone</Label>
                      <Input 
                        id="quick_phone"
                        placeholder="0708091011"
                        value={quickParentPhone}
                        onChange={(e) => setQuickParentPhone(e.target.value)}
                        className="bg-white h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => { setLinkStudentTarget(null); clearGlobalSearch(); setGlobalSearchQuery(''); }}>
                Annuler
              </Button>
              {linkParentMode !== 'global' && (
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={linkParentMutation.isPending || createParentMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  {linkParentMutation.isPending || createParentMutation.isPending ? "Association..." : "Confirmer l'Association"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 4 : IDENTIFIANTS DU PARENT GÉNÉRÉS ── */}
      <Dialog open={!!newCredentials} onOpenChange={(open) => !open && setNewCredentials(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <Key className="w-5 h-5 text-emerald-600" /> Compte Parent Créé avec Succès !
            </DialogTitle>
            <DialogDescription>
              Transmettez ces identifiants au parent pour qu'il puisse se connecter à son espace.
            </DialogDescription>
          </DialogHeader>

          {newCredentials && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-emerald-200/60">
                  <span className="text-gray-600">Nom du parent :</span>
                  <span className="font-bold text-gray-900">{newCredentials.fullName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-emerald-200/60">
                  <span className="text-gray-600">Identifiant (Email) :</span>
                  <span className="font-bold font-mono text-emerald-950">{newCredentials.email}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Mot de passe temporaire :</span>
                  <span className="font-bold font-mono text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {newCredentials.password}
                  </span>
                </div>
              </div>

              <Button 
                onClick={copyCredentials}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs"
              >
                <Copy className="w-4 h-4" /> Copier les Identifiants du Parent
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setNewCredentials(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 5 : MODIFIER L'ÉLÈVE ── */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Modifier l'élève</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-xs">
              <div className="grid gap-2">
                <Label htmlFor="edit_first_name">Prénom</Label>
                <Input 
                  id="edit_first_name" 
                  value={editingStudent?.first_name || ''}
                  onChange={(e) => setEditingStudent(s => s ? {...s, first_name: e.target.value} : null)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_last_name">Nom de famille</Label>
                <Input 
                  id="edit_last_name" 
                  value={editingStudent?.last_name || ''}
                  onChange={(e) => setEditingStudent(s => s ? {...s, last_name: e.target.value} : null)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_class_id">Classe</Label>
                <Select 
                  value={editingStudent?.class_id || ''} 
                  onValueChange={(val) => setEditingStudent(s => s ? {...s, class_id: val} : null)}
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
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingStudent(null)}>Annuler</Button>
              <Button type="submit" size="sm" disabled={updateStudentMutation.isPending}>
                {updateStudentMutation.isPending ? "Modification..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingStudent} onOpenChange={(open) => !open && setDeletingStudent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet élève ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'élève ainsi que toutes ses données associées (présences, paiements) seront supprimés.
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

      {/* Boîte de dialogue Partage d'Invitation */}
      <InvitationSuccessDialog
        isOpen={isInvitationSuccessOpen}
        onClose={() => {
          setIsInvitationSuccessOpen(false);
          setInvitationSuccessData(null);
        }}
        data={invitationSuccessData}
      />

    </AppShell>
  );
}
