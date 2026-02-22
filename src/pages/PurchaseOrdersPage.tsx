import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
    Plus, Search, Ship, Package, AlertCircle, CheckCircle2,
    Clock, Truck, ArrowRight, Eye, Pencil, Anchor
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/* ─── helpers ──────────────────────────────────────────────────── */

type PoStatus =
    | "brouillon"
    | "en_commande"
    | "en_transit"
    | "en_douane"
    | "receptionne"
    | "annule";

const STATUS_PIPELINE: PoStatus[] = [
    "brouillon", "en_commande", "en_transit", "en_douane", "receptionne",
];

const STATUS_LABELS: Record<string, string> = {
    brouillon: "Brouillon",
    en_commande: "En commande",
    en_transit: "En transit",
    en_douane: "En douane",
    receptionne: "Réceptionné",
    annule: "Annulé",
};

const STATUS_COLORS: Record<string, string> = {
    brouillon: "bg-muted text-muted-foreground border-muted",
    en_commande: "bg-blue-100 text-blue-800 border-blue-200",
    en_transit: "bg-sky-100 text-sky-800 border-sky-200",
    en_douane: "bg-amber-100 text-amber-800 border-amber-200",
    receptionne: "bg-emerald-100 text-emerald-800 border-emerald-200",
    annule: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    brouillon: <Package className="h-4 w-4" />,
    en_commande: <Clock className="h-4 w-4" />,
    en_transit: <Ship className="h-4 w-4" />,
    en_douane: <Anchor className="h-4 w-4" />,
    receptionne: <CheckCircle2 className="h-4 w-4" />,
    annule: <AlertCircle className="h-4 w-4" />,
};

const ALL_STATUSES: PoStatus[] = [
    "brouillon", "en_commande", "en_transit", "en_douane", "receptionne", "annule",
];

/* ─── component ─────────────────────────────────────────────────── */

const PurchaseOrdersPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState<any>(null);

    const emptyForm = {
        reference: "",
        supplier_id: "",
        brand_id: "",
        status: "brouillon" as PoStatus,
        estimated_arrival: "",
        total_amount_eur: "",
        exchange_rate: "3.35",
        customs_fees: "",
        transport_fees: "",
        transit_notes: "",
        customs_notes: "",
        notes: "",
    };
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState<string | null>(null);

    /* queries */
    const { data: pos = [], isLoading } = useQuery({
        queryKey: ["purchase-orders"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("purchase_orders")
                .select("*, suppliers(name, country), brands(name)")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ["suppliers-list"],
        queryFn: async () => {
            const { data, error } = await supabase.from("suppliers").select("id, name, country").order("name");
            if (error) throw error;
            return data;
        },
    });

    const { data: brands = [] } = useQuery({
        queryKey: ["brands-list"],
        queryFn: async () => {
            const { data, error } = await supabase.from("brands").select("id, name").order("name");
            if (error) throw error;
            return data;
        },
    });

    /* mutations */
    const upsertPO = useMutation({
        mutationFn: async () => {
            const payload: any = {
                supplier_id: form.supplier_id || null,
                brand_id: form.brand_id || null,
                status: form.status,
                estimated_arrival: form.estimated_arrival || null,
                total_amount_eur: parseFloat(form.total_amount_eur) || 0,
                exchange_rate: parseFloat(form.exchange_rate) || 3.35,
                customs_fees: parseFloat(form.customs_fees) || 0,
                transport_fees: parseFloat(form.transport_fees) || 0,
                transit_notes: form.transit_notes || null,
                customs_notes: form.customs_notes || null,
                notes: form.notes || null,
            };
            if (editing) {
                const { error } = await supabase.from("purchase_orders").update(payload).eq("id", editing);
                if (error) throw error;
            } else {
                payload.reference = form.reference;
                payload.created_by = user?.id;
                const { error } = await supabase.from("purchase_orders").insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
            setDialogOpen(false);
            setForm(emptyForm);
            setEditing(null);
            toast({ title: editing ? "Bon de commande mis à jour" : "Bon de commande créé" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { error } = await supabase.from("purchase_orders").update({ status: status as any }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
            if (selected?.id === vars.id) setSelected((prev: any) => ({ ...prev, status: vars.status }));
            toast({ title: "Statut mis à jour" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    /* derived */
    const kpiTransit = pos.filter((p: any) => p.status === "en_transit").length;
    const kpiDouane = pos.filter((p: any) => p.status === "en_douane").length;
    const kpiMois = pos.filter((p: any) => {
        if (p.status !== "receptionne" || !p.actual_arrival) return false;
        const d = new Date(p.actual_arrival);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const totalEngage = pos
        .filter((p: any) => !["receptionne", "annule"].includes(p.status))
        .reduce((s: number, p: any) => s + (p.total_amount_eur || 0), 0);

    const filtered = pos.filter((p: any) => {
        const matchSearch =
            p.reference?.toLowerCase().includes(search.toLowerCase()) ||
            p.suppliers?.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.brands?.name?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || p.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const openEdit = (po: any) => {
        setEditing(po.id);
        setForm({
            reference: po.reference || "",
            supplier_id: po.supplier_id || "",
            brand_id: po.brand_id || "",
            status: po.status || "brouillon",
            estimated_arrival: po.estimated_arrival || "",
            total_amount_eur: po.total_amount_eur?.toString() || "",
            exchange_rate: po.exchange_rate?.toString() || "3.35",
            customs_fees: po.customs_fees?.toString() || "",
            transport_fees: po.transport_fees?.toString() || "",
            transit_notes: po.transit_notes || "",
            customs_notes: po.customs_notes || "",
            notes: po.notes || "",
        });
        setDialogOpen(true);
    };

    const openNew = () => {
        setEditing(null);
        const yr = new Date().getFullYear();
        const seq = String(pos.length + 1).padStart(4, "0");
        setForm({ ...emptyForm, reference: `PO-${yr}-${seq}` });
        setDialogOpen(true);
    };

    /* render */
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                        <Ship className="h-6 w-6 text-primary" /> Achats Import
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Commandes fournisseurs internationales — ICA, Ermetika &amp; autres
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="h-4 w-4 mr-2" /> Nouveau bon de commande
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <Ship className="h-8 w-8 text-sky-500 flex-shrink-0" />
                        <div>
                            <p className="text-2xl font-bold">{kpiTransit}</p>
                            <p className="text-xs text-muted-foreground">En transit</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <Anchor className="h-8 w-8 text-amber-500 flex-shrink-0" />
                        <div>
                            <p className="text-2xl font-bold">{kpiDouane}</p>
                            <p className="text-xs text-muted-foreground">En douane</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 flex-shrink-0" />
                        <div>
                            <p className="text-2xl font-bold">{kpiMois}</p>
                            <p className="text-xs text-muted-foreground">Reçus ce mois</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <Truck className="h-8 w-8 text-primary flex-shrink-0" />
                        <div>
                            <p className="text-2xl font-bold">{totalEngage.toLocaleString("fr-TN", { maximumFractionDigits: 0 })} €</p>
                            <p className="text-xs text-muted-foreground">Engagé en cours</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pipeline visual */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Flux de traitement</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-1 flex-wrap">
                        {STATUS_PIPELINE.map((s, i) => {
                            const count = pos.filter((p: any) => p.status === s).length;
                            return (
                                <div key={s} className="flex items-center gap-1">
                                    <button
                                        onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${STATUS_COLORS[s]
                                            } ${statusFilter === s ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"}`}
                                    >
                                        {STATUS_ICONS[s]}
                                        {STATUS_LABELS[s]}
                                        <span className="font-bold">{count}</span>
                                    </button>
                                    {i < STATUS_PIPELINE.length - 1 && (
                                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Filters + table */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Référence, fournisseur, marque..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 w-72"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            {ALL_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Référence</TableHead>
                                <TableHead>Fournisseur</TableHead>
                                <TableHead>Marque</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Montant EUR</TableHead>
                                <TableHead>Arrivée estimée</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Chargement...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-14 text-muted-foreground">
                                        <Ship className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                        Aucun bon de commande
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((po: any) => (
                                <TableRow key={po.id}>
                                    <TableCell className="font-mono font-medium text-sm">{po.reference}</TableCell>
                                    <TableCell>{po.suppliers?.name || <span className="text-muted-foreground">—</span>}</TableCell>
                                    <TableCell>
                                        {po.brands?.name
                                            ? <Badge variant="outline" className="font-medium">{po.brands.name}</Badge>
                                            : <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`flex items-center gap-1 w-fit border ${STATUS_COLORS[po.status] || ""}`}>
                                            {STATUS_ICONS[po.status]}
                                            {STATUS_LABELS[po.status] || po.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium tabular-nums">
                                        {(po.total_amount_eur || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {po.estimated_arrival
                                            ? format(new Date(po.estimated_arrival), "dd/MM/yyyy", { locale: fr })
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => { setSelected(po); setDetailOpen(true); }}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(po)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ── Create / Edit Dialog ───────────────────────────────────── */}
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Modifier le bon de commande" : "Nouveau bon de commande"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5">
                        {/* Row 1 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Référence *</Label>
                                <Input
                                    value={form.reference}
                                    onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
                                    placeholder="PO-2026-0001"
                                    disabled={!!editing}
                                />
                            </div>
                            <div>
                                <Label>Statut</Label>
                                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as PoStatus }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {ALL_STATUSES.map((s) => (
                                            <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 2 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Fournisseur</Label>
                                <Select value={form.supplier_id} onValueChange={(v) => setForm((p) => ({ ...p, supplier_id: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map((s: any) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Marque</Label>
                                <Select value={form.brand_id} onValueChange={(v) => setForm((p) => ({ ...p, brand_id: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                    <SelectContent>
                                        {brands.map((b: any) => (
                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator />

                        {/* Financials */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Montant marchandise (€)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={form.total_amount_eur}
                                    onChange={(e) => setForm((p) => ({ ...p, total_amount_eur: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Taux de change (TND/€)</Label>
                                <Input
                                    type="number"
                                    step="0.0001"
                                    value={form.exchange_rate}
                                    onChange={(e) => setForm((p) => ({ ...p, exchange_rate: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Arrivée estimée</Label>
                                <Input
                                    type="date"
                                    value={form.estimated_arrival}
                                    onChange={(e) => setForm((p) => ({ ...p, estimated_arrival: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Frais douane (TND)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={form.customs_fees}
                                    onChange={(e) => setForm((p) => ({ ...p, customs_fees: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Frais transport (TND)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={form.transport_fees}
                                    onChange={(e) => setForm((p) => ({ ...p, transport_fees: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Display computed TND */}
                        {form.total_amount_eur && form.exchange_rate && (
                            <div className="rounded-lg bg-muted/60 px-4 py-2 text-sm">
                                <span className="text-muted-foreground">Valeur TND marchandise estimée : </span>
                                <span className="font-bold">
                                    {(parseFloat(form.total_amount_eur) * parseFloat(form.exchange_rate)).toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                                </span>
                            </div>
                        )}

                        <Separator />

                        {/* Notes */}
                        <div>
                            <Label>Notes transit</Label>
                            <Textarea
                                value={form.transit_notes}
                                onChange={(e) => setForm((p) => ({ ...p, transit_notes: e.target.value }))}
                                placeholder="Nom du navire, port de départ, date de départ..."
                                rows={2}
                            />
                        </div>
                        <div>
                            <Label>Notes douane</Label>
                            <Textarea
                                value={form.customs_notes}
                                onChange={(e) => setForm((p) => ({ ...p, customs_notes: e.target.value }))}
                                placeholder="N° déclaration douane, transitaire..."
                                rows={2}
                            />
                        </div>
                        <div>
                            <Label>Notes générales</Label>
                            <Textarea
                                value={form.notes}
                                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                                rows={2}
                            />
                        </div>

                        <Button
                            onClick={() => upsertPO.mutate()}
                            disabled={!form.reference || upsertPO.isPending}
                            className="w-full"
                        >
                            {editing ? "Enregistrer les modifications" : "Créer le bon de commande"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Detail Dialog ─────────────────────────────────────────── */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Ship className="h-5 w-5" />
                            {selected?.reference}
                        </DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <div className="space-y-5">
                            {/* Status Pipeline */}
                            <div>
                                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Avancement</p>
                                <div className="flex items-center gap-1 flex-wrap">
                                    {STATUS_PIPELINE.map((s, i) => {
                                        const activeIdx = STATUS_PIPELINE.indexOf(selected.status as PoStatus);
                                        const isDone = i <= activeIdx;
                                        const isCurrent = s === selected.status;
                                        return (
                                            <div key={s} className="flex items-center gap-1">
                                                <button
                                                    onClick={() => updateStatus.mutate({ id: selected.id, status: s })}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${isCurrent
                                                            ? `${STATUS_COLORS[s]} ring-2 ring-primary`
                                                            : isDone
                                                                ? `${STATUS_COLORS[s]} opacity-80`
                                                                : "bg-muted text-muted-foreground border-muted opacity-50"
                                                        }`}
                                                >
                                                    {STATUS_ICONS[s]}
                                                    {STATUS_LABELS[s]}
                                                </button>
                                                {i < STATUS_PIPELINE.length - 1 && (
                                                    <ArrowRight className={`h-3 w-3 flex-shrink-0 ${isDone && i < activeIdx ? "text-primary" : "text-muted-foreground"}`} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <Separator />

                            {/* Info grid */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Fournisseur</span>
                                    <p className="font-medium">{selected.suppliers?.name || "—"}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Marque</span>
                                    <p className="font-medium">{selected.brands?.name || "—"}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Arrivée estimée</span>
                                    <p className="font-medium">
                                        {selected.estimated_arrival
                                            ? format(new Date(selected.estimated_arrival), "dd MMMM yyyy", { locale: fr })
                                            : "—"}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Arrivée réelle</span>
                                    <p className="font-medium">
                                        {selected.actual_arrival
                                            ? format(new Date(selected.actual_arrival), "dd MMMM yyyy", { locale: fr })
                                            : "—"}
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            {/* Financials */}
                            <div className="rounded-lg border p-4 space-y-2 text-sm">
                                <h4 className="font-semibold mb-3">Récapitulatif financier</h4>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Valeur marchandise</span>
                                    <span className="font-medium">{(selected.total_amount_eur || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Taux de change</span>
                                    <span>{selected.exchange_rate || 3.35} TND/€</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Valeur TND marchandise</span>
                                    <span>{(selected.total_amount_tnd || 0).toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Frais douane</span>
                                    <span>{(selected.customs_fees || 0).toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Frais transport</span>
                                    <span>{(selected.transport_fees || 0).toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between font-bold text-base">
                                    <span>Coût total import</span>
                                    <span>
                                        {((selected.total_amount_tnd || 0) + (selected.customs_fees || 0) + (selected.transport_fees || 0))
                                            .toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                                    </span>
                                </div>
                            </div>

                            {/* Notes */}
                            {selected.transit_notes && (
                                <div className="rounded-lg bg-sky-50 border border-sky-100 p-3 text-sm">
                                    <p className="font-medium text-sky-800 mb-1 flex items-center gap-1"><Ship className="h-3 w-3" /> Notes transit</p>
                                    <p className="text-sky-700">{selected.transit_notes}</p>
                                </div>
                            )}
                            {selected.customs_notes && (
                                <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-sm">
                                    <p className="font-medium text-amber-800 mb-1 flex items-center gap-1"><Anchor className="h-3 w-3" /> Notes douane</p>
                                    <p className="text-amber-700">{selected.customs_notes}</p>
                                </div>
                            )}
                            {selected.notes && (
                                <div className="rounded-lg bg-muted/60 p-3 text-sm">
                                    <p className="font-medium mb-1">Notes générales</p>
                                    <p className="text-muted-foreground">{selected.notes}</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => { setDetailOpen(false); openEdit(selected); }}>
                                    <Pencil className="h-4 w-4 mr-2" /> Modifier
                                </Button>
                                <Button onClick={() => setDetailOpen(false)}>Fermer</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PurchaseOrdersPage;
