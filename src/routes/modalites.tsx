import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/AppShell'
import { 
  Plus, Calendar, BookOpen, Trash2, CheckCircle2,
  Table, LayoutGrid, AlertTriangle, Sparkles, Pencil,
  AlertCircle, Loader2, Building2, RefreshCw, Copy,
  Layers, ArrowRight, Check, CheckSquare, Square
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
import { useAuth } from "@/hooks/useAuth"

export const Route = createFileRoute('/modalites')({
  head: () => ({
    meta: [
      { title: "Modalités & Scolarité — Eurêka" },
      { name: "description", content: "Grille tarifaire par niveau, échéancier et modalités de paiement dans Eurêka." },
    ],
  }),
  component: ModalitesPage,
})

// Normalisation des intitulés de tranches pour un affichage en grille unifié
interface CanonicalTranche {
  key: string
  label: string
  shortLabel: string
  defaultDueMonth: string
}

const CANONICAL_TRANCHES: CanonicalTranche[] = [
  { key: 'inscription', label: 'Inscription & Rentrée', shortLabel: 'INSCRIPTION', defaultDueMonth: '09-30' },
  { key: 'tranche_1', label: '1ère Tranche (Trimestre 1)', shortLabel: '1ÈRE TRANCHE', defaultDueMonth: '10-30' },
  { key: 'tranche_2', label: '2ème Tranche (Trimestre 2)', shortLabel: '2ÈME TRANCHE', defaultDueMonth: '11-30' },
  { key: 'tranche_3', label: '3ème Tranche (Trimestre 3)', shortLabel: '3ÈME TRANCHE', defaultDueMonth: '12-31' },
]

function getTrancheKey(title: string): string {
  const t = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t.includes('inscri')) return 'inscription';
  if (t.includes('1') || t.includes('premier') || t.includes('t1')) return 'tranche_1';
  if (t.includes('2') || t.includes('deuxieme') || t.includes('t2')) return 'tranche_2';
  if (t.includes('3') || t.includes('troisieme') || t.includes('t3')) return 'tranche_3';
  return title.trim().toLowerCase();
}

function ModalitesPage() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'matrix' | 'cards'>('matrix')

  // Modals state
  const [isSingleCreateOpen, setIsSingleCreateOpen] = useState(false)
  const [isBatchConfigOpen, setIsBatchConfigOpen] = useState(false)
  const [isCopyGridOpen, setIsCopyGridOpen] = useState(false)
  const [copySourceClass, setCopySourceClass] = useState<any>(null)
  const [copyTargetClassIds, setCopyTargetClassIds] = useState<string[]>([])
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Single Create Form State
  const [singleTitle, setSingleTitle] = useState('')
  const [singleClassId, setSingleClassId] = useState<string>('all')
  const [singleAmount, setSingleAmount] = useState('')
  const [singleDueDate, setSingleDueDate] = useState('')
  const [singleDescription, setSingleDescription] = useState('')

  // Edit Single Schedule State
  const [editingSchedule, setEditingSchedule] = useState<any>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editClassId, setEditClassId] = useState<string>('all')
  const [editAmount, setEditAmount] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // Batch / Level Configurator State
  const year = new Date().getFullYear()
  const [batchSelectedClasses, setBatchSelectedClasses] = useState<string[]>([])
  const [batchForm, setBatchForm] = useState({
    inscriptionAmount: '20000',
    inscriptionDate: `${year}-09-30`,
    t1Amount: '35000',
    t1Date: `${year}-10-30`,
    t2Amount: '35000',
    t2Date: `${year}-11-30`,
    t3Amount: '25000',
    t3Date: `${year}-12-31`,
  })

  // Fetch tenant info
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

  const classes = classesQuery.data || []

  // Fetch Payment Schedules
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

  // Detect Level Groups from Classes (e.g. "6 eme", "5 eme", "4 eme", "3 eme")
  const levelGroups = useMemo(() => {
    const groups: { [key: string]: typeof classes } = {}
    classes.forEach(c => {
      const match = c.name.match(/^(\d+\s*(?:eme|ème|e|er|ère)|cp1|cp2|ce1|ce2|cm1|cm2|tle|term|seconde|première|1ère|2nde)/i)
      const groupKey = match ? match[1].toLowerCase().replace(/\s+/g, ' ') : 'Autres'
      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(c)
    })
    return groups
  }, [classes])

  // Map schedules into a matrix by Class ID and Tranche Key
  const scheduleMatrix = useMemo(() => {
    const matrix: { [classId: string]: { [trancheKey: string]: any } } = {}
    
    // Initialize for all classes
    classes.forEach(c => {
      matrix[c.id] = {}
    })

    // Populate with specific schedules first
    schedules.forEach(s => {
      const trancheKey = getTrancheKey(s.title)
      if (s.class_id && matrix[s.class_id]) {
        matrix[s.class_id][trancheKey] = s
      }
    })

    // If there are global schedules (class_id = null), fill in missing tranches
    schedules.forEach(s => {
      if (!s.class_id) {
        const trancheKey = getTrancheKey(s.title)
        classes.forEach(c => {
          if (!matrix[c.id][trancheKey]) {
            matrix[c.id][trancheKey] = s
          }
        })
      }
    })

    return matrix
  }, [classes, schedules])

  // Extract all active column definitions for the matrix
  const matrixColumns = useMemo(() => {
    // Collect all tranche keys that actually exist in schedules
    const presentKeys = new Set<string>()
    schedules.forEach(s => presentKeys.add(getTrancheKey(s.title)))

    // Order according to canonical if present, or add at least standard ones
    const cols = CANONICAL_TRANCHES.filter(ct => presentKeys.has(ct.key))

    // If empty or none matched canonical, show default 4 canonical
    if (cols.length === 0) {
      return CANONICAL_TRANCHES
    }

    // Add any non-canonical custom tranches found in schedules
    presentKeys.forEach(k => {
      if (!CANONICAL_TRANCHES.some(ct => ct.key === k)) {
        cols.push({
          key: k,
          label: k.toUpperCase(),
          shortLabel: k.toUpperCase(),
          defaultDueMonth: '12-31'
        })
      }
    })

    return cols
  }, [schedules])

  // ── MUTATIONS ──

  // 1. Single Create
  const createSingleMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) throw new Error("Établissement introuvable.")

      const { error } = await supabase.from('payment_schedules').insert([{
        tenant_id: profile.tenant_id,
        class_id: singleClassId === 'all' ? null : singleClassId,
        title: singleTitle.trim(),
        amount: parseFloat(singleAmount),
        due_date: singleDueDate,
        description: singleDescription || null,
      }])

      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Échéance ajoutée avec succès")
      queryClient.invalidateQueries({ queryKey: ['payment_schedules'] })
      setIsSingleCreateOpen(false)
      setSingleTitle('')
      setSingleAmount('')
      setSingleDueDate('')
      setSingleDescription('')
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la création")
    }
  })

  // 2. Batch / Level Configurator Mutation
  const batchConfigMutation = useMutation({
    mutationFn: async () => {
      if (batchSelectedClasses.length === 0) {
        throw new Error("Veuillez sélectionner au moins une classe cible.")
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) throw new Error("Établissement introuvable.")

      // Prepare records for each selected class
      const recordsToInsert: any[] = []

      batchSelectedClasses.forEach(classId => {
        // 1. Inscription
        if (parseFloat(batchForm.inscriptionAmount) > 0) {
          recordsToInsert.push({
            tenant_id: profile.tenant_id,
            class_id: classId,
            title: 'Inscription',
            amount: parseFloat(batchForm.inscriptionAmount),
            due_date: batchForm.inscriptionDate,
            description: "Frais d'inscription et de rentrée scolaire"
          })
        }
        // 2. Tranche 1
        if (parseFloat(batchForm.t1Amount) > 0) {
          recordsToInsert.push({
            tenant_id: profile.tenant_id,
            class_id: classId,
            title: '1ère Tranche',
            amount: parseFloat(batchForm.t1Amount),
            due_date: batchForm.t1Date,
            description: "Paiement Trimestre 1"
          })
        }
        // 3. Tranche 2
        if (parseFloat(batchForm.t2Amount) > 0) {
          recordsToInsert.push({
            tenant_id: profile.tenant_id,
            class_id: classId,
            title: '2ème Tranche',
            amount: parseFloat(batchForm.t2Amount),
            due_date: batchForm.t2Date,
            description: "Paiement Trimestre 2"
          })
        }
        // 4. Tranche 3
        if (parseFloat(batchForm.t3Amount) > 0) {
          recordsToInsert.push({
            tenant_id: profile.tenant_id,
            class_id: classId,
            title: '3ème Tranche',
            amount: parseFloat(batchForm.t3Amount),
            due_date: batchForm.t3Date,
            description: "Paiement Trimestre 3 (Solde)"
          })
        }
      })

      // Delete existing schedules for these classes first to avoid stale duplicates
      for (const cid of batchSelectedClasses) {
        await supabase
          .from('payment_schedules')
          .delete()
          .eq('class_id', cid)
          .eq('tenant_id', profile.tenant_id)
      }

      // Insert fresh batch
      const { error: insertErr } = await supabase
        .from('payment_schedules')
        .insert(recordsToInsert)

      if (insertErr) throw insertErr
    },
    onSuccess: () => {
      toast.success(`Grille tarifaire appliquée avec succès à ${batchSelectedClasses.length} classe(s) !`)
      queryClient.invalidateQueries({ queryKey: ['payment_schedules'] })
      setIsBatchConfigOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'application de la grille")
    }
  })

  // 3. Duplicate / Copy Grid from one class to others
  const copyGridMutation = useMutation({
    mutationFn: async () => {
      if (!copySourceClass || copyTargetClassIds.length === 0) {
        throw new Error("Sélectionnez la classe source et au moins une classe de destination.")
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) throw new Error("Établissement introuvable.")

      // Find all schedules of source class
      const sourceSchedules = schedules.filter(s => s.class_id === copySourceClass.id)
      if (sourceSchedules.length === 0) {
        throw new Error("La classe source n'a aucune tranche configurée à copier.")
      }

      // Delete existing on targets
      for (const targetId of copyTargetClassIds) {
        await supabase
          .from('payment_schedules')
          .delete()
          .eq('class_id', targetId)
          .eq('tenant_id', profile.tenant_id)
      }

      // Build copied rows
      const rowsToInsert: any[] = []
      copyTargetClassIds.forEach(targetId => {
        sourceSchedules.forEach(src => {
          rowsToInsert.push({
            tenant_id: profile.tenant_id,
            class_id: targetId,
            title: src.title,
            amount: src.amount,
            due_date: src.due_date,
            description: src.description,
          })
        })
      })

      const { error } = await supabase.from('payment_schedules').insert(rowsToInsert)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(`Grille de ${copySourceClass?.name} copiée vers ${copyTargetClassIds.length} classe(s) !`)
      queryClient.invalidateQueries({ queryKey: ['payment_schedules'] })
      setIsCopyGridOpen(false)
      setCopySourceClass(null)
      setCopyTargetClassIds([])
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la copie")
    }
  })

  // 4. Update Single Schedule
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
      toast.success("Échéance mise à jour")
      queryClient.invalidateQueries({ queryKey: ['payment_schedules'] })
      setEditingSchedule(null)
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la modification")
    }
  })

  // 5. Delete Schedule
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
      toast.error(err.message || "Impossible de supprimer")
    }
  })

  // Open copy dialog for a specific class
  const openCopyDialog = (cls: any) => {
    setCopySourceClass(cls)
    // By default, pre-select classes of the same level
    const match = cls.name.match(/^(\d+\s*(?:eme|ème|e|er|ère)|cp1|cp2|ce1|ce2|cm1|cm2|tle|term|seconde|première|1ère|2nde)/i)
    const prefix = match ? match[1].toLowerCase().replace(/\s+/g, ' ') : ''
    const siblingClassIds = classes
      .filter(c => c.id !== cls.id && (prefix ? c.name.toLowerCase().includes(prefix) : false))
      .map(c => c.id)

    setCopyTargetClassIds(siblingClassIds)
    setIsCopyGridOpen(true)
  }

  // Open Batch modal pre-filled for a specific level or class
  const openBatchForLevel = (targetClasses: any[]) => {
    setBatchSelectedClasses(targetClasses.map(c => c.id))
    // If one of these classes already has schedules, pre-populate amounts
    const firstConfigured = targetClasses.find(c => {
      const row = scheduleMatrix[c.id]
      return row && Object.keys(row).length > 0
    })

    if (firstConfigured) {
      const row = scheduleMatrix[firstConfigured.id]
      setBatchForm({
        inscriptionAmount: String(row.inscription?.amount || '20000'),
        inscriptionDate: row.inscription?.due_date || `${year}-09-30`,
        t1Amount: String(row.tranche_1?.amount || '35000'),
        t1Date: row.tranche_1?.due_date || `${year}-10-30`,
        t2Amount: String(row.tranche_2?.amount || '35000'),
        t2Date: row.tranche_2?.due_date || `${year}-11-30`,
        t3Amount: String(row.tranche_3?.amount || '25000'),
        t3Date: row.tranche_3?.due_date || `${year}-12-31`,
      })
    }
    setIsBatchConfigOpen(true)
  }

  const batchTotal = 
    (parseFloat(batchForm.inscriptionAmount) || 0) +
    (parseFloat(batchForm.t1Amount) || 0) +
    (parseFloat(batchForm.t2Amount) || 0) +
    (parseFloat(batchForm.t3Amount) || 0)

  // Overall Total across all classes
  const grandTotalScolarite = useMemo(() => {
    return classes.reduce((sum, c) => {
      const row = scheduleMatrix[c.id] || {}
      const classTotal = Object.values(row).reduce((subSum: number, item: any) => subSum + (Number(item?.amount) || 0), 0)
      return sum + classTotal
    }, 0)
  }, [classes, scheduleMatrix])

  const configuredClassesCount = useMemo(() => {
    return classes.filter(c => {
      const row = scheduleMatrix[c.id] || {}
      return Object.keys(row).length > 0
    }).length
  }, [classes, scheduleMatrix])

  return (
    <AppShell
      title="Modalités & Scolarité"
      subtitle={`Gestion optimisée des tranches et grille tarifaire — ${schoolName}`}
      actions={
        <div className="flex items-center gap-2">
          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['payment_schedules'] })}
            className="text-gray-500 hover:text-gray-800"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          {/* Action 1 : Configurer par Niveau / Multi-classes */}
          <Button
            onClick={() => {
              setBatchSelectedClasses(classes.map(c => c.id))
              setIsBatchConfigOpen(true)
            }}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
          >
            <Layers className="w-4 h-4" /> Configurer par Niveau / Multi-classes
          </Button>

          {/* Action 2 : Ajouter une tranche individuelle */}
          <Button 
            variant="outline"
            onClick={() => setIsSingleCreateOpen(true)}
            className="gap-2 text-xs font-semibold"
          >
            <Plus className="w-4 h-4" /> Ajouter une Tranche
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">

        {/* School Header Banner */}
        <div className="bg-gradient-to-r from-red-700 via-red-800 to-amber-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-300 bg-black/25 px-3 py-1 rounded-full border border-amber-300/30">
                GRILLE TARIFAIRE ET MODALITÉS DE PAIEMENT
              </span>
              <div className="flex items-center gap-2 mt-2">
                <Building2 className="w-6 h-6 text-amber-200" />
                <h2 className="text-2xl font-black tracking-tight">{schoolName}</h2>
              </div>
              <p className="text-xs text-amber-100/90 mt-1 max-w-xl">
                Configurez facilement les tranches de scolarité pour toutes les classes d'un niveau en 1 clic.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-xl border border-white/20">
                <div className="text-[11px] text-amber-200 uppercase font-bold tracking-wider">Classes Configurées</div>
                <div className="text-2xl font-black text-white mt-0.5">
                  {configuredClassesCount} / {classes.length}
                </div>
                <div className="text-[10px] text-amber-200/80">
                  {schedules.length} tranche(s) actives
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Grille Officielle des Tarifs</h2>
            <p className="text-xs text-gray-500">Visualisez et harmonisez les montants par classe et par tranche.</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'matrix' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Table className="w-4 h-4 text-emerald-600" /> Grille Tarifaire Normalisée
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'cards' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-blue-600" /> Liste Détaillée ({schedules.length})
            </button>
          </div>
        </div>

        {/* Quick Level Filter / Action Pills */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-2xl border text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wide text-[11px]">Configuration Rapide :</span>
          {Object.entries(levelGroups).map(([lvl, grpClasses]) => (
            <Button
              key={lvl}
              variant="outline"
              size="sm"
              onClick={() => openBatchForLevel(grpClasses)}
              className="h-7 text-xs gap-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 font-semibold"
            >
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Configurer niveau {lvl.toUpperCase()} ({grpClasses.length} classes)
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => openBatchForLevel(classes)}
            className="h-7 text-xs gap-1.5 bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-bold ml-auto"
          >
            <Layers className="w-3 h-3 text-emerald-700" />
            Tout le Collège / Établissement
          </Button>
        </div>

        {/* TAB 1: Normalisée & Consolidée Matrix Table */}
        {activeTab === 'matrix' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-center text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100/90 text-gray-800 border-b font-bold text-xs uppercase tracking-wider">
                      <th className="px-5 py-4 text-left border-r bg-gray-200/90 w-48">Classe / Niveau</th>
                      
                      {/* Standard Canonical Tranche Columns */}
                      {matrixColumns.map(col => {
                        // Find first schedule with this tranche to display typical due date
                        const sampleSchedule = schedules.find(s => getTrancheKey(s.title) === col.key)
                        const sampleDate = sampleSchedule?.due_date

                        return (
                          <th key={col.key} className="px-4 py-4 border-r text-red-800 bg-red-50/40 min-w-[130px]">
                            <div className="font-extrabold">{col.shortLabel}</div>
                            {sampleDate && (
                              <div className="text-[10px] text-gray-500 font-mono font-normal mt-0.5">
                                Échéance : {new Date(sampleDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                              </div>
                            )}
                          </th>
                        )
                      })}

                      <th className="px-5 py-4 bg-amber-200/90 text-amber-950 font-extrabold text-xs w-40">
                        TOTAL SCOLARITÉ
                      </th>
                      <th className="px-4 py-4 text-center bg-gray-100 text-gray-600 font-semibold text-xs w-36">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y font-semibold text-gray-900">
                    {classes.length === 0 ? (
                      <tr>
                        <td colSpan={matrixColumns.length + 3} className="py-12 text-center text-gray-400">
                          Aucune classe configurée dans l'établissement.
                        </td>
                      </tr>
                    ) : (
                      classes.map((c, idx) => {
                        const rowSchedules = scheduleMatrix[c.id] || {}
                        
                        // Calculate total for this class
                        let classTotal = 0
                        matrixColumns.forEach(col => {
                          const item = rowSchedules[col.key]
                          if (item && item.amount) {
                            classTotal += Number(item.amount)
                          }
                        })

                        const isZero = classTotal === 0

                        return (
                          <tr key={c.id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-gray-50/40 hover:bg-slate-50/80'}>
                            {/* Class Name */}
                            <td className="px-5 py-3.5 text-left border-r font-bold text-gray-900 bg-gray-50/60">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full ${isZero ? 'bg-gray-300' : 'bg-emerald-500'}`} />
                                  <span className="font-bold">{c.name}</span>
                                </div>
                              </div>
                            </td>

                            {/* Tranches Values */}
                            {matrixColumns.map(col => {
                              const item = rowSchedules[col.key]
                              const amount = item?.amount ? Number(item.amount) : 0

                              return (
                                <td key={col.key} className="px-4 py-3.5 border-r font-mono text-gray-800">
                                  {amount > 0 ? (
                                    <div>
                                      <span className="font-bold text-gray-900">
                                        {amount.toLocaleString('fr-FR')} F
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-300 font-normal">—</span>
                                  )}
                                </td>
                              )
                            })}

                            {/* Total Scolarité */}
                            <td className={`px-5 py-3.5 font-black text-sm font-mono border-r ${
                              isZero 
                                ? 'bg-gray-100/70 text-gray-400' 
                                : 'bg-amber-100/80 text-amber-950 font-bold'
                            }`}>
                              {classTotal.toLocaleString('fr-FR')} F
                            </td>

                            {/* Actions per class */}
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Copier / Dupliquer cette grille vers d'autres classes"
                                  onClick={() => openCopyDialog(c)}
                                  className="h-8 px-2 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 gap-1 font-semibold"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="hidden xl:inline">Dupliquer</span>
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Modifier les montants de cette classe"
                                  onClick={() => openBatchForLevel([c])}
                                  className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* NB & Conditions */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 space-y-2">
              <h4 className="font-extrabold text-amber-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Règlement & Conditions Officielles
              </h4>
              <ul className="text-xs text-amber-900/90 space-y-1.5 pl-6 list-disc font-medium">
                <li><strong>Toute scolarité entamée est due et non remboursable.</strong></li>
                <li>Tout défaut de paiement dans le délai convenu entraîne l'arrêt immédiat de la prestation pédagogique.</li>
                <li>Des paiements partiels via Mobile Money (Wave, Orange, MTN, Moov) sont acceptés — le solde doit être réglé avant l'échéance suivante.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: Liste Détaillée des Échéances */}
        {activeTab === 'cards' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedules.map((schedule: any) => (
                <div
                  key={schedule.id}
                  className="bg-white rounded-2xl border shadow-sm p-5 space-y-3 flex flex-col justify-between hover:shadow-md transition-shadow relative group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-100">
                        <BookOpen className="w-3.5 h-3.5" />
                        {schedule.classes?.name || 'Toutes les classes'}
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-blue-600 h-7 w-7"
                          onClick={() => {
                            setEditingSchedule(schedule)
                            setEditTitle(schedule.title)
                            setEditClassId(schedule.class_id || 'all')
                            setEditAmount(String(schedule.amount))
                            setEditDueDate(schedule.due_date)
                            setEditDescription(schedule.description || '')
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-red-600 h-7 w-7"
                          onClick={() => setDeleteConfirmId(schedule.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-gray-900 leading-snug">{schedule.title}</h3>

                    <div className="pt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-gray-900">
                        {Number(schedule.amount).toLocaleString('fr-FR')}
                      </span>
                      <span className="text-xs font-bold text-gray-500">FCFA</span>
                    </div>

                    {schedule.description && (
                      <p className="text-xs text-gray-500 italic">{schedule.description}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      Date limite :
                    </span>
                    <span className="font-semibold text-gray-800 font-mono">
                      {new Date(schedule.due_date + 'T00:00:00').toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── MODAL 1 : CONFIGURATEUR PAR NIVEAU / MULTI-CLASSES ── */}
      <Dialog open={isBatchConfigOpen} onOpenChange={setIsBatchConfigOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <form onSubmit={(e) => { e.preventDefault(); batchConfigMutation.mutate(); }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-800">
                <Layers className="w-5 h-5 text-emerald-600" />
                Configuration des Modalités par Niveau / Multi-Classes
              </DialogTitle>
              <DialogDescription>
                Définissez en une seule fois les 4 tranches et appliquez-les à toutes les classes sélectionnées.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              
              {/* Step 1 : Select Target Classes */}
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-slate-800">Classes cibles concernées ({batchSelectedClasses.length} sélectionnées) :</Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBatchSelectedClasses(classes.map(c => c.id))}
                      className="text-xs font-bold text-emerald-600 hover:underline"
                    >
                      Tout cocher
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setBatchSelectedClasses([])}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Tout décocher
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
                  {classes.map(c => {
                    const isChecked = batchSelectedClasses.includes(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setBatchSelectedClasses(prev => prev.filter(x => x !== c.id))
                          } else {
                            setBatchSelectedClasses(prev => [...prev, c.id])
                          }
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                          isChecked 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' 
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-300 shrink-0" />
                        )}
                        <span className="truncate">{c.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Step 2 : Define the 4 Standard Tranches */}
              <div className="space-y-3 bg-white p-3.5 rounded-xl border">
                <Label className="font-bold text-gray-900 block">
                  Définition des tranches de paiement :
                </Label>

                {/* Tranche 1: Inscription */}
                <div className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2.5 rounded-lg border">
                  <div className="col-span-5">
                    <span className="font-bold text-gray-900 block">Frais d'Inscription</span>
                    <span className="text-[10px] text-gray-500">Rentrée scolaire</span>
                  </div>
                  <div className="col-span-4">
                    <Input 
                      type="number"
                      placeholder="Montant FCFA"
                      value={batchForm.inscriptionAmount}
                      onChange={e => setBatchForm({...batchForm, inscriptionAmount: e.target.value})}
                      className="bg-white h-8 text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input 
                      type="date"
                      value={batchForm.inscriptionDate}
                      onChange={e => setBatchForm({...batchForm, inscriptionDate: e.target.value})}
                      className="bg-white h-8 text-[11px]"
                    />
                  </div>
                </div>

                {/* Tranche 2: Tranche 1 */}
                <div className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2.5 rounded-lg border">
                  <div className="col-span-5">
                    <span className="font-bold text-gray-900 block">1ère Tranche</span>
                    <span className="text-[10px] text-gray-500">Trimestre 1</span>
                  </div>
                  <div className="col-span-4">
                    <Input 
                      type="number"
                      placeholder="Montant FCFA"
                      value={batchForm.t1Amount}
                      onChange={e => setBatchForm({...batchForm, t1Amount: e.target.value})}
                      className="bg-white h-8 text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input 
                      type="date"
                      value={batchForm.t1Date}
                      onChange={e => setBatchForm({...batchForm, t1Date: e.target.value})}
                      className="bg-white h-8 text-[11px]"
                    />
                  </div>
                </div>

                {/* Tranche 3: Tranche 2 */}
                <div className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2.5 rounded-lg border">
                  <div className="col-span-5">
                    <span className="font-bold text-gray-900 block">2ème Tranche</span>
                    <span className="text-[10px] text-gray-500">Trimestre 2</span>
                  </div>
                  <div className="col-span-4">
                    <Input 
                      type="number"
                      placeholder="Montant FCFA"
                      value={batchForm.t2Amount}
                      onChange={e => setBatchForm({...batchForm, t2Amount: e.target.value})}
                      className="bg-white h-8 text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input 
                      type="date"
                      value={batchForm.t2Date}
                      onChange={e => setBatchForm({...batchForm, t2Date: e.target.value})}
                      className="bg-white h-8 text-[11px]"
                    />
                  </div>
                </div>

                {/* Tranche 4: Tranche 3 */}
                <div className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2.5 rounded-lg border">
                  <div className="col-span-5">
                    <span className="font-bold text-gray-900 block">3ème Tranche</span>
                    <span className="text-[10px] text-gray-500">Trimestre 3 (Solde)</span>
                  </div>
                  <div className="col-span-4">
                    <Input 
                      type="number"
                      placeholder="Montant FCFA"
                      value={batchForm.t3Amount}
                      onChange={e => setBatchForm({...batchForm, t3Amount: e.target.value})}
                      className="bg-white h-8 text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input 
                      type="date"
                      value={batchForm.t3Date}
                      onChange={e => setBatchForm({...batchForm, t3Date: e.target.value})}
                      className="bg-white h-8 text-[11px]"
                    />
                  </div>
                </div>

                {/* Total Preview */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 font-bold">
                  <span>TOTAL DE LA SCOLARITÉ CALCULÉ :</span>
                  <span className="text-base font-black font-mono">{batchTotal.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsBatchConfigOpen(false)}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                size="sm"
                disabled={batchConfigMutation.isPending || batchSelectedClasses.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {batchConfigMutation.isPending ? "Application en cours..." : `Appliquer à ces ${batchSelectedClasses.length} classe(s)`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2 : DUPLIQUER / COPIER LA GRILLE D'UNE CLASSE VERS D'AUTRES ── */}
      <Dialog open={isCopyGridOpen} onOpenChange={setIsCopyGridOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => { e.preventDefault(); copyGridMutation.mutate(); }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-800">
                <Copy className="w-5 h-5 text-emerald-600" />
                Dupliquer la Grille de {copySourceClass?.name}
              </DialogTitle>
              <DialogDescription>
                Copiez tous les tarifs et dates de cette classe vers d'autres classes de même niveau en 1 clic.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                <span className="font-bold">Classe source :</span> {copySourceClass?.name}
              </div>

              <div className="space-y-2">
                <Label>Classes de destination (cochez les classes à synchroniser) :</Label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {classes.filter(c => c.id !== copySourceClass?.id).map(c => {
                    const isChecked = copyTargetClassIds.includes(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setCopyTargetClassIds(prev => prev.filter(x => x !== c.id))
                          } else {
                            setCopyTargetClassIds(prev => [...prev, c.id])
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                          isChecked 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' 
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{c.name}</span>
                        {isChecked && <Check className="w-4 h-4 text-emerald-600" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCopyGridOpen(false)}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                size="sm"
                disabled={copyGridMutation.isPending || copyTargetClassIds.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold"
              >
                {copyGridMutation.isPending ? "Copie en cours..." : `Copier vers ${copyTargetClassIds.length} classe(s)`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3 : CRÉATION INDIVIDUELLE D'UNE ÉCHÉANCE ── */}
      <Dialog open={isSingleCreateOpen} onOpenChange={setIsSingleCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => { e.preventDefault(); createSingleMutation.mutate(); }}>
            <DialogHeader>
              <DialogTitle>Ajouter une Échéance de Paiement</DialogTitle>
              <DialogDescription>
                Ajoutez une tranche spécifique ou un frais particulier (cantine, sortie, etc.).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-3 text-xs">
              <div className="grid gap-1.5">
                <Label htmlFor="single_title">Intitulé de la tranche *</Label>
                <Input
                  id="single_title"
                  required
                  placeholder="Ex : Inscription, 1ère Tranche, etc."
                  value={singleTitle}
                  onChange={e => setSingleTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Classe concernée</Label>
                <Select value={singleClassId} onValueChange={setSingleClassId}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes (par défaut)</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="single_amount">Montant (FCFA) *</Label>
                  <Input
                    id="single_amount"
                    type="number"
                    min="0"
                    required
                    placeholder="25000"
                    value={singleAmount}
                    onChange={e => setSingleAmount(e.target.value)}
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="single_due">Date limite *</Label>
                  <Input
                    id="single_due"
                    type="date"
                    required
                    value={singleDueDate}
                    onChange={e => setSingleDueDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="single_desc">Description / Remarque (optionnel)</Label>
                <Input
                  id="single_desc"
                  placeholder="Ex: Modalité pour le premier trimestre"
                  value={singleDescription}
                  onChange={e => setSingleDescription(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsSingleCreateOpen(false)}>Annuler</Button>
              <Button type="submit" size="sm" disabled={createSingleMutation.isPending} className="bg-primary font-bold">
                {createSingleMutation.isPending ? "Création..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 4 : MODIFIER UNE ÉCHÉANCE EXISTANTE ── */}
      <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && setEditingSchedule(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" /> Modifier l'Échéance
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-3 text-xs">
              <div className="grid gap-1.5">
                <Label htmlFor="edit_t">Intitulé *</Label>
                <Input
                  id="edit_t"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Classe concernée</Label>
                <Select value={editClassId} onValueChange={setEditClassId}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit_a">Montant (FCFA) *</Label>
                  <Input
                    id="edit_a"
                    type="number"
                    min="0"
                    required
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit_d">Date limite *</Label>
                  <Input
                    id="edit_d"
                    type="date"
                    required
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit_desc">Description (optionnel)</Label>
                <Input
                  id="edit_desc"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingSchedule(null)}>Annuler</Button>
              <Button type="submit" size="sm" disabled={updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                {updateMutation.isPending ? "Mise à jour..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 5 : CONFIRMATION SUPPRESSION ── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Supprimer cette tranche ?
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Les paiements déjà enregistrés ne seront pas affectés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>Annuler</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppShell>
  )
}
