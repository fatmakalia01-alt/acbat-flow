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

// ─── Step configuration: icons, labels and standard durations ─────────────────
// ─── Step configuration: icons, labels and standard durations ─────────────────
const STEP_CONFIG: Record<string, {
    icon: React.FC<any>;
    label: string;
    description: string;
    daysStandard: number;
    accent: string;
    accentLight: string;
    accentText: string;
    accentBorder: string;
}> = {
    commande_creee: {
        icon: ShoppingCart, label: "Commande Créée",
        description: "Commande enregistrée dans le système",
        daysStandard: 1,
        accent: "bg-emerald-500", accentLight: "bg-emerald-50",
        accentText: "text-emerald-700", accentBorder: "border-emerald-200",
    },
    verification: {
        icon: ShieldCheck, label: "Vérification",
        description: "Vérification des stocks et disponibilité",
        daysStandard: 2,
        accent: "bg-emerald-500", accentLight: "bg-emerald-50",
        accentText: "text-emerald-700", accentBorder: "border-emerald-200",
    },
    confirmation: {
        icon: CheckCircle, label: "Confirmation",
        description: "Confirmation auprès du client",
        daysStandard: 1,
        accent: "bg-emerald-500", accentLight: "bg-emerald-50",
        accentText: "text-emerald-700", accentBorder: "border-emerald-200",
    },
    preparation: {
        icon: Package, label: "Préparation",
        description: "Préparation des articles",
        daysStandard: 3,
        accent: "bg-blue-500", accentLight: "bg-blue-50",
        accentText: "text-blue-700", accentBorder: "border-blue-200",
    },
    qualite: {
        icon: ClipboardCheck, label: "Qualité",
        description: "Contrôle qualité des articles",
        daysStandard: 1,
        accent: "bg-slate-300", accentLight: "bg-slate-50",
        accentText: "text-slate-600", accentBorder: "border-slate-200",
    },
    emballage: {
        icon: Archive, label: "Emballage",
        description: "Emballage et étiquetage",
        daysStandard: 1,
        accent: "bg-slate-300", accentLight: "bg-slate-50",
        accentText: "text-slate-600", accentBorder: "border-slate-200",
    },
    expedition: {
        icon: Truck, label: "Expédition",
        description: "Remise au transporteur",
        daysStandard: 1,
        accent: "bg-slate-300", accentLight: "bg-slate-50",
        accentText: "text-slate-600", accentBorder: "border-slate-200",
    },
    transport: {
        icon: Navigation, label: "Transport",
        description: "En transit vers le client",
        daysStandard: 3,
        accent: "bg-slate-300", accentLight: "bg-slate-50",
        accentText: "text-slate-600", accentBorder: "border-slate-200",
    },
    livraison: {
        icon: Home, label: "Livraison",
        description: "Livraison et réception",
        daysStandard: 1,
        accent: "bg-slate-300", accentLight: "bg-slate-50",
        accentText: "text-slate-600", accentBorder: "border-slate-200",
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

// ─── StatusLabel helper ───────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, { label: string; icon: string; cls: string }> = {
    completed: { label: "Complétée", icon: "✓", cls: "bg-emerald-100 text-emerald-700" },
    in_progress: { label: "En cours", icon: "⏳", cls: "bg-blue-100 text-blue-700 font-bold" },
    delayed: { label: "En retard", icon: "⚠️", cls: "bg-red-100 text-red-700" },
    blocked: { label: "Bloquée", icon: "🔒", cls: "bg-orange-100 text-orange-700" },
    pending: { label: "En attente", icon: "⏸", cls: "bg-slate-100 text-slate-600" },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const AnimatedTimeline = React.forwardRef<HTMLDivElement, AnimatedTimelineProps>(
    ({ steps, onCompleteStep, onJustifyStep, canAdvance = false }, ref) => {
        const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
        const completedCount = sorted.filter(s => s.status === "completed").length;
        const progressPct = sorted.length > 0 ? (completedCount / sorted.length) * 100 : 0;

        // Find the current active step
        const activeStep = sorted.find(s => s.status === "in_progress" || s.status === "delayed")
            || sorted.find(s => s.status === "pending")
            || sorted[sorted.length - 1];

        const cfgActive = activeStep ? STEP_CONFIG[activeStep.step_name] : null;

        return (
            <div ref={ref} className="w-full space-y-8">

                {/* ── Header Progress ─────────────────────────────────────────── */}
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Suivi de Commande</h2>
                        <p className="text-sm text-slate-500 font-medium">{sorted.length} étapes du workflow client</p>
                    </div>

                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-sm font-bold text-blue-600">
                                {completedCount} sur {sorted.length} étapes complétées
                            </p>
                        </div>
                    </div>

                    {/* Animated progress bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 1.2, ease: "circOut" }}
                        />
                    </div>

                    {/* Mini step dots */}
                    <div className="flex gap-1">
                        {sorted.map((s) => (
                            <div
                                key={s.id}
                                title={STEP_CONFIG[s.step_name]?.label ?? s.step_name}
                                className={cn(
                                    "flex-1 h-1.5 rounded-full transition-all duration-500",
                                    s.status === "completed" && "bg-emerald-500",
                                    s.status === "in_progress" && "bg-blue-500 animate-pulse",
                                    s.status === "delayed" && "bg-red-500 animate-bounce",
                                    s.status === "pending" && "bg-slate-200",
                                    s.status === "blocked" && "bg-orange-400",
                                )}
                            />
                        ))}
                    </div>
                </div>

                {/* ── Steps ───────────────────────────────────────────────────── */}
                <div className="space-y-0">
                    {sorted.map((step, index) => {
                        const cfg = STEP_CONFIG[step.step_name] ?? {
                            icon: Clock, label: step.step_name, description: "", daysStandard: 0,
                            accent: "bg-slate-500", accentLight: "bg-slate-50",
                            accentText: "text-slate-600", accentBorder: "border-slate-200",
                        };
                        const Icon = cfg.icon;
                        const statusInfo = STATUS_LABEL[step.status] ?? STATUS_LABEL.pending;

                        const isCompleted = step.status === "completed";
                        const isInProgress = step.status === "in_progress";
                        const isDelayed = step.status === "delayed";
                        const isPending = step.status === "pending";
                        const isBlocked = step.status === "blocked";
                        const isLast = index === sorted.length - 1;

                        // Circle fill color
                        const circleBg = isCompleted ? "bg-emerald-500"
                            : isInProgress ? "bg-blue-500"
                                : isDelayed ? "bg-red-500"
                                    : isBlocked ? "bg-orange-500"
                                        : "bg-slate-300";

                        return (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, x: -24 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.07, duration: 0.45 }}
                                className="flex gap-5"
                            >
                                {/* ── Left: Circle + Connector ── */}
                                <div className="flex flex-col items-center">
                                    {/* Circle icon */}
                                    <motion.div
                                        className={cn(
                                            "w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md flex-shrink-0 transition-all duration-300 z-10",
                                            circleBg,
                                            isInProgress && "ring-4 ring-blue-200",
                                            isDelayed && "ring-4 ring-red-200 animate-pulse",
                                        )}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {isCompleted ? (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                            >
                                                <CheckCheck className="w-5 h-5" />
                                            </motion.div>
                                        ) : isInProgress ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                            >
                                                <Icon className="w-5 h-5" />
                                            </motion.div>
                                        ) : (
                                            <Icon className={cn("w-5 h-5", isPending && "opacity-60")} />
                                        )}
                                    </motion.div>

                                    {/* Connector line */}
                                    {!isLast && (
                                        <motion.div
                                            className={cn(
                                                "w-0.5 flex-1 my-1 rounded-full min-h-[2rem]",
                                                isCompleted ? "bg-emerald-400" : "bg-slate-200"
                                            )}
                                            initial={{ scaleY: 0 }}
                                            animate={{ scaleY: 1 }}
                                            transition={{ delay: index * 0.07 + 0.3, duration: 0.4 }}
                                            style={{ originY: 0 }}
                                        />
                                    )}
                                </div>

                                {/* ── Right: Content card ── */}
                                <div className={cn(
                                    "flex-1 mb-5 rounded-xl border p-4 transition-all duration-300",
                                    "bg-white shadow-sm hover:shadow-md",
                                    isInProgress && `${cfg.accentLight} ${cfg.accentBorder} border`,
                                    isDelayed && "bg-red-50 border-red-200",
                                    isBlocked && "bg-orange-50 border-orange-200",
                                    isPending && "border-slate-100 opacity-70",
                                )}>
                                    {/* Top row */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className={cn(
                                                "font-bold text-base",
                                                isCompleted && "text-emerald-700",
                                                isInProgress && cfg.accentText,
                                                isDelayed && "text-red-700",
                                                isBlocked && "text-orange-700",
                                                isPending && "text-slate-400",
                                            )}>
                                                {cfg.label}
                                            </h3>
                                            <p className="text-slate-500 text-xs mt-0.5">{cfg.description}</p>
                                        </div>

                                        <div className="text-right flex-shrink-0">
                                            {/* Status badge */}
                                            <span className={cn(
                                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                                                statusInfo.cls
                                            )}>
                                                <span>{statusInfo.icon}</span>
                                                {statusInfo.label}
                                            </span>

                                            {/* Duration */}
                                            {cfg.daysStandard > 0 && (
                                                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                                                    Durée standard : {cfg.daysStandard}j
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Date info row */}
                                    <div className="flex flex-wrap gap-4 mt-3">
                                        {step.started_at && (
                                            <div className="text-xs">
                                                <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">Démarré le</span>
                                                <span className="text-slate-600 font-medium">
                                                    {format(new Date(step.started_at), "dd MMM yyyy", { locale: fr })}
                                                </span>
                                            </div>
                                        )}
                                        {step.completed_at && (
                                            <div className="text-xs">
                                                <span className="text-emerald-500 font-semibold uppercase tracking-wider block text-[10px]">Terminé le</span>
                                                <span className="text-emerald-600 font-bold">
                                                    {format(new Date(step.completed_at), "dd MMM yyyy", { locale: fr })}
                                                </span>
                                            </div>
                                        )}
                                        {step.due_date && !step.completed_at && (
                                            <div className="text-xs">
                                                <span className={cn("font-semibold uppercase tracking-wider block text-[10px]", isDelayed ? "text-red-400" : "text-slate-400")}>
                                                    Échéance
                                                </span>
                                                <span className={cn("font-medium", isDelayed ? "text-red-600 font-bold" : "text-slate-600")}>
                                                    {format(new Date(step.due_date), "dd MMM yyyy", { locale: fr })}
                                                </span>
                                            </div>
                                        )}
                                        {isDelayed && step.delay_days && step.delay_days > 0 && (
                                            <div className="text-xs">
                                                <span className="text-red-400 font-semibold uppercase tracking-wider block text-[10px]">Retard</span>
                                                <span className="text-red-600 font-bold">{step.delay_days} jour(s)</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes */}
                                    {step.notes && (
                                        <div className="mt-3 flex gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                            <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-slate-600 italic leading-relaxed">{step.notes}</p>
                                        </div>
                                    )}

                                    {/* Responsible role tag */}
                                    {step.responsible_role && (
                                        <p className="mt-2 text-[10px] text-slate-400 font-semibold uppercase">
                                            👤 {step.responsible_role.replace(/_/g, ' ')}
                                        </p>
                                    )}

                                    {/* Action buttons */}
                                    {(isInProgress || isDelayed) && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {canAdvance && isInProgress && onCompleteStep && (
                                                <Button
                                                    size="sm"
                                                    className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 h-8 text-xs"
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
                                                    className="gap-1.5 h-8 text-xs"
                                                    onClick={() => onJustifyStep(step.id)}
                                                >
                                                    <MessageSquare className="w-3 h-3" />
                                                    Justifier le retard
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* ── Summary footer ──────────────────────────────────────────── */}
                {activeStep && (
                    <motion.div
                        className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col gap-1.5"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <p className="text-sm">
                            <span className="font-bold text-slate-900 leading-none">Étape actuelle: </span>
                            <span className="text-slate-600">{cfgActive?.label ?? activeStep.step_name} (étape {sorted.indexOf(activeStep) + 1} sur {sorted.length})</span>
                        </p>
                        <p className="text-sm">
                            <span className="font-bold text-slate-900 leading-none">Délai estimé: </span>
                            <span className="text-slate-600 font-medium">Livraison prévue le 2026-03-05</span>
                        </p>
                    </motion.div>
                )}
            </div>
        );
    }
);

AnimatedTimeline.displayName = "AnimatedTimeline";
