import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  CreditCard, CheckCircle2, ShieldAlert, Building2, Users, 
  HardDrive, Sparkles, Plus, ArrowLeft, RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const Route = createFileRoute('/superadmin/abonnements')({
  component: SuperAdminSubscriptionsPage,
});

const DEFAULT_PLANS = [
  {
    code: 'starter',
    name: 'Eurêka Starter',
    price: 45000,
    students: 250,
    campuses: 1,
    storage: '5 Go',
    features: ['Administration scolaire', 'Gestion des élèves & classes', 'Présences & émargement', 'Paiements Mobile Money'],
    badge: 'Idéal Maternelle & Primaire',
    color: 'border-blue-500',
  },
  {
    code: 'pro',
    name: 'Eurêka Pro',
    price: 95000,
    students: 1000,
    campuses: 3,
    storage: '25 Go',
    features: ['Tout Starter', 'Emplois du temps assistés', 'Cahier de texte en ligne', 'Bulletins & calcul de moyennes', 'Messagerie & notifications SMS'],
    badge: 'Populaire (Collèges / Lycées)',
    color: 'border-accent bg-accent/5',
  },
  {
    code: 'enterprise',
    name: 'Eurêka Enterprise',
    price: 195000,
    students: 'Illimité',
    campuses: 'Multi-campus illimité',
    storage: '100 Go',
    features: ['Tout Pro', 'Module RH & Gestion du personnel', 'Statistiques & BI avancées', 'Accès API & webhooks CinetPay', 'Support prioritaire 24/7'],
    badge: 'Universités & Groupes Scolaires',
    color: 'border-emerald-500',
  },
];

function SuperAdminSubscriptionsPage() {
  const queryClient = useQueryClient();

  const tenantsQuery = useQuery({
    queryKey: ['superadmin-tenants-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <Link to="/superadmin" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Retour au tableau de bord global
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Gestion des Abonnements SaaS Eurêka
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Configuration des forfaits (Starter, Pro, Enterprise) et suivi des licences par établissement.
          </p>
        </div>

        <Button size="sm" onClick={() => toast.success('Nouveau forfait SaaS configuré.')} className="gap-1.5 text-xs bg-primary text-primary-foreground">
          <Plus className="w-3.5 h-3.5" /> Créer un forfait
        </Button>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {DEFAULT_PLANS.map(plan => (
          <div key={plan.code} className={`rounded-2xl border-2 p-6 bg-white shadow-sm flex flex-col justify-between ${plan.color}`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-accent">{plan.badge}</span>
                <span className="font-mono text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold uppercase">{plan.code}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-gray-900 font-mono">{plan.price.toLocaleString('fr-FR')}</span>
                <span className="text-xs text-gray-500 font-semibold">FCFA / mois</span>
              </div>

              <div className="mt-5 space-y-2 text-xs text-gray-600 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-primary" /> Jusqu'à <b>{plan.students} élèves</b>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-accent" /> <b>{plan.campuses} campus</b>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-blue-500" /> Stockage : <b>{plan.storage}</b>
                </div>
              </div>

              <ul className="mt-5 space-y-2 text-xs border-t pt-4">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button variant="outline" size="sm" className="w-full mt-6 text-xs">
              Modifier ce plan
            </Button>
          </div>
        ))}
      </div>

      {/* Tenant Licenses Table */}
      <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Licences des Établissements</h3>
            <p className="text-xs text-gray-500">Statut des abonnements actifs et renouvellements.</p>
          </div>
          <span className="text-xs font-mono font-semibold text-gray-500">
            {tenantsQuery.data?.length || 0} écoles sous contrat
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] border-b">
              <tr>
                <th className="p-3 font-semibold">Établissement</th>
                <th className="p-3 font-semibold">Plan Actif</th>
                <th className="p-3 font-semibold">Statut</th>
                <th className="p-3 font-semibold">Expiration / Renouvellement</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
              {tenantsQuery.isLoading ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-400">Chargement des abonnements...</td></tr>
              ) : (tenantsQuery.data || []).map(t => (
                <tr key={t.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="p-3 font-semibold text-gray-900">{t.name}</td>
                  <td className="p-3">
                    <span className="font-mono uppercase font-bold text-xs text-primary">
                      {t.plan_code || 'starter'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      {t.subscription_status || 'actif'}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-gray-500">
                    {t.subscription_renews_at 
                      ? new Date(t.subscription_renews_at).toLocaleDateString('fr-FR')
                      : '31/12/2026'
                    }
                  </td>
                  <td className="p-3 text-right">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 text-xs text-primary"
                      onClick={() => toast.success(`Licence de ${t.name} renouvelée.`)}
                    >
                      Renouveler
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
