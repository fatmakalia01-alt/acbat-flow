import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarClock, Loader2, CheckCheck } from "lucide-react";

interface ReceptionDialogProps {
    open: boolean;
    onClose: () => void;
    stepId: string;
    orderRef: string;
    stepLabel: string;
    onSuccess?: () => void;
}

export function ReceptionDialog({
    open, onClose, stepId, orderRef, stepLabel, onSuccess
}: ReceptionDialogProps) {
    const { user, roles } = useAuth();
    const [deadlineDays, setDeadlineDays] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        const days = parseInt(deadlineDays, 10);
        if (isNaN(days) || days <= 0) {
            toast.error("Veuillez saisir un délai valide (jours).");
            return;
        }
        if (!user) return;
        setSubmitting(true);

        try {
            const now = new Date();
            const dueDate = new Date(now.getTime() + days * 86_400_000).toISOString();

            // 1. Update the step: set deadline and confirm reception
            const { error: updateError } = await supabase.from("order_workflow_steps").update({
                estimated_duration_days: days,
                due_date: dueDate,
                deadline_set_at: now.toISOString(),
            } as any).eq("id", stepId);

            if (updateError) throw updateError;

            // 2. Notify management and sender (optional, but keep it transparent)
            await supabase.rpc("notify_management" as any, {
                p_title: `✅ Réception confirmée — ${orderRef}`,
                p_message: `Le service a validé la réception de l'étape "${stepLabel}" et a fixé un délai de ${days} jour(s).`,
                p_type: "info",
                p_order_id: null, // We'll skip order_id for this simple info pulse
                p_step_id: stepId,
            });

            toast.success("Réception confirmée et délai fixé !");
            setDeadlineDays("");
            onClose();
            onSuccess?.();
        } catch (err: any) {
            console.error(err);
            toast.error("Erreur lors de la confirmation de réception.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-700">
                        <CalendarClock className="w-5 h-5" />
                        Confirmer la réception
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Commande <strong>{orderRef}</strong> — Étape : <strong>{stepLabel}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        En confirmant la réception, vous vous engagez à traiter cette étape.
                        Veuillez indiquer votre **délai de traitement prévisionnel**.
                    </p>

                    <div className="space-y-1.5">
                        <Label htmlFor="deadline" className="text-slate-700 font-semibold">
                            Délai de traitement souhaité (jours) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="deadline"
                            type="number"
                            min="1"
                            max="365"
                            placeholder="Ex: 5"
                            value={deadlineDays}
                            onChange={e => setDeadlineDays(e.target.value)}
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                            Une alerte sera déclenchée si ce délai est dépassé à partir d'aujourd'hui.
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || !deadlineDays}
                        className="bg-amber-600 hover:bg-amber-700 gap-2"
                    >
                        {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Validation…</>
                            : <><CheckCheck className="w-4 h-4" /> Valider la réception</>
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
