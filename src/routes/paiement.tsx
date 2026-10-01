import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/AppShell'
import { useSchoolAccounting, StudentLedgerItem, OverdueScheduleReminder } from '@/hooks/useSchoolAccounting'
import { useClasses } from '@/hooks/useClasses'
import { useAuth } from '@/hooks/useAuth'
import {
  CreditCard, Smartphone, CheckCircle2, FileText, Download, Printer,
  Loader2, Calendar, User, Mail, Clock, ArrowRight, AlertCircle,
  RefreshCw, BadgePercent, ChevronDown, Banknote, School, Search,
  Filter, MessageCircle, BellRing, QrCode, ExternalLink, ShieldCheck,
  TrendingUp, AlertTriangle, Eye, Send, Users, DollarSign, Check,
  Share2, ArrowUpRight
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

export const Route = createFileRoute('/paiement')({
  component: PaymentAndAccountingPage,
})

// ─── Modes de Paiement Caisse & Mobile Money ──────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'Espèces',            name: 'Espèces (Caisse guichet)',     icon: '💵', color: 'bg-emerald-600' },
  { id: 'Wave',               name: 'Wave Mobile Money',           icon: '🌊', color: 'bg-cyan-500' },
  { id: 'Orange Money',       name: 'Orange Money',                icon: '🍊', color: 'bg-orange-500' },
  { id: 'MTN Mobile Money',   name: 'MTN MoMo',                    icon: '🟡', color: 'bg-yellow-400' },
  { id: 'Moov Money',         name: 'Moov Money',                  icon: '🔹', color: 'bg-blue-600' },
  { id: 'Chèque',             name: 'Chèque bancaire',             icon: '📑', color: 'bg-indigo-600' },
  { id: 'Virement bancaire',  name: 'Virement bancaire',           icon: '🏦', color: 'bg-purple-600' },
  { id: 'Carte Bancaire',     name: 'Carte Bancaire (Visa/MC)',    icon: '💳', color: 'bg-slate-800' },
]

function StatusBadge({ status }: { status: 'paid' | 'partial' | 'pending' | 'up_to_date' | 'late' | 'not_configured' }) {
  if (status === 'paid' || status === 'up_to_date') return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
      <CheckCircle2 className="w-3 h-3" /> EN RÈGLE
    </span>
  )
  if (status === 'partial') return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
      <BadgePercent className="w-3 h-3" /> PARTIEL
    </span>
  )
  if (status === 'late') return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 animate-pulse-slow">
      <AlertTriangle className="w-3 h-3 text-red-600" /> EN RETARD
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
      <Clock className="w-3 h-3" /> À PAYER
    </span>
  )
}

function PaymentAndAccountingPage() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const { classesQuery } = useClasses()
  const classes = classesQuery.data || []

  // Rôles
  const isStaff = ['admin', 'director', 'accountant', 'cashier', 'superadmin'].includes(profile?.role || '')
  const isParent = profile?.role === 'responsible' || profile?.role === 'parent'
  
  // Bascule de vue (si staff a aussi des enfants, ou vue par défaut)
  const [activeStaffView, setActiveStaffView] = useState<'accounting' | 'family'>(isStaff ? 'accounting' : 'family')

  // ── Hook de comptabilité scolaire ──
  const accounting = useSchoolAccounting()

  // ── Filtres & États Comptabilité ──
  const [accountingTab, setAccountingTab] = useState<'students' | 'reminders' | 'cash'>('students')
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'up_to_date' | 'partial' | 'late'>('all')

  // Filtres Relances
  const [reminderUrgencyFilter, setReminderUrgencyFilter] = useState<'all' | 'critical' | 'warning' | 'upcoming'>('all')
  const [reminderSearch, setReminderSearch] = useState('')

  // ── Modals & Actions ──
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<StudentLedgerItem | null>(null)
  const [studentForCashPayment, setStudentForCashPayment] = useState<StudentLedgerItem | null>(null)
  const [cashPaymentScheduleId, setCashPaymentScheduleId] = useState<string>('')
  const [cashPaymentAmount, setCashPaymentAmount] = useState<string>('')
  const [cashPaymentMethod, setCashPaymentMethod] = useState<string>('Espèces')
  const [cashPaymentNotes, setCashPaymentNotes] = useState<string>('')
  const [activeReceipt, setActiveReceipt] = useState<any>(null)

  // ── Filtrage des Comptes Élèves (Dissociés) ──
  const filteredStudentsLedger = useMemo(() => {
    return accounting.studentsLedger.filter(st => {
      const matchSearch = 
        `${st.first_name} ${st.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (st.student_code && st.student_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (st.parent_name && st.parent_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (st.parent_phone && st.parent_phone.includes(searchTerm))
      
      const matchClass = classFilter === 'all' || st.class_id === classFilter
      const matchStatus = statusFilter === 'all' || st.overall_financial_status === statusFilter

      return matchSearch && matchClass && matchStatus
    })
  }, [accounting.studentsLedger, searchTerm, classFilter, statusFilter])

  // ── Filtrage des Échéances & Relances ──
  const filteredReminders = useMemo(() => {
    return accounting.overdueReminders.filter(rem => {
      const matchSearch = 
        rem.student_name.toLowerCase().includes(reminderSearch.toLowerCase()) ||
        rem.parent_name.toLowerCase().includes(reminderSearch.toLowerCase()) ||
        rem.parent_phone.includes(reminderSearch) ||
        rem.class_name.toLowerCase().includes(reminderSearch.toLowerCase())
      
      const matchUrgency = reminderUrgencyFilter === 'all' || rem.urgency === reminderUrgencyFilter

      return matchSearch && matchUrgency
    })
  }, [accounting.overdueReminders, reminderSearch, reminderUrgencyFilter])

  // ── Enregistrement d'un Paiement Caisse Guichet ──
  const handleCashPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentForCashPayment) return

    const amount = parseFloat(cashPaymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Veuillez saisir un montant valide")
      return
    }

    try {
      const res = await accounting.recordPayment({
        studentId: studentForCashPayment.id,
        scheduleId: cashPaymentScheduleId || null,
        amount,
        method: cashPaymentMethod,
        notes: cashPaymentNotes,
        payerName: studentForCashPayment.parent_name,
        payerPhone: studentForCashPayment.parent_phone,
        payerEmail: studentForCashPayment.parent_email,
      })

      const targetSchedule = studentForCashPayment.schedules.find(s => s.schedule_id === cashPaymentScheduleId)

      // Reçu officiel
      setActiveReceipt({
        receiptNumber: res.receiptNumber,
        transactionRef: res.txRef,
        studentName: `${studentForCashPayment.first_name} ${studentForCashPayment.last_name}`,
        className: studentForCashPayment.class_name,
        schoolName: (profile?.tenants as any)?.name || 'Eurêka Établissement',
        title: targetSchedule?.title || 'Frais de scolarité',
        amount,
        totalDue: targetSchedule?.amount || amount,
        remaining: targetSchedule ? Math.max(0, targetSchedule.remaining - amount) : 0,
        method: cashPaymentMethod,
        paidAt: new Date().toLocaleString('fr-FR'),
        parentName: studentForCashPayment.parent_name,
        parentEmail: studentForCashPayment.parent_email,
        isPartial: targetSchedule ? (targetSchedule.remaining - amount > 0) : false,
      })

      setStudentForCashPayment(null)
      setCashPaymentAmount('')
      setCashPaymentScheduleId('')
      setCashPaymentNotes('')
    } catch (err: any) {
      // Toast géré dans le hook
    }
  }

  // ── Actions de Relance par Élève ──
  const triggerWhatsAppReminder = (rem: OverdueScheduleReminder) => {
    const schoolName = (profile?.tenants as any)?.name || 'notre établissement scolaire'
    const formattedDate = new Date(rem.due_date).toLocaleDateString('fr-FR')
    const parentGreeting = rem.parent_name ? `Bonjour M./Mme ${rem.parent_name}` : 'Bonjour'

    const message = `${parentGreeting},\n\nL'établissement ${schoolName} vous rappelle que l'échéance *${rem.schedule_title}* pour votre enfant *${rem.student_name}* (${rem.class_name}) présente un reliquat restant de *${rem.remaining_amount.toLocaleString('fr-FR')} FCFA* (Date limite : ${formattedDate}).\n\nNous vous prions de bien vouloir régulariser ce paiement au guichet de l'école ou directement en ligne.\n\nMerci de votre confiance et de votre précieuse collaboration.\n${schoolName}`

    let cleanPhone = rem.parent_phone ? rem.parent_phone.replace(/[^0-9]/g, '') : ''
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('225')) {
      cleanPhone = `225${cleanPhone}`
    }

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`

    window.open(url, '_blank')
  }

  const triggerEmailReminder = (rem: OverdueScheduleReminder) => {
    if (!rem.parent_email) {
      toast.error("Aucune adresse email enregistrée pour ce parent.")
      return
    }
    const schoolName = (profile?.tenants as any)?.name || 'notre établissement scolaire'
    const formattedDate = new Date(rem.due_date).toLocaleDateString('fr-FR')
    const parentGreeting = rem.parent_name ? `Bonjour M./Mme ${rem.parent_name}` : 'Bonjour'

    const subject = `Rappel d'échéance de scolarité — ${rem.student_name} (${rem.class_name})`
    const body = `${parentGreeting},\n\nL'établissement ${schoolName} vous rappelle que l'échéance "${rem.schedule_title}" pour votre enfant ${rem.student_name} (${rem.class_name}) d'un montant de ${rem.remaining_amount.toLocaleString('fr-FR')} FCFA est échue depuis le ${formattedDate}.\n\nNous vous remercions de bien vouloir régulariser au guichet de l'établissement ou en ligne via notre plateforme Eurêka.\n\nCordialement,\nLe Service Comptabilité & Caisse\n${schoolName}`

    window.open(`mailto:${rem.parent_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  }

  const triggerInAppReminder = async (rem: OverdueScheduleReminder) => {
    if (!rem.responsible_id) {
      toast.error("Ce parent n'a pas encore de compte Eurêka lié. Utilisez la relance WhatsApp ou Email.")
      return
    }
    await accounting.sendInAppReminder({
      responsibleId: rem.responsible_id,
      studentName: rem.student_name,
      className: rem.class_name,
      scheduleTitle: rem.schedule_title,
      remaining: rem.remaining_amount,
      dueDate: rem.due_date,
    })
  }

  // Relance groupée par notification in-app
  const handleBulkInAppReminders = async () => {
    const targets = filteredReminders.filter(r => r.responsible_id && r.days_overdue > 0)
    if (targets.length === 0) {
      toast.info("Aucun parent avec compte Eurêka à relancer parmi la sélection.")
      return
    }
    if (!confirm(`Envoyer une notification de rappel Eurêka à ${targets.length} parent(s) en retard ?`)) return

    let successCount = 0
    for (const r of targets) {
      try {
        await accounting.sendInAppReminder({
          responsibleId: r.responsible_id!,
          studentName: r.student_name,
          className: r.class_name,
          scheduleTitle: r.schedule_title,
          remaining: r.remaining_amount,
          dueDate: r.due_date,
        })
        successCount++
      } catch (e) {
        // continue
      }
    }
    toast.success(`${successCount} notification(s) de relance envoyée(s) aux parents avec succès !`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VUE 1 : COMPTABILITÉ & CAISSE ÉTABLISSEMENT (Staff)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isStaff && activeStaffView === 'accounting') {
    return (
      <AppShell
        title="Comptabilité, Caisse & Recouvrement"
        subtitle="Gestion individualisée des comptes élèves, encaissements et relances des parents par échéance."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => accounting.refetchAll()}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Actualiser
            </Button>
            {isParent && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveStaffView('family')}
                className="gap-1.5 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              >
                <User className="w-3.5 h-3.5" /> Espace Famille
              </Button>
            )}
          </div>
        }
      >
        {/* ── KPI Financiers Globaux ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold uppercase">Total Facturé</span>
              <FileText className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {accounting.stats.totalDueGlobal.toLocaleString('fr-FR')} <span className="text-xs font-normal text-muted-foreground">FCFA</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{accounting.stats.studentsCount} élève(s) suivi(s)</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold uppercase">Encaissé (Total)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-emerald-600">
              {accounting.stats.totalCollectedAllTime.toLocaleString('fr-FR')} <span className="text-xs font-normal text-muted-foreground">FCFA</span>
            </p>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              Taux : {accounting.stats.overallRecoveryRate}% recouvré
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold uppercase">Créances Restantes</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-lg font-bold text-amber-600">
              {accounting.stats.totalRemainingGlobal.toLocaleString('fr-FR')} <span className="text-xs font-normal text-muted-foreground">FCFA</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Solde total à percevoir</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold uppercase">Échéances en retard</span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-lg font-bold text-red-600">
              {accounting.stats.overdueCount}
            </p>
            <p className="text-[11px] text-red-700 font-semibold mt-0.5">
              {accounting.stats.lateStudentsCount} élève(s) en impayé
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-sm col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold uppercase">Caisse du Jour</span>
              <Banknote className="w-4 h-4 text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {accounting.stats.todayTotal.toLocaleString('fr-FR')} <span className="text-xs font-normal text-muted-foreground">FCFA</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Encaissements aujourd'hui</p>
          </div>
        </div>

        {/* ── Navigation Principale par Onglets ── */}
        <Tabs value={accountingTab} onValueChange={(val: any) => setAccountingTab(val)} className="space-y-4">
          <TabsList className="bg-slate-100 p-1 rounded-xl w-full sm:w-auto flex flex-wrap h-auto gap-1">
            <TabsTrigger value="students" className="gap-2 text-xs font-bold py-2 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Users className="w-4 h-4" />
              Comptes Élèves & Inscriptions ({accounting.studentsLedger.length})
            </TabsTrigger>
            <TabsTrigger value="reminders" className="gap-2 text-xs font-bold py-2 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm relative">
              <BellRing className="w-4 h-4 text-red-500" />
              Échéances & Relances Parents
              {accounting.stats.overdueCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-red-600 text-white rounded-full font-bold">
                  {accounting.stats.overdueCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="cash" className="gap-2 text-xs font-bold py-2 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Banknote className="w-4 h-4 text-emerald-600" />
              Journal de Caisse ({accounting.cashTransactions.length})
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════════════════
              ONGLET 1 : COMPTES ÉLÈVES & INSCRIPTIONS (GRAND LIVRE DISSOCIÉ)
              ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="students" className="space-y-4">
            {/* Barre de Recherche et Filtres */}
            <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  <Input
                    placeholder="Rechercher élève, matricule, parent ou téléphone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="Toutes classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes classes</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="Tous statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="up_to_date">En règle (Soldé)</SelectItem>
                    <SelectItem value="partial">Partiel</SelectItem>
                    <SelectItem value="late">En retard (Impayé)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <span className="text-xs text-muted-foreground">
                <strong>{filteredStudentsLedger.length}</strong> élève(s) affiché(s)
              </span>
            </div>

            {/* Tableau des Comptes Élèves */}
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/70 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Élève & Matricule</th>
                      <th className="py-3 px-3">Classe</th>
                      <th className="py-3 px-3">Parent Responsable</th>
                      <th className="py-3 px-3 text-right">Inscription</th>
                      <th className="py-3 px-3 text-right">Total Dû</th>
                      <th className="py-3 px-3 text-right">Réglé</th>
                      <th className="py-3 px-3 text-right">Reste à payer</th>
                      <th className="py-3 px-3 text-center">Statut</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStudentsLedger.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-muted-foreground">
                          Aucun compte élève ne correspond aux critères de recherche.
                        </td>
                      </tr>
                    ) : (
                      filteredStudentsLedger.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                {st.first_name[0]}{st.last_name[0]}
                              </div>
                              <div>
                                <p className="font-bold text-foreground text-xs">{st.first_name} {st.last_name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{st.student_code || 'ID:' + st.id.slice(0, 6)}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 font-semibold text-slate-700">
                            {st.class_name}
                          </td>

                          <td className="py-3 px-3">
                            <p className="font-medium text-foreground text-xs">{st.parent_name}</p>
                            <p className="text-[10px] text-muted-foreground">{st.parent_phone || st.parent_email || '—'}</p>
                          </td>

                          <td className="py-3 px-3 text-right">
                            {st.registration_due > 0 ? (
                              <div>
                                <span className={`font-bold ${st.registration_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                  {st.registration_paid.toLocaleString('fr-FR')} F
                                </span>
                                <span className="text-[10px] text-muted-foreground block">sur {st.registration_due.toLocaleString('fr-FR')} F</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right font-bold text-foreground">
                            {st.total_due.toLocaleString('fr-FR')} F
                          </td>

                          <td className="py-3 px-3 text-right">
                            <span className="font-bold text-emerald-600">
                              {st.total_paid.toLocaleString('fr-FR')} F
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              ({st.recovery_rate}%)
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right">
                            {st.remaining_balance > 0 ? (
                              <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                                {st.remaining_balance.toLocaleString('fr-FR')} F
                              </span>
                            ) : (
                              <span className="font-semibold text-emerald-600">0 F</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <StatusBadge status={st.overall_financial_status} />
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedStudentForDetails(st)}
                                className="h-7 px-2.5 text-[11px] gap-1 hover:bg-slate-100"
                                title="Voir la fiche financière et l'échéancier"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                Fiche
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => {
                                  setStudentForCashPayment(st);
                                  setCashPaymentAmount(st.remaining_balance > 0 ? String(st.remaining_balance) : '25000');
                                  if (st.schedules.length > 0) {
                                    const firstPending = st.schedules.find(s => s.remaining > 0);
                                    if (firstPending) {
                                      setCashPaymentScheduleId(firstPending.schedule_id);
                                      setCashPaymentAmount(String(firstPending.remaining));
                                    }
                                  }
                                }}
                                className="h-7 px-2.5 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                title="Encaisser un versement"
                              >
                                <Banknote className="w-3.5 h-3.5" />
                                Encaisser
                              </Button>
                            </div>
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
              ONGLET 2 : ÉCHÉANCES & RELANCES DES PARENTS (SUR-MESURE PAR ÉLÈVE)
              ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="reminders" className="space-y-4">
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Gestion des Relances d'Échéances par Élève</h4>
                  <p className="text-amber-800 text-[11px]">
                    Chaque relance est strictement adressée pour un élève spécifique, même si le parent en a plusieurs.
                    Relancez en 1 clic par WhatsApp, Email ou Notification directe sur le compte Eurêka du parent.
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={handleBulkInAppReminders}
                className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Relancer les parents Eurêka en retard ({filteredReminders.filter(r => r.responsible_id && r.days_overdue > 0).length})
              </Button>
            </div>

            {/* Barre de Recherche et Filtres d'Urgence */}
            <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  <Input
                    placeholder="Filtrer par nom d'élève, parent, classe..."
                    value={reminderSearch}
                    onChange={(e) => setReminderSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <Select value={reminderUrgencyFilter} onValueChange={(val: any) => setReminderUrgencyFilter(val)}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue placeholder="Niveau d'urgence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les retards & à venir</SelectItem>
                    <SelectItem value="critical">🔴 Retard critique (&gt; 15j)</SelectItem>
                    <SelectItem value="warning">🟠 Retard récent (1-15j)</SelectItem>
                    <SelectItem value="upcoming">🟡 À venir (&lt; 7j)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <span className="text-xs text-muted-foreground">
                <strong>{filteredReminders.length}</strong> échéance(s) à relancer
              </span>
            </div>

            {/* Liste des Échéances à relancer */}
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/70 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Élève concerné</th>
                      <th className="py-3 px-3">Parent à relancer</th>
                      <th className="py-3 px-3">Échéance</th>
                      <th className="py-3 px-3 text-center">Date Limite</th>
                      <th className="py-3 px-3 text-right">Reste Dû</th>
                      <th className="py-3 px-3 text-center">Retard</th>
                      <th className="py-3 px-4 text-center">Actions de Relance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredReminders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                          🎉 Aucune échéance en retard ne nécessite de relance actuellement !
                        </td>
                      </tr>
                    ) : (
                      filteredReminders.map((rem, idx) => (
                        <tr key={`${rem.student_id}-${rem.schedule_id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                                {rem.student_name[0]}
                              </div>
                              <div>
                                <p className="font-bold text-foreground text-xs">{rem.student_name}</p>
                                <p className="text-[10px] text-muted-foreground font-semibold">{rem.class_name}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <p className="font-semibold text-foreground text-xs">{rem.parent_name}</p>
                            <p className="text-[10px] text-muted-foreground">{rem.parent_phone || rem.parent_email || '—'}</p>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800">{rem.schedule_title}</span>
                            <span className="text-[10px] text-muted-foreground block">
                              Total tranche: {rem.schedule_amount.toLocaleString('fr-FR')} F
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center font-medium">
                            {new Date(rem.due_date).toLocaleDateString('fr-FR')}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                              {rem.remaining_amount.toLocaleString('fr-FR')} F
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            {rem.days_overdue > 0 ? (
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                rem.days_overdue > 15 
                                  ? 'bg-red-100 text-red-800 border border-red-300' 
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                +{rem.days_overdue} jour{rem.days_overdue > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full font-medium text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                                Dans {Math.abs(rem.days_overdue)} j
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                onClick={() => triggerWhatsAppReminder(rem)}
                                className="h-7 px-2 text-[10px] font-bold bg-[#25D366] hover:bg-[#1EBE5D] text-white gap-1"
                                title="Relancer le parent sur WhatsApp avec message prérempli"
                              >
                                <MessageCircle className="w-3.5 h-3.5 fill-white" />
                                WhatsApp
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => triggerEmailReminder(rem)}
                                disabled={!rem.parent_email}
                                className="h-7 px-2 text-[10px] gap-1 border-slate-300 hover:bg-slate-100"
                                title="Envoyer un email de relance"
                              >
                                <Mail className="w-3.5 h-3.5 text-blue-600" />
                                Email
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => triggerInAppReminder(rem)}
                                disabled={!rem.responsible_id || accounting.isSendingReminder}
                                className="h-7 px-2 text-[10px] gap-1 border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
                                title="Envoyer une notification directe sur son compte Eurêka"
                              >
                                <BellRing className="w-3.5 h-3.5 text-indigo-600" />
                                Eurêka
                              </Button>
                            </div>
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
              ONGLET 3 : JOURNAL DE CAISSE (HISTORIQUE DES ENCAISSEMENTS)
              ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="cash" className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-foreground text-sm">Journal des Règlements & Encaissements</h4>
                <p className="text-xs text-muted-foreground">Historique chronologique complet des versements enregistrés au guichet et en ligne.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-right">
                  <span className="text-[10px] text-emerald-800 uppercase font-bold block">Aujourd'hui</span>
                  <span className="text-sm font-bold text-emerald-700">{accounting.stats.todayTotal.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/70 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">N° Reçu</th>
                      <th className="py-3 px-3">Date & Heure</th>
                      <th className="py-3 px-3">Élève & Classe</th>
                      <th className="py-3 px-3">Échéance / Motif</th>
                      <th className="py-3 px-3">Mode Règlement</th>
                      <th className="py-3 px-3 text-right">Montant Encaissé</th>
                      <th className="py-3 px-4 text-center">Reçu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {accounting.cashTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                          Aucun encaissement enregistré pour le moment.
                        </td>
                      </tr>
                    ) : (
                      accounting.cashTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-primary">
                            {t.receipt_number}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {new Date(t.paid_at).toLocaleString('fr-FR', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-foreground">{t.student_name}</span>
                            <span className="text-[10px] text-muted-foreground block">{t.class_name}</span>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-800">
                            {t.schedule_title}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {t.payment_method}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600 text-sm">
                            {t.amount_paid.toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActiveReceipt({
                                receiptNumber: t.receipt_number,
                                transactionRef: t.transaction_reference,
                                studentName: t.student_name,
                                className: t.class_name,
                                schoolName: (profile?.tenants as any)?.name || 'Eurêka Établissement',
                                title: t.schedule_title || 'Scolarité',
                                amount: t.amount_paid,
                                totalDue: t.amount_paid,
                                remaining: 0,
                                method: t.payment_method,
                                paidAt: new Date(t.paid_at).toLocaleString('fr-FR'),
                                parentEmail: t.parent_email || '',
                                isPartial: false,
                              })}
                              className="h-7 px-2 text-[10px] gap-1"
                            >
                              <Printer className="w-3.5 h-3.5" /> Reçu
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ═══════════════════════════════════════════════════════════════════
            MODAL 1 : FICHE FINANCIÈRE & ÉCHÉANCIER D'UN ÉLÈVE
            ═══════════════════════════════════════════════════════════════════ */}
        <Dialog open={!!selectedStudentForDetails} onOpenChange={(open) => !open && setSelectedStudentForDetails(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            {selectedStudentForDetails && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base uppercase">
                        {selectedStudentForDetails.first_name[0]}{selectedStudentForDetails.last_name[0]}
                      </div>
                      <div>
                        <DialogTitle className="text-base font-bold text-foreground">
                          {selectedStudentForDetails.first_name} {selectedStudentForDetails.last_name}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                          Classe : <strong>{selectedStudentForDetails.class_name}</strong> · Parent : <strong>{selectedStudentForDetails.parent_name}</strong> ({selectedStudentForDetails.parent_phone || 'Sans tél'})
                        </DialogDescription>
                      </div>
                    </div>

                    <StatusBadge status={selectedStudentForDetails.overall_financial_status} />
                  </div>
                </DialogHeader>

                {/* Résumé Financier Élève */}
                <div className="grid grid-cols-3 gap-2.5 my-3 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Scolarité</span>
                    <p className="font-bold text-foreground text-sm">{selectedStudentForDetails.total_due.toLocaleString('fr-FR')} F</p>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 uppercase font-semibold">Total Réglé</span>
                    <p className="font-bold text-emerald-700 text-sm">{selectedStudentForDetails.total_paid.toLocaleString('fr-FR')} F</p>
                  </div>
                  <div className="bg-red-50 p-2.5 rounded-lg border border-red-200">
                    <span className="text-[10px] text-red-800 uppercase font-semibold">Reste à Payer</span>
                    <p className="font-bold text-red-700 text-sm">{selectedStudentForDetails.remaining_balance.toLocaleString('fr-FR')} F</p>
                  </div>
                </div>

                {/* Échéancier détaillé pour cet élève */}
                <div className="space-y-2 mt-4">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Échéancier individuel de paiement ({selectedStudentForDetails.schedules.length} tranches)
                  </h4>

                  <div className="border border-border rounded-xl overflow-hidden divide-y divide-border text-xs">
                    {selectedStudentForDetails.schedules.length === 0 ? (
                      <p className="p-4 text-center text-muted-foreground text-xs">
                        Aucune échéance configurée pour cette classe.
                      </p>
                    ) : (
                      selectedStudentForDetails.schedules.map(sc => (
                        <div key={sc.schedule_id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-xs">{sc.title}</span>
                              {sc.is_registration && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-purple-100 text-purple-700 rounded">
                                  Inscription
                                </span>
                              )}
                              {sc.is_overdue && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-red-100 text-red-700 rounded">
                                  +{sc.days_overdue}j retard
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Échéance le {new Date(sc.due_date).toLocaleDateString('fr-FR')} · Montant : {sc.amount.toLocaleString('fr-FR')} FCFA
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-bold text-foreground text-xs">{sc.total_paid.toLocaleString('fr-FR')} F</span>
                              {sc.remaining > 0 ? (
                                <span className="text-[10px] text-red-600 block font-medium">Reste : {sc.remaining.toLocaleString('fr-FR')} F</span>
                              ) : (
                                <span className="text-[10px] text-emerald-600 block font-medium">Soldé</span>
                              )}
                            </div>

                            {sc.remaining > 0 && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setStudentForCashPayment(selectedStudentForDetails);
                                  setCashPaymentScheduleId(sc.schedule_id);
                                  setCashPaymentAmount(String(sc.remaining));
                                  setSelectedStudentForDetails(null);
                                }}
                                className="h-7 px-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Encaisser
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <DialogFooter className="mt-4 pt-2 border-t border-border flex items-center justify-between sm:justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="gap-1.5 text-xs"
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimer la Fiche
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedStudentForDetails(null)}
                    className="text-xs"
                  >
                    Fermer
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════════════
            MODAL 2 : ENCAISSEMENT EN CAISSE GUICHET
            ═══════════════════════════════════════════════════════════════════ */}
        <Dialog open={!!studentForCashPayment} onOpenChange={(open) => !open && setStudentForCashPayment(null)}>
          <DialogContent className="max-w-md p-6">
            {studentForCashPayment && (
              <form onSubmit={handleCashPaymentSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-emerald-600" />
                    Encaisser un Paiement Scolaire
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Élève : <strong>{studentForCashPayment.first_name} {studentForCashPayment.last_name}</strong> ({studentForCashPayment.class_name})
                  </DialogDescription>
                </DialogHeader>

                {/* Choix de l'échéance / tranche */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Échéance / Tranche concernée *</Label>
                  <Select value={cashPaymentScheduleId} onValueChange={(val) => {
                    setCashPaymentScheduleId(val);
                    const target = studentForCashPayment.schedules.find(s => s.schedule_id === val);
                    if (target) {
                      setCashPaymentAmount(String(target.remaining > 0 ? target.remaining : target.amount));
                    }
                  }}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Sélectionner la tranche" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Paiement libre / Acompte global</SelectItem>
                      {studentForCashPayment.schedules.map(sc => (
                        <SelectItem key={sc.schedule_id} value={sc.schedule_id}>
                          {sc.title} — Reste : {sc.remaining.toLocaleString('fr-FR')} F (Total : {sc.amount.toLocaleString('fr-FR')} F)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Montant versé */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Montant versé (FCFA) *</Label>
                  <Input
                    type="number"
                    min="100"
                    step="100"
                    required
                    value={cashPaymentAmount}
                    onChange={(e) => setCashPaymentAmount(e.target.value)}
                    className="text-sm font-bold text-emerald-700 h-9"
                    placeholder="Ex: 50000"
                  />
                </div>

                {/* Mode de règlement */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Mode de règlement *</Label>
                  <Select value={cashPaymentMethod} onValueChange={setCashPaymentMethod}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Mode de paiement" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.icon} {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes / Réf chèque ou transaction */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Référence ou observations (optionnel)</Label>
                  <Input
                    value={cashPaymentNotes}
                    onChange={(e) => setCashPaymentNotes(e.target.value)}
                    className="text-xs h-9"
                    placeholder="Ex: Chèque N° 458921 ou payé par l'oncle"
                  />
                </div>

                <DialogFooter className="mt-4 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStudentForCashPayment(null)}
                    className="text-xs"
                  >
                    Annuler
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={accounting.isRecordingPayment}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                  >
                    {accounting.isRecordingPayment ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Valider & Émettre le Reçu
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════════════
            MODAL 3 : REÇU NUMÉRIQUE OFFICIEL (IMPRIMABLE)
            ═══════════════════════════════════════════════════════════════════ */}
        <Dialog open={!!activeReceipt} onOpenChange={(open) => !open && setActiveReceipt(null)}>
          <DialogContent className="max-w-md p-6 bg-white">
            {activeReceipt && (
              <div className="space-y-4">
                <DialogHeader className="text-center sm:text-center pb-3 border-b border-dashed border-border">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-1">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    {activeReceipt.schoolName}
                  </DialogTitle>
                  <p className="text-[11px] font-mono font-bold text-primary">
                    REÇU DE CAISSE : {activeReceipt.receiptNumber}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{activeReceipt.paidAt}</p>
                </DialogHeader>

                <div className="bg-slate-50 p-3 rounded-xl border border-border text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Élève :</span>
                    <strong className="text-foreground">{activeReceipt.studentName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Classe :</span>
                    <strong className="text-foreground">{activeReceipt.className}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Motif / Tranche :</span>
                    <strong className="text-foreground">{activeReceipt.title}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mode de règlement :</span>
                    <span className="font-semibold text-slate-700">{activeReceipt.method}</span>
                  </div>
                </div>

                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-emerald-800 uppercase font-bold block">Montant Perçu</span>
                  <span className="text-2xl font-bold text-emerald-700">
                    {Number(activeReceipt.amount).toLocaleString('fr-FR')} FCFA
                  </span>
                  {activeReceipt.remaining > 0 && (
                    <span className="text-[11px] text-amber-700 block font-semibold mt-1">
                      Reliquat restant à payer : {Number(activeReceipt.remaining).toLocaleString('fr-FR')} FCFA
                    </span>
                  )}
                </div>

                <div className="text-center text-[10px] text-muted-foreground pt-1">
                  Ce reçu numérique certifie l'encaissement régulier des frais scolaires dans le système Eurêka.
                </div>

                <DialogFooter className="pt-2 border-t border-border flex items-center justify-between sm:justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="gap-1.5 text-xs"
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimer le reçu
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setActiveReceipt(null)}
                    className="text-xs bg-slate-900 text-white"
                  >
                    Fermer
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AppShell>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VUE 2 : ESPACE FAMILLE / PARENT (COMPTES ENFANTS DISSOCIÉS)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <AppShell
      title="Espace Paiements Parent"
      subtitle="Comptes de scolarité individuels pour chacun de vos enfants inscrits."
      actions={
        isStaff && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveStaffView('accounting')}
            className="gap-1.5 text-xs border-primary text-primary"
          >
            <Banknote className="w-3.5 h-3.5" /> Retour Vue Comptabilité
          </Button>
        )
      }
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Rappel d'accès direct pour les parents */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Gestion Individualisée des Échéances par Enfant</h3>
              <p className="text-xs text-slate-600">
                Chaque enfant dispose de son propre compte financier, de son échéancier et de ses reçus indépendants.
                Pour gérer et payer directement les frais en ligne par Wave, Orange Money ou MTN, rendez-vous également sur votre{' '}
                <a href="/portail-parent" className="font-bold text-indigo-700 underline">Portail Parent</a>.
              </p>
            </div>
          </div>
        </div>

        {/* Liste des enfants avec compte dissocié */}
        <div className="grid gap-4 md:grid-cols-2">
          {accounting.studentsLedger
            .filter(st => st.responsible_id === user?.id || (st.parent_email && st.parent_email === user?.email))
            .map(child => (
              <div key={child.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase">
                      {child.first_name[0]}{child.last_name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{child.first_name} {child.last_name}</h4>
                      <p className="text-xs text-muted-foreground">Classe : <strong>{child.class_name}</strong></p>
                    </div>
                  </div>
                  <StatusBadge status={child.overall_financial_status} />
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-border text-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total</span>
                    <p className="font-bold text-foreground">{child.total_due.toLocaleString('fr-FR')} F</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-800 uppercase font-semibold">Payé</span>
                    <p className="font-bold text-emerald-700">{child.total_paid.toLocaleString('fr-FR')} F</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-red-800 uppercase font-semibold">Reste</span>
                    <p className="font-bold text-red-700">{child.remaining_balance.toLocaleString('fr-FR')} F</p>
                  </div>
                </div>

                {/* Échéances */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-foreground">Échéances de scolarité :</span>
                  <div className="divide-y divide-border border border-border rounded-xl overflow-hidden text-xs">
                    {child.schedules.map(sc => (
                      <div key={sc.schedule_id} className="p-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{sc.title}</p>
                          <p className="text-[10px] text-muted-foreground">Date limite : {new Date(sc.due_date).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div className="text-right">
                          <span className={`font-bold ${sc.remaining === 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                            {sc.remaining === 0 ? 'Réglé' : `${sc.remaining.toLocaleString('fr-FR')} F`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href="/portail-parent"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs py-2.5 shadow-sm"
                  >
                    <CreditCard className="w-4 h-4" /> Payer en ligne (Wave, Orange, MTN, Carte)
                  </a>
                </div>
              </div>
            ))}
        </div>
      </div>
    </AppShell>
  )
}
