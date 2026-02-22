import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Truck, Package, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const deliveryStatusColors: Record<string, string> = {
    planifiee: "bg-blue-100 text-blue-800",
    en_route: "bg-amber-100 text-amber-800",
    livree: "bg-emerald-100 text-emerald-800",
    echouee: "bg-red-100 text-red-800",
};

const LogisticsPage = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: deliveries = [], isLoading: loadingDeliveries } = useQuery({
        queryKey: ["deliveries"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("deliveries")
                .select("*, client_orders(reference, clients(full_name))")
                .order("scheduled_date", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const { data: supplierOrders = [], isLoading: loadingSuppliers } = useQuery({
        queryKey: ["supplier-orders"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("supplier_orders")
                .select("*, suppliers(name)")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const updateDeliveryStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const payload: any = { status };
            if (status === "livree") payload.actual_date = new Date().toISOString().split("T")[0];
            const { error } = await supabase.from("deliveries").update(payload).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deliveries"] });
            toast({ title: "Statut livraison mis à jour" });
        },
    });

    const planned = deliveries.filter((d: any) => d.status === "planifiee").length;
    const inRoute = deliveries.filter((d: any) => d.status === "en_route").length;
    const delivered = deliveries.filter((d: any) => d.status === "livree").length;

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Logistique</h1>
                <p className="text-muted-foreground text-sm">Livraisons et commandes fournisseurs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-card">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                            <Clock className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div><p className="text-2xl font-bold">{planned}</p><p className="text-xs text-muted-foreground">Planifiées</p></div>
                    </CardContent>
                </Card>
                <Card className="shadow-card">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center">
                            <Truck className="h-6 w-6 text-white" />
                        </div>
                        <div><p className="text-2xl font-bold">{inRoute}</p><p className="text-xs text-muted-foreground">En route</p></div>
                    </CardContent>
                </Card>
                <Card className="shadow-card">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-success flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                        <div><p className="text-2xl font-bold">{delivered}</p><p className="text-xs text-muted-foreground">Livrées</p></div>
                    </CardContent>
                </Card>
            </div>

            {/* Deliveries */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Truck className="h-5 w-5" /> Livraisons ({deliveries.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Commande</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Date planifiée</TableHead>
                                <TableHead>Date réelle</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingDeliveries ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Chargement...</TableCell></TableRow>
                            ) : deliveries.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Aucune livraison</TableCell></TableRow>
                            ) : deliveries.map((d: any) => (
                                <TableRow key={d.id}>
                                    <TableCell className="font-mono text-sm">{d.client_orders?.reference}</TableCell>
                                    <TableCell>{d.client_orders?.clients?.full_name}</TableCell>
                                    <TableCell className="text-sm">
                                        {d.scheduled_date ? format(new Date(d.scheduled_date), "dd/MM/yyyy", { locale: fr }) : "—"}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {d.actual_date ? format(new Date(d.actual_date), "dd/MM/yyyy", { locale: fr }) : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={deliveryStatusColors[d.status] || ""}>{d.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Select value={d.status}
                                            onValueChange={v => updateDeliveryStatus.mutate({ id: d.id, status: v })}>
                                            <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="planifiee">Planifiée</SelectItem>
                                                <SelectItem value="en_route">En route</SelectItem>
                                                <SelectItem value="livree">Livrée</SelectItem>
                                                <SelectItem value="echouee">Échouée</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Supplier Orders */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-5 w-5" /> Commandes Fournisseurs ({supplierOrders.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Référence</TableHead>
                                <TableHead>Fournisseur</TableHead>
                                <TableHead>Date commande</TableHead>
                                <TableHead>Livraison prévue</TableHead>
                                <TableHead>Montant</TableHead>
                                <TableHead>Statut</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingSuppliers ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Chargement...</TableCell></TableRow>
                            ) : supplierOrders.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Aucune commande fournisseur</TableCell></TableRow>
                            ) : supplierOrders.map((o: any) => (
                                <TableRow key={o.id}>
                                    <TableCell className="font-mono text-sm">{o.reference}</TableCell>
                                    <TableCell>{o.suppliers?.name}</TableCell>
                                    <TableCell className="text-sm">
                                        {o.order_date ? format(new Date(o.order_date), "dd/MM/yyyy") : "—"}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {o.expected_delivery ? format(new Date(o.expected_delivery), "dd/MM/yyyy") : "—"}
                                    </TableCell>
                                    <TableCell>{o.total_amount?.toLocaleString("fr-TN")} TND</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{o.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default LogisticsPage;
