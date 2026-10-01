import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, Users, 
  GraduationCap, Download, Calendar, Filter, PieChart as PieIcon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, 
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell 
} from 'recharts';
import { toast } from 'sonner';

export const Route = createFileRoute('/statistiques')({
  component: StatisticsPage,
});

const ACADEMIC_PERFORMANCE = [
  { niveau: '6ème', moyenne: 13.4, tauxReussite: 88, effectif: 45 },
  { niveau: '5ème', moyenne: 12.8, tauxReussite: 82, effectif: 42 },
  { niveau: '4ème', moyenne: 11.9, tauxReussite: 75, effectif: 38 },
  { niveau: '3ème', moyenne: 12.5, tauxReussite: 79, effectif: 50 },
  { niveau: '2nde', moyenne: 11.2, tauxReussite: 70, effectif: 36 },
  { niveau: '1ère', moyenne: 12.1, tauxReussite: 76, effectif: 34 },
  { niveau: 'Terminale', moyenne: 13.0, tauxReussite: 85, effectif: 40 },
];

const PAYMENT_METHODS_DATA = [
  { name: 'Wave', value: 55, color: '#06b6d4' },
  { name: 'Orange Money', value: 25, color: '#f97316' },
  { name: 'MTN MoMo', value: 12, color: '#eab308' },
  { name: 'Moov Money', value: 5, color: '#2563eb' },
  { name: 'Carte Bancaire', value: 3, color: '#334155' },
];

function StatisticsPage() {
  const { data: stats } = useDashboardStats();
  const [timeRange, setTimeRange] = useState<'trimester' | 'year'>('trimester');

  const handleExport = (format: 'pdf' | 'excel') => {
    toast.success(`Export ${format.toUpperCase()} généré avec succès pour l'établissement.`);
  };

  return (
    <AppShell
      title="Statistiques & Reporting BI"
      subtitle="Analytiques académiques, performances des filières et ratios de recouvrement"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export Excel
          </Button>
          <Button size="sm" onClick={() => handleExport('pdf')} className="gap-1.5 text-xs bg-primary text-primary-foreground">
            <Download className="w-3.5 h-3.5" /> Rapport PDF
          </Button>
        </div>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Taux de Réussite Global</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="font-display text-3xl font-bold text-foreground">79.5%</div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              <TrendingUp className="h-3 w-3" /> +3.2%
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Moyenne générale &gt;= 10/20</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Taux de Recouvrement</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="font-display text-3xl font-bold text-foreground">84.2%</div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              <TrendingUp className="h-3 w-3" /> Objectif 90%
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Scolarités encaissées vs dues</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Taux d'Absentéisme</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="font-display text-3xl font-bold text-foreground">4.1%</div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              <TrendingDown className="h-3 w-3" /> -0.8%
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Sur les 30 derniers jours</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Part Mobile Money</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="font-display text-3xl font-bold text-accent">97%</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Wave, Orange, MTN, Moov via CinetPay</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Performance by Level Bar Chart */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-base text-foreground">Moyennes Générales par Niveau</h3>
              <p className="text-xs text-muted-foreground">Comparatif des résultats du 1er trimestre</p>
            </div>
            <span className="text-xs font-mono bg-secondary px-2.5 py-1 rounded">Échelle /20</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ACADEMIC_PERFORMANCE} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="niveau" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="moyenne" name="Moyenne" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Channels Distribution */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-base text-foreground">Canaux de Paiement</h3>
              <p className="text-xs text-muted-foreground">Répartition Mobile Money CinetPay</p>
            </div>
            <PieIcon className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="space-y-3 mt-6">
            {PAYMENT_METHODS_DATA.map(pm => (
              <div key={pm.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-foreground">{pm.name}</span>
                  <span className="font-mono font-bold text-muted-foreground">{pm.value}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${pm.value}%`, backgroundColor: pm.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-3 rounded-lg bg-secondary/30 border border-border/50 text-[11px] text-muted-foreground">
            💡 <b>Wave</b> reste le canal préféré des parents d'élèves (55% des transactions), suivi par <b>Orange Money</b>.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
