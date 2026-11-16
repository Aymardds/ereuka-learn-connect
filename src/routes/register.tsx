import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, User, FileText, CheckCircle2, Upload, Loader2, ArrowRight, ArrowLeft, GraduationCap, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

const AFRICAN_COUNTRIES = [
  "Afrique du Sud",
  "Algérie",
  "Angola",
  "Bénin",
  "Botswana",
  "Burkina Faso",
  "Burundi",
  "Cameroun",
  "Cap-Vert",
  "Centrafrique (RCA)",
  "Comores",
  "Congo (Brazzaville)",
  "Congo (RDC)",
  "Côte d'Ivoire",
  "Djibouti",
  "Égypte",
  "Érythrée",
  "Eswatini",
  "Éthiopie",
  "Gabon",
  "Gambie",
  "Ghana",
  "Guinée",
  "Guinée-Bissau",
  "Guinée équatoriale",
  "Kenya",
  "Lesotho",
  "Libéria",
  "Libye",
  "Madagascar",
  "Malawi",
  "Mali",
  "Maroc",
  "Maurice",
  "Mauritanie",
  "Mozambique",
  "Namibie",
  "Niger",
  "Nigéria",
  "Ouganda",
  "Rwanda",
  "Sao Tomé-et-Principe",
  "Sénégal",
  "Seychelles",
  "Sierra Leone",
  "Somalie",
  "Soudan",
  "Soudan du Sud",
  "Tanzanie",
  "Tchad",
  "Togo",
  "Tunisie",
  "Zambie",
  "Zimbabwe"
];

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

      // 2. Create KYC Application Record
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#FAECBE] text-stone-900 selection:bg-amber-300 selection:text-stone-950">

      {/* ── COLONNE GAUCHE : VISUEL AVEC /creatAn account.jpg ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-white border-r border-[#DFCBA0]">

        {/* Image creatAn account.jpg réelle */}
        <img
          src="/creatAn account.jpg"
          alt="Création de compte Eurêka ERP"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Voile naturel subtil pour lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/35 to-transparent" />

        {/* Contenu textuel au-dessus de l'image */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full text-white">

          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 text-stone-900 border border-white/40 px-3.5 py-1 text-xs font-bold shadow-sm">
              Adhésion Établissement Scolaire
            </span>
          </div>

          {/* Bloc de texte centré descendu à 10% du trait sans les cartes */}
          <div className="space-y-3 max-w-lg mx-auto text-center mt-auto mb-4">
            <h2 className="font-display text-2xl xl:text-3xl font-black text-white leading-tight">
              Rejoignez les établissements de référence en Afrique
            </h2>
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed max-w-md mx-auto">
              Maternelle, primaire, collège, lycée ou université : Eurêka configure votre portail sur-mesure sous 24 à 48 heures ouvrables.
            </p>
          </div>

          <div className="text-xs text-stone-300 border-t border-white/20 pt-4 flex items-center justify-between">
            <span>Eurêka ERP v1.0.0</span>
            <span className="text-amber-300 font-semibold">eureka.inexiumus.com</span>
          </div>

        </div>

      </div>

      {/* ── COLONNE DROITE : PARCOURS D'INSCRIPTION ── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 lg:p-12 relative z-10 overflow-y-auto">

        {/* En-tête avec lien retour et lien vers connexion */}
        <div className="flex items-center justify-between w-full max-w-xl mx-auto">
          <Link
            to="/landing"
            className="inline-flex items-center gap-2 text-xs font-bold text-stone-700 hover:text-amber-800 transition-colors py-1.5 px-3 rounded-xl hover:bg-white/60 border border-[#DFCBA0]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </Link>

          <Link
            to="/login"
            className="text-xs font-bold text-amber-800 hover:text-amber-900 transition-colors py-1.5 px-3 rounded-xl hover:bg-white/60 border border-[#DFCBA0]"
          >
            Déjà inscrit ? Se connecter &rarr;
          </Link>
        </div>

        {/* Formulaire centré dans une carte blanche identique à Login */}
        <div className="w-full max-w-xl mx-auto my-auto py-6">
          <div className="bg-white rounded-3xl border border-[#DFCBA0] p-6 sm:p-8 shadow-lg shadow-amber-950/5">

            {/* Logo & Titres */}
            <div className="text-center space-y-2 mb-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 shadow-sm text-white">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-stone-900">
                Rejoindre Eurêka <span className="text-amber-700">ERP</span>
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 font-normal">
                Digitalisez votre établissement scolaire ou universitaire
              </p>
            </div>

            {/* Stepper Progrès en 3 étapes */}
            {step < 4 && (
              <div className="mb-6">
                <div className="flex items-center justify-between relative max-w-xs mx-auto">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-stone-200 rounded-full z-0" />
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-amber-600 rounded-full z-0 transition-all duration-300"
                    style={{ width: `${(step - 1) * 50}%` }}
                  />

                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 shadow-sm ${step >= s
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-100 text-stone-400 border border-stone-200'
                        }`}
                    >
                      {s}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[11px] font-bold text-stone-600 max-w-xs mx-auto">
                  <span className={step >= 1 ? 'text-amber-800' : ''}>1. École</span>
                  <span className={`text-center ${step >= 2 ? 'text-amber-800' : ''}`}>2. Direction</span>
                  <span className={`text-right ${step >= 3 ? 'text-amber-800' : ''}`}>3. Pièces</span>
                </div>
              </div>
            )}

            {/* Étapes du Formulaire */}
            <div className="space-y-5">

              {/* ÉTAPE 1 : Établissement */}
              {step === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
                    <div className="w-8 h-8 bg-amber-100 text-amber-800 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Informations de l'établissement</h3>
                      <p className="text-[11px] text-stone-500">Coordonnées officielles de l'école ou université.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="school_name" className="text-xs font-bold text-stone-700">
                        Nom complet de l'établissement *
                      </Label>
                      <Input
                        id="school_name"
                        name="school_name"
                        required
                        value={formData.school_name}
                        onChange={handleInputChange}
                        placeholder="Ex: Groupe Scolaire d'Excellence Saint-Jean"
                        className="h-10 bg-white border-[#D5C28F] text-stone-900 placeholder:text-stone-400 focus-visible:ring-amber-600 rounded-xl text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="address" className="text-xs font-bold text-stone-700">
                        Adresse géographique *
                      </Label>
                      <Input
                        id="address"
                        name="address"
                        required
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Quartier, avenue, commune..."
                        className="h-10 bg-white border-[#D5C28F] text-stone-900 placeholder:text-stone-400 focus-visible:ring-amber-600 rounded-xl text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="city" className="text-xs font-bold text-stone-700">
                          Ville *
                        </Label>
                        <Input
                          id="city"
                          name="city"
                          required
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="Abidjan, Dakar, Lomé..."
                          className="h-10 bg-white border-[#D5C28F] text-stone-900 focus-visible:ring-amber-600 rounded-xl text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="country" className="text-xs font-bold text-stone-700">
                          Pays (54 pays d'Afrique) *
                        </Label>
                        <div className="relative">
                          <select
                            id="country"
                            name="country"
                            required
                            value={formData.country}
                            onChange={handleInputChange}
                            className="h-10 w-full bg-white border border-[#D5C28F] text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded-xl text-sm pl-3 pr-9 appearance-none cursor-pointer"
                          >
                            <option value="">Sélectionnez votre pays...</option>
                            {AFRICAN_COUNTRIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="school_phone" className="text-xs font-bold text-stone-700">
                        Téléphone de contact *
                      </Label>
                      <Input
                        id="school_phone"
                        name="school_phone"
                        required
                        value={formData.school_phone}
                        onChange={handleInputChange}
                        placeholder="+225 07..."
                        className="h-10 bg-white border-[#D5C28F] text-stone-900 focus-visible:ring-amber-600 rounded-xl text-sm"
                      />
                    </div>

                    {/* Niveaux d'enseignement */}
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-xs font-bold text-stone-700">
                        Niveaux d'enseignement assurés *
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'Maternelle', desc: 'Petite à Grande Section' },
                          { id: 'Primaire', desc: 'CP1 au CM2' },
                          { id: 'Secondaire', desc: 'Collège & Lycée' },
                          { id: 'Supérieur', desc: 'Université & LMD' },
                        ].map((item) => {
                          const isChecked = formData.school_types.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleCheckboxChange(item.id, !isChecked)}
                              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${isChecked
                                ? 'bg-amber-50 border-amber-500 text-stone-900'
                                : 'bg-stone-50/50 border-stone-200 text-stone-700 hover:border-stone-300'
                                }`}
                            >
                              <Checkbox
                                id={`type-${item.id}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => handleCheckboxChange(item.id, checked as boolean)}
                                className="mt-0.5 data-[state=checked]:bg-amber-600 data-[state=checked]:text-white"
                              />
                              <div>
                                <div className="text-xs font-bold text-stone-900">{item.id}</div>
                                <div className="text-[10px] text-stone-500">{item.desc}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!formData.school_name || !formData.address || !formData.city || !formData.country || !formData.school_phone || formData.school_types.length === 0}
                      className="h-10 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 text-sm shadow-sm"
                    >
                      <span>Continuer vers Direction</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ÉTAPE 2 : Directeur */}
              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
                    <div className="w-8 h-8 bg-amber-100 text-amber-800 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Coordonnées du Responsable</h3>
                      <p className="text-[11px] text-stone-500">Administrateur principal du compte Eurêka.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="director_name" className="text-xs font-bold text-stone-700">
                        Nom complet du Directeur ou Fondateur *
                      </Label>
                      <Input
                        id="director_name"
                        name="director_name"
                        required
                        value={formData.director_name}
                        onChange={handleInputChange}
                        placeholder="Ex: Prof. Amadou Traoré"
                        className="h-10 bg-white border-[#D5C28F] text-stone-900 focus-visible:ring-amber-600 rounded-xl text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="director_email" className="text-xs font-bold text-stone-700">
                        Email professionnel du directeur *
                      </Label>
                      <Input
                        id="director_email"
                        name="director_email"
                        type="email"
                        required
                        value={formData.director_email}
                        onChange={handleInputChange}
                        placeholder="direction@groupe-excellence.edu"
                        className="h-10 bg-white border-[#D5C28F] text-stone-900 focus-visible:ring-amber-600 rounded-xl text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="director_phone" className="text-xs font-bold text-stone-700">
                        Téléphone direct du responsable *
                      </Label>
                      <Input
                        id="director_phone"
                        name="director_phone"
                        required
                        value={formData.director_phone}
                        onChange={handleInputChange}
                        placeholder="+225 05..."
                        className="h-10 bg-white border-[#D5C28F] text-stone-900 focus-visible:ring-amber-600 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="h-10 px-4 rounded-xl border-[#D5C28F] bg-white text-stone-700 hover:bg-stone-50 gap-2 text-sm"
                    >
                      <ArrowLeft className="w-4 h-4" /> Précédent
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!formData.director_name || !formData.director_email || !formData.director_phone}
                      className="h-10 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 text-sm shadow-sm"
                    >
                      <span>Continuer vers Justificatifs</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 : Justificatifs */}
              {step === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
                    <div className="w-8 h-8 bg-amber-100 text-amber-800 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Pièces justificatives (Optionnelles)</h3>
                      <p className="text-[11px] text-stone-500">Peuvent être fournies après validation initiale.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-stone-700">Logo de l'école (Optionnel)</Label>
                      <div className="border border-dashed border-stone-300 hover:border-amber-500 rounded-xl p-3 text-center cursor-pointer relative bg-stone-50/50">
                        <Input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'logo')} />
                        <div className="flex items-center justify-center gap-2">
                          <Upload className="w-4 h-4 text-amber-700" />
                          <span className="text-xs text-stone-700 font-medium">
                            {files.logo ? files.logo.name : "Importer un logo (PNG, JPG)"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-stone-700">Agrément d'ouverture (Optionnel)</Label>
                      <div className="border border-dashed border-stone-300 hover:border-amber-500 rounded-xl p-3 text-center cursor-pointer relative bg-stone-50/50">
                        <Input type="file" accept=".pdf,image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'registration')} />
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="w-4 h-4 text-amber-700" />
                          <span className="text-xs text-stone-700 font-medium">
                            {files.registration ? files.registration.name : "Document PDF ou scan officiel"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-stone-700">Pièce d'identité du représentant (Optionnel)</Label>
                      <div className="border border-dashed border-stone-300 hover:border-amber-500 rounded-xl p-3 text-center cursor-pointer relative bg-stone-50/50">
                        <Input type="file" accept=".pdf,image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'id_card')} />
                        <div className="flex items-center justify-center gap-2">
                          <User className="w-4 h-4 text-amber-700" />
                          <span className="text-xs text-stone-700 font-medium">
                            {files.id_card ? files.id_card.name : "CNI, Passeport ou Permis"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setStep(2)}
                      disabled={isSubmitting}
                      className="h-10 px-4 rounded-xl border-[#D5C28F] bg-white text-stone-700 hover:bg-stone-50 gap-2 text-sm"
                    >
                      <ArrowLeft className="w-4 h-4" /> Précédent
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="h-10 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 text-sm shadow-sm"
                    >
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin text-white" /> Envoi en cours...</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4" /> Soumettre la demande</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* ÉTAPE 4 : Confirmation */}
              {step === 4 && (
                <div className="animate-in fade-in zoom-in duration-500 text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-stone-900">Dossier soumis avec succès !</h2>
                    <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto mt-1">
                      Votre demande d'inscription pour <strong className="text-stone-900">{formData.school_name}</strong> a bien été enregistrée.
                    </p>
                  </div>
                  <div className="bg-[#FAF3D8] rounded-xl border border-[#E8D4A2] p-3 max-w-xs mx-auto">
                    <p className="text-[11px] text-stone-600 mb-0.5">Identifiant de suivi de dossier</p>
                    <p className="font-mono font-bold text-amber-900 text-xs break-all">{applicationId}</p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <Link to="/landing">
                      <Button variant="outline" className="rounded-xl border-[#D5C28F] bg-white text-stone-800 text-xs h-9">
                        Retour à l'accueil
                      </Button>
                    </Link>
                    <Link to="/login">
                      <Button className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9">
                        Aller à la connexion
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

            </div>

            {/* Lien d'accès en bas de carte */}
            {step < 4 && (
              <div className="mt-5 text-center text-xs text-stone-600 border-t border-stone-100 pt-4">
                Vous avez déjà des accès ?{' '}
                <Link to="/login" className="font-bold text-amber-800 hover:underline">
                  Se connecter à mon espace
                </Link>
              </div>
            )}

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
