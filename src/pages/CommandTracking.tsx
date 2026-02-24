import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedTimeline, WorkflowStep } from "@/components/AnimatedTimeline";
import {
    Loader2, Play, CheckCircle2, AlertCircle, Search, Filter,
    RefreshCw, ChevronRight, Clock, Package, User, Calendar, TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { JustificationDialog } from "@/components/JustificationDialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderSummary {
    id: string;
    reference: string;
    status: string;
    total_ht: number | null;
    created_at: string;
    clients: { full_name: string; company_name: string | null } | null;
    stepsTotal?: number;
    stepsCompleted?: number;
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    brouillon: { label: "Brouillon", color: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
    en_validation: { label: "En validation", color: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500 animate-pulse" },
    validee: { label: "Validée", color: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-500" },
    en_cours: { label: "En cours", color: "bg-indigo-100 text-indigo-800 border-indigo-200", dot: "bg-indigo-500 animate-pulse" },
    terminee: { label: "Terminée", color: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
    annulee: { label: "Annulée", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-400" },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

// Roles that can advance workflow steps
const ADVANCE_ROLES = ["manager", "directeur_exploitation", "responsable_commercial",
    "commercial", "responsable_logistique", "responsable_technique",
    "technicien_montage", "responsable_achat", "responsable_sav", "responsable_comptabilite"];

// ─── Order Card (list item) ────────────────────────────────────────────────────
const OrderCard = ({ order, isSelected, onClick }: { order: OrderSummary; isSelected: boolean; onClick: () => void }) => {
    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.brouillon;
    const progress = order.stepsTotal ? Math.round(((order.stepsCompleted || 0) / order.stepsTotal) * 100) : 0;

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left p-4 rounded-xl border transition-all duration-200 group",
                isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                    : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm truncate">
                            {order.reference || `#${order.id.slice(0, 8)}`}
                        </span>
                        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide", cfg.color)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                            {cfg.label}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 truncate flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {order.clients?.full_name || "Client inconnu"}
                        {order.clients?.company_name && <span className="opacity-60">— {order.clients.company_name}</span>}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(order.created_at), "dd MMM yyyy", { locale: fr })}
                        {order.total_ht != null && (
                            <span className="ml-2 font-semibold text-slate-600">{order.total_ht.toLocaleString()} €</span>
                        )}
                    </p>
                </div>
                <ChevronRight className={cn("w-4 h-4 text-slate-300 shrink-0 mt-1 transition-transform", isSelected && "text-primary rotate-90")} />
            </div>

            {/* Progress bar */}
            {order.stepsTotal ? (
                <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                        <span>{order.stepsCompleted}/{order.stepsTotal} étapes</span>
                        <span className="font-semibold text-slate-600">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            ) : null}
        </button>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CommandTracking() {
    const { user, roles, loading: authLoading } = useAuth();

    // List state
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<OrderSummary[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [listLoading, setListLoading] = useState(true);

    // Detail state
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [steps, setSteps] = useState<WorkflowStep[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [isManagerAbsent, setIsManagerAbsent] = useState(false);
    const [selectedStepForJustify, setSelectedStepForJustify] = useState<string | null>(null);

    const canAdvance = ADVANCE_ROLES.some(r => roles.includes(r as any));
    const canValidate = roles.includes("manager") || (isManagerAbsent && roles.includes("directeur_exploitation"));

    // ─── Fetch order list ──────────────────────────────────────────────────────
    const fetchOrders = useCallback(async () => {
        setListLoading(true);
        try {
            const { data, error } = await supabase
                .from("client_orders")
                .select(`id, reference, status, total_ht, created_at, clients (full_name, company_name)`)
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Fetch step counts for each order
            const withProgress: OrderSummary[] = await Promise.all(
                (data || []).map(async (o: any) => {
                    const { data: stepData } = await supabase
                        .from("order_workflow_steps")
                        .select("status")
                        .eq("order_id", o.id);
                    const total = stepData?.length || 0;
                    const completed = stepData?.filter(s => s.status === "completed").length || 0;
                    return { ...o, stepsTotal: total, stepsCompleted: completed };
                })
            );

            setOrders(withProgress);
        } catch (e: any) {
            toast.error("Erreur lors du chargement des commandes");
        } finally {
            setListLoading(false);
        }
    }, []);

    // ─── Fetch order detail ────────────────────────────────────────────────────
    const fetchDetail = useCallback(async (orderId: string) => {
        setDetailLoading(true);
        try {
            const [{ data: orderData, error: orderError }, { data: stepsData, error: stepsError }, { data: absenceData }] = await Promise.all([
                supabase.from("client_orders").select(`*, clients (full_name, company_name, email, phone)`).eq("id", orderId).single(),
                supabase.from("order_workflow_steps").select("*").eq("order_id", orderId).order("step_order", { ascending: true }),
                supabase.rpc("is_manager_absent" as any),
            ]);
            if (orderError) throw orderError;
            if (stepsError) throw stepsError;
            setSelectedOrder(orderData);
            setSteps(stepsData || []);
            setIsManagerAbsent(!!absenceData);
        } catch (e: any) {
            toast.error("Erreur lors du chargement du détail");
        } finally {
            setDetailLoading(false);
        }
    }, []);

    // ─── Filter logic ──────────────────────────────────────────────────────────
    useEffect(() => {
        let result = orders;
        if (statusFilter !== "all") result = result.filter(o => o.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(o =>
                o.reference?.toLowerCase().includes(q) ||
                o.clients?.full_name?.toLowerCase().includes(q) ||
                o.clients?.company_name?.toLowerCase().includes(q)
            );
        }
        setFilteredOrders(result);
    }, [orders, search, statusFilter]);

    // ─── Initial load + real-time ──────────────────────────────────────────────
    useEffect(() => {
        if (authLoading || !user) return;
        fetchOrders();

        const channel = supabase.channel("tracking-orders")
            .on("postgres_changes", { event: "*", schema: "public", table: "client_orders" }, () => {
                fetchOrders();
                if (selectedOrderId) fetchDetail(selectedOrderId);
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "order_workflow_steps" }, () => {
                if (selectedOrderId) fetchDetail(selectedOrderId);
                fetchOrders();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [authLoading, user, fetchOrders]);

    useEffect(() => {
        if (selectedOrderId) fetchDetail(selectedOrderId);
    }, [selectedOrderId, fetchDetail]);

    // ─── Actions ───────────────────────────────────────────────────────────────
    const handleLaunch = async () => {
        if (!selectedOrder) return;
        const { error } = await supabase.from("client_orders").update({ status: "en_validation" }).eq("id", selectedOrder.id);
        if (error) { toast.error("Erreur lors du lancement"); return; }
        toast.success("Commande lancée — en attente de validation ManagerÏ");
    };

    const handleConfirm = async () => {
        if (!selectedOrder) return;
        const { error } = await supabase.from("client_orders").update({ status: "validee" }).eq("id", selectedOrder.id);
        if (error) { toast.error("Erreur lors de la validation"); return; }
        toast.success("Commande validée !");
    };

    const handleCompleteStep = async (stepId: string) => {
        const step = steps.find(s => s.id === stepId);
        if (!step) return;

        const { error } = await supabase.from("order_workflow_steps")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", stepId);
        if (error) { toast.error("Erreur lors de la mise à jour de l'étape"); return; }

        // Auto-start next step
        const nextStep = steps.find(s => s.step_order === step.step_order + 1 && s.status === "pending");
        if (nextStep) {
            await supabase.from("order_workflow_steps")
                .update({ status: "in_progress", started_at: new Date().toISOString() })
                .eq("id", nextStep.id);
            toast.success(`Étape terminée — "${nextStep.step_name.replace(/_/g, ' ')}" démarre automatiquement`);
        } else {
            toast.success("Étape marquée comme terminée !");
        }
    };

    // ─── Stats summary ─────────────────────────────────────────────────────────
    const stats = {
        total: orders.length,
        enCours: orders.filter(o => ["en_validation", "validee", "en_cours"].includes(o.status)).length,
        delayed: orders.filter(o => {
            const order = orders.find(x => x.id === o.id);
            return order?.stepsTotal && order.stepsCompleted !== undefined &&
                order.status !== "terminee" && order.status !== "annulee";
        }).length,
        terminee: orders.filter(o => o.status === "terminee").length,
    };

    // ─── Loading state ─────────────────────────────────────────────────────────
    if (authLoading) {
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* ── Top Header ── */}
            <div className="bg-white border-b border-slate-100 px-6 py-5">
                <div className="max-w-screen-2xl mx-auto flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-primary" />
                            Suivi des Commandes
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">Suivi en temps réel du flux opérationnel</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchOrders} className="gap-2">
                        <RefreshCw className="w-4 h-4" /> Actualiser
                    </Button>
                </div>
            </div>

            {/* ── KPI Row ── */}
            <div className="max-w-screen-2xl mx-auto px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total commandes", value: stats.total, icon: Package, color: "text-slate-600" },
                    { label: "En cours", value: stats.enCours, icon: Clock, color: "text-blue-600" },
                    { label: "Terminées", value: stats.terminee, icon: CheckCircle2, color: "text-emerald-600" },
                ].map(k => (
                    <Card key={k.label} className="border-none shadow-sm">
                        <CardContent className="pt-4 pb-3 flex items-center gap-3">
                            <k.icon className={cn("w-8 h-8 opacity-80", k.color)} />
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{k.value}</p>
                                <p className="text-xs text-slate-500">{k.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Main Layout ── */}
            <div className="max-w-screen-2xl mx-auto px-6 pb-8 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
                {/* ── Left: Order List ── */}
                <div className="space-y-3">
                    {/* Search + Filter */}
                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Référence, client..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 bg-white border-slate-200"
                            />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                            <Button
                                size="sm"
                                variant={statusFilter === "all" ? "default" : "outline"}
                                className="h-7 text-xs"
                                onClick={() => setStatusFilter("all")}
                            >
                                Tout ({orders.length})
                            </Button>
                            {ALL_STATUSES.filter(s => orders.some(o => o.status === s)).map(s => (
                                <Button
                                    key={s}
                                    size="sm"
                                    variant={statusFilter === s ? "default" : "outline"}
                                    className="h-7 text-xs"
                                    onClick={() => setStatusFilter(s)}
                                >
                                    {STATUS_CONFIG[s].label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Order list */}
                    <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
                        {listLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin w-6 h-6 text-slate-400" />
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Aucune commande trouvée</p>
                            </div>
                        ) : (
                            filteredOrders.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    isSelected={selectedOrderId === order.id}
                                    onClick={() => setSelectedOrderId(order.id)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* ── Right: Order Detail ── */}
                <AnimatePresence mode="wait">
                    {!selectedOrderId ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white min-h-[400px]"
                        >
                            <div className="text-center text-slate-400 px-8">
                                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium text-slate-600">Sélectionnez une commande</p>
                                <p className="text-sm mt-1">Cliquez sur une commande dans la liste pour voir son suivi détaillé</p>
                            </div>
                        </motion.div>
                    ) : detailLoading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center rounded-2xl bg-white border border-slate-100 min-h-[400px]"
                        >
                            <Loader2 className="animate-spin w-8 h-8 text-primary" />
                        </motion.div>
                    ) : selectedOrder ? (
                        <motion.div
                            key={selectedOrderId}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-6"
                        >
                            {/* Detail Header */}
                            <Card className="border-none shadow-sm">
                                <CardHeader className="bg-slate-900 text-white rounded-t-xl pb-4">
                                    <div className="flex items-start justify-between flex-wrap gap-3">
                                        <div>
                                            <CardTitle className="text-xl flex items-center gap-2">
                                                Commande {selectedOrder.reference || `#${selectedOrder.id.slice(0, 8)}`}
                                            </CardTitle>
                                            <p className="text-slate-400 text-sm mt-1">
                                                {selectedOrder.clients?.full_name || "Client inconnu"}
                                                {selectedOrder.clients?.company_name && ` — ${selectedOrder.clients.company_name}`}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2 items-end">
                                            <Badge className={cn("text-xs capitalize", STATUS_CONFIG[selectedOrder.status]?.color || "bg-slate-100")}>
                                                <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5", STATUS_CONFIG[selectedOrder.status]?.dot)} />
                                                {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                                            </Badge>
                                            {selectedOrder.total_ht != null && (
                                                <span className="text-white font-bold text-lg">{selectedOrder.total_ht.toLocaleString()} € HT</span>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 flex flex-wrap gap-3">
                                    {selectedOrder.status === "brouillon" && canAdvance && (
                                        <Button onClick={handleLaunch} className="bg-blue-600 hover:bg-blue-700 gap-2">
                                            <Play className="w-4 h-4" /> Lancer la commande
                                        </Button>
                                    )}
                                    {selectedOrder.status === "en_validation" && canValidate && (
                                        <Button onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                                            <CheckCircle2 className="w-4 h-4" /> Confirmer & Valider
                                        </Button>
                                    )}
                                    {selectedOrder.status === "en_validation" && !canValidate && (
                                        <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 py-2 px-4 h-auto text-sm">
                                            {isManagerAbsent ? "⏳ En attente — Directeur Exploitation" : "⏳ En attente — Manager"}
                                        </Badge>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => fetchDetail(selectedOrderId!)} className="gap-2 ml-auto">
                                        <RefreshCw className="w-3 h-3" /> Rafraîchir
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Delay Alert */}
                            {steps.some(s => s.status === "delayed") && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <Card className="border-red-200 bg-red-50 shadow-sm">
                                        <CardContent className="pt-5">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <h3 className="font-bold text-red-900">⚠️ Alerte Retard</h3>
                                                    <p className="text-red-700 text-sm mt-0.5">
                                                        {steps.filter(s => s.status === "delayed").length} étape(s) ont dépassé leur délai et nécessitent une justification.
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Timeline */}
                            <Card className="border-none shadow-sm">
                                <CardHeader className="border-b bg-slate-50/50">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        Avancement du Workflow
                                        <Badge variant="secondary" className="font-normal">
                                            {steps.filter(s => s.status === "completed").length} / {steps.length} étapes
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-8">
                                    {steps.length === 0 ? (
                                        <p className="text-slate-500 text-center py-6">Aucune étape de workflow définie pour cette commande.</p>
                                    ) : (
                                        <AnimatedTimeline
                                            steps={steps}
                                            canAdvance={canAdvance}
                                            onCompleteStep={handleCompleteStep}
                                            onJustifyStep={setSelectedStepForJustify}
                                        />
                                    )}
                                </CardContent>
                            </Card>

                            {/* Order Notes */}
                            {selectedOrder.notes && (
                                <Card className="border-none shadow-sm bg-slate-50">
                                    <CardContent className="pt-5">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Notes</p>
                                        <p className="text-sm text-slate-600 italic">{selectedOrder.notes}</p>
                                    </CardContent>
                                </Card>
                            )}
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* Justification Dialog */}
            <JustificationDialog
                isOpen={!!selectedStepForJustify}
                onClose={() => setSelectedStepForJustify(null)}
                stepId={selectedStepForJustify || ""}
                onSuccess={() => selectedOrderId && fetchDetail(selectedOrderId)}
            />
        </div>
    );
}
