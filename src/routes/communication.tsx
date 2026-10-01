import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useCommunication } from '@/hooks/useCommunication';
import { useHR } from '@/hooks/useHR';
import { 
  MessageSquare, Bell, Megaphone, Send, Mail, CheckCircle2, 
  AlertCircle, Plus, Clock, User, Filter, Paperclip 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/communication')({
  component: CommunicationPage,
});

function CommunicationPage() {
  const { messages, announcements, notifications, sendMessage, createAnnouncement } = useCommunication();
  const { staff } = useHR();
  const [activeTab, setActiveTab] = useState<'messages' | 'annonces' | 'notifications'>('messages');
  
  // Message Dialog State
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');

  // Announcement Dialog State
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementTarget, setAnnouncementTarget] = useState<'all' | 'parent' | 'teacher' | 'student' | 'staff'>('all');
  const [announcementPriority, setAnnouncementPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  const handleSendMessage = async () => {
    if (!recipientId || !messageSubject || !messageBody) return;
    await sendMessage({
      recipientId,
      subject: messageSubject,
      body: messageBody,
    });
    setIsMessageOpen(false);
    setMessageSubject('');
    setMessageBody('');
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementTitle || !announcementContent) return;
    await createAnnouncement({
      title: announcementTitle,
      content: announcementContent,
      target_role: announcementTarget,
      priority: announcementPriority,
    });
    setIsAnnouncementOpen(false);
    setAnnouncementTitle('');
    setAnnouncementContent('');
  };

  return (
    <AppShell
      title="Communication & Messagerie"
      subtitle="Échanges internes, diffusions scolaires et notifications aux parents"
      actions={
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsAnnouncementOpen(true)} 
            className="gap-1.5 text-xs border-accent text-accent hover:bg-accent/10"
          >
            <Megaphone className="w-3.5 h-3.5" /> Diffuser une annonce
          </Button>
          <Button 
            size="sm" 
            onClick={() => setIsMessageOpen(true)} 
            className="gap-1.5 text-xs bg-primary text-primary-foreground"
          >
            <Send className="w-3.5 h-3.5" /> Nouveau message
          </Button>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="mb-6 bg-secondary/50">
          <TabsTrigger value="messages" className="text-xs gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Messagerie ({messages.length})
          </TabsTrigger>
          <TabsTrigger value="annonces" className="text-xs gap-1.5">
            <Megaphone className="w-3.5 h-3.5" /> Annonces officielles ({announcements.length})
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs gap-1.5">
            <Bell className="w-3.5 h-3.5" /> Notifications système ({notifications.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Messages */}
        <TabsContent value="messages">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <Mail className="mx-auto w-10 h-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold text-sm text-foreground">Aucun message pour le moment</h3>
              <p className="text-xs text-muted-foreground mt-1">Commencez une conversation avec un enseignant ou la direction.</p>
              <Button size="sm" onClick={() => setIsMessageOpen(true)} className="mt-4 gap-1.5 text-xs">
                <Send className="w-3.5 h-3.5" /> Rédiger un message
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map(m => (
                <div key={m.id} className="rounded-xl border border-border bg-card p-4 shadow-sm hover:border-border/80 transition-colors">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                        {m.sender?.full_name?.substring(0, 2) || 'EX'}
                      </div>
                      <div>
                        <span className="font-semibold text-xs text-foreground">{m.sender?.full_name || 'Utilisateur'}</span>
                        <span className="text-[11px] text-muted-foreground ml-2">→ {m.recipient?.full_name || 'Moi'}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{new Date(m.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="mt-2 font-semibold text-xs text-foreground">{m.subject}</div>
                  <p className="mt-1 text-xs text-foreground/80 whitespace-pre-line leading-relaxed">{m.body}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Announcements */}
        <TabsContent value="annonces">
          {announcements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <Megaphone className="mx-auto w-10 h-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold text-sm text-foreground">Aucune annonce publiée</h3>
              <p className="text-xs text-muted-foreground mt-1">Publiez une circulaire générale pour l'ensemble des parents et équipes.</p>
              <Button size="sm" onClick={() => setIsAnnouncementOpen(true)} className="mt-4 gap-1.5 text-xs">
                <Megaphone className="w-3.5 h-3.5" /> Publier une annonce
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map(a => (
                <div key={a.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        a.priority === 'urgent' 
                          ? 'bg-destructive/10 text-destructive' 
                          : a.priority === 'high' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {a.priority}
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Cible : <b className="text-foreground capitalize">{a.target_role}</b>
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(a.published_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-base text-foreground mt-2">{a.title}</h3>
                  <div className="mt-2 text-xs text-foreground/90 leading-relaxed whitespace-pre-line bg-secondary/15 p-3 rounded-lg">
                    {a.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: System Notifications */}
        <TabsContent value="notifications">
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Aucune notification récente.</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-accent" />
                    <div>
                      <div className="font-semibold text-foreground">{n.title}</div>
                      <div className="text-muted-foreground">{n.body}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(n.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Compose Message Dialog */}
      <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Rédiger un message</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Destinataire</Label>
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Choisir un destinataire" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name || s.email} ({s.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Objet</Label>
              <Input 
                placeholder="Ex: Réunion pédagogique / Relevé de notes" 
                value={messageSubject} 
                onChange={(e) => setMessageSubject(e.target.value)}
                className="mt-1 h-9 text-xs" 
              />
            </div>

            <div>
              <Label className="text-xs">Message</Label>
              <Textarea 
                placeholder="Votre message..." 
                value={messageBody} 
                onChange={(e) => setMessageBody(e.target.value)}
                rows={4}
                className="mt-1 text-xs" 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsMessageOpen(false)}>Annuler</Button>
            <Button size="sm" onClick={handleSendMessage} disabled={!recipientId || !messageSubject || !messageBody}>
              Envoyer le message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compose Announcement Dialog */}
      <Dialog open={isAnnouncementOpen} onOpenChange={setIsAnnouncementOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Publier une annonce officielle</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Public cible</Label>
              <Select value={announcementTarget} onValueChange={(v: any) => setAnnouncementTarget(v)}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tout l'établissement (Parents, Élèves, Profs)</SelectItem>
                  <SelectItem value="parent">Parents d'élèves uniquement</SelectItem>
                  <SelectItem value="teacher">Corps Enseignant</SelectItem>
                  <SelectItem value="student">Élèves / Étudiants</SelectItem>
                  <SelectItem value="staff">Personnel administratif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Priorité</Label>
                <Select value={announcementPriority} onValueChange={(v: any) => setAnnouncementPriority(v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normale</SelectItem>
                    <SelectItem value="high">Importante</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Titre</Label>
                <Input 
                  placeholder="Ex: Calendrier des Examens" 
                  value={announcementTitle} 
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Contenu de la circulaire</Label>
              <Textarea 
                placeholder="Texte détaillé de l'annonce..." 
                value={announcementContent} 
                onChange={(e) => setAnnouncementContent(e.target.value)}
                rows={5}
                className="mt-1 text-xs" 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAnnouncementOpen(false)}>Annuler</Button>
            <Button size="sm" onClick={handleCreateAnnouncement} disabled={!announcementTitle || !announcementContent}>
              Diffuser l'annonce
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
