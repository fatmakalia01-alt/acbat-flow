import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    Truck, Package, CheckCircle, Clock, AlertTriangle,
    Plus, Search, MapPin, Calendar, User, RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const DELIVERY_STATUS: Record<string, { label: string; className: string; icon: any }> = {
    planifiee: { label: "Planifiée", className: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
    en_route: { label: "En route", className: "bg-amber-100 text-amber-800 border-amber-200", icon: Truck },
    livree: { label: "Livrée", className: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle },
    echouee: { label: "Échouée", className: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle },
};

const SUPPLIER_STATUS: Record<string, string> = {
    brouillon: "bg-gray-100 text-gray-700",
    confirme: "bg-blue-100 text-blue-800",
    expedie: "bg-amber-100 text-amber-800",
    recu: "bg-emerald-100 text-emerald-800",
    annule: "bg-red-100 text-red-700",
};

const LogisticsPage = () => {
    const { toast } = useToast();
    const { roles } = useAuth();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [newDeliveryOpen, setNewDeliveryOpen] = useState(false);
    const [newDelivForm, setNewDelivForm] = useState({
        order_id: "",
        address: "",
        scheduled_date: "",
        vehicle_plate: "",
        driver_name: "",
        notes: "",
    });

    // Deliveries
    const { data: deliveries = [], isLoading: loadingDel } = useQuery({
        queryKey: ["deliveries-logistics"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("deliveries")
                .select("*, client_orders(reference, clients(full_name, phone, address))")
                .order("scheduled_date", { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    // Orders for delivery planning
    const { data: orders = [] } = useQuery({
        queryKey: ["orders-for-delivery"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("client_orders")
                .select("id, reference, clients(full_name)")
                .in("status", ["en_cours", "validee"])
                .order("reference");
            if (error) throw error;
            return data || [];
        },
    });

    // Supplier Orders
    const { data: supplierOrders = [], isLoading: loadingSupp } = useQuery({
        queryKey: ["supplier-orders-logistics"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("supplier_orders")
                .select("*, suppliers(name, country)")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    const updateDelivery = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const payload: any = { status };
            if (status === "livree") payload.actual_date = new Date().toISOString().split("T")[0];
            if (status === "en_route") payload.actual_date = null;
            const { error } = await supabase.from("deliveries").update(payload).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deliveries-logistics"] });
            toast({ title: "Statut livraison mis à jour" });
        },
    });

    const createDelivery = useMutation({
        mutationFn: async () => {
            if (!newDelivForm.order_id || !newDelivForm.scheduled_date) throw new Error("Commande et date requises");
            const { error } = await supabase.from("deliveries").insert({
                order_id: newDelivForm.order_id,
                address: newDelivForm.address,
                scheduled_date: newDelivForm.scheduled_date,
                vehicle_plate: newDelivForm.vehicle_plate,
                driver_name: newDelivForm.driver_name,
                notes: newDelivForm.notes,
                status: "planifiee",
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deliveries-logistics"] });
            setNewDeliveryOpen(false);
            setNewDelivForm({ order_id: "", address: "", scheduled_date: "", vehicle_plate: "", driver_name: "", notes: "" });
            toast({ title: "Livraison planifiée avec succès" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    // Stats
    const planned = deliveries.filter((d: any) => d.status === "planifiee").length;
    const inRoute = deliveries.filter((d: any) => d.status === "en_route").length;
    const delivered = deliveries.filter((d: any) => d.status === "livree").length;
    const failed = deliveries.filter((d: any) => d.status === "echouee").length;

    const filteredDel = deliveries.filter((d: any) => {
        const name = d.client_orders?.clients?.full_name?.toLowerCase() || "";
        const ref = (d.client_orders?.reference || "").toLowerCase();
        const matchSearch = name.includes(search.toLowerCase()) || ref.includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || d.status === statusFilter;
        return matchSearch && matchStatus;
    });

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Logistique</h1>
                    <p className="text-muted-foreground text-sm">Planification des livraisons et commandes fournisseurs</p>
                </div>
                <Button onClick={() => setNewDeliveryOpen(true)} className="gap-2 self-start sm:self-auto">
                    <Plus className="h-4 w-4" /> Planifier une livraison
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Planifiées", value: planned, color: "bg-blue-500", icon: Clock },
                    { label: "En route", value: inRoute, color: "bg-amber-500", icon: Truck },
                    { label: "Livrées", value: delivered, color: "bg-emerald-500", icon: CheckCircle },
                    { label: "Échouées", value: failed, color: "bg-red-500", icon: AlertTriangle },
                ].map(({ label, value, color, icon: Icon }) => (
                    <Card key={label}>
                        <CardContent className="p-5 flex items-center gap-3">
                            <div className={`h-11 w-11 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                                <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{value}</p>
                                <p className="text-xs text-muted-foreground">{label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Deliveries section */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher client ou commande..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="Filtrer statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="planifiee">Planifiées</SelectItem>
                            <SelectItem value="en_route">En route</SelectItem>
                            <SelectItem value="livree">Livrées</SelectItem>
                            <SelectItem value="echouee">Échouées</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Card>
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Livraisons ({filteredDel.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Commande</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Date prévue</TableHead>
                                    <TableHead>Livreur / Véhicule</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Changer statut</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingDel ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
                                ) : filteredDel.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Truck className="h-8 w-8 opacity-40" />
                                            <p>Aucune livraison trouvée</p>
                                        </div>
                                    </TableCell></TableRow>
                                ) : filteredDel.map((d: any) => {
                                    const cfg = DELIVERY_STATUS[d.status] || DELIVERY_STATUS.planifiee;
                                    const StatusIcon = cfg.icon;
                                    return (
                                        <TableRow key={d.id} className="hover:bg-muted/30">
                                            <TableCell className="font-mono text-sm font-medium">
                                                {d.client_orders?.reference}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm font-medium">{d.client_orders?.clients?.full_name}</div>
                                                {d.address && (
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />{d.address}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {d.scheduled_date
                                                    ? format(new Date(d.scheduled_date), "dd MMM yyyy", { locale: fr })
                                                    : "—"}
                                                {d.actual_date && (
                                                    <div className="text-xs text-emerald-600 flex items-center gap-1">
                                                        <CheckCircle className="h-3 w-3" />
                                                        {format(new Date(d.actual_date), "dd MMM", { locale: fr })}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {d.driver_name && (
                                                    <div className="text-sm flex items-center gap-1">
                                                        <User className="h-3 w-3 text-muted-foreground" />
                                                        {d.driver_name}
                                                    </div>
                                                )}
                                                {d.vehicle_plate && (
                                                    <div className="text-xs font-mono text-muted-foreground">{d.vehicle_plate}</div>
                                                )}
                                                {!d.driver_name && !d.vehicle_plate && <span className="text-muted-foreground text-sm">—</span>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`gap-1 ${cfg.className}`} variant="outline">
                                                    <StatusIcon className="h-3 w-3" />
                                                    {cfg.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={d.status}
                                                    onValueChange={v => updateDelivery.mutate({ id: d.id, status: v })}
                                                >
                                                    <SelectTrigger className="w-36 h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="planifiee">Planifiée</SelectItem>
                                                        <SelectItem value="en_route">En route</SelectItem>
                                                        <SelectItem value="livree">Livrée</SelectItem>
                                                        <SelectItem value="echouee">Échouée</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Supplier Orders */}
            <Card>
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Commandes Fournisseurs ({supplierOrders.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Référence</TableHead>
                                <TableHead>Fournisseur</TableHead>
                                <TableHead>Pays</TableHead>
                                <TableHead>Date commande</TableHead>
                                <TableHead>Livraison prévue</TableHead>
                                <TableHead className="text-right">Montant</TableHead>
                                <TableHead>Statut</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingSupp ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Chargement...</TableCell></TableRow>
                            ) : supplierOrders.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Aucune commande fournisseur</TableCell></TableRow>
                            ) : supplierOrders.map((o: any) => (
                                <TableRow key={o.id} className="hover:bg-muted/30">
                                    <TableCell className="font-mono text-sm font-medium">{o.reference}</TableCell>
                                    <TableCell className="font-medium text-sm">{o.suppliers?.name}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{o.suppliers?.country || "—"}</TableCell>
                                    <TableCell className="text-sm">
                                        {o.order_date ? format(new Date(o.order_date), "dd/MM/yyyy") : "—"}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {o.expected_delivery
                                            ? <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-muted-foreground" />{format(new Date(o.expected_delivery), "dd/MM/yyyy")}</span>
                                            : "—"}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {o.total_amount ? `${o.total_amount.toLocaleString("fr-TN")} TND` : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={SUPPLIER_STATUS[o.status] || "bg-gray-100"} variant="outline">
                                            {o.status || "—"}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Plan Delivery Dialog */}
            <Dialog open={newDeliveryOpen} onOpenChange={setNewDeliveryOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5" /> Planifier une livraison
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Commande *</Label>
                            <Select value={newDelivForm.order_id} onValueChange={v => setNewDelivForm(p => ({ ...p, order_id: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner une commande..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {orders.map((o: any) => (
                                        <SelectItem key={o.id} value={o.id}>
                                            {o.reference} — {(o as any).clients?.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Date de livraison prévue *</Label>
                            <Input
                                type="date"
                                value={newDelivForm.scheduled_date}
                                onChange={e => setNewDelivForm(p => ({ ...p, scheduled_date: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label>Adresse de livraison</Label>
                            <Input
                                placeholder="ex: 15 Rue des Oliviers, Sfax"
                                value={newDelivForm.address}
                                onChange={e => setNewDelivForm(p => ({ ...p, address: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Chauffeur</Label>
                                <Input
                                    placeholder="Nom du livreur"
                                    value={newDelivForm.driver_name}
                                    onChange={e => setNewDelivForm(p => ({ ...p, driver_name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Immatriculation</Label>
                                <Input
                                    placeholder="ex: 123 TU 4567"
                                    value={newDelivForm.vehicle_plate}
                                    onChange={e => setNewDelivForm(p => ({ ...p, vehicle_plate: e.target.value }))}
                                />
                            </div>
                        </div>
                        <Button
                            onClick={() => createDelivery.mutate()}
                            disabled={!newDelivForm.order_id || !newDelivForm.scheduled_date || createDelivery.isPending}
                            className="w-full"
                        >
                            {createDelivery.isPending ? "Planification..." : "Planifier la livraison"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default LogisticsPage;
