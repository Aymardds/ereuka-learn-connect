import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, User, FileText, CheckCircle2, Upload, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [applicationId, setApplicationId] = useState<string | null>(null)

  // Form Data
  const [formData, setFormData] = useState({
    school_name: '', address: '', city: '', country: '', school_phone: '',
    director_name: '', director_email: '', director_phone: '',
    school_types: [] as string[]
  })

  // Files
  const [files, setFiles] = useState({
    logo: null as File | null,
    registration: null as File | null,
    id_card: null as File | null
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCheckboxChange = (type: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      school_types: checked 
        ? [...prev.school_types, type] 
        : prev.school_types.filter(t => t !== type)
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof typeof files) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [type]: e.target.files[0] })
    }
  }

  const uploadFile = async (file: File, type: string, uuid: string) => {
    const fileExt = file.name.split('.').pop()
    const filePath = `${uuid}/${type}.${fileExt}`
    const { data, error } = await supabase.storage.from('kyc-documents').upload(filePath, file)
    if (error) throw error
    return data.path
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const appId = crypto.randomUUID()

      // 1. Upload Files if present
      let logo_url = null
      let document_registration_url = null
      let document_id_url = null

      if (files.logo) logo_url = await uploadFile(files.logo, 'logo', appId)
      if (files.registration) document_registration_url = await uploadFile(files.registration, 'registration', appId)
      if (files.id_card) document_id_url = await uploadFile(files.id_card, 'id_card', appId)

      // 2. Create KYC Application Record with all data at once
      const { error: appError } = await supabase
        .from('kyc_applications')
        .insert([{
          id: appId,
          school_name: formData.school_name,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          school_phone: formData.school_phone,
          director_name: formData.director_name,
          director_email: formData.director_email,
          director_phone: formData.director_phone,
          school_types: formData.school_types,
          logo_url,
          document_registration_url,
          document_id_url
        }])

      if (appError) throw appError

      setApplicationId(appId)
      setStep(4)
      toast.success("Dossier soumis avec succès !")

    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la soumission.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display text-2xl font-bold shadow-lg">
            E
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-display font-bold tracking-tight text-gray-900">
          Rejoindre Ereuka
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Digitalisez votre établissement scolaire en quelques étapes.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-gray-100">

          {/* Progress Bar */}
          {step < 4 && (
            <div className="mb-8">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full z-0"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-300" style={{ width: `${(step - 1) * 50}%` }}></div>

                {[1, 2, 3].map((s) => (
                  <div key={s} className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-300 ${step >= s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {s}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs font-medium text-gray-500">
                <span>Établissement</span>
                <span className="text-center">Directeur</span>
                <span className="text-right">Documents</span>
              </div>
            </div>
          )}

          {/* Form Steps */}
          <div className="space-y-6">

            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Informations de l'établissement</h3>
                    <p className="text-sm text-gray-500">Parlez-nous de votre école.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="school_name">Nom complet de l'établissement *</Label>
                    <Input id="school_name" name="school_name" required value={formData.school_name} onChange={handleInputChange} placeholder="Ex: Groupe Scolaire d'Excellence" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Adresse physique *</Label>
                    <Textarea id="address" name="address" required value={formData.address} onChange={handleInputChange} placeholder="Quartier, rue..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="city">Ville *</Label>
                      <Input id="city" name="city" required value={formData.city} onChange={handleInputChange} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="country">Pays *</Label>
                      <Input id="country" name="country" required value={formData.country} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="school_phone">Téléphone de l'école *</Label>
                    <Input id="school_phone" name="school_phone" required value={formData.school_phone} onChange={handleInputChange} />
                  </div>
                  
                  <div className="grid gap-3 pt-2">
                    <Label>Niveaux d'enseignement *</Label>
                    <div className="flex gap-4">
                      {['Maternelle', 'Primaire', 'Secondaire'].map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`type-${type}`} 
                            checked={formData.school_types.includes(type)}
                            onCheckedChange={(checked) => handleCheckboxChange(type, checked as boolean)}
                          />
                          <label htmlFor={`type-${type}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!formData.school_name || !formData.address || !formData.city || !formData.country || !formData.school_phone || formData.school_types.length === 0}
                    className="gap-2"
                  >
                    Suivant <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Coordonnées du Directeur</h3>
                    <p className="text-sm text-gray-500">Le futur administrateur principal du compte.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="director_name">Nom complet *</Label>
                    <Input id="director_name" name="director_name" required value={formData.director_name} onChange={handleInputChange} placeholder="Ex: Jean Dupont" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="director_email">Email professionnel *</Label>
                    <Input id="director_email" name="director_email" type="email" required value={formData.director_email} onChange={handleInputChange} placeholder="jean.dupont@ecole.edu" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="director_phone">Téléphone portable *</Label>
                    <Input id="director_phone" name="director_phone" required value={formData.director_phone} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Précédent
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!formData.director_name || !formData.director_email || !formData.director_phone}
                    className="gap-2"
                  >
                    Suivant <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Documents justificatifs</h3>
                    <p className="text-sm text-gray-500">Aidez-nous à vérifier votre établissement.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800">
                    Ces documents ne sont pas obligatoires pour soumettre la demande, mais ils seront nécessaires pour l'approbation finale de votre compte.
                  </div>

                  <div className="grid gap-2">
                    <Label>Logo de l'école (Optionnel)</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 hover:bg-gray-50 transition-colors text-center cursor-pointer relative">
                      <Input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'logo')} />
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-6 h-6 text-gray-400" />
                        <span className="text-sm text-gray-600 font-medium">
                          {files.logo ? files.logo.name : "Cliquez ou glissez pour ajouter une image"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Acte de création de l'établissement (Optionnel)</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 hover:bg-gray-50 transition-colors text-center cursor-pointer relative">
                      <Input type="file" accept=".pdf,image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'registration')} />
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-6 h-6 text-gray-400" />
                        <span className="text-sm text-gray-600 font-medium">
                          {files.registration ? files.registration.name : "Document PDF ou image"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Pièce d'identité du directeur (Optionnel)</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 hover:bg-gray-50 transition-colors text-center cursor-pointer relative">
                      <Input type="file" accept=".pdf,image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'id_card')} />
                      <div className="flex flex-col items-center gap-2">
                        <User className="w-6 h-6 text-gray-400" />
                        <span className="text-sm text-gray-600 font-medium">
                          {files.id_card ? files.id_card.name : "Document PDF ou image"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)} disabled={isSubmitting} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Précédent
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /> Soumettre le dossier</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-in fade-in zoom-in duration-500 text-center py-12">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Dossier soumis avec succès !</h2>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  Votre demande a bien été enregistrée. Notre équipe va examiner votre dossier dans les plus brefs délais. Vous recevrez vos accès par email une fois validé.
                </p>
                <div className="bg-gray-50 rounded-lg border p-4 max-w-sm mx-auto mb-8">
                  <p className="text-sm text-gray-500 mb-1">Numéro de suivi</p>
                  <p className="font-mono font-bold text-gray-900 break-all">{applicationId}</p>
                </div>
                <Link to="/">
                  <Button variant="outline">Retour à l'accueil</Button>
                </Link>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
