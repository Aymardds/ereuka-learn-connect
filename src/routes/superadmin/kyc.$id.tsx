import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, XCircle, Search, Building2, User, FileText, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/superadmin/kyc/$id')({
  component: KycDetailPage,
})

// Secure admin client for user creation
function getAdminClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;
  if (!key) throw new Error('VITE_SUPABASE_SERVICE_ROLE_KEY is not set in .env');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending': return <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium"><Search className="w-4 h-4"/> En attente</span>
    case 'under_review': return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium"><Search className="w-4 h-4"/> En cours d'examen</span>
    case 'approved': return <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium"><CheckCircle2 className="w-4 h-4"/> Approuvé</span>
    case 'rejected': return <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium"><XCircle className="w-4 h-4"/> Rejeté</span>
    default: return null
  }
}

function KycDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [newCredentials, setNewCredentials] = useState<{email: string, pass: string} | null>(null)

  const kycQuery = useQuery({
    queryKey: ['superadmin-kyc-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kyc_applications')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    }
  })

  // Start Review Mutation
  const startReviewMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('kyc_applications')
        .update({ status: 'under_review' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-kyc-detail', id] })
      toast.success('Dossier en cours d\'examen')
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
    }
  })

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      const app = kycQuery.data
      if (!app) throw new Error("Dossier introuvable")

      const adminClient = getAdminClient()

      // 1. Create the tenant
      const { data: tenant, error: tenantError } = await adminClient
        .from('tenants')
        .insert([{ 
          name: app.school_name, 
          school_types: app.school_types || [],
          address: app.address,
          city: app.city,
          country: app.country,
          phone: app.school_phone,
          logo_url: app.logo_url
        }])
        .select()
        .single();
      if (tenantError) throw new Error(`Erreur création établissement: ${tenantError.message}`);

      // 2. Generate temp password
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

      // 3. Create user in Auth
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: app.director_email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: app.director_name }
      });
      if (authError) throw new Error(`Erreur création auth: ${authError.message}`);

      // 4. Create user profile linked to tenant
      const { error: profileError } = await adminClient
        .from('user_profiles')
        .insert([{
          id: authUser.user.id,
          email: app.director_email,
          full_name: app.director_name,
          role: 'admin',
          tenant_id: tenant.id
        }]);
      if (profileError) throw new Error(`Erreur création profil: ${profileError.message}`);

      // 5. Update KYC Application status
      const { error: kycError } = await supabase
        .from('kyc_applications')
        .update({ 
          status: 'approved', 
          tenant_id: tenant.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id)
      if (kycError) throw new Error(`Erreur maj kyc: ${kycError.message}`);

      return { tempPassword }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-kyc-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['superadmin-kyc'] })
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['superadmin-stats'] })
      setNewCredentials({ email: kycQuery.data!.director_email, pass: data.tempPassword })
      toast.success('Dossier approuvé avec succès ! L\'établissement a été créé.')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'approbation')
    }
  })

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('kyc_applications')
        .update({ 
          status: 'rejected', 
          rejection_reason: rejectReason,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-kyc-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['superadmin-kyc'] })
      setIsRejectOpen(false)
      toast.success('Dossier rejeté')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors du rejet')
    }
  })

  if (kycQuery.isLoading) return <div className="p-8 text-center text-gray-500">Chargement du dossier...</div>
  
  const app = kycQuery.data
  if (!app) return <div className="p-8 text-center text-red-500">Dossier introuvable.</div>

  const getFileUrl = (path: string | null) => {
    if (!path) return null
    const { data } = supabase.storage.from('kyc-documents').getPublicUrl(path)
    return data.publicUrl
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/superadmin/kyc' })}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Dossier KYC : {app.school_name}</h1>
          <p className="text-sm text-gray-500">Soumis le {new Date(app.created_at).toLocaleString('fr-FR')}</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={app.status} />
        </div>
      </div>

      {/* Success Credentials Modal (After Approval) */}
      <Dialog open={!!newCredentials} onOpenChange={(open) => !open && setNewCredentials(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" /> Établissement Approuvé et Créé !
            </DialogTitle>
          </DialogHeader>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
            <p className="text-sm text-gray-600 mb-4">Le dossier a été approuvé. L'établissement et le compte administrateur ont été générés. Veuillez transmettre ces identifiants au directeur :</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">Email (Admin) :</span>
                <span className="font-mono">{newCredentials?.email}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="font-semibold">Mot de passe provisoire :</span>
                <span className="font-mono bg-yellow-100 px-2 rounded text-yellow-800">{newCredentials?.pass}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button onClick={() => setNewCredentials(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Rejeter le dossier
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-600">Veuillez indiquer le motif du rejet. Cette information sera conservée dans l'historique.</p>
            <div className="grid gap-2">
              <Label>Motif du rejet</Label>
              <Textarea 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)} 
                placeholder="Ex: Document d'identité illisible..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Annuler</Button>
            <Button 
              variant="destructive" 
              onClick={() => rejectMutation.mutate()}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejet...' : 'Confirmer le rejet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column : Data */}
        <div className="md:col-span-2 space-y-6">
          
          {/* School Info */}
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold">Informations de l'établissement</h2>
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Nom complet</p>
                <p className="font-medium">{app.school_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Téléphone</p>
                <p className="font-medium">{app.school_phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Adresse</p>
                <p className="font-medium">{app.address}</p>
                <p className="text-sm text-gray-600">{app.city}, {app.country}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Niveaux d'enseignement</p>
                <div className="flex gap-2 mt-1">
                  {app.school_types?.map((type: string) => (
                    <span key={type} className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-200">
                      {type}
                    </span>
                  )) || <span className="text-gray-400 text-sm">Non spécifié</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Director Info */}
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold">Coordonnées du Directeur</h2>
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Nom complet</p>
                <p className="font-medium">{app.director_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Téléphone</p>
                <p className="font-medium">{app.director_phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Email professionnel</p>
                <p className="font-medium text-primary">{app.director_email}</p>
              </div>
            </div>
          </div>

          {/* Rejection Reason (If applicable) */}
          {app.status === 'rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-red-800 font-semibold mb-2 flex items-center gap-2"><XCircle className="w-5 h-5"/> Motif du rejet</h3>
              <p className="text-red-700 whitespace-pre-wrap">{app.rejection_reason}</p>
            </div>
          )}

        </div>

        {/* Right Column : Documents & Actions */}
        <div className="space-y-6">
          
          {/* Actions Panel */}
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold border-b pb-4">Actions de vérification</h2>
            
            {app.status === 'pending' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Dossier en attente de prise en charge.</p>
                <Button className="w-full" onClick={() => startReviewMutation.mutate()} disabled={startReviewMutation.isPending}>
                  Commencer l'examen
                </Button>
              </div>
            )}

            {app.status === 'under_review' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Après avoir vérifié les documents et informations, vous pouvez statuer sur ce dossier.</p>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700" 
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Approuver et créer l'école
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => setIsRejectOpen(true)}
                  disabled={approveMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeter le dossier
                </Button>
              </div>
            )}

            {(app.status === 'approved' || app.status === 'rejected') && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">Ce dossier a déjà été traité.</p>
                <p className="text-xs text-gray-400 mt-1">Le {new Date(app.reviewed_at).toLocaleString('fr-FR')}</p>
              </div>
            )}
          </div>

          {/* Documents Panel */}
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold border-b pb-4">Documents joints</h2>
            
            <div className="space-y-3">
              <DocumentItem 
                title="Logo de l'école" 
                url={getFileUrl(app.logo_url)} 
              />
              <DocumentItem 
                title="Acte de création" 
                url={getFileUrl(app.document_registration_url)} 
              />
              <DocumentItem 
                title="Pièce d'identité" 
                url={getFileUrl(app.document_id_url)} 
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function DocumentItem({ title, url }: { title: string, url: string | null }) {
  if (!url) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-gray-50">
        <span className="text-sm font-medium text-gray-500 flex items-center gap-2"><FileText className="w-4 h-4" /> {title}</span>
        <span className="text-xs text-gray-400">Non fourni</span>
      </div>
    )
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors group cursor-pointer">
      <span className="text-sm font-medium text-gray-700 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> {title}</span>
      <Download className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
    </a>
  )
}
