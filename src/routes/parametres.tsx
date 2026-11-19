import { createFileRoute, redirect } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useState, useEffect, useRef } from 'react';
import { 
  Building2, Save, Upload, MapPin, Phone, GraduationCap, 
  Loader2, Lock, KeyRound, Shield, Users, Search, CheckCircle2, UserCheck, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useTeam } from '@/hooks/useTeam';
import { UserRole, UserProfile } from '@/types/database';

export const Route = createFileRoute('/parametres')({
  component: ParametresPage,
});

const AVAILABLE_ROLES: { id: UserRole; label: string; description: string; badgeColor: string }[] = [
  { id: 'teacher', label: 'Enseignant', description: 'Accès notes, devoirs, appel et cahier de texte de ses classes', badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'director', label: 'Directeur', description: 'Supervision générale, délibérations et clôtures des bulletins', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'admin', label: 'Administrateur', description: 'Gestion technique, comptes utilisateurs et paramètres globaux', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'accountant', label: 'Comptable / Économe', description: 'Gestion financière, encaissements, caisse et CinetPay', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'cashier', label: 'Caissier', description: 'Enregistrement des paiements directs en caisse et terminaux QR', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'secretary', label: 'Secrétariat Scolaire', description: 'Inscriptions des élèves et gestion des dossiers scolaires', badgeColor: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'surveillance', label: 'Surveillant Général', description: 'Gestion des absences, retards et discipline quotidienne', badgeColor: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'dean', label: 'Doyen de Faculté', description: 'Supervision académique des promotions et jurys LMD (Supérieur)', badgeColor: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'department_head', label: 'Chef de Département', description: 'Gestion des maquettes et affectations de département', badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'doctor', label: 'Santé / Infirmerie', description: 'Dossiers médicaux et infirmerie scolaire', badgeColor: 'bg-rose-100 text-rose-800 border-rose-200' },
];

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

  // Staff Roles management states (Checkbox attribution)
  const { staff = [], isLoading: isLoadingStaff, updateUserRolesMutation } = useTeam();
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  const handleToggleUserRole = async (member: UserProfile, roleId: UserRole, checked: boolean) => {
    const currentRoles = member.assigned_roles && member.assigned_roles.length > 0 
      ? [...member.assigned_roles] 
      : [member.role];

    let newRoles: string[];
    if (checked) {
      newRoles = Array.from(new Set([...currentRoles, roleId]));
    } else {
      newRoles = currentRoles.filter(r => r !== roleId);
      if (newRoles.length === 0) {
        toast.error("L'utilisateur doit conserver au moins un rôle actif.");
        return;
      }
    }

    const newPrimaryRole = (newRoles[0] as UserRole) || 'teacher';

    await updateUserRolesMutation.mutateAsync({
      userId: member.id,
      role: newPrimaryRole,
      assignedRoles: newRoles,
    });
  };

  const filteredStaffUsers = staff.filter(m => {
    const term = userSearchTerm.toLowerCase().trim();
    const matchesSearch = !term || 
      (m.full_name && m.full_name.toLowerCase().includes(term)) ||
      m.email.toLowerCase().includes(term);
    
    if (selectedRoleFilter === 'all') return matchesSearch;
    const roles = m.assigned_roles && m.assigned_roles.length > 0 ? m.assigned_roles : [m.role];
    return matchesSearch && roles.includes(selectedRoleFilter as any);
  });

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

            {schoolTypes.includes('Supérieur') && !schoolTypes.some(t => ['Maternelle', 'Primaire', 'Secondaire'].includes(t)) && (
              <div className="mt-4 rounded-lg bg-purple-50 border border-purple-200 p-3 text-xs text-purple-900 flex items-center gap-2">
                <span className="font-bold">Mode Université / Supérieur exclusif :</span> L'interface et les menus s'adaptent automatiquement au supérieur (vocabulaire Étudiants / Filières / Relevés LMD ; les modules de gestion K12 sont masqués).
              </div>
            )}

            {schoolTypes.includes('Supérieur') && schoolTypes.some(t => ['Maternelle', 'Primaire', 'Secondaire'].includes(t)) && (
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-center gap-2">
                <span className="font-bold">Mode Groupe Scolaire & Supérieur (Mixte) :</span> Les modules de l'enseignement scolaire (Maternelle à Terminale) et universitaire (LMD) cohabitent harmonieusement avec filtrage par niveau.
              </div>
            )}

            {!schoolTypes.includes('Supérieur') && schoolTypes.length > 0 && (
              <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-center gap-2">
                <span className="font-bold">Mode Groupe Scolaire (K12) :</span> Modules scolaires complets (Classes, Élèves, Bulletins trimestriels, Cahier de texte). Le module universitaire LMD est masqué pour garder votre espace épuré.
              </div>
            )}
          </div>
        </section>

        {/* SECTION ATTRIBUTION DES RÔLES PAR UTILISATEUR EN MODE CHECKBOX */}
        <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="border-b bg-gray-50/50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-500" />
              <div>
                <h2 className="text-lg font-semibold">Attribution des Rôles & Autorisations</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configurez les habilitations de chaque utilisateur de l'établissement à l'aide des cases à cocher.
                </p>
              </div>
            </div>

            {/* Recherche rapide */}
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Rechercher un collaborateur..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="h-8 pl-9 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            {isLoadingStaff ? (
              <div className="py-8 text-center text-xs text-gray-500">Chargement des collaborateurs...</div>
            ) : filteredStaffUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                Aucun collaborateur ne correspond à votre recherche.
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-xs text-gray-500">
                  Cochez ou décochez les rôles opérationnels pour chaque membre du personnel. Un utilisateur peut cumuler plusieurs attributions selon son profil (ex: Enseignant et Surveillant).
                </p>

                {filteredStaffUsers.map((member) => {
                  const currentRoles = member.assigned_roles && member.assigned_roles.length > 0 
                    ? member.assigned_roles 
                    : [member.role];

                  return (
                    <div 
                      key={member.id} 
                      className="rounded-xl border border-gray-200 p-4 bg-gray-50/40 hover:bg-gray-50/80 transition-colors space-y-3"
                    >
                      {/* En-tête collaborateur */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {member.full_name ? member.full_name.substring(0, 2) : member.email.substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                              <span>{member.full_name || "Sans nom"}</span>
                              {member.id === profile?.id && (
                                <span className="text-[10px] bg-primary text-primary-foreground font-semibold px-2 py-0.5 rounded-full">
                                  Votre compte
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{member.email}</div>
                          </div>
                        </div>

                        {/* Badges des rôles actuels */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Rôles actifs ({currentRoles.length}) :</span>
                          {currentRoles.map((r) => {
                            const found = AVAILABLE_ROLES.find(ar => ar.id === r);
                            return (
                              <span 
                                key={r} 
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${found?.badgeColor || 'bg-gray-100 text-gray-700 border-gray-300'}`}
                              >
                                {found?.label || r}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Grille de sélection des rôles en mode Checkbox */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
                        {AVAILABLE_ROLES.map((roleOpt) => {
                          const isChecked = currentRoles.includes(roleOpt.id);
                          return (
                            <label
                              key={roleOpt.id}
                              className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                                isChecked 
                                  ? 'bg-primary/5 border-primary shadow-xs' 
                                  : 'bg-white border-gray-200 hover:bg-gray-100/60 text-gray-600'
                              }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => handleToggleUserRole(member, roleOpt.id, checked as boolean)}
                                className="mt-0.5"
                              />
                              <div className="min-w-0">
                                <div className={`font-semibold ${isChecked ? 'text-gray-900' : 'text-gray-700'}`}>
                                  {roleOpt.label}
                                </div>
                                <div className="text-[10px] text-gray-500 leading-snug line-clamp-2 mt-0.5">
                                  {roleOpt.description}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
