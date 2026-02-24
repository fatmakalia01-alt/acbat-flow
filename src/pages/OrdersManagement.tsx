import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Package, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Constants } from "@/integrations/supabase/types";
import WorkflowTimeline from "@/components/WorkflowTimeline";
import OrderPDF from "@/components/OrderPDF";
import { PDFDownloadLink } from "@react-pdf/renderer";

const statusLabels: Record<string, string> = {
  brouillon: "Brouillon", en_validation: "En validation", validee: "Validée",
  en_commande_fournisseur: "Cmd fournisseur", en_reception: "Réception",
  en_preparation: "Préparation", en_livraison: "Livraison", livree: "Livrée",
  en_facturation: "Facturation", payee: "Payée", cloturee: "Clôturée", annulee: "Annulée",
};

const statusColors: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground", en_validation: "bg-amber-100 text-amber-800",
  validee: "bg-emerald-100 text-emerald-800", en_commande_fournisseur: "bg-blue-100 text-blue-800",
  en_reception: "bg-indigo-100 text-indigo-800", en_preparation: "bg-purple-100 text-purple-800",
  en_livraison: "bg-orange-100 text-orange-800", livree: "bg-green-100 text-green-800",
  en_facturation: "bg-yellow-100 text-yellow-800", payee: "bg-teal-100 text-teal-800",
  cloturee: "bg-gray-100 text-gray-800", annulee: "bg-red-100 text-red-800",
};

const OrdersManagement = React.forwardRef<HTMLDivElement, {}>(
  (_, ref) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const [newOrder, setNewOrder] = useState({ client_id: "", notes: "", site_id: "" });
    const [newItem, setNewItem] = useState({ product_id: "", quantity: 1 });

    const { data: sites = [] } = useQuery({
      queryKey: ["sites"],
      queryFn: async () => {
        const { data, error } = await supabase.from("sites").select("*").order("name");
        if (error) throw error;
        return data;
      },
    });

    const { data: orders = [], isLoading } = useQuery({
      queryKey: ["orders"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("client_orders")
          .select("*, clients(full_name, company_name), sites(name)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      },
    });

    const { data: clients = [] } = useQuery({
      queryKey: ["clients"],
      queryFn: async () => {
        const { data, error } = await supabase.from("clients").select("id, full_name, company_name").order("full_name");
        if (error) throw error;
        return data;
      },
    });

    const { data: products = [] } = useQuery({
      queryKey: ["products"],
      queryFn: async () => {
        const { data, error } = await supabase.from("products").select("*, stock(quantity)").order("name");
        if (error) throw error;
        return data;
      },
    });

    const { data: orderItems = [], refetch: refetchItems } = useQuery({
      queryKey: ["order-items", selectedOrder?.id],
      queryFn: async () => {
        if (!selectedOrder) return [];
        const { data, error } = await supabase
          .from("order_items")
          .select("*, products(name, unit)")
          .eq("order_id", selectedOrder.id);
        if (error) throw error;
        return data;
      },
      enabled: !!selectedOrder,
    });

    const { data: workflowSteps = [] } = useQuery({
      queryKey: ["workflow-steps", selectedOrder?.id],
      queryFn: async () => {
        if (!selectedOrder) return [];
        const { data, error } = await supabase
          .from("order_workflow_steps")
          .select("*")
          .eq("order_id", selectedOrder.id)
          .order("step_order", { ascending: true });
        if (error) throw error;
        return data;
      },
      enabled: !!selectedOrder,
    });

    const updateOrderTotals = async (orderId: string) => {
      const { data: items } = await supabase.from("order_items").select("total_ht, total_ttc").eq("order_id", orderId);
      if (!items) return;
      const total_ht = items.reduce((sum, item) => sum + (Number(item.total_ht) || 0), 0);
      const total_ttc = items.reduce((sum, item) => sum + (Number(item.total_ttc) || 0), 0);
      const tva_amount = total_ttc - total_ht;
      await (supabase.from("client_orders") as any).update({ total_ht, total_ttc, tva_amount }).eq("id", orderId);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    };

    const addItem = useMutation({
      mutationFn: async () => {
        if (!selectedOrder || !newItem.product_id) return;
        const product = products.find(p => p.id === newItem.product_id);
        if (!product) return;
        const total_ht = Number(product.price_ht) * newItem.quantity;
        const total_ttc = total_ht * (1 + (Number(product.tva_rate) || 19) / 100);
        const { error } = await supabase.from("order_items").insert({
          order_id: selectedOrder.id,
          product_id: newItem.product_id,
          quantity: newItem.quantity,
          unit_price_ht: product.price_ht,
          tva_rate: product.tva_rate || 19,
          total_ht,
          total_ttc,
        });
        if (error) throw error;
        await updateOrderTotals(selectedOrder.id);
      },
      onSuccess: () => {
        refetchItems();
        setNewItem({ product_id: "", quantity: 1 });
        toast({ title: "Article ajouté" });
      },
      onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    const deleteItem = useMutation({
      mutationFn: async (itemId: string) => {
        const { error } = await supabase.from("order_items").delete().eq("id", itemId);
        if (error) throw error;
        if (selectedOrder) await updateOrderTotals(selectedOrder.id);
      },
      onSuccess: () => {
        refetchItems();
        toast({ title: "Article supprimé" });
      },
    });

    const createOrder = useMutation({
      mutationFn: async () => {
        const { data, error } = await (supabase.from("client_orders") as any).insert({
          client_id: newOrder.client_id,
          notes: newOrder.notes || null,
          site_id: newOrder.site_id || null,
          created_by: user?.id,
        }).select("*, clients(full_name, company_name), sites(name)").single();
        if (error) throw error;
        return data;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        setNewOrder({ client_id: "", notes: "", site_id: "" });
        setDialogOpen(false);
        setSelectedOrder(data);
        setDetailOpen(true);
        toast({ title: "Commande créée avec succès" });
      },
      onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    const updateStatus = useMutation({
      mutationFn: async ({ id, status }: { id: string; status: string }) => {
        const { error } = await (supabase.from("client_orders") as any).update({ status: status as any }).eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        toast({ title: "Statut mis à jour" });
      },
    });

    const stepLabels: Record<string, string> = {
      creation_commande: "Création", validation_commerciale: "Validation commerciale",
      commande_fournisseur: "Cmd fournisseur", reception_marchandises: "Réception",
      preparation_technique: "Préparation", livraison_installation: "Livraison",
      validation_client: "Validation client", facturation_paiement: "Facturation",
      cloture_archivage: "Clôture",
    };

    const filtered = orders.filter((o: any) => {
      const matchSearch = o.reference.toLowerCase().includes(search.toLowerCase()) ||
        o.clients?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.clients?.company_name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });

    return (
      <div ref={ref} className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Commandes</h1>
            <p className="text-muted-foreground text-sm">{orders.length} commande(s) au total</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nouvelle commande</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une commande</DialogTitle>
                <DialogDescription>
                  Sélectionnez le client et le site pour initialiser une nouvelle commande client.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Client</Label>
                  <Select value={newOrder.client_id} onValueChange={v => setNewOrder(p => ({ ...p, client_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}{c.company_name ? ` (${c.company_name})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Site / Établissement</Label>
                  <Select value={newOrder.site_id} onValueChange={v => setNewOrder(p => ({ ...p, site_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un site" /></SelectTrigger>
                    <SelectContent>
                      {sites.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={newOrder.notes} onChange={e => setNewOrder(p => ({ ...p, notes: e.target.value }))} />
                </div>
                <Button onClick={() => createOrder.mutate()} disabled={!newOrder.client_id || createOrder.isPending} className="w-full">
                  Créer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Constants.public.Enums.order_status.map(s => (
                <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Total TTC</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune commande</TableCell></TableRow>
                ) : filtered.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono font-medium">{o.reference}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {o.sites?.name || "Siège"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>{o.clients?.full_name}</div>
                      {o.clients?.company_name && <div className="text-xs text-muted-foreground">{o.clients.company_name}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[o.status] || ""}>{statusLabels[o.status] || o.status}</Badge>
                    </TableCell>
                    <TableCell>{(o.total_ttc || 0).toLocaleString("fr-TN")} TND</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(o.created_at), "dd MMM yyyy", { locale: fr })}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedOrder(o); setDetailOpen(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" /> Commande {selectedOrder?.reference}
                </DialogTitle>
                <DialogDescription>
                  Détails complets de la commande, articles inclus et suivi du workflow.
                </DialogDescription>
              </div>
              {selectedOrder && orderItems.length > 0 && (
                <PDFDownloadLink
                  document={<OrderPDF order={selectedOrder} items={orderItems} type="facture" />}
                  fileName={`Facture_${selectedOrder.reference}.pdf`}
                >
                  {({ loading }) => (
                    <Button variant="outline" size="sm" disabled={loading} className="gap-2">
                      <Download className="h-4 w-4" />
                      {loading ? "Génération..." : "Télécharger Facture"}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Site:</span> <span className="font-medium">{selectedOrder.sites?.name || "Non spécifié"}</span></div>
                  <div><span className="text-muted-foreground">Client:</span> {selectedOrder.clients?.full_name}</div>
                  <div><span className="text-muted-foreground">Total TTC:</span> {(selectedOrder.total_ttc || 0).toLocaleString("fr-TN")} TND</div>
                  <div>
                    <span className="text-muted-foreground">Statut:</span>{" "}
                    <Select value={selectedOrder.status} onValueChange={v => { updateStatus.mutate({ id: selectedOrder.id, status: v }); setSelectedOrder({ ...selectedOrder, status: v }); }}>
                      <SelectTrigger className="w-48 inline-flex h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Constants.public.Enums.order_status.map(s => (
                          <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><span className="text-muted-foreground">Créée le:</span> {format(new Date(selectedOrder.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}</div>
                </div>
                {selectedOrder.notes && <div className="text-sm bg-muted p-3 rounded-lg"><span className="font-medium">Notes:</span> {selectedOrder.notes}</div>}

                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-medium flex items-center gap-2 border-b pb-2">
                    <Package className="h-4 w-4" /> Articles de la commande
                  </h4>

                  <div className="space-y-2">
                    {orderItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">Aucun article dans cette commande.</p>
                    ) : (
                      <div className="space-y-1">
                        {orderItems.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                            <div className="flex-1">
                              <span className="font-medium">{item.products?.name}</span>
                              <span className="text-muted-foreground ml-2">x{item.quantity} {item.products?.unit}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span>{(item.total_ttc || 0).toLocaleString("fr-TN")} TND</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteItem.mutate(item.id)}>
                                <Plus className="h-3 w-3 rotate-45" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-12 gap-2 pt-2 border-t">
                    <div className="col-span-7">
                      <Select value={newItem.product_id} onValueChange={v => setNewItem(p => ({ ...p, product_id: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choisir un produit" /></SelectTrigger>
                        <SelectContent>
                          {products.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({(p.price_ht || 0).toLocaleString()} TND)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min="1"
                        value={newItem.quantity}
                        onChange={e => setNewItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                        className="h-8 text-xs"
                        placeholder="Qté"
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        size="sm"
                        className="h-8 w-full text-xs"
                        onClick={() => addItem.mutate()}
                        disabled={!newItem.product_id || addItem.isPending}
                      >
                        Ajouter
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col items-end text-sm space-y-1 border-t">
                    <div className="flex justify-between w-48"><span className="text-muted-foreground">Total HT:</span> <span>{(selectedOrder.total_ht || 0).toLocaleString("fr-TN")} TND</span></div>
                    <div className="flex justify-between w-48"><span className="text-muted-foreground">TVA:</span> <span>{(selectedOrder.tva_amount || 0).toLocaleString("fr-TN")} TND</span></div>
                    <div className="flex justify-between w-48 font-bold text-lg"><span className="text-foreground">Total TTC:</span> <span>{(selectedOrder.total_ttc || 0).toLocaleString("fr-TN")} TND</span></div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Workflow de la commande</h4>
                  <WorkflowTimeline steps={workflowSteps} />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);

OrdersManagement.displayName = "OrdersManagement";

export default OrdersManagement;
