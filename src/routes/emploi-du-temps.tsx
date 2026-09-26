import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useTimetable } from '@/hooks/useTimetable';
import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';
import { 
  CalendarDays, Plus, Clock, MapPin, User, Trash2, Filter, 
  Printer, AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/emploi-du-temps')({
  component: TimetablePage,
});

const DAYS = [
  { id: 1, name: 'Lundi' },
  { id: 2, name: 'Mardi' },
  { id: 3, name: 'Mercredi' },
  { id: 4, name: 'Jeudi' },
  { id: 5, name: 'Vendredi' },
  { id: 6, name: 'Samedi' },
];

function TimetablePage() {
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { classes } = useClasses();
  const { subjects } = useSubjects();
  const { slots, isLoadingSlots, createSlot, deleteSlot } = useTimetable(selectedClassId);

  // Form state
  const [formClassId, setFormClassId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formDay, setFormDay] = useState('1');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formRoom, setFormRoom] = useState('');

  const handleCreate = async () => {
    if (!formClassId || !formSubjectId) return;
    await createSlot({
      class_id: formClassId,
      subject_id: formSubjectId,
      day_of_week: parseInt(formDay, 10),
      start_time: formStartTime,
      end_time: formEndTime,
      room_name: formRoom || 'Salle standard',
    });
    setIsDialogOpen(false);
  };

  const getSlotsForDay = (dayId: number) => {
    return slots
      .filter(s => s.day_of_week === dayId)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  return (
    <AppShell
      title="Emploi du Temps"
      subtitle="Gestion hebdomadaire des cours, salles et enseignants"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5" /> Imprimer
          </Button>
          <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-1.5 text-xs bg-primary text-primary-foreground">
            <Plus className="w-3.5 h-3.5" /> Ajouter un créneau
          </Button>
        </div>
      }
    >
      {/* Top filters */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Filtrer par classe :</span>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-56 h-9 text-xs">
              <SelectValue placeholder="Toutes les classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les classes ({classes.length})</SelectItem>
              {classes.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground">
          Total : <span className="font-bold text-foreground">{slots.length}</span> créneaux enregistrés
        </div>
      </div>

      {/* Timetable Weekly Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {DAYS.map(day => {
          const daySlots = getSlotsForDay(day.id);
          return (
            <div key={day.id} className="flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="bg-primary/5 px-3 py-2.5 border-b border-border flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">{day.name}</span>
                <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {daySlots.length} cours
                </span>
              </div>

              <div className="p-2 space-y-2 flex-1 min-h-[300px] bg-card">
                {daySlots.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground italic p-4 text-center">
                    Aucun cours programmé
                  </div>
                ) : (
                  daySlots.map(slot => (
                    <div 
                      key={slot.id} 
                      className="group relative rounded-lg border border-border/80 bg-secondary/30 hover:bg-secondary/70 p-2.5 transition-colors"
                    >
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <Clock className="w-3 h-3" /> {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                        </span>
                        <button 
                          onClick={() => deleteSlot(slot.id)}
                          className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 p-1 rounded transition-opacity"
                          title="Supprimer ce créneau"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="mt-1 font-semibold text-xs text-foreground truncate">
                        {slot.subject?.name || 'Matière'}
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded truncate max-w-[100px]">
                          {slot.class?.name}
                        </span>
                        {slot.room_name && (
                          <span className="flex items-center gap-0.5 text-muted-foreground truncate">
                            <MapPin className="w-2.5 h-2.5" /> {slot.room_name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Slot Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Ajouter un créneau de cours</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Classe</Label>
              <Select value={formClassId} onValueChange={setFormClassId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Matière</Label>
              <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Sélectionner une matière" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} (coeff {s.coefficient})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Jour de la semaine</Label>
              <Select value={formDay} onValueChange={setFormDay}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Jour" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Heure de début</Label>
                <Input 
                  type="time" 
                  value={formStartTime} 
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
              <div>
                <Label className="text-xs">Heure de fin</Label>
                <Input 
                  type="time" 
                  value={formEndTime} 
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Salle ou amphithéâtre</Label>
              <Input 
                placeholder="Ex: Salle B12, Labo SVT, Amphi A" 
                value={formRoom} 
                onChange={(e) => setFormRoom(e.target.value)}
                className="mt-1 h-9 text-xs" 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button size="sm" onClick={handleCreate} disabled={!formClassId || !formSubjectId}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
