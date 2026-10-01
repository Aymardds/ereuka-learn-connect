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
      // Vérifier si l'utilisateur est déjà connecté (cas multi-école : parent déjà inscrit ailleurs)
      const { data: { user: existingUser } } = await supabase.auth.getUser()

      if (existingUser) {
        // Le parent est déjà connecté : on appelle directement l'RPC pour lier le nouvel établissement
        const { data: rpcData, error: rpcError } = await supabase.rpc('accept_parent_invitation', {
          invitation_token: token,
          parent_full_name: fullName || existingUser.user_metadata?.full_name || fullName
        })

        if (rpcError) throw rpcError

        toast.success("Nouvel établissement lié à votre compte !")
        navigate({ to: '/portail-parent' })
        return
      }

      // Nouveau parent : créer le compte
      const generatedPassword = crypto.randomUUID()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: generatedPassword,
      })

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          // Compte existant : envoyer un magic link pour connexion puis rediriger
          const { error: otpErr } = await supabase.auth.signInWithOtp({
            email: invitation.email,
            options: {
              emailRedirectTo: `${window.location.origin}/invite?token=${token}`,
            },
          })
          if (otpErr) throw otpErr
          toast.info("Un lien de connexion a été envoyé à votre adresse email. Cliquez dessus pour lier cet établissement à votre compte existant.")
          setIsSubmitting(false)
          return
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
      
      // Redirect to parent portal
      navigate({ to: '/portail-parent' })

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

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 mb-2">Vous avez déjà un compte Eurêka ?</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate({ 
                to: '/login', 
                search: { redirectTo: `/invite?token=${token}` } as any 
              })}
              className="w-full text-xs font-semibold text-primary border-primary/30 hover:bg-primary/5"
            >
              Me connecter avec mon compte existant
            </Button>
          </div>

        </div>
      </div>
    </div>
  )
}
