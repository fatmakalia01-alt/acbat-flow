import { motion } from "framer-motion";
import {
    ShoppingCart, CheckCircle, Package, Warehouse,
    Wrench, Truck, ClipboardCheck, CreditCard, Archive, Clock, AlertCircle, Play, MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const stepConfig: Record<string, { icon: any; label: string; daysStandard: number; color: string }> = {
    creation_commande: { icon: ShoppingCart, label: "Création commande", daysStandard: 1, color: "bg-blue-500" },
    validation_commerciale: { icon: CheckCircle, label: "Validation commerciale", daysStandard: 2, color: "bg-purple-500" },
    commande_fournisseur: { icon: Package, label: "Cmd fournisseur", daysStandard: 7, color: "bg-indigo-500" },
    reception_marchandises: { icon: Warehouse, label: "Réception marchandises", daysStandard: 14, color: "bg-cyan-500" },
    preparation_technique: { icon: Wrench, label: "Préparation technique", daysStandard: 3, color: "bg-amber-500" },
    livraison_installation: { icon: Truck, label: "Livraison / Installation", daysStandard: 2, color: "bg-orange-500" },
    validation_client: { icon: ClipboardCheck, label: "Validation client", daysStandard: 1, color: "bg-teal-500" },
    facturation_paiement: { icon: CreditCard, label: "Facturation / Paiement", daysStandard: 7, color: "bg-green-500" },
    cloture_archivage: { icon: Archive, label: "Clôture & Archivage", daysStandard: 1, color: "bg-gray-500" },
};

const statusStyles: Record<string, { ring: string; dot: string; badge: string; iconColor: string }> = {
    completed: { ring: "ring-emerald-500", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800", iconColor: "text-emerald-500" },
    in_progress: { ring: "ring-blue-500", dot: "bg-blue-500 animate-pulse", badge: "bg-blue-100 text-blue-800", iconColor: "text-blue-500" },
    delayed: { ring: "ring-red-500", dot: "bg-red-500 animate-bounce", badge: "bg-red-100 text-red-800", iconColor: "text-red-500" },
    blocked: { ring: "ring-orange-500", dot: "bg-orange-500", badge: "bg-orange-100 text-orange-800", iconColor: "text-orange-500" },
    pending: { ring: "ring-border", dot: "bg-muted-foreground/30", badge: "bg-muted text-muted-foreground", iconColor: "text-muted-foreground/50" },
};

const statusLabels: Record<string, string> = {
    completed: "Terminé", in_progress: "En cours", delayed: "En retard",
    blocked: "Bloqué", pending: "En attente",
};

export interface WorkflowStep {
    id: string;
    step_name: string;
    step_order: number;
    status: string;
    started_at?: string | null;
    completed_at?: string | null;
    due_date?: string | null;
    delay_days?: number;
    notes?: string | null;
    responsible_role?: string | null;
}

interface AnimatedTimelineProps {
    steps: WorkflowStep[];
    onCompleteStep?: (stepId: string) => void;
    onJustifyStep?: (stepId: string) => void;
    canAdvance?: boolean;
}

export const AnimatedTimeline = ({ steps, onCompleteStep, onJustifyStep, canAdvance = false }: AnimatedTimelineProps) => {
    const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
    const completedCount = sorted.filter(s => s.status === "completed").length;
    const progressPct = sorted.length > 0 ? (completedCount / sorted.length) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Progress bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-700">{completedCount} sur {sorted.length} étapes terminées</span>
                    <span className="text-primary font-bold">{Math.round(progressPct)}%</span>
                </div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 1, ease: "circOut" }}
                    />
                </div>
            </div>

            {/* Steps */}
            <div className="relative pt-2">
                {/* Vertical connector line */}
                <div className="absolute left-[22px] top-8 bottom-8 w-1 bg-slate-200 rounded-full" />
                {/* Animated fill line */}
                <motion.div
                    className="absolute left-[22px] top-8 w-1 bg-gradient-to-b from-blue-600 to-emerald-500 origin-top rounded-full"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: progressPct / 100 }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                    style={{ height: "calc(100% - 64px)" }}
                />

                <div className="space-y-8">
                    {sorted.map((step, i) => {
                        const config = stepConfig[step.step_name];
                        const style = statusStyles[step.status] || statusStyles.pending;
                        const Icon = config?.icon || Clock;
                        const isDelayed = step.status === "delayed";
                        const isInProgress = step.status === "in_progress";

                        return (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08, duration: 0.4 }}
                                className="flex items-start gap-6 relative pl-14"
                            >
                                {/* Icon bubble */}
                                <div className={cn(
                                    "absolute left-0 h-11 w-11 rounded-full flex items-center justify-center ring-4 bg-white shadow-lg transition-all duration-300",
                                    style.ring,
                                    isDelayed && "animate-pulse"
                                )}>
                                    <div className={cn("h-3 w-3 rounded-full absolute -top-1 -right-1 border-2 border-white", style.dot)} />
                                    <Icon className={cn("h-5 w-5", style.iconColor)} />
                                </div>

                                {/* Content Card */}
                                <div className={cn(
                                    "flex-1 p-5 rounded-xl border bg-white shadow-sm transition-all duration-300 hover:shadow-md",
                                    isInProgress ? "border-blue-200 bg-blue-50/30" :
                                        isDelayed ? "border-red-200 bg-red-50/30" : "border-slate-100"
                                )}>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className={cn("font-bold text-slate-800", step.status === "pending" && "text-slate-400")}>
                                                {config?.label || step.step_name}
                                            </h3>
                                            <Badge className={cn("text-[10px] uppercase tracking-wider", style.badge)}>
                                                {statusLabels[step.status] || step.status}
                                            </Badge>
                                        </div>
                                        {step.responsible_role && (
                                            <span className="text-[10px] font-semibold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">
                                                {step.responsible_role.replace(/_/g, ' ')}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Délai standard</p>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                                <Clock className="w-3 h-3 text-slate-400" />
                                                <span>{config?.daysStandard || 0} jour(s)</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Échéance</p>
                                            <p className={cn("text-xs font-medium", isDelayed ? "text-red-600 font-bold" : "text-slate-700")}>
                                                {step.due_date ? format(new Date(step.due_date), "dd MMM yyyy", { locale: fr }) : "Non définie"}
                                            </p>
                                        </div>
                                    </div>

                                    {step.completed_at && (
                                        <p className="mt-2 text-[11px] text-emerald-600 font-medium">
                                            ✓ Terminé le {format(new Date(step.completed_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                                        </p>
                                    )}

                                    {step.notes && (
                                        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 flex gap-2">
                                            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                            <p className="text-xs text-slate-600 leading-relaxed italic">{step.notes}</p>
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="mt-4 flex gap-2 flex-wrap">
                                        {canAdvance && isInProgress && onCompleteStep && (
                                            <Button
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-700 gap-2 h-8 text-xs"
                                                onClick={() => onCompleteStep(step.id)}
                                            >
                                                <Play className="w-3 h-3" /> Marquer terminée
                                            </Button>
                                        )}
                                        {isDelayed && onJustifyStep && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="gap-2 h-8 text-xs"
                                                onClick={() => onJustifyStep(step.id)}
                                            >
                                                <MessageSquare className="w-3 h-3" /> Justifier le retard
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
