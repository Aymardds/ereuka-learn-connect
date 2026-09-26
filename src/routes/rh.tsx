import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useHR } from '@/hooks/useHR';
import { 
  Briefcase, Users, FileText, Calendar, CheckCircle2, XCircle, 
  Clock, Plus, DollarSign, Filter, Download, UserCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/rh')({
  component: HRPage,
});

function HRPage() {
  const { staff, contracts, leaves, isLoading, createContract, updateLeaveStatus } = useHR();
  const [activeTab, setActiveTab] = useState<'personnel' | 'contrats' | 'conges'>('personnel');
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);

  // Contract form
  const [selectedUserId, setSelectedUserId] = useState('');
  const [contractType, setContractType] = useState<'cdi' | 'cdd' | 'vacataire' | 'stage' | 'prestataire'>('cdi');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [baseSalary, setBaseSalary] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [weeklyHours, setWeeklyHours] = useState('18');

  const handleCreateContract = async () => {
    if (!selectedUserId || !title) return;
    await createContract({
      user_id: selectedUserId,
      contract_type: contractType,
      title,
      start_date: startDate,
      base_salary: parseFloat(baseSalary || '0'),
      hourly_rate: parseFloat(hourlyRate || '0'),
      weekly_hours: parseInt(weeklyHours || '18', 10),
      status: 'active',
    });
    setIsContractDialogOpen(false);
  };

  const pendingLeaves = leaves.filter(l => l.status === 'pending');
  const totalPayroll = contracts
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + (c.base_salary || 0), 0);

  return (
    <AppShell
      title="Ressources Humaines & Personnel"
      subtitle="Gestion du personnel enseignant, contrats, vacations et congés"
      actions={
        <Button size="sm" onClick={() => setIsContractDialogOpen(true)} className="gap-1.5 text-xs bg-primary text-primary-foreground">
          <Plus className="w-3.5 h-3.5" /> Nouveau contrat
        </Button>
      }
    >
      {/* Top HR KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Personnel Enregistré</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-foreground">{staff.length}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Enseignants & Administratifs</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Contrats Actifs</span>
            <FileText className="w-4 h-4 text-accent" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-foreground">
            {contracts.filter(c => c.status === 'active').length}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">CDI, CDD & Vacations</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Masse Salariale Mensuelle</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-display text-xl font-bold text-foreground truncate">
            {totalPayroll.toLocaleString('fr-FR')} FCFA
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Salaires fixes de base</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Congés en Attente</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-amber-600">
            {pendingLeaves.length}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">À valider par la direction</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="mb-4 bg-secondary/50">
          <TabsTrigger value="personnel" className="text-xs">
            Effectif du personnel ({staff.length})
          </TabsTrigger>
          <TabsTrigger value="contrats" className="text-xs">
            Contrats de travail ({contracts.length})
          </TabsTrigger>
          <TabsTrigger value="conges" className="text-xs">
            Demandes de congés ({leaves.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Staff list */}
        <TabsContent value="personnel">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 font-semibold">Membre du personnel</th>
                    <th className="p-3 font-semibold">Rôle</th>
                    <th className="p-3 font-semibold">Contact / Email</th>
                    <th className="p-3 font-semibold">Matricule</th>
                    <th className="p-3 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {staff.map(s => (
                    <tr key={s.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{s.full_name || 'Sans nom'}</div>
                        <div className="text-[11px] text-muted-foreground">{s.qualification || 'Personnel enseignant'}</div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary">
                          {s.role}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        <div>{s.email}</div>
                        {s.phone && <div className="text-[11px] text-foreground/80">{s.phone}</div>}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">
                        {s.employee_code || 'EMP-' + s.id.substring(0, 6).toUpperCase()}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Actif
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Contracts */}
        <TabsContent value="contrats">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 font-semibold">Employé & Intitulé</th>
                    <th className="p-3 font-semibold">Type de contrat</th>
                    <th className="p-3 font-semibold">Rémunération</th>
                    <th className="p-3 font-semibold">Date de début</th>
                    <th className="p-3 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {contracts.map(c => (
                    <tr key={c.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{c.user?.full_name || 'Employé'}</div>
                        <div className="text-[11px] text-muted-foreground">{c.title}</div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-accent/20 text-accent-foreground">
                          {c.contract_type}
                        </span>
                      </td>
                      <td className="p-3 font-mono">
                        {c.base_salary > 0 ? (
                          <div className="font-semibold text-foreground">
                            {c.base_salary.toLocaleString('fr-FR')} FCFA / mois
                          </div>
                        ) : (
                          <div className="font-semibold text-foreground">
                            {c.hourly_rate.toLocaleString('fr-FR')} FCFA / heure
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground">{c.weekly_hours}h / semaine</div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">
                        {c.start_date}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Leaves */}
        <TabsContent value="conges">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 font-semibold">Demandeur</th>
                    <th className="p-3 font-semibold">Type de congé</th>
                    <th className="p-3 font-semibold">Période</th>
                    <th className="p-3 font-semibold">Motif</th>
                    <th className="p-3 font-semibold">Statut & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {leaves.map(l => (
                    <tr key={l.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-3 font-semibold text-foreground">
                        {l.user?.full_name || 'Personnel'}
                      </td>
                      <td className="p-3 uppercase text-[10px] font-bold">
                        {l.leave_type}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">
                        Du {l.start_date} au {l.end_date} ({l.days_count} jours)
                      </td>
                      <td className="p-3 text-muted-foreground italic">
                        {l.reason || 'Non spécifié'}
                      </td>
                      <td className="p-3">
                        {l.status === 'pending' ? (
                          <div className="flex items-center gap-1.5">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => updateLeaveStatus({ leaveId: l.id, status: 'approved' })}
                              className="h-7 px-2 text-[11px] text-emerald-600 border-emerald-600/30 hover:bg-emerald-50"
                            >
                              Approuver
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => updateLeaveStatus({ leaveId: l.id, status: 'rejected' })}
                              className="h-7 px-2 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10"
                            >
                              Rejeter
                            </Button>
                          </div>
                        ) : (
                          <span className={l.status === 'approved' ? 'text-emerald-600 font-bold uppercase text-[10px]' : 'text-destructive font-bold uppercase text-[10px]'}>
                            {l.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Contract Dialog */}
      <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Établir un contrat de travail</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Employé / Enseignant</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Sélectionner un collaborateur" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name || s.email} ({s.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Type de contrat</Label>
                <Select value={contractType} onValueChange={(v: any) => setContractType(v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cdi">CDI</SelectItem>
                    <SelectItem value="cdd">CDD</SelectItem>
                    <SelectItem value="vacataire">Vacataire</SelectItem>
                    <SelectItem value="stage">Stage</SelectItem>
                    <SelectItem value="prestataire">Prestataire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Date de prise d'effet</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Intitulé du poste</Label>
              <Input 
                placeholder="Ex: Professeur de Mathématiques Certifié" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 h-9 text-xs" 
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Salaire mensuel de base (FCFA)</Label>
                <Input 
                  type="number" 
                  placeholder="250000" 
                  value={baseSalary} 
                  onChange={(e) => setBaseSalary(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
              <div>
                <Label className="text-xs">Taux horaire vacation (FCFA)</Label>
                <Input 
                  type="number" 
                  placeholder="5000" 
                  value={hourlyRate} 
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Volume horaire hebdomadaire (heures)</Label>
              <Input 
                type="number" 
                value={weeklyHours} 
                onChange={(e) => setWeeklyHours(e.target.value)}
                className="mt-1 h-9 text-xs w-32" 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsContractDialogOpen(false)}>Annuler</Button>
            <Button size="sm" onClick={handleCreateContract} disabled={!selectedUserId || !title}>Créer le contrat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
