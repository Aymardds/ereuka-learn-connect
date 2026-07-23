import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/AppShell'
import {
  CreditCard, Smartphone, CheckCircle2, FileText, Download, Printer,
  Loader2, Calendar, User, Mail, Clock, ArrowRight, AlertCircle,
  RefreshCw, BadgePercent, ChevronDown, Banknote, School
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
  component: ParentPaymentPage,
})

// ─── Payment Methods ─────────────────────────────────────────────────────────
const paymentMethods = [
  { id: 'wave',       name: 'Wave Mobile Money',           icon: '🌊', color: 'bg-cyan-500' },
  { id: 'orange',     name: 'Orange Money',                icon: '🍊', color: 'bg-orange-500' },
  { id: 'mtn',        name: 'MTN Mobile Money',            icon: '🟡', color: 'bg-yellow-400' },
  { id: 'moov',       name: 'Moov Money',                  icon: '🔹', color: 'bg-blue-600' },
  { id: 'card',       name: 'Carte Bancaire (Visa/MC)',    icon: '💳', color: 'bg-slate-800' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function genReceiptNumber() {
  const y = new Date().getFullYear()
  return `REC-${y}-${Math.floor(10000 + Math.random() * 90000)}`
}
function genTxRef(method: string) {
  const prefix = { wave: 'WV', orange: 'OM', mtn: 'MTN', moov: 'MV', card: 'CB' }[method] || 'TX'
  return `${prefix}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'paid' | 'partial' | 'pending' }) {
  if (status === 'paid') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
      <CheckCircle2 className="w-3.5 h-3.5" /> PAYÉ
    </span>
  )
  if (status === 'partial') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
      <BadgePercent className="w-3.5 h-3.5" /> PARTIEL
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
      <Clock className="w-3.5 h-3.5" /> À PAYER
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
function ParentPaymentPage() {
  const queryClient = useQueryClient()

  // ── UI state
  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [selectedMethod, setSelectedMethod] = useState<string>('wave')
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [parentEmail, setParentEmail] = useState<string>('')
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [isPartial, setIsPartial] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeReceipt, setActiveReceipt] = useState<any>(null)

  // ── Fetch current user
  const userQuery = useQuery({
    queryKey: ['current_user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw new Error('Non authentifié')
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, tenant_id, role, tenants(name)')
        .eq('id', user.id)
        .single()
      return profile
    }
  })

  const schoolName = (userQuery.data?.tenants as any)?.name || 'Votre Établissement'
  const parentEmailFromDB = userQuery.data?.email || ''

  // ── Fetch children of this parent (responsible_id = auth.uid)
  const childrenQuery = useQuery({
    queryKey: ['my_children'],
    enabled: !!userQuery.data,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, class_id, classes(name)')
        .eq('responsible_id', userQuery.data!.id)
        .order('last_name')
      if (error) throw error
      return data || []
    },
    onSuccess: (data: any[]) => {
      if (data.length > 0 && !selectedChildId) {
        setSelectedChildId(data[0].id)
      }
      if (userQuery.data?.email) setParentEmail(userQuery.data.email)
    }
  } as any)

  const children = (childrenQuery.data as any[]) || []
  const selectedChild = children.find((c: any) => c.id === selectedChildId)

  // ── Fetch payment summary for selected child
  const paymentSummaryQuery = useQuery({
    queryKey: ['payment_summary', selectedChildId],
    enabled: !!selectedChildId,
    queryFn: async () => {
      // Use the view created in migration 00012
      const { data, error } = await supabase
        .from('v_student_payment_summary')
        .select('*')
        .eq('student_id', selectedChildId)
        .order('due_date', { ascending: true })
      if (error) {
        // Fallback: fetch schedules + payments manually if view not yet applied
        const { data: schedules, error: sErr } = await supabase
          .from('payment_schedules')
          .select('id, title, amount, due_date, class_id, classes(name)')
          .order('due_date', { ascending: true })
        if (sErr) throw sErr

        const { data: payments } = await supabase
          .from('student_payments')
          .select('schedule_id, amount_paid, receipt_number, paid_at, payment_method')
          .eq('student_id', selectedChildId)

        return (schedules || []).map((s: any) => {
          const paid = (payments || [])
            .filter((p: any) => p.schedule_id === s.id)
            .reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0)
          const lastPay = (payments || [])
            .filter((p: any) => p.schedule_id === s.id)
            .sort((a: any, b: any) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())[0]
          return {
            schedule_id: s.id,
            schedule_title: s.title,
            schedule_amount: s.amount,
            due_date: s.due_date,
            total_paid: paid,
            remaining: Number(s.amount) - paid,
            payment_status: paid === 0 ? 'pending' : paid < Number(s.amount) ? 'partial' : 'paid',
            last_payment_at: lastPay?.paid_at || null,
            last_receipt_number: lastPay?.receipt_number || null,
          }
        })
      }
      return data || []
    }
  })

  const summary = (paymentSummaryQuery.data as any[]) || []
  const pendingItems = summary.filter(s => s.payment_status !== 'paid')
  const paidItems = summary.filter(s => s.payment_status === 'paid')
  const totalDue = summary.reduce((sum, s) => sum + Number(s.schedule_amount), 0)
  const totalPaid = summary.reduce((sum, s) => sum + Number(s.total_paid), 0)
  const totalRemaining = totalDue - totalPaid

  // ── Open payment modal
  const openPayment = (scheduleItem: any) => {
    setSelectedSchedule(scheduleItem)
    setPaymentAmount(String(scheduleItem.remaining))
    setIsPartial(false)
    if (parentEmailFromDB) setParentEmail(parentEmailFromDB)
  }

  // ── Handle Payment Execution (writes to student_payments)
  const handlePayment = async () => {
    if (!selectedSchedule || !selectedChild) return
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Montant invalide")
      return
    }
    if (amount > selectedSchedule.remaining) {
      toast.error(`Le montant ne peut pas dépasser le reliquat (${selectedSchedule.remaining.toLocaleString('fr-FR')} FCFA)`)
      return
    }

    setIsProcessing(true)

    const receiptNo = genReceiptNumber()
    const txRef = genTxRef(selectedMethod)
    const methodObj = paymentMethods.find(m => m.id === selectedMethod)

    const { error } = await supabase.from('student_payments').insert({
      tenant_id: userQuery.data?.tenant_id,
      student_id: selectedChildId,
      schedule_id: selectedSchedule.schedule_id,
      amount_paid: amount,
      payment_method: methodObj?.name || selectedMethod,
      transaction_reference: txRef,
      receipt_number: receiptNo,
      parent_email: parentEmail,
      phone_number: phoneNumber,
    })

    setIsProcessing(false)

    if (error) {
      toast.error(error.message || "Erreur lors de l'enregistrement du paiement")
      return
    }

    // Build receipt
    const receipt = {
      receiptNumber: receiptNo,
      transactionRef: txRef,
      studentName: `${selectedChild.first_name} ${selectedChild.last_name}`,
      className: (selectedChild.classes as any)?.name || '—',
      schoolName,
      title: selectedSchedule.schedule_title,
      amount,
      totalDue: selectedSchedule.schedule_amount,
      remaining: selectedSchedule.remaining - amount,
      method: methodObj?.name,
      paidAt: new Date().toLocaleString('fr-FR'),
      parentEmail,
      isPartial: amount < selectedSchedule.remaining,
    }

    queryClient.invalidateQueries({ queryKey: ['payment_summary', selectedChildId] })
    setSelectedSchedule(null)
    setActiveReceipt(receipt)
    toast.success("Paiement enregistré ! Votre reçu numérique est disponible.")
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AppShell
      title="Espace Paiements"
      subtitle="Consultez les échéances de scolarité et réglez les frais de votre enfant."
    >
      <div className="space-y-8 max-w-5xl mx-auto">

        {/* Loading user */}
        {userQuery.isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="ml-3 text-gray-500">Chargement de votre espace...</span>
          </div>
        )}

        {/* Error */}
        {userQuery.isError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Erreur de connexion</p>
              <p className="text-sm text-red-600 mt-1">{(userQuery.error as any)?.message}</p>
            </div>
          </div>
        )}

        {userQuery.data && (
          <>
            {/* No children linked yet */}
            {!childrenQuery.isLoading && children.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <School className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="font-bold text-gray-700 text-lg">Aucun élève associé à votre compte</h3>
                <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
                  Dès que l'établissement inscrit votre enfant et vous associe comme parent responsable,
                  vous verrez ici son dossier et l'échéancier de paiement.
                </p>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['my_children'] })}
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
                </Button>
              </div>
            )}

            {children.length > 0 && (
              <>
                {/* Child Selector + Profile Card */}
                <div className="bg-gradient-to-r from-emerald-900 to-emerald-950 text-white rounded-2xl p-6 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center border border-white/20">
                        <User className="w-7 h-7" />
                      </div>
                      <div>
                        {children.length > 1 ? (
                          <div className="mb-1">
                            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm font-semibold w-auto pr-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {children.map((c: any) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.first_name} {c.last_name} — {(c.classes as any)?.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
                              {(selectedChild?.classes as any)?.name}
                            </span>
                            <h2 className="text-2xl font-bold mt-0.5">
                              {selectedChild?.first_name} {selectedChild?.last_name}
                            </h2>
                          </div>
                        )}
                        <p className="text-xs text-emerald-200/80 mt-0.5">{schoolName}</p>
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 text-center">
                        <div className="text-[10px] text-emerald-200 uppercase font-semibold">Total dû</div>
                        <div className="text-sm font-bold mt-0.5">{totalDue.toLocaleString('fr-FR')} F</div>
                      </div>
                      <div className="bg-emerald-600/40 backdrop-blur-md p-3 rounded-xl border border-emerald-500/30 text-center">
                        <div className="text-[10px] text-emerald-200 uppercase font-semibold">Payé</div>
                        <div className="text-sm font-bold mt-0.5">{totalPaid.toLocaleString('fr-FR')} F</div>
                      </div>
                      <div className={`backdrop-blur-md p-3 rounded-xl border text-center ${totalRemaining > 0 ? 'bg-amber-500/20 border-amber-400/30' : 'bg-white/10 border-white/10'}`}>
                        <div className="text-[10px] text-emerald-200 uppercase font-semibold">Reliquat</div>
                        <div className={`text-sm font-bold mt-0.5 ${totalRemaining > 0 ? 'text-amber-300' : 'text-white'}`}>
                          {totalRemaining.toLocaleString('fr-FR')} F
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Loading summary */}
                {paymentSummaryQuery.isLoading && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="ml-2 text-gray-500 text-sm">Chargement de l'échéancier...</span>
                  </div>
                )}

                {paymentSummaryQuery.isError && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-700">{(paymentSummaryQuery.error as any)?.message}</p>
                    <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['payment_summary'] })}>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}

                {/* Tabs */}
                {!paymentSummaryQuery.isLoading && summary.length > 0 && (
                  <Tabs defaultValue="due" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl">
                      <TabsTrigger value="due" className="rounded-lg font-medium">
                        Échéances ({pendingItems.length} à régler)
                      </TabsTrigger>
                      <TabsTrigger value="history" className="rounded-lg font-medium">
                        Historique des Paiements ({paidItems.length})
                      </TabsTrigger>
                    </TabsList>

                    {/* TAB 1: Échéances */}
                    <TabsContent value="due" className="mt-6 space-y-4">
                      {summary.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border">
                          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-300" />
                          <p>Aucune échéance disponible pour le moment.</p>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {summary.map((item: any) => {
                            const status = item.payment_status as 'paid' | 'partial' | 'pending'
                            const isPaid = status === 'paid'
                            const isPartialPaid = status === 'partial'
                            const progressPct = Math.min(100, Math.round((Number(item.total_paid) / Number(item.schedule_amount)) * 100))

                            return (
                              <div
                                key={item.schedule_id}
                                className={`bg-white rounded-2xl border p-6 flex flex-col gap-4 transition-all ${
                                  isPaid
                                    ? 'border-emerald-200 bg-emerald-50/20'
                                    : isPartialPaid
                                    ? 'border-blue-200 bg-blue-50/10'
                                    : 'border-gray-200 hover:border-gray-300 shadow-sm'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <StatusBadge status={status} />
                                      <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Limite : {new Date(item.due_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                      </span>
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900">{item.schedule_title}</h3>
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                                    <div className="text-right">
                                      <div className="text-2xl font-bold text-gray-900">
                                        {Number(item.schedule_amount).toLocaleString('fr-FR')}
                                        <span className="text-xs font-normal ml-1">FCFA</span>
                                      </div>
                                      {isPartialPaid && (
                                        <div className="text-xs text-blue-600 font-semibold">
                                          Reliquat : {Number(item.remaining).toLocaleString('fr-FR')} FCFA
                                        </div>
                                      )}
                                    </div>

                                    {!isPaid ? (
                                      <Button
                                        className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 shrink-0"
                                        onClick={() => openPayment(item)}
                                      >
                                        {isPartialPaid ? 'Compléter' : 'Payer'} <ArrowRight className="w-4 h-4" />
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 shrink-0"
                                        onClick={() => setActiveReceipt({
                                          receiptNumber: item.last_receipt_number,
                                          transactionRef: '—',
                                          studentName: `${selectedChild?.first_name} ${selectedChild?.last_name}`,
                                          className: (selectedChild?.classes as any)?.name || '—',
                                          schoolName,
                                          title: item.schedule_title,
                                          amount: item.schedule_amount,
                                          totalDue: item.schedule_amount,
                                          remaining: 0,
                                          method: '—',
                                          paidAt: item.last_payment_at ? new Date(item.last_payment_at).toLocaleString('fr-FR') : '—',
                                          parentEmail,
                                          isPartial: false,
                                        })}
                                      >
                                        <FileText className="w-4 h-4" /> Reçu
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {/* Progress bar for partial */}
                                {(isPartialPaid || isPaid) && (
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-gray-500">
                                      <span>Payé : {Number(item.total_paid).toLocaleString('fr-FR')} FCFA</span>
                                      <span>{progressPct}%</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${isPaid ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                        style={{ width: `${progressPct}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* TAB 2: Historique */}
                    <TabsContent value="history" className="mt-6 space-y-4">
                      {paidItems.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border text-gray-400">
                          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>Aucun paiement enregistré pour l'instant.</p>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {paidItems.map((item: any) => (
                            <div key={item.schedule_id} className="bg-white p-5 rounded-2xl border flex items-center justify-between gap-4 hover:shadow-sm transition-shadow">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                                  <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="font-mono text-xs text-gray-400 font-semibold">{item.last_receipt_number}</div>
                                  <h4 className="font-bold text-gray-900 text-base">{item.schedule_title}</h4>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {item.last_payment_at ? new Date(item.last_payment_at).toLocaleDateString('fr-FR') : '—'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 shrink-0">
                                <div className="text-right font-bold text-gray-900 text-lg">
                                  {Number(item.schedule_amount).toLocaleString('fr-FR')} FCFA
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setActiveReceipt({
                                    receiptNumber: item.last_receipt_number,
                                    transactionRef: '—',
                                    studentName: `${selectedChild?.first_name} ${selectedChild?.last_name}`,
                                    className: (selectedChild?.classes as any)?.name || '—',
                                    schoolName,
                                    title: item.schedule_title,
                                    amount: item.schedule_amount,
                                    totalDue: item.schedule_amount,
                                    remaining: 0,
                                    method: '—',
                                    paidAt: item.last_payment_at ? new Date(item.last_payment_at).toLocaleString('fr-FR') : '—',
                                    parentEmail,
                                    isPartial: false,
                                  })}
                                >
                                  <Download className="w-4 h-4 mr-1.5" /> Reçu
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}

                {/* Empty schedule state */}
                {!paymentSummaryQuery.isLoading && summary.length === 0 && !paymentSummaryQuery.isError && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed text-gray-400">
                    <Banknote className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="font-medium">Aucun échéancier de paiement défini pour le moment.</p>
                    <p className="text-xs mt-1">L'établissement n'a pas encore configuré les tranches de scolarité.</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── MODAL 1: Checkout ─────────────────────────────────────── */}
        <Dialog open={!!selectedSchedule} onOpenChange={(open) => !open && setSelectedSchedule(null)}>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <CreditCard className="w-6 h-6 text-emerald-600" /> Règlement de scolarité
              </DialogTitle>
              <DialogDescription>
                {selectedSchedule?.schedule_title}
              </DialogDescription>
            </DialogHeader>

            {/* Amount Summary */}
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-1">
              <div className="flex justify-between text-xs text-emerald-700 font-semibold uppercase">
                <span>Montant total de l'échéance</span>
                <span>{Number(selectedSchedule?.schedule_amount).toLocaleString('fr-FR')} FCFA</span>
              </div>
              {selectedSchedule && Number(selectedSchedule.total_paid) > 0 && (
                <div className="flex justify-between text-xs text-blue-600">
                  <span>Déjà payé</span>
                  <span>- {Number(selectedSchedule.total_paid).toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-950 font-extrabold text-xl pt-1 border-t border-emerald-200 mt-1">
                <span>Reliquat à régler</span>
                <span>{Number(selectedSchedule?.remaining).toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>

            {/* Partial payment toggle */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsPartial(!isPartial)
                    if (!isPartial) setPaymentAmount('')
                    else setPaymentAmount(String(selectedSchedule?.remaining || ''))
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPartial ? 'bg-blue-500' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPartial ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <Label className="text-sm font-medium cursor-pointer" onClick={() => setIsPartial(p => !p)}>
                  Paiement partiel
                </Label>
                <span className="text-xs text-gray-400">(Verser un montant inférieur)</span>
              </div>

              {isPartial && (
                <div className="grid gap-1.5">
                  <Label htmlFor="partialAmt" className="text-xs">Montant à verser (FCFA)</Label>
                  <Input
                    id="partialAmt"
                    type="number"
                    min="1"
                    max={selectedSchedule?.remaining}
                    placeholder={`Max : ${Number(selectedSchedule?.remaining).toLocaleString('fr-FR')}`}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="text-lg font-bold"
                  />
                  {paymentAmount && parseFloat(paymentAmount) < Number(selectedSchedule?.remaining) && (
                    <p className="text-xs text-blue-600">
                      Reliquat après ce paiement : {(Number(selectedSchedule?.remaining) - parseFloat(paymentAmount)).toLocaleString('fr-FR')} FCFA
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Moyen de paiement *</Label>
              <div className="grid grid-cols-1 gap-2">
                {paymentMethods.map(method => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedMethod === method.id
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{method.icon}</span>
                      <span className="font-semibold text-sm text-gray-900">{method.name}</span>
                    </div>
                    {selectedMethod === method.id && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="phone" className="text-xs">Numéro Mobile Money</Label>
                <Input id="phone" placeholder="07 00 00 00 00" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email" className="text-xs">Email pour le reçu</Label>
                <Input id="email" type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} />
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setSelectedSchedule(null)}>Annuler</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={handlePayment}
                disabled={isProcessing || !paymentAmount || parseFloat(paymentAmount) <= 0}
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Validation en cours...</>
                ) : (
                  `Confirmer — ${parseFloat(paymentAmount || '0').toLocaleString('fr-FR')} FCFA`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── MODAL 2: Digital Receipt ──────────────────────────────── */}
        <Dialog open={!!activeReceipt} onOpenChange={(open) => !open && setActiveReceipt(null)}>
          <DialogContent className="sm:max-w-[600px] bg-white p-8 border shadow-2xl rounded-2xl">
            {activeReceipt && (
              <div className="space-y-6">

                {/* Email Notice */}
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Une copie a été envoyée par mail à <strong>{activeReceipt.parentEmail}</strong>.</span>
                </div>

                {/* Partial warning */}
                {activeReceipt.isPartial && activeReceipt.remaining > 0 && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl text-xs flex items-center gap-2">
                    <BadgePercent className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>
                      Paiement partiel enregistré. Reliquat restant : <strong>{Number(activeReceipt.remaining).toLocaleString('fr-FR')} FCFA</strong>
                    </span>
                  </div>
                )}

                {/* Printable Area */}
                <div className="border-2 border-dashed border-gray-300 p-6 rounded-xl space-y-6 bg-gray-50/50 relative overflow-hidden">

                  {/* Stamp */}
                  <div className={`absolute top-12 right-6 transform rotate-12 border-4 font-extrabold text-2xl tracking-widest px-4 py-1.5 rounded-lg opacity-80 select-none ${
                    activeReceipt.isPartial
                      ? 'border-blue-500 text-blue-500'
                      : 'border-emerald-600 text-emerald-600'
                  }`}>
                    {activeReceipt.isPartial ? 'PARTIEL' : 'PAYÉ / VALIDÉ'}
                  </div>

                  {/* Header */}
                  <div className="flex items-center gap-3 border-b pb-4">
                    <div className="w-10 h-10 bg-emerald-900 text-white font-bold rounded-xl flex items-center justify-center text-lg">E</div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 leading-none">{activeReceipt.schoolName}</h3>
                      <p className="text-xs text-gray-500 mt-1">Plateforme Officielle Ereuka Learn & Connect</p>
                    </div>
                  </div>

                  {/* Receipt No + Date */}
                  <div className="grid grid-cols-2 gap-4 text-xs border-b pb-4">
                    <div>
                      <span className="text-gray-400 uppercase tracking-wider block">Numéro de reçu</span>
                      <span className="font-mono font-bold text-sm text-gray-900">{activeReceipt.receiptNumber}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 uppercase tracking-wider block">Date & Heure</span>
                      <span className="font-semibold text-gray-800">{activeReceipt.paidAt}</span>
                    </div>
                  </div>

                  {/* Student Details */}
                  <div className="grid grid-cols-2 gap-4 text-xs border-b pb-4">
                    <div>
                      <span className="text-gray-400 uppercase block">Élève</span>
                      <span className="font-bold text-gray-900 text-sm">{activeReceipt.studentName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 uppercase block">Classe</span>
                      <span className="font-semibold text-gray-800">{activeReceipt.className}</span>
                    </div>
                  </div>

                  {/* Itemized */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-400 uppercase border-b pb-1 font-semibold">
                      <span>Désignation</span>
                      <span>Montant</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1">
                      <span>{activeReceipt.title}</span>
                      <span>{Number(activeReceipt.amount).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    {activeReceipt.isPartial && (
                      <div className="flex justify-between text-xs text-blue-600">
                        <span>Total échéance</span>
                        <span>{Number(activeReceipt.totalDue).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Method + Total */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center mt-4">
                    <div>
                      <span className="text-xs text-gray-500 block">Mode de règlement</span>
                      <span className="font-semibold text-xs text-gray-900">{activeReceipt.method}</span>
                      <span className="text-[10px] text-gray-400 block font-mono">Ref: {activeReceipt.transactionRef}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-emerald-700 font-bold block uppercase">
                        {activeReceipt.isPartial ? 'Versement Partiel' : 'Total Réglé'}
                      </span>
                      <span className="text-2xl font-extrabold text-gray-900">
                        {Number(activeReceipt.amount).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <DialogFooter className="flex sm:justify-between gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
                    <Printer className="w-4 h-4" /> Imprimer
                  </Button>
                  <Button size="sm" onClick={() => setActiveReceipt(null)} className="bg-emerald-700 hover:bg-emerald-800">
                    Fermer
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </AppShell>
  )
}
