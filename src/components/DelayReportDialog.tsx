import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, SendHorizonal } from "lucide-react";

// ─── Rôles pouvant être désignés comme cause de retard ───────────────────────
const WORKFLOW_ROLES = [
    { value: "responsable_commercial", label: "Responsable Commercial" },
    { value: "responsable_logistique", label: "Responsable Logistique" },
    { value: "responsable_technique", label: "Responsable Technique" },
    { value: "responsable_achat", label: "Responsable Achat" },
    { value: "responsable_sav", label: "Responsable SAV" },
    { value: "responsable_comptabilite", label: "Responsable Comptabilité" },
    { value: "technicien_montage", label: "Technicien Montage" },
    { value: "commercial", label: "Commercial" },
    { value: "fournisseur_externe", label: "Fournisseur externe" },
];

interface DelayReportDialogProps {
    open: boolean;
    onClose: () => void;
    stepId: string;
    orderId: string;
    orderRef: string;
    stepLabel: string;
    onSuccess?: () => void;
}

export function DelayReportDialog({
    open, onClose, stepId, orderId, orderRef, stepLabel, onSuccess
}: DelayReportDialogProps) {
    const { user } = useAuth();
    const [cause, setCause] = useState("");
    const [blamedRole, setBlamedRole] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!cause.trim()) {
            toast.error("Veuillez indiquer la cause du retard.");
            return;
        }
        if (!user) return;
        setSubmitting(true);

        try {
            // 1. Enregistrer le rapport de retard
            const { error: reportError } = await supabase.from("delay_reports").insert({
                step_id: stepId,
                order_id: orderId,
                reported_by: user.id,
                cause_text: cause.trim(),
                blamed_role: blamedRole || null,
            });
            if (reportError) throw reportError;

            // 2. Mettre à jour l'étape avec la cause et service blâmé
            await supabase.from("order_workflow_steps").update({
                delay_cause: cause.trim(),
                blamed_service: blamedRole || null,
                delay_reported_at: new Date().toISOString(),
            } as any).eq("id", stepId);

            // 3. Notifier manager + directeur via fonction DB
            await supabase.rpc("notify_management" as any, {
                p_title: `Rapport de retard — ${orderRef}`,
                p_message: `Étape "${stepLabel}" : ${cause.trim()}${blamedRole ? ` (Service désigné : ${blamedRole})` : ""}`,
                p_type: "depassement",
                p_order_id: orderId,
                p_step_id: stepId,
            });

            // 4. Si un service est désigné comme cause → lui envoyer une notification d'action
            if (blamedRole) {
                await supabase.rpc("notify_users_by_role" as any, {
                    p_role: blamedRole,
                    p_title: `⚠️ Vous êtes désigné comme cause de retard — ${orderRef}`,
                    p_message: `L'étape "${stepLabel}" a été retardée. Cause signalée : ${cause.trim()}. Veuillez expliquer votre part de responsabilité.`,
                    p_type: "depassement",
                    p_order_id: orderId,
                    p_step_id: stepId,
                    p_action_required: true,
                    p_action_type: "report_delay",
                });
            }

            toast.success("Rapport de retard envoyé !");
            setCause("");
            setBlamedRole("");
            onClose();
            onSuccess?.();
        } catch (err: any) {
            console.error(err);
            toast.error("Erreur lors de l'envoi du rapport.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-5 h-5" />
                        Signaler un retard
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Commande <strong>{orderRef}</strong> — Étape : <strong>{stepLabel}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Cause du retard */}
                    <div className="space-y-1.5">
                        <Label className="text-slate-700 font-semibold">
                            Cause du retard <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            placeholder="Décrivez la cause du retard..."
                            value={cause}
                            onChange={e => setCause(e.target.value)}
                            rows={3}
                            className="resize-none"
                        />
                    </div>

                    {/* Service responsable (optionnel) */}
                    <div className="space-y-1.5">
                        <Label className="text-slate-700 font-semibold">
                            Service responsable du retard <span className="text-slate-400 font-normal">(optionnel)</span>
                        </Label>
                        <Select value={blamedRole} onValueChange={setBlamedRole}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un service..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">-- Aucun --</SelectItem>
                                {WORKFLOW_ROLES.map(r => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {blamedRole && blamedRole !== "none" && (
                            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 mt-1">
                                Ce service recevra une notification lui demandant de s'expliquer.
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || !cause.trim()}
                        className="bg-red-600 hover:bg-red-700 gap-2"
                    >
                        {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi…</>
                            : <><SendHorizonal className="w-4 h-4" />Envoyer le rapport</>
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
