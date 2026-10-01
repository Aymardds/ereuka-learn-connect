import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useCourseLogs } from '@/hooks/useCourseLogs';
import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';
import { 
  BookCheck, Plus, Calendar, BookOpen, Clock, 
  CheckCircle2, AlertCircle, FileText, Filter 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/cahier-de-texte')({
  component: CourseLogsPage,
});

function CourseLogsPage() {
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { classes } = useClasses();
  const { subjects } = useSubjects();
  const { courseLogs, isLoading, createCourseLog } = useCourseLogs(selectedClassId);

  // Form State
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [contentSummary, setContentSummary] = useState('');
  const [homeworkAssigned, setHomeworkAssigned] = useState('');
  const [homeworkDueDate, setHomeworkDueDate] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);

  const handleCreate = async () => {
    if (!classId || !subjectId || !title || !contentSummary) return;
    await createCourseLog({
      class_id: classId,
      subject_id: subjectId,
      title,
      chapter_title: chapterTitle || null,
      content_summary: contentSummary,
      homework_assigned: homeworkAssigned || null,
      homework_due_date: homeworkDueDate || null,
      session_date: sessionDate,
    });
    setIsDialogOpen(false);
    setTitle('');
    setChapterTitle('');
    setContentSummary('');
    setHomeworkAssigned('');
  };

  return (
    <AppShell
      title="Cahier de Texte & Suivi Pédagogique"
      subtitle="Journalisation des séances de cours, devoirs et progression du programme"
      actions={
        <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-1.5 text-xs bg-primary text-primary-foreground">
          <Plus className="w-3.5 h-3.5" /> Nouvelle séance
        </Button>
      }
    >
      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Classe :</span>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-56 h-9 text-xs">
              <SelectValue placeholder="Toutes les classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les classes</SelectItem>
              {classes.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{courseLogs.length}</span> séances enregistrées
        </div>
      </div>

      {/* Course logs list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Chargement du cahier de texte...</div>
        ) : courseLogs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <BookCheck className="mx-auto w-10 h-10 text-muted-foreground/50 mb-3" />
            <h3 className="font-semibold text-sm text-foreground">Aucune séance enregistrée</h3>
            <p className="text-xs text-muted-foreground mt-1">Ajoutez la première séance de cours avec les devoirs assignés.</p>
            <Button size="sm" onClick={() => setIsDialogOpen(true)} className="mt-4 gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Enregistrer une séance
            </Button>
          </div>
        ) : (
          courseLogs.map(log => (
            <div key={log.id} className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-border/80 transition-colors">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary">
                      {log.class?.name}
                    </span>
                    <span className="text-xs font-semibold text-accent uppercase">
                      {log.subject?.name}
                    </span>
                    {log.chapter_title && (
                      <span className="text-xs text-muted-foreground">
                        · {log.chapter_title}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display font-bold text-base text-foreground mt-1.5">
                    {log.title}
                  </h3>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> {log.session_date}
                  </span>
                  {log.is_validated_by_inspection ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Conforme
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" /> En attente visa
                    </span>
                  )}
                </div>
              </div>

              {/* Content body */}
              <div className="mt-3 text-xs text-foreground/90 leading-relaxed whitespace-pre-line bg-secondary/20 p-3 rounded-lg">
                {log.content_summary}
              </div>

              {/* Homework if present */}
              {log.homework_assigned && (
                <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs">
                  <div className="flex items-center justify-between font-semibold text-accent">
                    <span>Devoir / Travail à faire :</span>
                    {log.homework_due_date && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Pour le : {log.homework_due_date}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-foreground/80">{log.homework_assigned}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Renseigner une séance de cours</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Classe</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Sélectionner" />
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
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date de la séance</Label>
                <Input 
                  type="date" 
                  value={sessionDate} 
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
              <div>
                <Label className="text-xs">Chapitre / Module (optionnel)</Label>
                <Input 
                  placeholder="Ex: Chapitre 3 - Les Équations" 
                  value={chapterTitle} 
                  onChange={(e) => setChapterTitle(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Titre de la leçon / Notion abordée</Label>
              <Input 
                placeholder="Ex: Résolution par substitution et applications pratiques" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 h-9 text-xs" 
              />
            </div>

            <div>
              <Label className="text-xs">Déroulement et contenu du cours</Label>
              <Textarea 
                placeholder="Décrivez les objectifs atteints, exercices corrigés et notions abordées durant la séance..." 
                value={contentSummary} 
                onChange={(e) => setContentSummary(e.target.value)}
                rows={4}
                className="mt-1 text-xs" 
              />
            </div>

            <div className="border-t border-border pt-3">
              <Label className="text-xs font-semibold text-accent">Travail de maison / Devoir (optionnel)</Label>
              <Textarea 
                placeholder="Exercices 4 et 5 page 42 du manuel..." 
                value={homeworkAssigned} 
                onChange={(e) => setHomeworkAssigned(e.target.value)}
                rows={2}
                className="mt-1 text-xs" 
              />
              <div className="mt-2">
                <Label className="text-xs">Date limite de rendu</Label>
                <Input 
                  type="date" 
                  value={homeworkDueDate} 
                  onChange={(e) => setHomeworkDueDate(e.target.value)}
                  className="mt-1 h-9 text-xs w-48" 
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button size="sm" onClick={handleCreate} disabled={!classId || !subjectId || !title || !contentSummary}>
              Enregistrer la séance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
