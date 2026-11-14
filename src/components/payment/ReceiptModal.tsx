import { CheckCircle2, Printer, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaymentBadge } from './PaymentLogos';

export interface ReceiptData {
  receiptNumber: string;
  transactionRef?: string;
  studentName: string;
  className?: string;
  schoolName: string;
  title: string;
  amount: number;
  totalDue?: number;
  remaining?: number;
  method: string;
  paidAt: string;
  parentEmail?: string;
  isPartial?: boolean;
}

interface ReceiptModalProps {
  receipt: ReceiptData | null;
  onClose: () => void;
}

export function ReceiptModal({ receipt, onClose }: ReceiptModalProps) {
  return (
    <Dialog open={!!receipt} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden bg-white">
        {receipt && (
          <>
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-center text-white">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-lg font-bold">{receipt.schoolName}</h2>
              <p className="text-xs text-emerald-100 mt-0.5">REÇU OFFICIEL DE PAIEMENT</p>
              <p className="text-sm font-mono font-bold mt-2 bg-white/20 rounded-lg px-3 py-1 inline-block">
                {receipt.receiptNumber}
              </p>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Amount */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Montant Perçu</p>
                <p className="text-3xl font-black text-emerald-700 mt-1">
                  {Number(receipt.amount).toLocaleString('fr-FR')}
                  <span className="text-base ml-1 font-semibold">FCFA</span>
                </p>
                {receipt.remaining != null && receipt.remaining > 0 && (
                  <p className="text-xs text-amber-700 font-semibold mt-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                    Reste à payer : {Number(receipt.remaining).toLocaleString('fr-FR')} FCFA
                  </p>
                )}
              </div>

              {/* Details */}
              <div className="bg-slate-50 rounded-xl border border-border p-3 space-y-2 text-xs">
                {[
                  { label: 'Élève', value: receipt.studentName },
                  receipt.className ? { label: 'Classe', value: receipt.className } : null,
                  { label: 'Motif / Tranche', value: receipt.title },
                  { label: 'Date du paiement', value: receipt.paidAt },
                ].filter(Boolean).map((row: any) => (
                  <div key={row.label} className="flex justify-between items-start gap-2">
                    <span className="text-muted-foreground shrink-0">{row.label} :</span>
                    <span className="font-semibold text-foreground text-right">{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center gap-2 pt-1 border-t border-border">
                  <span className="text-muted-foreground">Mode de règlement :</span>
                  <PaymentBadge method={receipt.method} size="sm" />
                </div>
                {receipt.transactionRef && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Réf. transaction :</span>
                    <span className="font-mono text-[10px] text-slate-600">{receipt.transactionRef}</span>
                  </div>
                )}
              </div>

              <p className="text-center text-[10px] text-muted-foreground">
                Ce reçu numérique certifie l'encaissement régulier dans le système Eurêka.
              </p>
            </div>

            <DialogFooter className="p-4 pt-0 flex gap-2 sm:flex-row">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5" /> Imprimer
              </Button>
              <Button size="sm" className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onClose}>
                <X className="w-3.5 h-3.5" /> Fermer
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
