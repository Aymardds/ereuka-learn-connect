import { createFileRoute, redirect } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useState, useEffect, useRef } from 'react';
import { Building2, Save, Upload, MapPin, Phone, GraduationCap, Loader2, Lock, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute('/parametres')({
  component: ParametresPage,
});

function ParametresPage() {
  const { profile } = useAuth();
  const { tenantQuery, updateTenantMutation, uploadLogoMutation } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [schoolTypes, setSchoolTypes] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Password change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (tenantQuery.data) {
      setName(tenantQuery.data.name || '');
      setAddress(tenantQuery.data.address || '');
      setCity(tenantQuery.data.city || '');
      setCountry(tenantQuery.data.country || '');
      setPhone(tenantQuery.data.phone || '');
      setSchoolTypes(tenantQuery.data.school_types || []);
    }
  }, [tenantQuery.data]);

  const hasAccess = profile?.role === 'admin' || profile?.role === 'director';

  if (!hasAccess) {
    return (
      <AppShell title="Paramètres">
        <div className="p-8 text-center text-red-500">
          Vous n'avez pas les droits d'accès à cette page. Seuls les administrateurs et directeurs peuvent modifier les paramètres de l'établissement.
        </div>
      </AppShell>
    );
  }

  if (tenantQuery.isLoading) {
    return <AppShell title="Paramètres"><div className="p-8">Chargement...</div></AppShell>;
  }

  const handleCheckboxChange = (type: string, checked: boolean) => {
    setSchoolTypes(prev => 
      checked ? [...prev, type] : prev.filter(t => t !== type)
    );
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (schoolTypes.length === 0) {
      toast.error('Veuillez sélectionner au moins un niveau d\'enseignement.');
      return;
    }
    await updateTenantMutation.mutateAsync({
      name,
      address,
      city,
      country,
      phone,
      school_types: schoolTypes
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Le logo ne doit pas dépasser 2Mo.');
      return;
    }

    setIsUploading(true);
    try {
      await uploadLogoMutation.mutateAsync(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const tenant = tenantQuery.data;

  return (
    <AppShell title="Paramètres de l'établissement" subtitle="Gérez les informations générales de votre école">
      <div className="max-w-4xl space-y-8 pb-12">
        
        {/* SECTION IDENTITÉ & LOGO */}
        <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="border-b bg-gray-50/50 px-6 py-4 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Identité visuelle</h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center bg-gray-50 overflow-hidden relative group">
                {tenant?.logo_url ? (
                  <img src={tenant.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-gray-400 text-center text-sm p-4">Aucun logo</div>
                )}
                
                {/* Overlay for upload */}
                <div 
                  className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6 mb-1" />}
                  <span className="text-xs font-medium">{isUploading ? 'Upload...' : 'Modifier'}</span>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleLogoUpload} 
                accept="image/png, image/jpeg, image/webp"
                className="hidden" 
              />
              <p className="text-xs text-gray-500 text-center px-4">
                Format: PNG, JPG, WEBP. Max 2Mo.
              </p>
            </div>

            <div className="md:col-span-2 flex items-center">
              <div className="w-full grid gap-2">
                <Label htmlFor="name">Nom de l'établissement</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="max-w-md text-lg"
                />
                <p className="text-sm text-gray-500 mt-1">Ce nom apparaîtra sur tous les documents officiels et bulletins.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION COORDONNÉES */}
        <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="border-b bg-gray-50/50 px-6 py-4 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Coordonnées</h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="address">Adresse physique</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">Pays</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
        </section>

        {/* SECTION PÉDAGOGIE */}
        <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="border-b bg-gray-50/50 px-6 py-4 flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Enseignement</h2>
          </div>
          
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">Sélectionnez les niveaux d'enseignement dispensés par votre établissement. Cela adaptera les fonctionnalités (ex: professeurs principaux vs professeurs par matière).</p>
            <div className="flex flex-wrap gap-4">
              {['Maternelle', 'Primaire', 'Secondaire', 'Supérieur'].map((type) => (
                <div key={type} className="flex items-center space-x-2 bg-gray-50 px-4 py-3 rounded-lg border">
                  <Checkbox 
                    id={`type-${type}`} 
                    checked={schoolTypes.includes(type)}
                    onCheckedChange={(checked) => handleCheckboxChange(type, checked as boolean)}
                  />
                  <label htmlFor={`type-${type}`} className="text-sm font-medium leading-none cursor-pointer">
                    {type === 'Supérieur' ? 'Supérieur (Université / LMD)' : type}
                  </label>
                </div>
              ))}
            </div>

            {schoolTypes.includes('Supérieur') && (
              <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
                <span className="font-bold">Mode Supérieur actif :</span> Le module Système LMD est opérationnel (Licence/Master/Doctorat, UEs, crédits ECTS, sessions normales et rattrapages).
              </div>
            )}
          </div>
        </section>

        {/* SECTION SÉCURITÉ & MOT DE PASSE */}
        <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="border-b bg-gray-50/50 px-6 py-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Sécurité du compte</h2>
          </div>
          
          <div className="p-6 max-w-xl space-y-4">
            <p className="text-sm text-gray-600">
              Modifiez le mot de passe associé à votre compte ({profile?.email || 'votre adresse email'}).
            </p>
            
            <div className="grid gap-2">
              <Label htmlFor="param-new-password">Nouveau mot de passe</Label>
              <Input
                id="param-new-password"
                type="password"
                placeholder="Au moins 6 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="param-confirm-password">Confirmer le nouveau mot de passe</Label>
              <Input
                id="param-confirm-password"
                type="password"
                placeholder="Répétez le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (newPassword.length < 6) {
                  toast.error('Le mot de passe doit comporter au moins 6 caractères');
                  return;
                }
                if (newPassword !== confirmPassword) {
                  toast.error('Les mots de passe ne correspondent pas');
                  return;
                }
                setIsChangingPassword(true);
                try {
                  const { error } = await supabase.auth.updateUser({ password: newPassword });
                  if (error) throw error;
                  toast.success('Mot de passe mis à jour avec succès');
                  setNewPassword('');
                  setConfirmPassword('');
                } catch (err: any) {
                  toast.error(err?.message || 'Erreur lors de la modification');
                } finally {
                  setIsChangingPassword(false);
                }
              }}
              disabled={isChangingPassword || !newPassword || !confirmPassword}
              className="gap-2 mt-2"
            >
              {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Changer mon mot de passe
            </Button>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="flex justify-end pt-4">
          <Button 
            size="lg" 
            onClick={handleSaveInfo} 
            disabled={updateTenantMutation.isPending || (name === tenant?.name && address === tenant?.address && city === tenant?.city && country === tenant?.country && phone === tenant?.phone && JSON.stringify(schoolTypes) === JSON.stringify(tenant?.school_types))}
            className="gap-2"
          >
            {updateTenantMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer les modifications
          </Button>
        </div>

      </div>
    </AppShell>
  );
}
