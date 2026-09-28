import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { useStudents } from '@/hooks/useStudents';
import { useClasses } from '@/hooks/useClasses';
import { useCinetPay } from '@/hooks/useCinetPay';
import { useAuth } from '@/hooks/useAuth';
import { useParentSchools, useParentChildrenAllSchools, useParentPendingInvitations, ParentChildAllSchools } from '@/hooks/useParentMultiSchool';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { 
  UserCheck, GraduationCap, CreditCard, Calendar, Clock, 
  CheckCircle2, AlertCircle, FileText, Download, Phone, ArrowRight,
  UserPlus, HeartPulse, Sparkles, ShieldCheck, Building2, RefreshCw,
  Globe2, School, ChevronRight, ExternalLink, Mail, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export const Route = createFileRoute('/portail-parent')({
  head: () => ({
    meta: [
      { title: "Espace Parents — Eurêka" },
      { name: "description", content: "Portail parent : suivi multi-école, inscriptions d'enfants et paiements mobiles sécurisés." },
    ],
  }),
  component: ParentPortalPage,
});

const PAYMENT_METHODS = [
  { id: 'WAVE', name: 'Wave Mobile Money', icon: '🌊', color: 'bg-cyan-500' },
  { id: 'ORANGE_MONEY_CI', name: 'Orange Money', icon: '🍊', color: 'bg-orange-500' },
  { id: 'MTN_CI', name: 'MTN Mobile Money', icon: '🟡', color: 'bg-yellow-400' },
  { id: 'MOOV_CI', name: 'Moov Money', icon: '🔹', color: 'bg-blue-600' },
  { id: 'CARD', name: 'Carte Bancaire (Visa/Mastercard)', icon: '💳', color: 'bg-slate-800' },
];

function ParentPortalPage() {
  const { students } = useStudents();
  const { classes } = useClasses();
  const { user, profile } = useAuth();
  const { initiatePayment, isProcessing } = useCinetPay();
  const queryClient = useQueryClient();

  // Multi-school hooks
  const { schools, isLoading: isLoadingSchools } = useParentSchools();
  const { children: allChildren, isLoading: isLoadingChildren } = useParentChildrenAllSchools();
  const { invitations: pendingInvitations, acceptInvitation, declineInvitation } = useParentPendingInvitations();
  const [processingToken, setProcessingToken] = useState<string | null>(null);

  // Filter school — 'all' shows children from all schools
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('all');
  
  // Selected child state
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isSubmittingEnrollment, setIsSubmittingEnrollment] = useState(false);

  // New Child Enrollment Form State
  const [enrollForm, setEnrollForm] = useState({
    firstName: '',
    lastName: profile?.full_name ? profile.full_name.split(' ').slice(1).join(' ') || profile.full_name.split(' ')[0] : '',
    classId: '',
    dateOfBirth: '',
    gender: 'M' as 'M' | 'F',
    medicalNotes: '',
  });
  
  // Payment Form state
  const [amount, setAmount] = useState('65000');
  const [channel, setChannel] = useState<'WAVE' | 'ORANGE_MONEY_CI' | 'MTN_CI' | 'MOOV_CI' | 'CARD'>('WAVE');
  const [parentName, setParentName] = useState(profile?.full_name?.split(' ')[0] || 'Parent');
  const [parentSurname, setParentSurname] = useState(profile?.full_name?.split(' ').slice(1).join(' ') || '');
  const [parentPhone, setParentPhone] = useState(profile?.phone || '0708091011');

  // Merge allChildren from RPC + local students (fallback)
  const displayChildren = useMemo(() => {
    if (allChildren.length > 0) {
      // Filter by selected school
      if (selectedSchoolFilter === 'all') return allChildren;
      return allChildren.filter(c => c.tenant_id === selectedSchoolFilter);
    }
    // Fallback to useStudents hook data
    return students.map((s: any) => ({
      student_id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      class_name: s.classes?.name || null,
      tenant_id: profile?.tenant_id || '',
      school_name: 'Mon établissement',
      status: s.status,
    }));
  }, [allChildren, selectedSchoolFilter, students, profile]);

  const currentChild = useMemo((): ParentChildAllSchools | null => {
    if (!selectedStudentId && displayChildren.length > 0) return displayChildren[0];
    return displayChildren.find((c: ParentChildAllSchools) => c.student_id === selectedStudentId) || displayChildren[0] || null;
  }, [selectedStudentId, displayChildren]);

  // For payment we still use the "currentStudent" from local useStudents if possible
  const currentStudentLocal = students.find((s: any) => s.id === currentChild?.student_id);

  // Submit Child Enrollment
  const handleEnrollChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollForm.firstName || !enrollForm.lastName || !enrollForm.classId) {
      toast.error("Veuillez renseigner le prénom, le nom et la classe");
      return;
    }

    if (!user?.id || !profile?.tenant_id) {
      toast.error("Votre compte n'est pas correctement rattaché à un établissement.");
      return;
    }

    setIsSubmittingEnrollment(true);
    try {
      const { data, error } = await supabase.from('students').insert([{
        first_name: enrollForm.firstName.trim(),
        last_name: enrollForm.lastName.trim(),
        class_id: enrollForm.classId,
        date_of_birth: enrollForm.dateOfBirth || null,
        gender: enrollForm.gender,
        medical_notes: enrollForm.medicalNotes || null,
        responsible_id: user.id,
        tenant_id: profile.tenant_id,
        status: 'pending',
        guardian_name: profile.full_name || `${parentName} ${parentSurname}`.trim(),
        guardian_phone: profile.phone || parentPhone || null,
        guardian_email: profile.email || user.email || null,
      }]).select().single();

      if (error) throw error;

      toast.success(`Demande d'inscription enregistrée pour ${enrollForm.firstName} !`);
      await queryClient.invalidateQueries({ queryKey: ['students'] });
      await queryClient.invalidateQueries({ queryKey: ['parent_children_all'] });
      
      if (data?.id) setSelectedStudentId(data.id);

      setEnrollForm({
        firstName: '',
        lastName: profile?.full_name?.split(' ').slice(1).join(' ') || '',
        classId: '',
        dateOfBirth: '',
        gender: 'M',
        medicalNotes: '',
      });
      setIsEnrollModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement de l'inscription");
    } finally {
      setIsSubmittingEnrollment(false);
    }
  };

  const handlePay = async () => {
    if (!currentChild) return;
    try {
      await initiatePayment({
        studentId: currentChild.student_id,
        amount: parseFloat(amount),
        description: `Scolarité — ${currentChild.first_name} ${currentChild.last_name}`,
        customerName: parentName,
        customerSurname: parentSurname,
        customerPhone: parentPhone,
        channel,
      });
      setIsPayModalOpen(false);
    } catch (e) {
      // handled in hook
    }
  };

  const isPendingValidation = currentChild?.status === 'pending';
  const hasMultipleSchools = schools.length > 1;

  return (
    <AppShell
      title="Espace Parents d'Élèves"
      subtitle={hasMultipleSchools 
        ? `Compte lié à ${schools.length} établissements · ${allChildren.length} enfant(s) suivi(s)`
        : "Suivi de scolarité, inscriptions d'enfants et paiement direct en ligne"
      }
      actions={
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setIsEnrollModalOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Inscrire un enfant
          </Button>
        </div>
      }
    >
      {/* ── Pending Invitations Banner ── */}
      {pendingInvitations.length > 0 && (
        <div className="mb-6 rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-blue-50/80 to-purple-50/60 p-5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Nouvelle{pendingInvitations.length > 1 ? 's' : ''} invitation{pendingInvitations.length > 1 ? 's' : ''} d'établissement scolaire
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full">
                    {pendingInvitations.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-600">
                  Un ou plusieurs établissements vous invitent à synchroniser vos enfants sur votre compte Eurêka.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.invitation_id}
                className="bg-white rounded-xl p-4 border border-indigo-100 shadow-sm flex flex-col justify-between gap-3 hover:border-indigo-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs mb-1">
                      <School className="w-3.5 h-3.5" />
                      <span>{inv.school_name}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-emerald-600" />
                      {inv.student_name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Classe : <span className="font-semibold text-slate-700">{inv.class_name}</span>
                    </p>
                  </div>
                  <span className="px-2 py-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg shrink-0">
                    En attente
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Button
                    size="sm"
                    disabled={processingToken === inv.invitation_token}
                    onClick={async () => {
                      setProcessingToken(inv.invitation_token);
                      try {
                        await acceptInvitation(inv.invitation_token);
                        toast.success(`Élève ${inv.student_name} rattaché avec succès !`);
                      } catch (err: any) {
                        toast.error(err.message || "Erreur lors de l'acceptation");
                      } finally {
                        setProcessingToken(null);
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 flex-1 shadow-sm"
                  >
                    {processingToken === inv.invitation_token ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Accepter l'association
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={processingToken === inv.invitation_token}
                    onClick={async () => {
                      if (!confirm(`Refuser l'invitation pour ${inv.student_name} ?`)) return;
                      setProcessingToken(inv.invitation_token);
                      try {
                        await declineInvitation(inv.invitation_token);
                        toast.info("Invitation refusée");
                      } catch (err: any) {
                        toast.error(err.message || "Erreur lors du refus");
                      } finally {
                        setProcessingToken(null);
                      }
                    }}
                    className="text-xs text-slate-500 hover:text-red-600 hover:border-red-200"
                  >
                    Refuser
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Multi-school banner ── */}
      {hasMultipleSchools && (
        <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Compte multi-établissement</p>
              <p className="text-xs text-muted-foreground">
                Vous êtes inscrit dans {schools.length} écoles sur Eurêka
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {schools.map(school => (
              <button
                key={school.tenant_id}
                onClick={() => setSelectedSchoolFilter(
                  selectedSchoolFilter === school.tenant_id ? 'all' : school.tenant_id
                )}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                  selectedSchoolFilter === school.tenant_id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white text-foreground border-border hover:border-primary/50'
                }`}
              >
                <School className="w-3 h-3" />
                {school.school_name}
                <span className="opacity-70">· {school.child_count} enfant{school.child_count > 1 ? 's' : ''}</span>
              </button>
            ))}
            {selectedSchoolFilter !== 'all' && (
              <button
                onClick={() => setSelectedSchoolFilter('all')}
                className="text-xs text-muted-foreground px-2 py-1.5 hover:text-foreground"
              >
                Voir tout
              </button>
            )}
          </div>
        </div>
      )}

      {/* Child selector */}
      {displayChildren.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-accent" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Mon enfant :</span>
            <Select 
              value={selectedStudentId || (displayChildren[0]?.student_id || '')} 
              onValueChange={setSelectedStudentId}
            >
              <SelectTrigger className="w-72 h-9 text-xs bg-white">
                <SelectValue placeholder="Sélectionner l'enfant" />
              </SelectTrigger>
              <SelectContent>
                {displayChildren.map((c: ParentChildAllSchools) => (
                  <SelectItem key={c.student_id} value={c.student_id}>
                    <span className="flex items-center gap-2">
                      {hasMultipleSchools && (
                        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono">
                          {c.school_name.slice(0, 8)}…
                        </span>
                      )}
                      {c.first_name} {c.last_name}
                      {c.class_name && <span className="text-muted-foreground">({c.class_name})</span>}
                      {c.status === 'pending' ? ' ⏳' : ' ✅'}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              size="sm"
              variant="outline"
              onClick={() => setIsEnrollModalOpen(true)}
              className="gap-1.5 text-xs text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 font-semibold"
            >
              <UserPlus className="w-3.5 h-3.5" /> Inscrire un autre enfant
            </Button>

            <Button 
              size="sm" 
              onClick={() => setIsPayModalOpen(true)} 
              className="gap-2 bg-accent text-accent-foreground font-bold hover:opacity-95 text-xs shadow-md"
            >
              <CreditCard className="w-4 h-4" /> Payer la scolarité
            </Button>
          </div>
        </div>
      )}

      {currentChild ? (
        <div className="space-y-6">

          {/* Pending Banner */}
          {isPendingValidation && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 flex items-start gap-3 shadow-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-amber-950">
                  Dossier d'inscription en attente de validation administrative
                </h4>
                <p className="text-xs text-amber-800">
                  La demande d'inscription pour <strong>{currentChild.first_name} {currentChild.last_name}</strong> a bien été enregistrée. L'administration procède à la vérification des pièces. Dès validation, les notes et bulletins seront débloqués.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Child Identity & Status Card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 border-b border-border pb-5">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-display text-2xl font-bold">
                    {currentChild.first_name[0]}{currentChild.last_name[0]}
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">
                      {currentChild.first_name} {currentChild.last_name}
                    </h2>
                    <div className="mt-1 flex flex-col gap-1">
                      {isPendingValidation ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                          ⏳ En attente de validation
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Dossier Validé
                        </span>
                      )}
                      {hasMultipleSchools && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          <Building2 className="w-3 h-3" /> {currentChild.school_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Classe actuelle :</span>
                    <span className="font-bold text-foreground">{currentChild.class_name || 'Affectation en cours'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Assiduité (Présences) :</span>
                    <span className="font-bold text-emerald-600">96.5% de présence</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Moyenne trimestrielle :</span>
                    <span className="font-bold text-foreground">{isPendingValidation ? 'Non calculée' : '14.25 / 20'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Tuteur déclaré :</span>
                    <span className="font-semibold text-foreground">{profile?.full_name || 'Vous-même'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex flex-col gap-2">
                <Button variant="outline" size="sm" className="w-full text-xs gap-2" disabled={isPendingValidation}>
                  <FileText className="w-3.5 h-3.5" /> Télécharger le dernier bulletin
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs gap-2" disabled={isPendingValidation}>
                  <Calendar className="w-3.5 h-3.5" /> Voir l'emploi du temps
                </Button>
              </div>
            </div>

            {/* Tuition Fee Breakdown */}
            <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">Échéancier des Frais de Scolarité</h3>
                  <p className="text-xs text-muted-foreground">Règlement en ligne sécurisé via Mobile Money (Wave, OM, Moov, MTN)</p>
                </div>
                <span className="text-xs font-mono font-bold bg-accent/20 text-accent px-2.5 py-1 rounded">
                  Année 2025-2026
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {/* Tranche Inscription */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground">Frais d'Inscription & Rentrée</div>
                      <div className="text-[11px] text-muted-foreground">Échéance : 30 Septembre 2025</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-foreground font-mono">20 000 FCFA</div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Payé en ligne</span>
                  </div>
                </div>

                {/* Tranche 1 */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 text-xs">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground">1ère Tranche (Trimestre 1)</div>
                      <div className="text-[11px] text-muted-foreground">Échéance : 30 Octobre 2025</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-amber-700 font-mono">35 000 FCFA</div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase">À régler</span>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setAmount('35000');
                        setIsPayModalOpen(true);
                      }}
                      className="h-8 px-3 text-xs bg-primary text-primary-foreground font-semibold"
                    >
                      Régler
                    </Button>
                  </div>
                </div>

                {/* Tranche 2 */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-secondary/30 text-xs opacity-80">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground">2ème Tranche (Trimestre 2)</div>
                      <div className="text-[11px] text-muted-foreground">Échéance : 30 Novembre 2025</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-foreground font-mono">35 000 FCFA</div>
                    <span className="text-[10px] text-muted-foreground uppercase">À venir</span>
                  </div>
                </div>

                {/* Tranche 3 */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-secondary/30 text-xs opacity-80">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground">3ème Tranche (Trimestre 3)</div>
                      <div className="text-[11px] text-muted-foreground">Échéance : 31 Décembre 2025</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-foreground font-mono">25 000 FCFA</div>
                    <span className="text-[10px] text-muted-foreground uppercase">À venir</span>
                  </div>
                </div>
              </div>

              {/* Direct Pay Info Banner */}
              <div className="mt-6 rounded-xl bg-primary text-primary-foreground p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-sm">Paiement Mobile Instantané</h4>
                  <p className="text-xs text-primary-foreground/75 mt-0.5">
                    Règlement sécurisé sans déplacement : reçu officiel généré automatiquement.
                  </p>
                </div>
                <Button 
                  onClick={() => setIsPayModalOpen(true)}
                  className="bg-accent text-accent-foreground font-bold hover:opacity-90 text-xs"
                >
                  Payer avec Mobile Money
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed max-w-2xl mx-auto shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Bienvenue sur votre Espace Parent Eurêka</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            Vous n'avez pas encore d'enfant rattaché à votre compte. Vous pouvez effectuer une nouvelle inscription en ligne directement en quelques clics, ou attendre une invitation de l'établissement.
          </p>
          <div className="pt-2">
            <Button 
              onClick={() => setIsEnrollModalOpen(true)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 h-11 shadow-md"
            >
              <UserPlus className="w-4 h-4" /> Inscrire mon enfant maintenant
            </Button>
          </div>
        </div>
      )}

      {/* ── MODAL INSCRIPTION D'UN ENFANT ── */}
      <Dialog open={isEnrollModalOpen} onOpenChange={setIsEnrollModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEnrollChild}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-800">
                <UserPlus className="w-5 h-5 text-emerald-600" /> Inscrire mon enfant
              </DialogTitle>
              <DialogDescription>
                Renseignez le formulaire pour transmettre la demande d'inscription à l'établissement.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3.5 py-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="c_firstname">Prénom de l'enfant *</Label>
                  <Input 
                    id="c_firstname"
                    required
                    placeholder="Ex: Jean-Marc"
                    value={enrollForm.firstName}
                    onChange={(e) => setEnrollForm({...enrollForm, firstName: e.target.value})}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="c_lastname">Nom de famille *</Label>
                  <Input 
                    id="c_lastname"
                    required
                    placeholder="Ex: Kouamé"
                    value={enrollForm.lastName}
                    onChange={(e) => setEnrollForm({...enrollForm, lastName: e.target.value})}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Classe demandée *</Label>
                  <Select 
                    value={enrollForm.classId} 
                    onValueChange={(val) => setEnrollForm({...enrollForm, classId: val})}
                    required
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choisir la classe..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label>Genre</Label>
                  <Select 
                    value={enrollForm.gender} 
                    onValueChange={(val: any) => setEnrollForm({...enrollForm, gender: val})}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Garçon (Masculin)</SelectItem>
                      <SelectItem value="F">Fille (Féminin)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="c_dob">Date de naissance</Label>
                <Input 
                  id="c_dob"
                  type="date"
                  value={enrollForm.dateOfBirth}
                  onChange={(e) => setEnrollForm({...enrollForm, dateOfBirth: e.target.value})}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="c_notes">Remarques médicales / Allergies / Particularités (optionnel)</Label>
                <Textarea 
                  id="c_notes"
                  placeholder="Ex: Asthme léger, régime alimentaire sans arachides..."
                  value={enrollForm.medicalNotes}
                  onChange={(e) => setEnrollForm({...enrollForm, medicalNotes: e.target.value})}
                  className="text-xs min-h-[60px]"
                />
              </div>

              <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Cet enfant sera automatiquement rattaché à votre compte tuteur ({profile?.full_name || profile?.email}).
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEnrollModalOpen(false)}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                size="sm"
                disabled={isSubmittingEnrollment}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isSubmittingEnrollment ? "Envoi du dossier..." : "Transmettre l'Inscription"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL PAIEMENT ── */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-accent" />
              Paiement Sécurisé CinetPay
            </DialogTitle>
            {currentChild && (
              <DialogDescription>
                Pour : <strong>{currentChild.first_name} {currentChild.last_name}</strong>
                {hasMultipleSchools && <span className="text-muted-foreground"> · {currentChild.school_name}</span>}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-xs">Moyen de paiement</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {PAYMENT_METHODS.map(pm => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setChannel(pm.id as any)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                      channel === pm.id 
                        ? 'border-accent bg-accent/10 font-bold' 
                        : 'border-border hover:bg-secondary/50'
                    }`}
                  >
                    <span className="text-lg">{pm.icon}</span>
                    <span className="truncate">{pm.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Montant à régler (FCFA)</Label>
              <Input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 h-10 text-sm font-mono font-bold" 
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Nom du payeur</Label>
                <Input 
                  value={parentName} 
                  onChange={(e) => setParentName(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
              <div>
                <Label className="text-xs">Prénom</Label>
                <Input 
                  value={parentSurname} 
                  onChange={(e) => setParentSurname(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Numéro de téléphone (Compte Mobile Money)</Label>
              <Input 
                placeholder="Ex: 0708091011" 
                value={parentPhone} 
                onChange={(e) => setParentPhone(e.target.value)}
                className="mt-1 h-9 text-xs font-mono" 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsPayModalOpen(false)}>Annuler</Button>
            <Button 
              size="sm" 
              onClick={handlePay} 
              disabled={isProcessing || !amount || !parentPhone}
              className="bg-accent text-accent-foreground font-bold hover:opacity-95"
            >
              {isProcessing ? 'Validation en cours...' : `Confirmer (${parseInt(amount || '0').toLocaleString('fr-FR')} FCFA)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
