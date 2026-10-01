import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  KeyRound, Mail, Lock, ArrowLeft, CheckCircle2, 
  Eye, EyeOff, Loader2, ShieldCheck, AlertCircle 
} from 'lucide-react'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Detect recovery mode from URL hash, search params or auth state
  useEffect(() => {
    // 1. Check URL hash (Supabase implicit flow)
    const hash = window.location.hash
    if (hash && (hash.includes('type=recovery') || hash.includes('access_token='))) {
      setIsRecoveryMode(true)
    }

    // 2. Check query params (Supabase PKCE code exchange)
    const params = new URLSearchParams(window.location.search)
    if (params.get('code') || params.get('type') === 'recovery') {
      setIsRecoveryMode(true)
    }

    // 3. Listen to Supabase Auth State changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 1. Request Reset Password Link
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Veuillez renseigner votre adresse email')
      return
    }

    setIsLoading(true)
    try {
      const redirectUrl = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      })

      if (error) {
        toast.error(error.message || 'Impossible d\'envoyer le lien de réinitialisation')
        return
      }

      setIsEmailSent(true)
      toast.success('Lien envoyé ! Vérifiez votre boîte de réception.')
    } catch (err: any) {
      toast.error(err?.message || 'Une erreur inattendue est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  // 2. Submit New Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit comporter au moins 6 caractères')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        toast.error(error.message || 'Impossible de mettre à jour le mot de passe')
        return
      }

      setIsSuccess(true)
      toast.success('Votre mot de passe a été mis à jour avec succès !')
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigate({ to: '/login' })
      }, 3000)
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la mise à jour')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50 ring-1 ring-gray-100">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {isSuccess
              ? 'Mot de passe réinitialisé !'
              : isRecoveryMode
                ? 'Nouveau mot de passe'
                : isEmailSent
                  ? 'Vérifiez votre boîte mail'
                  : 'Mot de passe oublié ?'}
          </h1>
          <p className="text-sm text-gray-500">
            {isSuccess
              ? 'Vous pouvez maintenant vous connecter avec vos nouveaux identifiants.'
              : isRecoveryMode
                ? 'Saisissez votre nouveau mot de passe ci-dessous.'
                : isEmailSent
                  ? `Un email avec un lien de réinitialisation a été envoyé à ${email}.`
                  : 'Entrez votre email pour recevoir les instructions de réinitialisation.'}
          </p>
        </div>

        {/* State 1: Password reset successfully */}
        {isSuccess ? (
          <div className="space-y-6 pt-2 text-center">
            <div className="flex justify-center text-emerald-500">
              <CheckCircle2 className="h-16 w-16 animate-in zoom-in-75 duration-300" />
            </div>
            <p className="text-sm text-gray-600">
              Redirection automatique vers la page de connexion dans quelques instants...
            </p>
            <Button
              className="w-full"
              onClick={() => navigate({ to: '/login' })}
            >
              Aller à la connexion
            </Button>
          </div>
        ) : isRecoveryMode ? (
          /* State 2: Set New Password Form (from recovery link) */
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Au moins 6 caractères"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Répétez le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password strength checklist */}
              <div className="rounded-lg bg-gray-50 p-3 space-y-1.5 text-xs text-gray-600 border border-gray-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`h-4 w-4 ${newPassword.length >= 6 ? 'text-emerald-500' : 'text-gray-400'}`} />
                  <span>Au moins 6 caractères ({newPassword.length}/6)</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`h-4 w-4 ${newPassword && newPassword === confirmPassword ? 'text-emerald-500' : 'text-gray-400'}`} />
                  <span>Les mots de passe sont identiques</span>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour en cours...
                </>
              ) : (
                'Mettre à jour le mot de passe'
              )}
            </Button>
          </form>
        ) : isEmailSent ? (
          /* State 3: Confirmation email sent */
          <div className="space-y-6 pt-2">
            <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-4 text-blue-900 text-sm space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <Mail className="h-4 w-4 text-blue-600" />
                <span>Email de réinitialisation envoyé</span>
              </div>
              <p className="text-xs text-blue-700">
                Cliquez sur le lien contenu dans l'email pour définir votre nouveau mot de passe.
                Pensez à vérifier vos courriers indésirables (spams).
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsEmailSent(false)}
              >
                Renvoyer à une autre adresse
              </Button>
              <Link
                to="/login"
                className="inline-flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors pt-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la connexion
              </Link>
            </div>
          </div>
        ) : (
          /* State 4: Initial Request Form */
          <form onSubmit={handleRequestReset} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@ecole.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-9"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                'Envoyer le lien de réinitialisation'
              )}
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la page de connexion
              </Link>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
