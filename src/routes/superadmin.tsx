import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { LayoutDashboard, Building2, Settings, LogOut, FileCheck, ArrowDownToLine } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from '@/hooks/useAuth';
import { cn } from "@/lib/utils";
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute('/superadmin')({
  component: SuperAdminLayout,
})

const superAdminNav = [
  { to: "/superadmin", label: "Tableau de bord global", icon: LayoutDashboard, badgeKey: 'disbursements' },
  { to: "/superadmin/etablissements", label: "Établissements (Tenants)", icon: Building2 },
  { to: "/superadmin/kyc", label: "Vérifications KYC", icon: FileCheck, badgeKey: 'kyc' },
] as const;

function SuperAdminLayout() {
  const { profile, user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDesktop = useIsDesktop();

  const pendingDisbursementsQuery = useQuery({
    queryKey: ['pending_disbursements_badge'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('disbursement_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return error ? 0 : (count || 0);
    },
    refetchInterval: 30000,
  });

  const pendingKycQuery = useQuery({
    queryKey: ['pending_kyc_badge'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('kyc_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return error ? 0 : (count || 0);
    },
    refetchInterval: 30000,
  });

  if (!isLoading && profile?.role !== 'superadmin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <h1 className="text-2xl font-bold text-red-600">Accès Refusé</h1>
        <p>Vous n'avez pas les droits SuperAdmin.</p>
        {!isDesktop ? (
          <button onClick={() => navigate({ to: '/' })} className="text-primary hover:underline">Retour à l'accueil</button>
        ) : (
          <button onClick={() => navigate({ to: '/login' })} className="text-primary hover:underline">Retour à la connexion</button>
        )}
      </div>
    );
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const pendingDisbCount = pendingDisbursementsQuery.data || 0;
  const pendingKycCount = pendingKycQuery.data || 0;

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex">
      {/* Sidebar SuperAdmin avec effet Liquide Glass Obsidian */}
      <aside className="w-64 bg-gradient-to-b from-slate-900/92 via-slate-950/96 to-[#050811]/98 backdrop-blur-2xl border-r border-white/10 text-white flex flex-col hidden lg:flex shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),6px_0_30px_rgba(0,0,0,0.35)] relative overflow-hidden">
        {/* Lueur liquide discrète */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-0 -ml-16 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 p-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)] p-1.5">
            <img src="/favicon.svg" alt="Eurêka" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="font-display text-base font-bold text-white tracking-tight leading-tight">Eurêka</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-400">SuperAdmin</div>
          </div>
        </div>

        <nav className="relative z-10 flex-1 px-3 space-y-1.5 mt-2">
          {superAdminNav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            const badgeCount = item.badgeKey === 'disbursements' ? pendingDisbCount : item.badgeKey === 'kyc' ? pendingKycCount : 0;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border",
                  active
                    ? "bg-gradient-to-r from-white/16 via-white/10 to-white/5 backdrop-blur-xl text-white font-bold border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_14px_rgba(0,0,0,0.2)]"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-white/8 hover:border-white/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-5 h-5 transition-transform duration-200", active ? "text-amber-300 drop-shadow-sm scale-110" : "text-slate-400")} />
                  {item.label}
                </div>
                {badgeCount > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.badgeKey === 'disbursements' ? 'bg-amber-500 text-white animate-pulse' : 'bg-blue-600 text-white'
                  }`}>
                    {badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="relative z-10 p-4 border-t border-white/10 space-y-3">
           <button 
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
             <div className="w-9 h-9 rounded-xl bg-red-600/90 text-white flex items-center justify-center font-bold text-xs shadow-sm">
               {profile?.full_name?.substring(0,2) || 'SA'}
             </div>
             <div className="min-w-0 flex-1">
               <p className="text-sm font-semibold text-white truncate">{profile?.full_name}</p>
               <p className="text-[11px] text-slate-400 truncate">Super Administrateur</p>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-semibold">Administration Centrale</h2>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
