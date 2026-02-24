import React from "react";
import { motion } from "framer-motion";
import {
    ShoppingCart, CheckCircle, Package, Warehouse,
    Wrench, Truck, ClipboardCheck, CreditCard, Archive,
    Clock, AlertCircle, Play, MessageSquare, CheckCheck,
    Loader2, ShieldCheck, Scale, Briefcase, Navigation, Home
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";

// ─── Step configuration ────────────────────────────────────────────────────────
const STEP_CONFIG: Record<string, {
    icon: React.FC<any>;
    label: string;
    description: string;
    daysStandard: number;
}> = {
    commande_creee: {
        icon: ShoppingCart, label: "Commande Créée",
        description: "Commande enregistrée dans le système",
        daysStandard: 1,
    },
    verification: {
        icon: ShieldCheck, label: "Vérification",
        description: "Vérification des stocks et disponibilité",
        daysStandard: 2,
    },
    confirmation: {
        icon: CheckCircle, label: "Confirmation",
        description: "Confirmation auprès du client",
        daysStandard: 1,
    },
    preparation: {
        icon: Package, label: "Préparation",
        description: "Préparation des articles",
        daysStandard: 3,
    },
    qualite: {
        icon: ClipboardCheck, label: "Qualité",
        description: "Contrôle qualité des articles",
        daysStandard: 1,
    },
    emballage: {
        icon: Archive, label: "Emballage",
        description: "Emballage et étiquetage",
        daysStandard: 1,
    },
    expedition: {
        icon: Truck, label: "Expédition",
        description: "Remise au transporteur",
        daysStandard: 1,
    },
    transport: {
        icon: Navigation, label: "Transport",
        description: "En transit vers le client",
        daysStandard: 3,
    },
    livraison: {
        icon: Home, label: "Livraison",
        description: "Livraison et réception",
        daysStandard: 1,
    },
    // legacy mapping for DB step names
    creation_commande: {
        icon: ShoppingCart, label: "Commande Créée",
        description: "Commande enregistrée dans le système",
        daysStandard: 1,
    },
    validation_commerciale: {
        icon: CheckCircle, label: "Confirmation",
        description: "Validation commerciale de la commande",
        daysStandard: 1,
    },
    commande_fournisseur: {
        icon: Briefcase, label: "Cmd. Fournisseur",
        description: "Commande passée au fournisseur",
        daysStandard: 2,
    },
    reception_marchandises: {
        icon: Warehouse, label: "Réception",
        description: "Réception des marchandises",
        daysStandard: 2,
    },
    preparation_technique: {
        icon: Wrench, label: "Préparation",
        description: "Préparation technique des articles",
        daysStandard: 3,
    },
    livraison_installation: {
        icon: Truck, label: "Livraison",
        description: "Livraison et installation chez le client",
        daysStandard: 1,
    },
    validation_client: {
        icon: CheckCheck, label: "Validation client",
        description: "Réception confirmée par le client",
        daysStandard: 1,
    },
    facturation_paiement: {
        icon: CreditCard, label: "Facturation",
        description: "Facturation et encaissement",
        daysStandard: 2,
    },
    cloture_archivage: {
        icon: Archive, label: "Clôture",
        description: "Clôture et archivage du dossier",
        daysStandard: 1,
    },
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WorkflowStep {
    id: string;
    step_name: string;
    step_order: number;
    status: "pending" | "in_progress" | "completed" | "delayed" | "blocked" | string;
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

// ─── Status badge config ───────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    completed: { label: "✓ Complétée", cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
    in_progress: { label: "En cours", cls: "bg-blue-100 text-blue-700 border border-blue-200 font-bold" },
    delayed: { label: "En retard", cls: "bg-red-100 text-red-700 border border-red-200" },
    blocked: { label: "Bloquée", cls: "bg-orange-100 text-orange-700 border border-orange-200" },
    pending: { label: "En attente", cls: "bg-slate-100 text-slate-500 border border-slate-200" },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const AnimatedTimeline = React.forwardRef<HTMLDivElement, AnimatedTimelineProps>(
    ({ steps, onCompleteStep, onJustifyStep, canAdvance = false }, ref) => {
        const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
        const completedCount = sorted.filter(s => s.status === "completed").length;
        const progressPct = sorted.length > 0 ? (completedCount / sorted.length) * 100 : 0;

        const activeStep = sorted.find(s => s.status === "in_progress" || s.status === "delayed")
            || sorted.find(s => s.status === "pending")
            || sorted[sorted.length - 1];

        const cfgActive = activeStep ? STEP_CONFIG[activeStep.step_name] : null;

        return (
            <div ref={ref} className="w-full space-y-6">

                {/* ── Header ──────────────────────────────────────────────────── */}
                <div className="space-y-3">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Suivi de Commande</h2>
                        <p className="text-sm text-slate-400 font-medium mt-0.5">
                            {sorted.length} étapes du workflow client
                        </p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 1.2, ease: "circOut" }}
                        />
                    </div>

                    <p className="text-xs font-semibold text-blue-600">
                        {completedCount} sur {sorted.length} étapes complétées
                    </p>
                </div>

                {/* ── Steps list ──────────────────────────────────────────────── */}
                <div className="space-y-0">
                    {sorted.map((step, index) => {
                        const cfg = STEP_CONFIG[step.step_name] ?? {
                            icon: Clock,
                            label: step.step_name.replace(/_/g, " "),
                            description: "",
                            daysStandard: 0,
                        };
                        const Icon = cfg.icon;
                        const badge = STATUS_BADGE[step.status] ?? STATUS_BADGE.pending;

                        const isCompleted = step.status === "completed";
                        const isInProgress = step.status === "in_progress";
                        const isDelayed = step.status === "delayed";
                        const isBlocked = step.status === "blocked";
                        const isPending = step.status === "pending";
                        const isLast = index === sorted.length - 1;

                        // Circle color
                        const circleBg = isCompleted ? "bg-emerald-500"
                            : isInProgress ? "bg-blue-500"
                                : isDelayed ? "bg-red-500"
                                    : isBlocked ? "bg-orange-500"
                                        : "bg-slate-200";

                        // Card border/bg
                        const cardCls = isInProgress ? "bg-blue-50/60 border-blue-200"
                            : isDelayed ? "bg-red-50 border-red-200"
                                : isBlocked ? "bg-orange-50 border-orange-200"
                                    : isCompleted ? "bg-white border-slate-100"
                                        : "bg-white border-slate-100 opacity-75";

                        // Display date (completed_at or started_at)
                        const displayDate = step.completed_at || step.started_at || null;

                        return (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.06, duration: 0.4 }}
                                className="flex gap-4"
                            >
                                {/* ── Left: circle + connector ── */}
                                <div className="flex flex-col items-center w-9 flex-shrink-0">
                                    {/* Circle */}
                                    <div className={cn(
                                        "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all duration-300",
                                        circleBg,
                                        isInProgress && "ring-4 ring-blue-100 shadow-md shadow-blue-200",
                                        isDelayed && "ring-4 ring-red-100 animate-pulse",
                                        isCompleted && "shadow-sm shadow-emerald-200",
                                    )}>
                                        {isCompleted ? (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            >
                                                <CheckCheck className="w-4 h-4 text-white" />
                                            </motion.div>
                                        ) : isInProgress ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                            >
                                                <Icon className="w-4 h-4 text-white" />
                                            </motion.div>
                                        ) : (
                                            /* For pending/blocked: show step number */
                                            <span className="text-xs font-bold text-slate-500">
                                                {index + 1}
                                            </span>
                                        )}
                                    </div>

                                    {/* Connector line */}
                                    {!isLast && (
                                        <motion.div
                                            className={cn(
                                                "w-0.5 flex-1 my-1 rounded-full min-h-[1.5rem]",
                                                isCompleted ? "bg-emerald-300" : "bg-slate-150 bg-slate-200"
                                            )}
                                            initial={{ scaleY: 0 }}
                                            animate={{ scaleY: 1 }}
                                            transition={{ delay: index * 0.06 + 0.25, duration: 0.4 }}
                                            style={{ originY: 0 }}
                                        />
                                    )}
                                </div>

                                {/* ── Right: card ── */}
                                <div className={cn(
                                    "flex-1 mb-3 rounded-xl border p-4 transition-all duration-300 shadow-sm",
                                    cardCls
                                )}>
                                    {/* Top row: title + date & duration */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className={cn(
                                                "font-bold text-sm leading-tight",
                                                isCompleted && "text-slate-800",
                                                isInProgress && "text-blue-700",
                                                isDelayed && "text-red-700",
                                                isBlocked && "text-orange-700",
                                                isPending && "text-slate-400",
                                            )}>
                                                {cfg.label}
                                            </h3>
                                            <p className="text-slate-400 text-xs mt-0.5 leading-snug">
                                                {cfg.description}
                                            </p>
                                        </div>

                                        <div className="text-right flex-shrink-0 space-y-0.5">
                                            {displayDate && (
                                                <p className="text-xs font-semibold text-slate-500">
                                                    {format(new Date(displayDate), "yyyy-MM-dd")}
                                                </p>
                                            )}
                                            {cfg.daysStandard > 0 && (
                                                <p className="text-[10px] text-slate-400">
                                                    Durée: {cfg.daysStandard} jour{cfg.daysStandard > 1 ? "s" : ""}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Due date warning */}
                                    {step.due_date && !step.completed_at && !isDelayed && (
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Échéance : {format(new Date(step.due_date), "dd MMM yyyy", { locale: fr })}
                                        </p>
                                    )}

                                    {/* Delay info */}
                                    {isDelayed && step.delay_days && step.delay_days > 0 && (
                                        <p className="text-xs text-red-600 font-bold mt-1">
                                            ⚠ Retard de {step.delay_days} jour(s)
                                        </p>
                                    )}

                                    {/* Notes */}
                                    {step.notes && (
                                        <div className="mt-2 flex gap-2 p-2 bg-white/70 rounded-lg border border-slate-100">
                                            <AlertCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-slate-500 italic leading-relaxed">{step.notes}</p>
                                        </div>
                                    )}

                                    {/* Bottom row: status badge + actions */}
                                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                                        {/* Status badge — bottom left */}
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold",
                                            badge.cls
                                        )}>
                                            {badge.label}
                                        </span>

                                        {/* Action buttons */}
                                        {(isInProgress || isDelayed) && (
                                            <div className="flex gap-2 flex-wrap">
                                                {canAdvance && isInProgress && onCompleteStep && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 h-7 text-xs px-3"
                                                        onClick={() => onCompleteStep(step.id)}
                                                    >
                                                        <Play className="w-3 h-3" />
                                                        Marquer terminée
                                                    </Button>
                                                )}
                                                {isDelayed && onJustifyStep && (
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="gap-1.5 h-7 text-xs px-3"
                                                        onClick={() => onJustifyStep(step.id)}
                                                    >
                                                        <MessageSquare className="w-3 h-3" />
                                                        Justifier le retard
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* ── Summary footer ───────────────────────────────────────────── */}
                {activeStep && (
                    <motion.div
                        className="p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <p className="text-sm">
                            <span className="font-bold text-slate-800">Étape actuelle: </span>
                            <span className="text-blue-700 font-medium underline underline-offset-2">
                                {cfgActive?.label ?? activeStep.step_name.replace(/_/g, " ")} (étape {sorted.indexOf(activeStep) + 1} sur {sorted.length})
                            </span>
                        </p>
                        {activeStep.due_date && (
                            <p className="text-sm">
                                <span className="font-bold text-slate-800">Délai actuel: </span>
                                <span className="text-slate-600">
                                    Livraison prévue le {format(new Date(activeStep.due_date), "yyyy-MM-dd")}
                                </span>
                            </p>
                        )}
                    </motion.div>
                )}

                {/* ── Legend ──────────────────────────────────────────────────── */}
                <div className="flex items-center gap-6 pt-2">
                    {[
                        { dot: "bg-emerald-500", label: "Complétée" },
                        { dot: "bg-blue-500", label: "En cours" },
                        { dot: "bg-slate-300", label: "En attente" },
                    ].map(({ dot, label }) => (
                        <div key={label} className="flex items-center gap-2">
                            <span className={cn("w-3 h-3 rounded-full flex-shrink-0", dot)} />
                            <span className="text-xs text-slate-500 font-medium">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
);

AnimatedTimeline.displayName = "AnimatedTimeline";
