import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { GraduationCap, Eye, EyeOff, Loader2, Mail, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginRoute,
})

function LoginRoute() {
  const isDesktop = useIsDesktop()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as any
  const redirectTo = search?.redirectTo || null
  const { session, profile } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      if (redirectTo) {
        window.location.href = redirectTo;
      } else if (profile?.role === 'responsible' || profile?.role === 'parent') {
        navigate({ to: '/portail-parent' })
      } else {
        navigate({ to: '/' })
      }
    }
  }, [session, profile, redirectTo, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        toast.error(error.message || 'Identifiants incorrects')
        return
      }

      toast.success('Connexion réussie')
      if (redirectTo) {
        window.location.href = redirectTo;
      } else {
        navigate({ to: '/' })
      }
    } catch (error) {
      toast.error('Une erreur est survenue lors de la connexion')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#FAECBE] text-stone-900 selection:bg-amber-300 selection:text-stone-950">
      
      {/* ── COLONNE GAUCHE : VISUEL AVEC /Login.jpg ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-white border-r border-[#DFCBA0]">
        
        {/* Image Login.jpg réelle */}
        <img
          src="/Login.jpg"
          alt="Enseignant et élève Eurêka ERP"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Voile naturel subtil pour lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/30 to-transparent" />

        {/* Contenu textuel au-dessus de l'image */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full text-white">
          
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 text-stone-900 border border-white/40 px-3.5 py-1 text-xs font-bold shadow-sm">
              Maternelle · Primaire · Secondaire · Supérieur
            </span>
          </div>

          {/* Bloc de texte centré descendu à 10% du trait sans les cartes */}
          <div className="space-y-3 max-w-lg mx-auto text-center mt-auto mb-4">
            <h2 className="font-display text-2xl xl:text-3xl font-black text-white leading-tight">
              L'excellence éducative au service de vos ambitions
            </h2>
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed max-w-md mx-auto">
              Une plateforme tout-en-un conçue pour simplifier la gestion quotidienne des écoles, collèges, lycées et universités africaines.
            </p>
          </div>

          <div className="text-xs text-stone-300 border-t border-white/20 pt-4 flex items-center justify-between">
            <span>Eurêka ERP v1.0.0</span>
            <span className="text-amber-300 font-semibold">eureka.inexiumus.com</span>
          </div>

        </div>

      </div>

      {/* ── COLONNE DROITE : FORMULAIRE DE CONNEXION ── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 relative z-10 overflow-y-auto">
        
        {/* En-tête avec lien retour (masqué sur desktop) */}
        <div className={`flex items-center ${isDesktop ? 'justify-end' : 'justify-between'}`}>
          {!isDesktop && (
            <Link
              to="/landing"
              className="inline-flex items-center gap-2 text-xs font-bold text-stone-700 hover:text-amber-800 transition-colors py-1.5 px-3 rounded-xl hover:bg-white/60 border border-[#DFCBA0]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à l'accueil</span>
            </Link>
          )}

          <Link
            to="/register"
            className="text-xs font-bold text-amber-800 hover:text-amber-900 transition-colors"
          >
            Créer un compte établissement &rarr;
          </Link>
        </div>

        {/* Formulaire centré dans une carte blanche chaleureuse */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="bg-white rounded-3xl border border-[#DFCBA0] p-8 sm:p-10 shadow-lg shadow-amber-950/5">
            
            {/* Logo & Titres */}
            <div className="text-center space-y-3 mb-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-600 shadow-sm">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-stone-900">
                  Eurêka <span className="text-amber-700">ERP</span>
                </h1>
                <p className="text-sm text-stone-600 mt-1 font-normal">
                  Accédez à votre espace de gestion d'établissement
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                
                {/* Champ Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-bold text-stone-700">
                    Adresse Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="directeur@ecole.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-11 bg-white border-[#D5C28F] text-stone-900 placeholder:text-stone-400 focus-visible:ring-amber-600 focus-visible:border-amber-600 rounded-xl"
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  </div>
                </div>

                {/* Champ Mot de passe */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-bold text-stone-700">
                      Mot de passe
                    </Label>
                    <Link
                      to="/reset-password"
                      className="text-xs font-semibold text-amber-800 hover:text-amber-900 transition-colors"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 pr-10 h-11 bg-white border-[#D5C28F] text-stone-900 placeholder:text-stone-400 focus-visible:ring-amber-600 focus-visible:border-amber-600 rounded-xl"
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

              </div>

              {/* Bouton de soumission */}
              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-sm transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter à mon espace'
                )}
              </Button>
            </form>

            {/* Lien d'inscription */}
            <div className="mt-6 text-center text-xs text-stone-600 border-t border-stone-100 pt-5">
              Votre établissement n'est pas encore inscrit ?{' '}
              <Link to="/register" className="font-bold text-amber-800 hover:underline">
                Créer un compte
              </Link>
            </div>

          </div>
        </div>

        {/* Footer simple */}
        <div className="text-center text-xs text-stone-600">
          © {new Date().getFullYear()} Eurêka ERP · Inexiumus · Tous droits réservés.
        </div>

      </div>

    </div>
  )
}
