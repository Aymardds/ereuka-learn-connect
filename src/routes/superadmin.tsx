import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { LayoutDashboard, Building2, Settings, LogOut, FileCheck } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from '@/hooks/useAuth';
import { cn } from "@/lib/utils";

export const Route = createFileRoute('/superadmin')({
  component: SuperAdminLayout,
})

const superAdminNav = [
  { to: "/superadmin", label: "Tableau de bord global", icon: LayoutDashboard },
  { to: "/superadmin/etablissements", label: "Établissements (Tenants)", icon: Building2 },
  { to: "/superadmin/kyc", label: "Vérifications KYC", icon: FileCheck },
] as const;

function SuperAdminLayout() {
  const { profile, user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!isLoading && profile?.role !== 'superadmin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <h1 className="text-2xl font-bold text-red-600">Accès Refusé</h1>
        <p>Vous n'avez pas les droits SuperAdmin.</p>
        <button onClick={() => navigate({ to: '/' })} className="text-primary hover:underline">Retour à l'accueil</button>
      </div>
    );
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex">
      {/* Sidebar SuperAdmin */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col hidden lg:flex">
        <div className="p-6">
          <div className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="bg-red-600 text-white p-1 rounded-md text-sm">S</span>
            Ereuka SuperAdmin
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {superAdminNav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
           <button 
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400 hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          <div className="mt-4 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-bold">
               {profile?.full_name?.substring(0,2) || 'SA'}
             </div>
             <div>
               <p className="text-sm font-medium">{profile?.full_name}</p>
               <p className="text-xs text-gray-400">Super Administrateur</p>
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
