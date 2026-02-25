import React from "react";
import { motion } from "framer-motion";
import {
    ShoppingCart, CheckCircle, Package, Warehouse,
    Wrench, Truck, ClipboardCheck, CreditCard, Archive, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

const stepConfig: Record<string, {
    icon: any;
    label: string;
    daysStandard: number;
    color: string;
    responsible: string[];
}> = {
    creation_commande: {
        icon: ShoppingCart,
        label: "Création",
        daysStandard: 1,
        color: "bg-blue-500",
        responsible: ["Responsable Commercial"],
    },
    validation_commerciale: {
        icon: CheckCircle,
        label: "Validation",
        daysStandard: 2,
        color: "bg-purple-500",
        responsible: ["Responsable Logistique", "Responsable Technique"],
    },
    commande_fournisseur: {
        icon: Package,
        label: "Fournisseur",
        daysStandard: 7,
        color: "bg-indigo-500",
        responsible: ["Responsable Achat"],
    },
    reception_marchandises: {
        icon: Warehouse,
        label: "Réception",
        daysStandard: 14,
        color: "bg-cyan-500",
        responsible: ["Responsable Logistique"],
    },
    preparation_technique: {
        icon: Wrench,
        label: "Préparation",
        daysStandard: 3,
        color: "bg-amber-500",
        responsible: ["Responsable Technique"],
    },
    livraison_installation: {
        icon: Truck,
        label: "Livraison",
        daysStandard: 2,
        color: "bg-orange-500",
        responsible: ["Responsable Logistique", "Technicien Montage"],
    },
    validation_client: {
        icon: ClipboardCheck,
        label: "Validation",
        daysStandard: 1,
        color: "bg-teal-500",
        responsible: ["Responsable SAV", "Commercial"],
    },
    facturation_paiement: {
        icon: CreditCard,
        label: "Facturation",
        daysStandard: 7,
        color: "bg-green-500",
        responsible: ["Responsable Comptabilité"],
    },
    cloture_archivage: {
        icon: Archive,
        label: "Clôture",
        daysStandard: 1,
        color: "bg-gray-500",
        responsible: ["Manager", "Responsable Commercial"],
    },
};

const statusStyles: Record<string, { ring: string; dot: string; badge: string }> = {
    completed: { ring: "ring-emerald-500", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800" },
    in_progress: { ring: "ring-blue-500", dot: "bg-blue-500 animate-pulse", badge: "bg-blue-100 text-blue-800" },
    delayed: { ring: "ring-red-500", dot: "bg-red-500 animate-pulse", badge: "bg-red-100 text-red-800" },
    blocked: { ring: "ring-orange-500", dot: "bg-orange-500", badge: "bg-orange-100 text-orange-800" },
    pending: { ring: "ring-border", dot: "bg-muted-foreground/30", badge: "bg-muted text-muted-foreground" },
};

const statusLabels: Record<string, string> = {
    completed: "Terminé", in_progress: "En cours", delayed: "En retard",
    blocked: "Bloqué", pending: "En attente",
};

interface WorkflowStep {
    id: string;
    step_name: string;
    step_order: number;
    status: string;
    started_at?: string | null;
    completed_at?: string | null;
    due_date?: string | null;
    delay_days?: number;
    notes?: string | null;
}

interface WorkflowTimelineProps {
    steps: WorkflowStep[];
}

const WorkflowTimeline = React.forwardRef<HTMLDivElement, WorkflowTimelineProps>(
    ({ steps }, ref) => {
        // Deduplicate by step_order — keep the most advanced status per step
        const statusPriority: Record<string, number> = { completed: 4, in_progress: 3, delayed: 2, blocked: 1, pending: 0 };
        const deduped = Object.values(
            steps.reduce((acc, step) => {
                const key = `${step.step_order}`;
                const existing = acc[key];
                if (!existing || (statusPriority[step.status] ?? 0) > (statusPriority[existing.status] ?? 0)) {
                    acc[key] = step;
                }
                return acc;
            }, {} as Record<string, WorkflowStep>)
        );
        const sorted = deduped.sort((a, b) => a.step_order - b.step_order);
        const completedCount = sorted.filter(s => s.status === "completed").length;
        const progressPct = sorted.length > 0 ? (completedCount / sorted.length) * 100 : 0;

        return (
            <div ref={ref} className="space-y-4">
                {/* Progress bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{completedCount} / {sorted.length} étapes complétées</span>
                        <span>{Math.round(progressPct)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                    </div>
                </div>

                {/* Steps */}
                <div className="relative">
                    {/* Vertical connector line */}
                    <div className="absolute left-[18px] top-5 bottom-5 w-0.5 bg-border" />
                    {/* Animated fill */}
                    <motion.div
                        className="absolute left-[18px] top-5 w-0.5 bg-gradient-to-b from-primary to-emerald-500 origin-top"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: progressPct / 100 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        style={{ height: "calc(100% - 40px)" }}
                    />

                    <div className="space-y-1">
                        {sorted.map((step, i) => {
                            const config = stepConfig[step.step_name];
                            const style = statusStyles[step.status] || statusStyles.pending;
                            const Icon = config?.icon || Clock;

                            return (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.07, duration: 0.4 }}
                                    className="flex items-start gap-4 relative pl-10 py-2.5"
                                >
                                    {/* Icon bubble */}
                                    <div className={cn(
                                        "absolute left-0 h-9 w-9 rounded-full flex items-center justify-center ring-2 bg-background flex-shrink-0",
                                        style.ring
                                    )}>
                                        <div className={cn("h-2.5 w-2.5 rounded-full absolute bottom-0 right-0", style.dot)} />
                                        <Icon className={cn("h-4 w-4", step.status === "completed" ? "text-emerald-500" :
                                            step.status === "in_progress" ? "text-blue-500" :
                                                step.status === "delayed" ? "text-red-500" : "text-muted-foreground/50")} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Step label + status badge */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={cn("text-sm font-semibold", step.status === "pending" && "text-muted-foreground")}>
                                                {config?.label || step.step_name}
                                            </span>
                                            <Badge className={cn("text-xs px-1.5 py-0.5", style.badge)}>
                                                {statusLabels[step.status] || step.status}
                                            </Badge>
                                            {step.delay_days && step.delay_days > 0 && (
                                                <Badge className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700">
                                                    +{step.delay_days}j
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Responsible services */}
                                        {config?.responsible && config.responsible.length > 0 && (
                                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                                {config.responsible.map((r, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="text-[11px] font-medium text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5 leading-tight"
                                                    >
                                                        {r}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Dates */}
                                        <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                                            {config?.daysStandard && (
                                                <span>Délai standard: {config.daysStandard}j</span>
                                            )}
                                            {step.completed_at && (
                                                <span>Terminé: {format(new Date(step.completed_at), "dd/MM/yyyy", { locale: fr })}</span>
                                            )}
                                            {step.due_date && step.status !== "completed" && (
                                                <span>Échéance: {format(new Date(step.due_date), "dd/MM/yyyy", { locale: fr })}</span>
                                            )}
                                        </div>
                                        {step.notes && (
                                            <p className="text-xs text-muted-foreground mt-1 italic">{step.notes}</p>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }
);

WorkflowTimeline.displayName = "WorkflowTimeline";

export default WorkflowTimeline;
