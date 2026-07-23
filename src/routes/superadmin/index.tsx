import { createFileRoute, Link } from '@tanstack/react-router'
import { 
  Building2, Users, FileCheck, Clock, CheckCircle2, XCircle, 
  TrendingUp, DollarSign, Percent, ArrowUpRight, ShieldCheck, Eye, RefreshCw
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend, AreaChart, Area 
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/superadmin/')({
  component: SuperAdminDashboard,
})

// Mock historical growth data for establishments & tuition fees
const monthlyGrowthData = [
  { month: 'Jan', ecoles: 4, scolariteFCFA: 15000000, inscriptionFCFA: 3000000 },
  { month: 'Fév', ecoles: 7, scolariteFCFA: 28000000, inscriptionFCFA: 5000000 },
  { month: 'Mar', ecoles: 12, scolariteFCFA: 42000000, inscriptionFCFA: 8500000 },
  { month: 'Avr', ecoles: 15, scolariteFCFA: 58000000, inscriptionFCFA: 10000000 },
  { month: 'Mai', ecoles: 21, scolariteFCFA: 85000000, inscriptionFCFA: 14000000 },
  { month: 'Juin', ecoles: 28, scolariteFCFA: 120000000, inscriptionFCFA: 18000000 },
]

function SuperAdminDashboard() {
  // Commission rate state (default 2.5%, editable by SuperAdmin)
  const [commissionRate, setCommissionRate] = useState<number>(2.5)
  const [isEditingRate, setIsEditingRate] = useState(false)

  // Fetch real platform stats from Supabase
  const statsQuery = useQuery({
    queryKey: ['superadmin-dashboard-stats'],
    queryFn: async () => {
      const [
        { count: tenantsCount },
        { count: usersCount },
        { count: pendingKyc },
        { count: underReviewKyc },
        { count: approvedKyc },
        { count: rejectedKyc },
        { data: recentKyc }
      ] = await Promise.all([
        supabase.from('tenants').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('kyc_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('kyc_applications').select('*', { count: 'exact', head: true }).eq('status', 'under_review'),
        supabase.from('kyc_applications').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('kyc_applications').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('kyc_applications').select('*').order('created_at', { ascending: false }).limit(5)
      ]);

      return {
        tenants: tenantsCount || 0,
        users: usersCount || 0,
        kyc: {
          pending: pendingKyc || 0,
          underReview: underReviewKyc || 0,
          approved: approvedKyc || 0,
          rejected: rejectedKyc || 0,
          total: (pendingKyc || 0) + (underReviewKyc || 0) + (approvedKyc || 0) + (rejectedKyc || 0)
        },
        recentKyc: recentKyc || []
      }
    }
  })

  // Calculate totals based on mock data & custom commission rate
  const totalScolarite = monthlyGrowthData.reduce((sum, item) => sum + item.scolariteFCFA, 0)
  const totalInscription = monthlyGrowthData.reduce((sum, item) => sum + item.inscriptionFCFA, 0)
  const totalCommissions = Math.round(totalScolarite * (commissionRate / 100))

  // Prepare chart data with commissions dynamically calculated
  const chartData = monthlyGrowthData.map(item => ({
    ...item,
    commissionFCFA: Math.round(item.scolariteFCFA * (commissionRate / 100))
  }))

  const stats = statsQuery.data

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header & Commission Rate Controller */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tableau de bord Global</h1>
          <p className="text-gray-500 text-sm mt-1">Supervision complète, statistiques KYC et revenus de la plateforme.</p>
        </div>

        {/* Commission Configuration Widget */}
        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Taux Commission Scolarité</div>
            <div className="flex items-center gap-2 mt-0.5">
              {isEditingRate ? (
                <div className="flex items-center gap-1">
                  <Input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="100"
                    value={commissionRate} 
                    onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-20 h-7 text-xs font-bold"
                  />
                  <span className="text-xs font-bold">%</span>
                  <Button size="sm" className="h-7 text-xs px-2" onClick={() => setIsEditingRate(false)}>OK</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">{commissionRate}%</span>
                  <button 
                    onClick={() => setIsEditingRate(true)} 
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Modifier
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Establishments */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Établissements</span>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{stats?.tenants ?? '...'}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +12% ce mois
            </span>
          </div>
          <p className="text-xs text-gray-400">Écoles actives configurées</p>
        </div>

        {/* KYC Applications Pending */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dossiers KYC</span>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{stats?.kyc.pending ?? '...'}</span>
            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              {stats?.kyc.underReview ? `${stats.kyc.underReview} en examen` : 'À traiter'}
            </span>
          </div>
          <p className="text-xs text-gray-400">Demandes en attente de vérification</p>
        </div>

        {/* Total Tuition Collected */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scolarités Collectées</span>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{(totalScolarite / 1000000).toFixed(1)}M</span>
            <span className="text-xs font-semibold text-gray-500">FCFA</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-400 pt-1">
            <span>Inscriptions (0% comm.):</span>
            <span className="font-medium text-gray-600">{(totalInscription / 1000000).toFixed(1)}M FCFA</span>
          </div>
        </div>

        {/* Total Platform Commissions */}
        <div className="bg-emerald-950 text-white p-6 rounded-2xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Commissions Ereuka</span>
            <div className="w-10 h-10 bg-emerald-800 text-emerald-300 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-emerald-400">{(totalCommissions / 1000000).toFixed(2)}M</span>
            <span className="text-xs font-semibold text-emerald-300">FCFA</span>
          </div>
          <p className="text-xs text-emerald-400/80">Basé sur le taux de {commissionRate}% (Scolarité uniquement)</p>
        </div>

      </div>

      {/* KYC Status Breakdown Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <Clock className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-xs text-amber-800 font-medium">En attente</p>
            <p className="text-lg font-bold text-amber-900">{stats?.kyc.pending ?? 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <Eye className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-xs text-blue-800 font-medium">En examen</p>
            <p className="text-lg font-bold text-blue-900">{stats?.kyc.underReview ?? 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-xs text-emerald-800 font-medium">Approuvés</p>
            <p className="text-lg font-bold text-emerald-900">{stats?.kyc.approved ?? 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
          <XCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-xs text-red-800 font-medium">Rejetés</p>
            <p className="text-lg font-bold text-red-900">{stats?.kyc.rejected ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Establishment Growth (Line Chart) */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-bold text-lg text-gray-900">Croissance des Établissements</h3>
              <p className="text-xs text-gray-500">Évolution du nombre d'écoles inscrites sur la plateforme</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg">
              <Building2 className="w-3.5 h-3.5" /> Cumulatif
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#888888" fontSize={12} />
                <YAxis stroke="#888888" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', borderColor: '#e5e7eb' }}
                  formatter={(value: any) => [`${value} écoles`, 'Nombre d\'établissements']}
                />
                <Line 
                  type="monotone" 
                  dataKey="ecoles" 
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: '#2563eb' }} 
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Commissions & Tuition Revenue */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-bold text-lg text-gray-900">Commissions vs Volume Scolarité</h3>
              <p className="text-xs text-gray-500">Revenus générés calculés à {commissionRate}% sur les scolarités</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
              <Percent className="w-3.5 h-3.5" /> {commissionRate}% appliqué
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#888888" fontSize={12} />
                <YAxis stroke="#888888" fontSize={12} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', borderColor: '#e5e7eb' }}
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString('fr-FR')} FCFA`, 
                    name === 'scolariteFCFA' ? 'Scolarité Collectée' : 'Commission Ereuka'
                  ]}
                />
                <Legend formatter={(value) => value === 'scolariteFCFA' ? 'Scolarités (FCFA)' : `Commission ${commissionRate}% (FCFA)`} />
                <Bar dataKey="scolariteFCFA" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="commissionFCFA" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Recent KYC Submissions Table */}
      <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Dernières Demandes KYC</h3>
            <p className="text-xs text-gray-500">Demandes d'inscription d'écoles récemment soumises.</p>
          </div>
          <Link to="/superadmin/kyc" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            Voir tout <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Établissement</th>
                <th className="px-4 py-3 font-medium">Directeur</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
              {statsQuery.isLoading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Chargement...</td></tr>
              ) : stats?.recentKyc.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Aucune demande KYC récente.</td></tr>
              ) : (
                stats?.recentKyc.map((app: any) => (
                  <tr key={app.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{app.school_name}</td>
                    <td className="px-4 py-3">{app.director_name} ({app.director_email})</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(app.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        app.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        app.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                        app.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link 
                        to="/superadmin/kyc/$id" 
                        params={{ id: app.id }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" /> Examiner
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
