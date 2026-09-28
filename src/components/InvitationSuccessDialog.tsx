import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Copy,
  Check,
  Mail,
  Share2,
  ExternalLink,
  MessageCircle,
  BellRing,
  User,
  GraduationCap,
  School,
} from 'lucide-react';

export interface InvitationSuccessData {
  token: string;
  parentName?: string | null;
  parentEmail: string;
  parentPhone?: string | null;
  studentName?: string | null;
  schoolName?: string | null;
  isExistingUser?: boolean;
}

interface InvitationSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: InvitationSuccessData | null;
}

export function InvitationSuccessDialog({
  isOpen,
  onClose,
  data,
}: InvitationSuccessDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const inviteUrl = `${window.location.origin}/invite?token=${data.token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Lien d'invitation copié dans le presse-papiers !");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    const parentGreeting = data.parentName ? `Bonjour ${data.parentName}` : 'Bonjour';
    const childText = data.studentName ? `votre enfant ${data.studentName}` : 'votre enfant';
    const schoolText = data.schoolName ? `l'établissement ${data.schoolName}` : 'notre établissement';

    const message = `${parentGreeting},\n\n${schoolText} vous invite à rejoindre le portail Eurêka pour suivre la scolarité et effectuer les paiements de ${childText}.\n\nCliquez sur ce lien pour accepter l'invitation et lier votre compte :\n${inviteUrl}\n\nMerci et à très bientôt !`;

    let cleanPhone = data.parentPhone ? data.parentPhone.replace(/[^0-9]/g, '') : '';
    // Si format local ivoirien sans indicatif (10 chiffres)
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('225')) {
      cleanPhone = `225${cleanPhone}`;
    }

    const whatsappUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
  };

  const handleEmail = () => {
    const parentGreeting = data.parentName ? `Bonjour ${data.parentName}` : 'Bonjour';
    const childText = data.studentName ? `de votre enfant ${data.studentName}` : 'de votre enfant';
    const schoolText = data.schoolName ? data.schoolName : 'notre établissement scolaire';

    const subject = `Invitation Eurêka — Suivi scolaire ${childText}`;
    const body = `${parentGreeting},\n\nL'établissement ${schoolText} vous invite à vous connecter sur Eurêka pour suivre la scolarité ${childText} et gérer ses paiements.\n\nVeuillez cliquer sur le lien ci-dessous pour confirmer l'association :\n${inviteUrl}\n\nCordialement,\nLa direction.`;

    const mailtoUrl = `mailto:${data.parentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="text-center sm:text-left">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Invitation prête à être transmise
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                L'invitation a été enregistrée avec succès dans le système Eurêka.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Détails de la liaison */}
        <div className="rounded-xl border border-border bg-slate-50/70 p-3.5 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <User className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-semibold">Parent invité :</span>
            <span className="truncate">{data.parentName || data.parentEmail}</span>
            {data.parentPhone && (
              <span className="text-muted-foreground ml-auto">({data.parentPhone})</span>
            )}
          </div>
          {data.studentName && (
            <div className="flex items-center gap-2 text-slate-700">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-semibold">Élève concerné :</span>
              <span className="truncate font-medium text-foreground">{data.studentName}</span>
            </div>
          )}
          {data.schoolName && (
            <div className="flex items-center gap-2 text-slate-600">
              <School className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-semibold">Établissement :</span>
              <span className="truncate">{data.schoolName}</span>
            </div>
          )}
        </div>

        {/* Avis automatique in-app */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-900 flex items-start gap-2.5">
          <BellRing className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Notification Eurêka envoyée au parent</p>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Ce parent possède déjà un compte Eurêka. L'invitation est désormais active dans son{' '}
              <strong>Portail Parent</strong> et sa cloche de notifications. Dès sa connexion, il pourra l'accepter en 1 clic.
            </p>
          </div>
        </div>

        {/* Lien direct à copier */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">
            Lien d'invitation direct :
          </Label>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={inviteUrl}
              className="text-xs font-mono bg-white select-all h-9"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0 h-9 px-3 gap-1.5 text-xs font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copié !" : "Copier"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Vous pouvez également envoyer ce lien au parent par SMS ou message direct.
          </p>
        </div>

        {/* Boutons d'envoi immédiat multi-canal */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            onClick={handleWhatsApp}
            className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold gap-1.5 h-9"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            Envoyer sur WhatsApp
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleEmail}
            className="w-full text-xs font-semibold gap-1.5 h-9 border-slate-300 hover:bg-slate-100"
          >
            <Mail className="w-4 h-4 text-blue-600" />
            Envoyer par Email
          </Button>
        </div>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-full text-xs"
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
