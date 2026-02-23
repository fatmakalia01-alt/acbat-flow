import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface JustificationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    stepId: string;
    onSuccess: () => void;
}

const ROLES = [
    { value: "manager", label: "Manager" },
    { value: "responsable_commercial", label: "Responsable Commercial" },
    { value: "responsable_achat", label: "Responsable Achat" },
    { value: "directeur_exploitation", label: "Directeur Exploitation" },
    { value: "responsable_logistique", label: "Responsable Logistique" },
    { value: "commercial", label: "Commercial" },
    { value: "responsable_technique", label: "Responsable Technique" },
    { value: "technicien_montage", label: "Technicien Montage" },
    { value: "responsable_sav", label: "Responsable SAV" },
    { value: "responsable_comptabilite", label: "Responsable Comptabilité" },
    { value: "livraison", label: "Livraison" },
];

export function JustificationDialog({ isOpen, onClose, stepId, onSuccess }: JustificationDialogProps) {
    const [note, setNote] = useState("");
    const [blamedRole, setBlamedRole] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!note.trim()) {
            toast.error("Veuillez saisir une note de justification");
            return;
        }

        setIsSubmitting(true);
        try {
            const { error: justificationError } = await supabase
                .from("workflow_justifications")
                .insert([
                    {
                        step_id: stepId,
                        content: note,
                        blamed_role: blamedRole,
                        justified_by: (await supabase.auth.getUser()).data.user?.id
                    }
                ]);

            if (justificationError) throw justificationError;

            // Update step status to 'delayed' and add note to it as well for quick view
            const { error: stepError } = await supabase
                .from("order_workflow_steps")
                .update({
                    status: "delayed",
                    notes: note + (blamedRole ? ` (Cause identifiée: ${blamedRole})` : "")
                })
                .eq("id", stepId);

            if (stepError) throw stepError;

            toast.success("Justification enregistrée");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error submitting justification:", error);
            toast.error("Erreur lors de l'enregistrement de la justification");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-5 h-5" />
                        Justifier le retard
                    </DialogTitle>
                    <DialogDescription>
                        Le délai est dépassé. Veuillez expliquer la raison du retard.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="note">Note de justification</Label>
                        <Textarea
                            id="note"
                            placeholder="Expliquez pourquoi l'étape prend du retard..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="blame">Attribuer à un autre service (Optionnel)</Label>
                        <Select value={blamedRole || "none"} onValueChange={(v) => setBlamedRole(v === "none" ? null : v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez un service" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Aucun (Retard interne)</SelectItem>
                                {ROLES.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                        {role.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Annuler
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700">
                        {isSubmitting ? "Enregistrement..." : "Confirmer la justification"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
