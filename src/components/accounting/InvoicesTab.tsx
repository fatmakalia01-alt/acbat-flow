import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Download, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Constants } from "@/integrations/supabase/types";

const statusLabels: Record<string, string> = {
  brouillon: "Brouillon", emise: "Émise", payee_partiel: "Payée partiel",
  payee: "Payée", impayee: "Impayée", annulee: "Annulée",
};

const statusColors: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground", emise: "bg-blue-100 text-blue-800",
  payee_partiel: "bg-amber-100 text-amber-800", payee: "bg-emerald-100 text-emerald-800",
  impayee: "bg-red-100 text-red-800", annulee: "bg-gray-100 text-gray-600",
};

const InvoicesTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ client_id: "", order_id: "", reference: "", due_date: "" });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
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

  const { data: orders = [] } = useQuery({
    queryKey: ["orders-for-invoice"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_orders").select("id, reference, client_id").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments-for-invoice", selectedInvoice?.id],
    enabled: !!selectedInvoice,
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").eq("invoice_id", selectedInvoice.id).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const createInvoice = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("invoices").insert({
        client_id: newInvoice.client_id,
        order_id: newInvoice.order_id,
        reference: newInvoice.reference,
        due_date: newInvoice.due_date || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setDialogOpen(false);
      setNewInvoice({ client_id: "", order_id: "", reference: "", due_date: "" });
      toast({ title: "Facture créée" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("invoices").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Statut mis à jour" });
    },
  });

  const generatePdf = (invoice: any) => {
    const content = `
FACTURE ${invoice.reference}
================================
Client: ${invoice.clients?.full_name || ""}
Société: ${invoice.clients?.company_name || "—"}
Date d'émission: ${invoice.issue_date ? format(new Date(invoice.issue_date), "dd/MM/yyyy") : "—"}
Date d'échéance: ${invoice.due_date ? format(new Date(invoice.due_date), "dd/MM/yyyy") : "—"}

--------------------------------
Total HT:    ${(invoice.total_ht || 0).toLocaleString("fr-TN")} TND
TVA:         ${(invoice.tva_amount || 0).toLocaleString("fr-TN")} TND
Total TTC:   ${(invoice.total_ttc || 0).toLocaleString("fr-TN")} TND
================================
Statut: ${statusLabels[invoice.status] || invoice.status}

ACBAT - Tous droits réservés
    `.trim();

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facture-${invoice.reference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Facture téléchargée" });
  };

  const filteredOrders = newInvoice.client_id
    ? orders.filter((o: any) => o.client_id === newInvoice.client_id)
    : orders;

  const unpaidCount = invoices.filter((i: any) => i.status === "impayee").length;

  const filtered = invoices.filter((i: any) => {
    const matchSearch = i.reference?.toLowerCase().includes(search.toLowerCase()) ||
      i.clients?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const methodLabels: Record<string, string> = {
    especes: "Espèces", cheque: "Chèque", virement: "Virement",
    carte_bancaire: "Carte bancaire", traite_bancaire: "Traite bancaire",
  };

  return (
    <div className="space-y-6">
      {unpaidCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">{unpaidCount} facture(s) impayée(s) nécessitent votre attention</span>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Constants.public.Enums.invoice_status.map(s => (
                <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nouvelle facture</Button>
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
                <TableHead>Échéance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune facture</TableCell></TableRow>
              ) : filtered.map((inv: any) => (
                <TableRow key={inv.id} className={inv.status === "impayee" ? "bg-destructive/5" : ""}>
                  <TableCell className="font-mono font-medium">{inv.reference}</TableCell>
                  <TableCell>
                    <div>{inv.clients?.full_name}</div>
                    {inv.clients?.company_name && <div className="text-xs text-muted-foreground">{inv.clients.company_name}</div>}
                  </TableCell>
                  <TableCell><Badge className={statusColors[inv.status] || ""}>{statusLabels[inv.status] || inv.status}</Badge></TableCell>
                  <TableCell className="font-medium">{(inv.total_ttc || 0).toLocaleString("fr-TN")} TND</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {inv.due_date ? format(new Date(inv.due_date), "dd/MM/yyyy") : "—"}
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedInvoice(inv); setDetailOpen(true); }}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => generatePdf(inv)}><Download className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New invoice dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Créer une facture</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Référence *</Label>
              <Input value={newInvoice.reference} onChange={e => setNewInvoice(p => ({ ...p, reference: e.target.value }))} placeholder="FAC-2026-0001" />
            </div>
            <div>
              <Label>Client *</Label>
              <Select value={newInvoice.client_id} onValueChange={v => setNewInvoice(p => ({ ...p, client_id: v, order_id: "" }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}{c.company_name ? ` (${c.company_name})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Commande associée *</Label>
              <Select value={newInvoice.order_id} onValueChange={v => setNewInvoice(p => ({ ...p, order_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une commande" /></SelectTrigger>
                <SelectContent>
                  {filteredOrders.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>{o.reference}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date d'échéance</Label>
              <Input type="date" value={newInvoice.due_date} onChange={e => setNewInvoice(p => ({ ...p, due_date: e.target.value }))} />
            </div>
            <Button onClick={() => createInvoice.mutate()} disabled={!newInvoice.client_id || !newInvoice.order_id || !newInvoice.reference || createInvoice.isPending} className="w-full">
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Facture {selectedInvoice?.reference}</DialogTitle></DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Client:</span> {selectedInvoice.clients?.full_name}</div>
                <div><span className="text-muted-foreground">Total HT:</span> {(selectedInvoice.total_ht || 0).toLocaleString("fr-TN")} TND</div>
                <div><span className="text-muted-foreground">TVA:</span> {(selectedInvoice.tva_amount || 0).toLocaleString("fr-TN")} TND</div>
                <div><span className="text-muted-foreground">Total TTC:</span> <span className="font-bold">{(selectedInvoice.total_ttc || 0).toLocaleString("fr-TN")} TND</span></div>
                <div>
                  <span className="text-muted-foreground">Statut:</span>{" "}
                  <Select value={selectedInvoice.status} onValueChange={v => { updateStatus.mutate({ id: selectedInvoice.id, status: v }); setSelectedInvoice({ ...selectedInvoice, status: v }); }}>
                    <SelectTrigger className="w-44 inline-flex h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Constants.public.Enums.invoice_status.map(s => (
                        <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><span className="text-muted-foreground">Échéance:</span> {selectedInvoice.due_date ? format(new Date(selectedInvoice.due_date), "dd/MM/yyyy") : "—"}</div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => generatePdf(selectedInvoice)}>
                  <Download className="h-4 w-4 mr-1" /> Télécharger PDF
                </Button>
              </div>

              {payments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Paiements associés</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Méthode</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.payment_date ? format(new Date(p.payment_date), "dd/MM/yyyy") : "—"}</TableCell>
                          <TableCell className="font-medium">{p.amount?.toLocaleString("fr-TN")} TND</TableCell>
                          <TableCell>{methodLabels[p.method] || p.method}</TableCell>
                          <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesTab;
