import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { FileText, Clock, CheckCircle2, XCircle, Search, Eye } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const Route = createFileRoute('/superadmin/kyc/')({
  component: KycListPage,
})

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending': return <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full"><Clock className="w-3 h-3"/> En attente</span>
    case 'under_review': return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"><Search className="w-3 h-3"/> En examen</span>
    case 'approved': return <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3"/> Approuvé</span>
    case 'rejected': return <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full"><XCircle className="w-3 h-3"/> Rejeté</span>
    default: return null
  }
}

function KycListPage() {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const kycQuery = useQuery({
    queryKey: ['superadmin-kyc'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kyc_applications')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const filteredData = kycQuery.data?.filter(app => {
    const matchesFilter = filter === 'all' || app.status === filter
    const matchesSearch = app.school_name.toLowerCase().includes(search.toLowerCase()) || 
                          app.director_name.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Vérifications KYC</h1>
          <p className="text-gray-500">Examinez les demandes d'inscription des établissements.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              placeholder="Rechercher une école..." 
              className="pl-9 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 bg-white">
              <SelectValue placeholder="Filtrer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="under_review">En examen</SelectItem>
              <SelectItem value="approved">Approuvés</SelectItem>
              <SelectItem value="rejected">Rejetés</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 font-medium text-gray-500">Établissement</th>
              <th className="px-6 py-4 font-medium text-gray-500">Directeur</th>
              <th className="px-6 py-4 font-medium text-gray-500">Date de soumission</th>
              <th className="px-6 py-4 font-medium text-gray-500">Statut</th>
              <th className="px-6 py-4 font-medium text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {kycQuery.isLoading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Chargement...</td></tr>
            ) : filteredData?.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Aucun dossier trouvé.</td></tr>
            ) : (
              filteredData?.map(app => (
                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{app.school_name}</div>
                    <div className="text-xs text-gray-500">{app.city}, {app.country}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{app.director_name}</div>
                    <div className="text-xs text-gray-500">{app.director_email}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(app.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      to="/superadmin/kyc/$id" 
                      params={{ id: app.id }} 
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border shadow-sm rounded-md text-sm font-medium hover:bg-gray-50 transition-colors text-primary"
                    >
                      <Eye className="w-4 h-4" /> Examiner
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
