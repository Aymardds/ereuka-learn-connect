import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { Plus, Building, KeyRound, ShieldAlert, CheckCircle2, UserCheck } from 'lucide-react'
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

export const Route = createFileRoute('/superadmin/etablissements')({
  component: EtablissementsPage,
})

// Admin client uses the service role key to bypass RLS for user creation / password reset
function getAdminClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;
  if (!key) throw new Error('VITE_SUPABASE_SERVICE_ROLE_KEY is not set in .env');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function EtablissementsPage() {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  
  // Create Tenant State
  const [tenantName, setTenantName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [newCredentials, setNewCredentials] = useState<{email: string, pass: string} | null>(null)

  // Reset Password State
  const [resetAdmin, setResetAdmin] = useState<{ userId: string; adminName: string; adminEmail: string; schoolName: string } | null>(null)
  const [resetResult, setResetResult] = useState<{ email: string; pass: string } | null>(null)

  const tenantsQuery = useQuery({
    queryKey: ['superadmin-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*, user_profiles(*)')
        .order('created_at', { ascending: false })
      if (error) throw error;
      return data;
    }
  })

  // Create Tenant Mutation
  const createTenantMutation = useMutation({
    mutationFn: async () => {
      const adminClient = getAdminClient();
      
      // 1. Create the tenant
      const { data: tenant, error: tenantError } = await adminClient
        .from('tenants')
        .insert([{ name: tenantName }])
        .select()
        .single();
      if (tenantError) throw new Error(`Erreur tenant: ${tenantError.message}`);

      // 2. Generate temp password
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

      // 3. Create user in Auth
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: adminEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: adminName }
      });
      if (authError) throw new Error(`Erreur auth: ${authError.message}`);

      // 4. Create user profile linked to tenant
      const { error: profileError } = await adminClient
        .from('user_profiles')
        .insert([{
          id: authUser.user.id,
          email: adminEmail,
          full_name: adminName,
          role: 'admin',
          tenant_id: tenant.id
        }]);
      if (profileError) throw new Error(`Erreur profil: ${profileError.message}`);

      return { tempPassword };
    },
    onSuccess: (data) => {
      toast.success('Établissement créé avec succès')
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['superadmin-stats'] })
      setNewCredentials({ email: adminEmail, pass: data.tempPassword })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la création')
    }
  })

  // Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!resetAdmin) throw new Error("Aucun administrateur sélectionné");
      const adminClient = getAdminClient();
      const newTempPassword = Math.random().toString(36).slice(-8) + 'A1!';

      const { error } = await adminClient.auth.admin.updateUserById(
        resetAdmin.userId,
        { password: newTempPassword }
      );

      if (error) throw new Error(`Erreur réinitialisation: ${error.message}`);
      return { tempPassword: newTempPassword };
    },
    onSuccess: (data) => {
      toast.success('Mot de passe réinitialisé avec succès !');
      setResetResult({ email: resetAdmin!.adminEmail, pass: data.tempPassword });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la réinitialisation');
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createTenantMutation.mutate()
  }

  const resetForm = () => {
    setTenantName('')
    setAdminName('')
    setAdminEmail('')
    setNewCredentials(null)
    setIsOpen(false)
  }

  const closeResetModal = () => {
    setResetAdmin(null);
    setResetResult(null);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Établissements</h1>
          <p className="text-gray-500">Gérez les écoles et réinitialisez les accès administrateurs.</p>
        </div>
        
        {/* Create Tenant Dialog */}
        <Dialog open={isOpen} onOpenChange={(open) => {
          if(!open) resetForm()
          setIsOpen(open)
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Nouvel établissement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            {newCredentials ? (
              <div className="space-y-4 py-4">
                <DialogHeader>
                  <DialogTitle className="text-green-600">Création Réussie !</DialogTitle>
                </DialogHeader>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-4">Transmettez ces identifiants à l'administrateur de l'école.</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-semibold">Email :</span>
                      <span className="font-mono">{newCredentials.email}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="font-semibold">Mot de passe provisoire :</span>
                      <span className="font-mono bg-yellow-100 px-2 rounded text-yellow-800 font-bold">{newCredentials.pass}</span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={resetForm}>Fermer</Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Ajouter un Établissement</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Nom de l'établissement</Label>
                    <Input required value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="Ex: Groupe Scolaire Les Anges" />
                  </div>
                  <div className="grid gap-2 mt-2">
                    <Label className="text-primary font-semibold border-b pb-2">Compte Administrateur Principal</Label>
                  </div>
                  <div className="grid gap-2">
                    <Label>Nom complet</Label>
                    <Input required value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Ex: Jean Dupont" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input type="email" required value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="jean@ecole.edu" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
                  <Button type="submit" disabled={createTenantMutation.isPending}>
                    {createTenantMutation.isPending ? 'Création...' : "Créer l'école"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={!!resetAdmin} onOpenChange={(open) => !open && closeResetModal()}>
        <DialogContent className="sm:max-w-[480px]">
          {resetResult ? (
            <div className="space-y-4 py-2">
              <DialogHeader>
                <DialogTitle className="text-emerald-600 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Mot de passe réinitialisé !
                </DialogTitle>
              </DialogHeader>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <p className="text-sm text-emerald-900 mb-3">
                  Un nouveau mot de passe provisoire a été généré pour <strong>{resetResult.email}</strong>.
                </p>
                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Nouveau mot de passe :</span>
                    <span className="font-mono bg-yellow-100 px-3 py-1 rounded text-yellow-900 font-bold text-base">
                      {resetResult.pass}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button onClick={closeResetModal}>Fermer</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-600">
                  <KeyRound className="w-5 h-5" /> Réinitialiser le mot de passe
                </DialogTitle>
                <DialogDescription>
                  Vous êtes sur le point de générer un nouveau mot de passe pour l'administrateur de l'école <strong>{resetAdmin?.schoolName}</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="bg-gray-50 p-4 rounded-xl border space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Administrateur :</span>
                  <span className="font-medium text-gray-900">{resetAdmin?.adminName}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-500">Email :</span>
                  <span className="font-mono text-gray-900">{resetAdmin?.adminEmail}</span>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={closeResetModal}>Annuler</Button>
                <Button 
                  className="bg-amber-600 hover:bg-amber-700 text-white" 
                  onClick={() => resetPasswordMutation.mutate()}
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? 'Réinitialisation...' : 'Générer le mot de passe'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Establishments Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 font-medium text-gray-500">Établissement</th>
              <th className="px-6 py-4 font-medium text-gray-500">Administrateur Principal</th>
              <th className="px-6 py-4 font-medium text-gray-500">Date de création</th>
              <th className="px-6 py-4 font-medium text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tenantsQuery.isLoading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Chargement...</td></tr>
            ) : tenantsQuery.data?.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Aucun établissement enregistré.</td></tr>
            ) : (
              tenantsQuery.data?.map(t => {
                // Find main admin profile
                const profiles = (t as any).user_profiles || [];
                const mainAdmin = profiles.find((p: any) => p.role === 'admin') || profiles[0];

                return (
                  <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <Building className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 block">{t.name}</span>
                          <span className="text-xs text-gray-400">{profiles.length} utilisateur(s)</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {mainAdmin ? (
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            {mainAdmin.full_name || 'Admin'}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">{mainAdmin.email}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Aucun admin trouvé</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(t.created_at).toLocaleDateString('fr-FR')}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {mainAdmin ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="gap-1.5 text-xs text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100 hover:text-amber-900"
                          onClick={() => setResetAdmin({
                            userId: mainAdmin.id,
                            adminName: mainAdmin.full_name || 'Admin',
                            adminEmail: mainAdmin.email,
                            schoolName: t.name
                          })}
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Réinitialiser Pass
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
