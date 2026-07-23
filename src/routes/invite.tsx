import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ParentInvitation } from '@/types/database'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, CheckCircle2, User, Lock, AlertCircle } from 'lucide-react'

export const Route = createFileRoute('/invite')({
  component: InviteRoute,
})

function InviteRoute() {
  const search = useSearch({ strict: false })
  const token = (search as any).token as string | undefined
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invitation, setInvitation] = useState<ParentInvitation | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Form
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    if (!token) {
      setErrorMsg("Lien d'invitation invalide ou manquant.")
      setIsLoading(false)
      return
    }

    const fetchInvitation = async () => {
      try {
        const { data, error } = await supabase
          .from('parent_invitations')
          .select('*')
          .eq('token', token)
          .eq('status', 'pending')
          .single()

        if (error || !data) {
          setErrorMsg("Cette invitation est invalide, expirée, ou a déjà été acceptée.")
          return
        }

        setInvitation(data as ParentInvitation)
      } catch (err) {
        setErrorMsg("Erreur lors de la vérification de l'invitation.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvitation()
  }, [token])

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invitation || !fullName) return

    setIsSubmitting(true)

    try {
      // Pour une expérience "sans mot de passe", on génère un mot de passe sécurisé aléatoire.
      // Le parent pourra se reconnecter plus tard via Magic Link (OTP) sur l'app mobile ou web.
      const generatedPassword = crypto.randomUUID()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: generatedPassword,
      })

      if (authError) {
        // Si le compte existe déjà, on ne peut pas le connecter avec un mot de passe aléatoire.
        // Dans une vraie app passwordless, on enverrait un Magic Link ici.
        if (authError.message.includes('already registered')) {
           throw new Error("Ce compte email existe déjà. Veuillez utiliser la page de connexion standard avec OTP/Magic Link.")
        } else {
          throw authError
        }
      }

      // 2. Call the RPC to accept invitation and link profile
      const { data: rpcData, error: rpcError } = await supabase.rpc('accept_parent_invitation', {
        invitation_token: token,
        parent_full_name: fullName
      })

      if (rpcError) throw rpcError

      toast.success("Compte créé et lié avec succès !")
      
      // Redirect to parent dashboard (payments)
      navigate({ to: '/paiement' })

    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création du compte.")
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>Vérification de l'invitation...</p>
        </div>
      </div>
    )
  }

  if (errorMsg || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Invitation non valide</h2>
          <p className="text-gray-500">{errorMsg}</p>
          <Button onClick={() => navigate({ to: '/login' })} className="w-full">
            Aller à la page de connexion
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display text-2xl font-bold shadow-lg">
            E
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-display font-bold tracking-tight text-gray-900">
          Bienvenue sur Ereuka
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 px-4">
          Vous avez été invité par l'établissement scolaire à suivre la scolarité de votre enfant.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-gray-100">
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium">Invitation pour :</p>
              <p className="font-mono mt-1 opacity-80">{invitation.email}</p>
            </div>
          </div>

          <form onSubmit={handleAccept} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Confirmez vos nom et prénom *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="fullName"
                  placeholder="Ex: Jean Dupont"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2 mt-4" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Confirmation en cours...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Confirmer mon compte</>
              )}
            </Button>
          </form>

        </div>
      </div>
    </div>
  )
}
