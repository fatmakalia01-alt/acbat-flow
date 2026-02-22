import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Package } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Constants } from "@/integrations/supabase/types";
import WorkflowTimeline from "@/components/WorkflowTimeline";

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

const OrdersManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [newOrder, setNewOrder] = useState({ client_id: "", notes: "" });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_orders")
        .select("*, clients(full_name, company_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, full_name, company_name").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: workflowSteps = [] } = useQuery({
    queryKey: ["workflow-steps", selectedOrder?.id],
    enabled: !!selectedOrder,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_workflow_steps")
        .select("*")
        .eq("order_id", selectedOrder.id)
        .order("step_order");
      if (error) throw error;
      return data;
    },
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_orders").insert({
        client_id: newOrder.client_id,
        notes: newOrder.notes || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setDialogOpen(false);
      setNewOrder({ client_id: "", notes: "" });
      toast({ title: "Commande créée" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("client_orders").update({ status: status as any }).eq("id", id);
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
    <div className="p-6 space-y-6">
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
            <DialogHeader><DialogTitle>Créer une commande</DialogTitle></DialogHeader>
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
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Commande {selectedOrder?.reference}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
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
};

export default OrdersManagement;
