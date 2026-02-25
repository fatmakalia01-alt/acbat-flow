import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedTimeline, WorkflowStep } from "@/components/AnimatedTimeline";
import {
    Loader2, Play, CheckCircle2, AlertCircle, Search, Filter,
    RefreshCw, ChevronRight, Clock, Package, User, Calendar,
    TrendingUp, MapPin, Truck, Phone, Mail, Building2,
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

// ─── Types ─────────────────────────────────────────────────────────────────
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

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    brouillon: { label: "Brouillon", color: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
    en_validation: { label: "En validation", color: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500 animate-pulse" },
    validee: { label: "Validée", color: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-500" },
    en_cours: { label: "En cours", color: "bg-indigo-100 text-indigo-800 border-indigo-200", dot: "bg-indigo-500 animate-pulse" },
    en_commande_fournisseur: { label: "Cmd fourn.", color: "bg-purple-100 text-purple-800 border-purple-200", dot: "bg-purple-500" },
    en_reception: { label: "En réception", color: "bg-cyan-100 text-cyan-800 border-cyan-200", dot: "bg-cyan-500" },
    en_preparation: { label: "Préparation", color: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500" },
    en_livraison: { label: "En livraison", color: "bg-orange-100 text-orange-800 border-orange-200", dot: "bg-orange-500 animate-pulse" },
    livree: { label: "Livrée", color: "bg-teal-100 text-teal-800 border-teal-200", dot: "bg-teal-500" },
    en_facturation: { label: "Facturation", color: "bg-violet-100 text-violet-800 border-violet-200", dot: "bg-violet-500" },
    payee: { label: "Payée", color: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
    cloturee: { label: "Clôturée", color: "bg-green-100 text-green-800 border-green-200", dot: "bg-green-500" },
    terminee: { label: "Terminée", color: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
    annulee: { label: "Annulée", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-400" },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);
const ADVANCE_ROLES = [
    "manager", "directeur_exploitation", "responsable_commercial",
    "commercial", "responsable_logistique", "responsable_technique",
    "technicien_montage", "responsable_achat", "responsable_sav", "responsable_comptabilite",
];

// ─── Order Card ─────────────────────────────────────────────────────────────
const OrderCard = ({ order, isSelected, onClick }: { order: OrderSummary; isSelected: boolean; onClick: () => void }) => {
    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.brouillon;
    const progress = order.stepsTotal ? Math.round(((order.stepsCompleted || 0) / order.stepsTotal) * 100) : 0;

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left p-4 rounded-xl border transition-all duration-200",
                isSelected
                    ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100 shadow-sm"
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
                <ChevronRight className={cn("w-4 h-4 text-slate-300 shrink-0 mt-1 transition-transform", isSelected && "text-blue-500 rotate-90")} />
            </div>

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

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CommandTracking() {
    const { user, roles, loading: authLoading } = useAuth();

    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<OrderSummary[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [listLoading, setListLoading] = useState(true);

    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [steps, setSteps] = useState<WorkflowStep[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [isManagerAbsent, setIsManagerAbsent] = useState(false);
    const [selectedStepForJustify, setSelectedStepForJustify] = useState<string | null>(null);

    // Delivery info (latest delivery linked to order)
    const [delivery, setDelivery] = useState<any | null>(null);

    const canAdvance = ADVANCE_ROLES.some(r => roles.includes(r as any));
    const canValidate = roles.includes("manager") || (isManagerAbsent && roles.includes("directeur_exploitation"));

    // ─── Fetch orders list ────────────────────────────────────────────────────
    const fetchOrders = useCallback(async () => {
        if (!user) return;
        setListLoading(true);
        try {
            // Apply role-based filtering
            const isManagerOrAdmin = roles.some(r => [
                "manager", "directeur_exploitation", "responsable_achat",
                "responsable_logistique", "responsable_technique",
                "responsable_sav", "responsable_comptabilite",
                "responsable_showroom", "responsable_commercial",
                "commercial"
            ].includes(r));

            let data: any[] = [];

            if (isManagerOrAdmin) {
                // Managers see all orders
                const { data: d, error } = await supabase
                    .from("client_orders")
                    .select("id, reference, status, total_ht, created_at, clients(id, full_name, company_name, user_id, commercial_id)")
                    .order("created_at", { ascending: false });
                if (error) throw error;
                data = d || [];
            } else if (roles.includes("client")) {
                const { data: d, error } = await supabase
                    .from("client_orders")
                    .select("id, reference, status, total_ht, created_at, clients!inner(id, full_name, company_name, user_id, commercial_id)")
                    .eq("clients.user_id", user.id)
                    .order("created_at", { ascending: false });
                if (error) throw error;
                data = d || [];
            } else if (roles.includes("commercial")) {
                // Commercial sees orders where: (1) their client has commercial_id = them, OR (2) they created the order
                const [byCommercial, byCreator] = await Promise.all([
                    supabase
                        .from("client_orders")
                        .select("id, reference, status, total_ht, created_at, clients!inner(id, full_name, company_name, user_id, commercial_id)")
                        .eq("clients.commercial_id", user.id)
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("client_orders")
                        .select("id, reference, status, total_ht, created_at, clients(id, full_name, company_name, user_id, commercial_id)")
                        .eq("created_by", user.id)
                        .order("created_at", { ascending: false }),
                ]);
                if (byCommercial.error) throw byCommercial.error;
                // Merge + deduplicate by id
                const seen = new Set<string>();
                const merged: any[] = [];
                for (const row of [...(byCommercial.data || []), ...(byCreator.data || [])]) {
                    if (!seen.has(row.id)) { seen.add(row.id); merged.push(row); }
                }
                data = merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            } else if (roles.includes("technicien_montage") || roles.includes("livraison")) {
                const { data: deliveryOrders } = await supabase
                    .from("deliveries")
                    .select("order_id")
                    .eq("technician_id", user.id);
                const orderIds = (deliveryOrders || []).map(d => d.order_id);
                if (orderIds.length > 0) {
                    const { data: d, error } = await supabase
                        .from("client_orders")
                        .select("id, reference, status, total_ht, created_at, clients(id, full_name, company_name, user_id, commercial_id)")
                        .in("id", orderIds)
                        .order("created_at", { ascending: false });
                    if (error) throw error;
                    data = d || [];
                }
                // else stays empty
            }

            const withProgress: OrderSummary[] = await Promise.all(
                data.map(async (o: any) => {
                    const { data: stepData } = await supabase
                        .from("order_workflow_steps").select("status").eq("order_id", o.id);
                    return {
                        ...o,
                        stepsTotal: stepData?.length || 0,
                        stepsCompleted: stepData?.filter((s: any) => s.status === "completed").length || 0,
                    };
                })
            );
            setOrders(withProgress);
        } catch (err: any) {
            console.error("Fetch orders error:", err);
            toast.error("Erreur lors du chargement des commandes");
        } finally {
            setListLoading(false);
        }
    }, [user, roles]);

    // ─── Fetch order detail ───────────────────────────────────────────────────
    const fetchDetail = useCallback(async (orderId: string) => {
        setDetailLoading(true);
        try {
            const [{ data: orderData, error: orderError }, { data: stepsData, error: stepsError }, { data: absenceData }, { data: deliveryData }] = await Promise.all([
                supabase.from("client_orders").select("*, clients (full_name, company_name, email, phone, address, city)").eq("id", orderId).single(),
                supabase.from("order_workflow_steps").select("*").eq("order_id", orderId).order("step_order", { ascending: true }),
                supabase.rpc("is_manager_absent" as any),
                supabase.from("deliveries").select("*").eq("order_id", orderId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
            ]);
            if (orderError) throw orderError;
            if (stepsError) throw stepsError;
            setSelectedOrder(orderData);
            setSteps(stepsData || []);
            setIsManagerAbsent(!!absenceData);
            setDelivery(deliveryData);
        } catch {
            toast.error("Erreur lors du chargement du détail");
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const [selectedStepForDelay, setSelectedStepForDelay] = useState<WorkflowStep | null>(null);

    // Monitoring
    useDeadlineMonitor();

    // ─── Filters ──────────────────────────────────────────────────────────────
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

    // ─── Init + realtime ──────────────────────────────────────────────────────
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
        else { setSelectedOrder(null); setSteps([]); setDelivery(null); }
    }, [selectedOrderId, fetchDetail]);

    // ─── Actions ──────────────────────────────────────────────────────────
    const handleLaunch = async () => {
        if (!selectedOrder) return;
        const { error } = await supabase.from("client_orders").update({ status: "en_validation" }).eq("id", selectedOrder.id);
        if (error) { toast.error("Erreur lors du lancement"); return; }
        toast.success("Commande lancée — en attente de validation Manager");
    };

    const handleConfirm = async () => {
        if (!selectedOrder) return;
        const { error } = await supabase.from("client_orders").update({ status: "validee" }).eq("id", selectedOrder.id);
        if (error) { toast.error("Erreur lors de la validation"); return; }
        toast.success("Commande validée !");
    };

    const handleCompleteStep = async (stepId: string, deadlineDays?: number | null) => {
        const step = steps.find(s => s.id === stepId);
        if (!step) return;

        // Step 1: Mark current step as completed
        const { error } = await supabase.from("order_workflow_steps")
            .update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", stepId);
        if (error) { toast.error("Erreur lors de la mise à jour de l'étape"); return; }

        // Step 2: Activate next step + set deadline if provided
        const nextStep = steps.find(s => s.step_order === step.step_order + 1 && s.status === "pending");
        if (nextStep) {
            const now = new Date();
            const dueDate = deadlineDays
                ? new Date(now.getTime() + deadlineDays * 86_400_000).toISOString()
                : null;

            await supabase.from("order_workflow_steps").update({
                status: "in_progress",
                started_at: now.toISOString(),
                ...(deadlineDays && { estimated_duration_days: deadlineDays }),
                ...(dueDate && { due_date: dueDate }),
                ...(deadlineDays && { deadline_set_at: now.toISOString() }),
            } as any).eq("id", nextStep.id);

            // Step 3: Notify the next step's responsible role
            // Derive the role from step name mapping
            const STEP_ROLE_MAP: Record<string, string> = {
                creation_commande: "responsable_commercial",
                validation_commerciale: "responsable_logistique",
                commande_fournisseur: "responsable_achat",
                reception_marchandises: "responsable_logistique",
                preparation_technique: "responsable_technique",
                livraison_installation: "responsable_logistique",
                validation_client: "responsable_sav",
                facturation_paiement: "responsable_comptabilite",
                cloture_archivage: "manager",
            };
            const nextRole = STEP_ROLE_MAP[nextStep.step_name];
            const orderRef = selectedOrder?.reference || "?";
            const nextLabel = nextStep.step_name.replace(/_/g, " ");
            const delayText = deadlineDays ? ` — Délai accordé : ${deadlineDays} jour(s)` : "";

            if (nextRole) {
                await supabase.rpc("notify_users_by_role" as any, {
                    p_role: nextRole,
                    p_title: `📦 Nouvelle étape à traiter — ${orderRef}`,
                    p_message: `L'étape "${nextLabel}" vous a été transmise pour la commande ${orderRef}.${delayText}`,
                    p_type: "transition",
                    p_order_id: nextStep.order_id,
                    p_step_id: nextStep.id,
                    p_action_required: false,
                    p_action_type: null,
                });
            }

            // Step 4: Notify manager + directeur of the transfer
            await supabase.rpc("notify_management" as any, {
                p_title: `🔄 Transfert commande — ${orderRef}`,
                p_message: `Étape "${step.step_name.replace(/_/g, " ")}" terminée. Passage à "${nextLabel}"${deadlineDays ? ` (délai : ${deadlineDays}j)` : ""}.`,
                p_type: "transition",
                p_order_id: step.order_id,
                p_step_id: nextStep.id,
            });

            toast.success(`Étape terminée — "${nextLabel}" démarre${deadlineDays ? ` (${deadlineDays}j)` : ""}`);
        } else {
            // Last step completed — notify management
            await supabase.rpc("notify_management" as any, {
                p_title: `✅ Workflow terminé — ${selectedOrder?.reference || ""}`,
                p_message: `Toutes les étapes de la commande ${selectedOrder?.reference || ""} ont été complétées.`,
                p_type: "info",
                p_order_id: step.order_id,
                p_step_id: stepId,
            });
            toast.success("Toutes les étapes sont terminées !");
        }
    };

    const stats = {
        total: orders.length,
        enCours: orders.filter(o => ["en_validation", "validee", "en_cours", "en_livraison", "en_preparation"].includes(o.status)).length,
        terminee: orders.filter(o => ["terminee", "cloturee", "payee"].includes(o.status)).length,
        retard: orders.filter(o => o.stepsCompleted !== undefined && o.stepsTotal !== undefined &&
            o.status !== "terminee" && o.status !== "annulee" && o.status !== "cloturee" &&
            o.stepsTotal > 0).length,
    };

    if (authLoading) {
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-100 px-6 py-8">
                <div className="max-w-screen-xl mx-auto">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        Suivi des Commandes
                    </h1>
                    <p className="text-slate-500 text-lg mt-2 font-medium">
                        Visualisez l'avancement de vos commandes en temps réel
                    </p>
                </div>
            </div>

            {/* ── KPI cards ─────────────────────────────────────────────────── */}
            <div className="max-w-screen-2xl mx-auto px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total commandes", value: stats.total, icon: Package, color: "text-slate-600", bg: "bg-slate-100" },
                    { label: "En cours", value: stats.enCours, icon: Clock, color: "text-blue-600", bg: "bg-blue-100" },
                    { label: "Terminées", value: stats.terminee, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
                    { label: "Actives", value: stats.retard, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-100" },
                ].map(k => (
                    <Card key={k.label} className="border-none shadow-sm">
                        <CardContent className="pt-4 pb-3 flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", k.bg)}>
                                <k.icon className={cn("w-5 h-5", k.color)} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">{k.value}</p>
                                <p className="text-xs text-slate-500">{k.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Main Layout ───────────────────────────────────────────────── */}
            <div className="max-w-screen-2xl mx-auto px-6 pb-10 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">

                {/* ── Left: Order list ── */}
                <div className="space-y-3">
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
                        <Button size="sm" variant={statusFilter === "all" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setStatusFilter("all")}>
                            Tout ({orders.length})
                        </Button>
                        {ALL_STATUSES.filter(s => orders.some(o => o.status === s)).map(s => (
                            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="h-7 text-xs" onClick={() => setStatusFilter(s)}>
                                {STATUS_CONFIG[s].label}
                            </Button>
                        ))}
                    </div>

                    <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                        {listLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-slate-400" /></div>
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

                {/* ── Right: Detail panel ── */}
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
                                <p className="font-semibold text-slate-600">Sélectionnez une commande</p>
                                <p className="text-sm mt-1">Cliquez sur une commande pour voir son suivi détaillé</p>
                            </div>
                        </motion.div>
                    ) : detailLoading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex items-center justify-center rounded-2xl bg-white border border-slate-100 min-h-[400px]">
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

                            {/* ── Main Tracking Card ── */}
                            <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white rounded-2xl">
                                <CardContent className="p-8">
                                    <div className="flex justify-start mb-6">
                                        <div className="flex flex-wrap gap-2">
                                            {selectedOrder.status === "brouillon" && canAdvance && (
                                                <Button onClick={handleLaunch} size="sm" className="bg-blue-600 hover:bg-blue-700 gap-2 rounded-lg">
                                                    <Play className="w-4 h-4" /> Lancer la commande
                                                </Button>
                                            )}
                                            {selectedOrder.status === "en_validation" && canValidate && (
                                                <Button onClick={handleConfirm} size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-2 rounded-lg">
                                                    <CheckCircle2 className="w-4 h-4" /> Confirmer & Valider
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => fetchDetail(selectedOrderId!)} className="text-slate-400 hover:text-slate-600">
                                                <RefreshCw className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {steps.length === 0 ? (
                                        <p className="text-slate-500 text-center py-12">Aucun workflow actif.</p>
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

                            {/* ── Two-column info cards ── */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                                {/* Order Details */}
                                <Card className="border-none shadow-lg shadow-slate-200/40 bg-white rounded-xl overflow-hidden">
                                    <CardHeader className="pb-4 border-b border-slate-50">
                                        <CardTitle className="text-lg font-bold text-slate-800">
                                            Détail de la Commande
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                            <span className="text-slate-500 text-sm font-medium uppercase tracking-tight">Numéro de commande:</span>
                                            <span className="font-bold text-slate-800 tracking-tight">{selectedOrder.reference || `#${selectedOrder.id.slice(0, 8)}`}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                            <span className="text-slate-500 text-sm font-medium uppercase tracking-tight">Client:</span>
                                            <span className="font-bold text-slate-800 tracking-tight">{selectedOrder.clients?.full_name || "—"}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                            <span className="text-slate-500 text-sm font-medium uppercase tracking-tight">Montant:</span>
                                            <span className="font-black text-slate-900 text-lg">
                                                {selectedOrder.total_ht ? `${selectedOrder.total_ht.toLocaleString()}€` : "—"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                            <span className="text-slate-500 text-sm font-medium uppercase tracking-tight">Date de création:</span>
                                            <span className="font-bold text-slate-800 tracking-tight">{format(new Date(selectedOrder.created_at), "yyyy-MM-dd")}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 text-sm font-medium uppercase tracking-tight">Statut:</span>
                                            <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", STATUS_CONFIG[selectedOrder.status]?.color)}>
                                                {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Delivery Info */}
                                <Card className="border-none shadow-lg shadow-slate-200/40 bg-white rounded-xl overflow-hidden">
                                    <CardHeader className="pb-4 border-b border-slate-50">
                                        <CardTitle className="text-lg font-bold text-slate-800">
                                            Informations de Livraison
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="border-b border-slate-50 pb-2">
                                            <span className="text-slate-500 text-sm font-medium uppercase tracking-tight block mb-1">Adresse de livraison:</span>
                                            <span className="font-bold text-slate-800 tracking-tight leading-tight block">
                                                {selectedOrder.clients?.address || "123 Rue de la Paix, 75000 Paris"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                            <span className="text-slate-500 text-sm font-medium uppercase tracking-tight">Date prévue:</span>
                                            <span className="font-bold text-slate-800 tracking-tight">
                                                {delivery?.scheduled_date ? format(new Date(delivery.scheduled_date), "yyyy-MM-dd") : "2026-03-05"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                            <span className="text-slate-500 text-sm font-medium uppercase tracking-tight">Transporteur:</span>
                                            <span className="font-bold text-slate-800 tracking-tight">DHL Express</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 text-sm font-medium uppercase tracking-tight">Numéro de suivi:</span>
                                            <span className="font-bold text-blue-600 decoration-blue-600 underline">1234567890</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* ── Legend ── */}
                            <Card className="border-none shadow-md bg-white rounded-xl mt-8">
                                <CardHeader className="py-4 border-b border-slate-50">
                                    <CardTitle className="text-base font-bold text-slate-800">Légende des Statuts</CardTitle>
                                </CardHeader>
                                <CardContent className="py-6">
                                    <div className="flex gap-12">
                                        {[
                                            { label: "Complétée", dot: "bg-emerald-500" },
                                            { label: "En cours", dot: "bg-blue-500" },
                                            { label: "En attente", dot: "bg-slate-300" },
                                        ].map(({ label, dot }) => (
                                            <div key={label} className="flex items-center gap-3">
                                                <div className={cn("w-4 h-4 rounded-full shadow-sm", dot)} />
                                                <span className="text-slate-600 font-bold text-sm">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* ── Justification dialog ── */}
            <JustificationDialog
                isOpen={!!selectedStepForJustify}
                onClose={() => setSelectedStepForJustify(null)}
                stepId={selectedStepForJustify || ""}
                onSuccess={() => selectedOrderId && fetchDetail(selectedOrderId)}
            />
        </div>
    );
}
