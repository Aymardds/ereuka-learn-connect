import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/AppShell'
import { 
  Plus, Calendar, BookOpen, Trash2, CheckCircle2,
  Table, LayoutGrid, AlertTriangle, Sparkles, Pencil,
  AlertCircle, Loader2, Building2, RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export const Route = createFileRoute('/modalites')({
  component: ModalitesPage,
})

// Grille tarifaire dynamique calculée à partir des données réelles de l'établissement

function ModalitesPage() {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'matrix' | 'cards'>('matrix')
  const [confirmPreset, setConfirmPreset] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Create Form State
  const [title, setTitle] = useState('')
  const [selectedClassId, setSelectedClassId] = useState<string>('all')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')

  // Edit Form State
  const [editingSchedule, setEditingSchedule] = useState<any>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editClassId, setEditClassId] = useState<string>('all')
  const [editAmount, setEditAmount] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // Fetch tenant info (real school name)
  const tenantQuery = useQuery({
    queryKey: ['tenant_info'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')
      const { data, error } = await supabase
        .from('user_profiles')
        .select('tenant_id, tenants(id, name)')
        .eq('id', user.id)
        .single()
      if (error) throw error
      return data
    }
  })

  const schoolName = (tenantQuery.data?.tenants as any)?.name || 'Votre Établissement'

  // Fetch Classes
  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*').order('name')
      if (error) throw error
      return data || []
    }
  })

  // Fetch Payment Schedules (real data only)
  const schedulesQuery = useQuery({
    queryKey: ['payment_schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_schedules')
        .select('*, classes(name)')
        .order('due_date', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  const schedules = schedulesQuery.data || []
  const hasSchedules = schedules.length > 0

  // Create Schedule Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) throw new Error("Établissement introuvable. Vérifiez votre compte.")

      const { error } = await supabase.from('payment_schedules').insert([{
        tenant_id: profile.tenant_id,
        class_id: selectedClassId === 'all' ? null : selectedClassId,
        title,
        amount: parseFloat(amount),
        due_date: dueDate,
        description: description || null,
      }])

      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Échéance créée avec succès")
      queryClient.invalidateQueries({ queryKey: ['payment_schedules'] })
      resetForm()
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la création")
    }
  })

  // Update Schedule Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingSchedule) throw new Error("Aucune échéance sélectionnée")
      const { error } = await supabase.from('payment_schedules').update({
        title: editTitle,
        class_id: editClassId === 'all' ? null : editClassId,
        amount: parseFloat(editAmount),
        due_date: editDueDate,
        description: editDescription || null,
      }).eq('id', editingSchedule.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Échéance mise à jour avec succès")
      queryClient.invalidateQueries({ queryKey: ['payment_schedules'] })
      setEditingSchedule(null)
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la mise à jour")
    }
  })

  // Delete Schedule Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payment_schedules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Échéance supprimée")
      queryClient.invalidateQueries({ queryKey: ['payment_schedules'] })
      setDeleteConfirmId(null)
    },
    onError: (err: any) => {
      toast.error(err.message || "Impossible de supprimer (des paiements existent pour cette échéance)")
    }
  })

  // Apply Matrix Preset — protected against duplicates
  const applyPresetMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) throw new Error("Établissement introuvable.")

      const year = new Date().getFullYear()

      const standardPreset = [
        { title: 'Frais d\'inscription & Réinscription', amount: 25000, due_date: `${year}-09-15`, description: 'Frais d\'inscriptions pour l\'année académique' },
        { title: '1ère Tranche — Scolarité T1', amount: 30000, due_date: `${year}-10-05`, description: 'Paiement avant le démarrage du 1er trimestre' },
        { title: '2ème Tranche — Scolarité T2', amount: 25000, due_date: `${year}-12-05`, description: 'Paiement de la 2ème tranche' },
        { title: '3ème Tranche — Scolarité T3', amount: 25000, due_date: `${year + 1}-02-05`, description: 'Solde de la scolarité de l\'année' },
      ]

      const toInsert = standardPreset.map(item => ({
        tenant_id: profile.tenant_id,
        title: item.title,
        amount: item.amount,
        due_date: item.due_date,
        description: item.description,
      }))

      const { error } = await supabase.from('payment_schedules').insert(toInsert)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Grille tarifaire officielle appliquée avec succès !")
      queryClient.invalidateQueries({ queryKey: ['payment_schedules'] })
      setConfirmPreset(false)
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'application de la grille")
      setConfirmPreset(false)
    }
  })

  const openEdit = (schedule: any) => {
    setEditingSchedule(schedule)
    setEditTitle(schedule.title)
    setEditClassId(schedule.class_id || 'all')
    setEditAmount(String(schedule.amount))
    setEditDueDate(schedule.due_date)
    setEditDescription(schedule.description || '')
  }

  const resetForm = () => {
    setTitle('')
    setSelectedClassId('all')
    setAmount('')
    setDueDate('')
    setDescription('')
    setIsOpen(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  const totalScolarite = schedules.reduce((sum: number, s: any) => sum + Number(s.amount), 0)

  return (
    <AppShell
      title="Modalités & Scolarité"
      subtitle={`Grille tarifaire et échéancier de paiement — ${schoolName}`}
      actions={
        <div className="flex items-center gap-2">
          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['payment_schedules'] })}
            className="text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          {/* Apply Preset */}
          <Button
            variant="outline"
            className="gap-2 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
            onClick={() => hasSchedules ? setConfirmPreset(true) : applyPresetMutation.mutate()}
            disabled={applyPresetMutation.isPending}
          >
            <Sparkles className="w-4 h-4" />
            {applyPresetMutation.isPending ? 'Application...' : 'Grille Officielle'}
          </Button>

          {/* Create */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary">
                <Plus className="w-4 h-4" /> Ajouter une Échéance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Nouvelle Échéance de Paiement</DialogTitle>
                  <DialogDescription>
                    Cette échéance sera visible par les parents dans leur espace paiement.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Intitulé de la tranche *</Label>
                    <Input
                      id="title"
                      required
                      placeholder="Ex : 1ère Tranche — Scolarité Trimestre 1"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Classe concernée</Label>
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Toutes les classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les classes (par défaut)</SelectItem>
                        {classesQuery.data?.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Montant (FCFA) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        required
                        placeholder="20000"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dueDate">Date limite *</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        required
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Description / Remarques (optionnel)</Label>
                    <Input
                      id="description"
                      placeholder="Ex: Obligatoire pour la prise en compte de la réinscription"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enregistrement...</>
                    ) : 'Enregistrer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && setEditingSchedule(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate() }}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-blue-600" /> Modifier l'Échéance
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="editTitle">Intitulé *</Label>
                    <Input
                      id="editTitle"
                      required
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Classe concernée</Label>
                    <Select value={editClassId} onValueChange={setEditClassId}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Toutes les classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les classes</SelectItem>
                        {classesQuery.data?.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="editAmount">Montant (FCFA) *</Label>
                      <Input
                        id="editAmount"
                        type="number"
                        min="0"
                        required
                        value={editAmount}
                        onChange={e => setEditAmount(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editDueDate">Date limite *</Label>
                      <Input
                        id="editDueDate"
                        type="date"
                        required
                        value={editDueDate}
                        onChange={e => setEditDueDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="editDescription">Description / Remarques (optionnel)</Label>
                    <Input
                      id="editDescription"
                      placeholder="Ex: Modalité pour le premier trimestre"
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingSchedule(null)}>Annuler</Button>
                  <Button type="submit" disabled={updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                    {updateMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />Mise à jour...</>
                    ) : 'Enregistrer les modifications'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Confirm Preset (when data already exists) */}
          <Dialog open={confirmPreset} onOpenChange={setConfirmPreset}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-5 h-5" /> Confirmation
                </DialogTitle>
                <DialogDescription>
                  Des échéances existent déjà ({schedules.length} entrées). L'application de la grille officielle
                  va <strong>ajouter</strong> de nouvelles entrées sans supprimer les existantes.
                  Êtes-vous sûr(e) de vouloir continuer ?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmPreset(false)}>Annuler</Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => applyPresetMutation.mutate()}
                  disabled={applyPresetMutation.isPending}
                >
                  {applyPresetMutation.isPending ? 'Application...' : 'Confirmer et Appliquer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Confirm Delete */}
          <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
            <DialogContent className="sm:max-w-[380px]">
              <DialogHeader>
                <DialogTitle className="text-red-700 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" /> Supprimer cette échéance ?
                </DialogTitle>
                <DialogDescription>
                  Cette action est irréversible. Si des paiements ont déjà été effectués pour cette échéance,
                  la suppression sera bloquée automatiquement.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Annuler</Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Suppression...' : 'Supprimer définitivement'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-8 max-w-6xl mx-auto">

        {/* School Header Banner */}
        <div className="bg-gradient-to-r from-red-700 via-red-800 to-amber-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-300 bg-black/20 px-3 py-1 rounded-full border border-amber-300/30">
                SCOLARITÉ ET MODALITÉ DE PAIEMENT
              </span>
              <div className="flex items-center gap-2 mt-2">
                <Building2 className="w-5 h-5 text-amber-200" />
                <h2 className="text-2xl font-black tracking-tight">{schoolName}</h2>
              </div>
              <p className="text-xs text-amber-100/90 mt-1">
                Tarifs et échéanciers applicables pour l'année scolaire en cours.
              </p>
            </div>

            <div className="hidden sm:block text-right bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
              <div className="text-xs text-amber-200 uppercase font-semibold">Total Scolarité Défini</div>
              <div className="text-2xl font-black text-white mt-1">
                {hasSchedules ? totalScolarite.toLocaleString('fr-FR') + ' FCFA' : '—'}
              </div>
              <div className="text-xs text-amber-200/70 mt-0.5">{schedules.length} échéance(s) configurée(s)</div>
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Grille Tarifaire</h2>
            <p className="text-xs text-gray-500">Visualisez et gérez les tranches de paiement par niveau.</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'matrix' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Table className="w-4 h-4 text-emerald-600" /> Grille Officielle
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'cards' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-blue-600" /> Échéances Configurées ({schedules.length})
            </button>
          </div>
        </div>

        {/* TAB 1: Dynamic Matrix Table */}
        {activeTab === 'matrix' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {schedules.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Table className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="font-bold text-gray-800 text-lg">Aucune grille enregistrée</h3>
                <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
                  Ajoutez vos premières échéances ou cliquez sur "Grille Officielle" pour générer automatiquement l'échéancier de l'établissement.
                </p>
                <Button
                  className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => applyPresetMutation.mutate()}
                  disabled={applyPresetMutation.isPending}
                >
                  <Sparkles className="w-4 h-4" />
                  {applyPresetMutation.isPending ? 'Génération...' : 'Générer l\'Échéancier Type'}
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-800 border-b font-bold text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 text-left border-r bg-gray-200/80">Classe / Niveau</th>
                        {schedules.map((s: any) => (
                          <th key={s.id} className="px-4 py-4 border-r text-red-700 bg-red-50/50">
                            <div>{s.title}</div>
                            <div className="text-[10px] text-gray-500 font-normal font-mono mt-0.5">
                              {new Date(s.due_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            </div>
                          </th>
                        ))}
                        <th className="px-6 py-4 bg-amber-200/80 text-amber-950 font-extrabold text-sm">TOTAL SCOLARITÉ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-semibold text-gray-900">
                      {(classesQuery.data && classesQuery.data.length > 0
                        ? classesQuery.data 
                        : [{ id: 'all', name: 'Toutes les classes' }]
                      ).map((c: any, idx: number) => {
                        // Calculate row total for this class
                        const classTotal = schedules.reduce((sum: number, s: any) => {
                          const isApplicable = !s.class_id || s.class_id === c.id;
                          return isApplicable ? sum + Number(s.amount) : sum;
                        }, 0);

                        return (
                          <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <td className="px-6 py-4 text-left border-r font-bold text-gray-900 bg-gray-50/80">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                                {c.name}
                              </div>
                            </td>
                            {schedules.map((s: any) => {
                              const isApplicable = !s.class_id || s.class_id === c.id;
                              return (
                                <td key={s.id} className="px-4 py-4 border-r font-mono text-gray-800">
                                  {isApplicable ? (
                                    <span className="font-bold text-gray-900">{Number(s.amount).toLocaleString('fr-FR')} F</span>
                                  ) : (
                                    <span className="text-gray-300 font-normal">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-6 py-4 bg-amber-100/70 text-amber-950 font-black text-base font-mono">
                              {classTotal.toLocaleString('fr-FR')} F
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* NB */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 space-y-2">
              <h4 className="font-extrabold text-amber-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Règlement & Conditions (NB)
              </h4>
              <ul className="text-xs text-amber-900/90 space-y-1.5 pl-6 list-disc font-medium">
                <li><strong>Toute scolarité entamée est due et non remboursable.</strong></li>
                <li>Tout défaut de paiement dans le délai convenu entraîne l'arrêt immédiat de la prestation.</li>
                <li>Des paiements partiels sont acceptés — le solde doit être réglé avant la prochaine échéance.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: Real Configured Schedules */}
        {activeTab === 'cards' && (
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* Loading */}
            {schedulesQuery.isLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-3 text-gray-500">Chargement des échéances...</span>
              </div>
            )}

            {/* Error */}
            {schedulesQuery.isError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">Erreur de chargement</p>
                  <p className="text-sm text-red-600 mt-1">{(schedulesQuery.error as any)?.message}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['payment_schedules'] })}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Réessayer
                  </Button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!schedulesQuery.isLoading && !schedulesQuery.isError && !hasSchedules && (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="font-bold text-gray-700 text-lg">Aucune échéance configurée</h3>
                <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
                  Cliquez sur <strong>"Grille Officielle"</strong> pour importer automatiquement
                  les tranches tarifaires de la brochure, ou ajoutez des échéances manuellement.
                </p>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <Button
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => applyPresetMutation.mutate()}
                    disabled={applyPresetMutation.isPending}
                  >
                    <Sparkles className="w-4 h-4" />
                    {applyPresetMutation.isPending ? 'Application...' : 'Importer la Grille Officielle'}
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => setIsOpen(true)}>
                    <Plus className="w-4 h-4" /> Créer manuellement
                  </Button>
                </div>
              </div>
            )}

            {/* Schedule Cards */}
            {hasSchedules && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {schedules.map((schedule: any) => (
                  <div
                    key={schedule.id}
                    className="bg-white rounded-2xl border shadow-sm p-6 space-y-4 flex flex-col justify-between relative group hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-100">
                          <BookOpen className="w-3.5 h-3.5" />
                          {schedule.classes?.name || 'Toutes les classes'}
                        </span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-blue-600 h-8 w-8"
                            onClick={() => openEdit(schedule)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-red-600 h-8 w-8"
                            onClick={() => setDeleteConfirmId(schedule.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <h3 className="font-bold text-base text-gray-900 leading-snug">{schedule.title}</h3>

                      <div className="pt-1 flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900">{Number(schedule.amount).toLocaleString('fr-FR')}</span>
                        <span className="text-xs font-semibold text-gray-500">FCFA</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        Date limite :
                      </span>
                      <span className="font-medium text-gray-800">
                        {new Date(schedule.due_date + 'T00:00:00').toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'long', year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </AppShell>
  )
}
