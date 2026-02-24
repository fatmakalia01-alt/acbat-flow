import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Constants } from "@/integrations/supabase/types";

const methodLabels: Record<string, string> = {
  especes: "Espèces", cheque: "Chèque", virement: "Virement",
  carte_bancaire: "Carte bancaire", traite_bancaire: "Traite bancaire",
};

const statusLabels: Record<string, string> = {
  en_attente: "En attente", confirme: "Confirmé", rejete: "Rejeté",
};

const statusColors: Record<string, string> = {
  en_attente: "bg-amber-100 text-amber-800",
  confirme: "bg-emerald-100 text-emerald-800",
  rejete: "bg-red-100 text-red-800",
};

const PaymentsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    invoice_id: "", client_id: "", amount: "", method: "" as string,
    payment_date: "", reference_number: "", notes: "",
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["all-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, clients(full_name, company_name), invoices(reference)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-for-payment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, reference, client_id, total_ttc, clients(full_name)")
        .in("status", ["emise", "payee_partiel", "impayee"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createPayment = useMutation({
    mutationFn: async () => {
      const selectedInvoice = invoices.find((i: any) => i.id === newPayment.invoice_id);
      const { error } = await supabase.from("payments").insert({
        invoice_id: newPayment.invoice_id,
        client_id: selectedInvoice?.client_id || newPayment.client_id,
        amount: parseFloat(newPayment.amount),
        method: newPayment.method as any,
        payment_date: newPayment.payment_date || null,
        reference_number: newPayment.reference_number || null,
        notes: newPayment.notes || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setDialogOpen(false);
      setNewPayment({ invoice_id: "", client_id: "", amount: "", method: "", payment_date: "", reference_number: "", notes: "" });
      toast({ title: "Paiement enregistré" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("payments").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-payments"] });
      toast({ title: "Statut mis à jour" });
    },
  });

  const totalConfirmed = payments.filter((p: any) => p.status === "confirme").reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const totalPending = payments.filter((p: any) => p.status === "en_attente").reduce((s: number, p: any) => s + (p.amount || 0), 0);

  const filtered = payments.filter((p: any) => {
    const matchSearch = p.invoices?.reference?.toLowerCase().includes(search.toLowerCase()) ||
      p.clients?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.reference_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total confirmé</p>
            <p className="text-2xl font-bold text-emerald-600">{totalConfirmed.toLocaleString("fr-TN")} TND</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">En attente</p>
            <p className="text-2xl font-bold text-amber-600">{totalPending.toLocaleString("fr-TN")} TND</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Nombre de paiements</p>
            <p className="text-2xl font-bold text-foreground">{payments.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Constants.public.Enums.payment_status.map(s => (
                <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Enregistrer un paiement</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun paiement</TableCell></TableRow>
              ) : filtered.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.invoices?.reference || "—"}</TableCell>
                  <TableCell>{p.clients?.full_name}</TableCell>
                  <TableCell className="font-medium">{p.amount?.toLocaleString("fr-TN")} TND</TableCell>
                  <TableCell>{methodLabels[p.method] || p.method}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.payment_date ? format(new Date(p.payment_date), "dd/MM/yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <Select value={p.status} onValueChange={v => updateStatus.mutate({ id: p.id, status: v })}>
                      <SelectTrigger className="w-36 h-8">
                        <Badge className={statusColors[p.status] || ""}>{statusLabels[p.status] || p.status}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {Constants.public.Enums.payment_status.map(s => (
                          <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
            <DialogDescription>
              Saisissez les informations du règlement reçu (montant, mode de paiement et référence).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Facture *</Label>
              <Select value={newPayment.invoice_id} onValueChange={v => setNewPayment(p => ({ ...p, invoice_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une facture" /></SelectTrigger>
                <SelectContent>
                  {invoices.map((i: any) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.reference} — {i.clients?.full_name} ({(i.total_ttc || 0).toLocaleString("fr-TN")} TND)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Montant (TND) *</Label>
                <Input type="number" step="0.01" value={newPayment.amount} onChange={e => setNewPayment(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <Label>Méthode *</Label>
                <Select value={newPayment.method} onValueChange={v => setNewPayment(p => ({ ...p, method: v }))}>
                  <SelectTrigger><SelectValue placeholder="Méthode" /></SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.payment_method.map(m => (
                      <SelectItem key={m} value={m}>{methodLabels[m] || m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date de paiement</Label>
                <Input type="date" value={newPayment.payment_date} onChange={e => setNewPayment(p => ({ ...p, payment_date: e.target.value }))} />
              </div>
              <div>
                <Label>N° de référence</Label>
                <Input value={newPayment.reference_number} onChange={e => setNewPayment(p => ({ ...p, reference_number: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={newPayment.notes} onChange={e => setNewPayment(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <Button onClick={() => createPayment.mutate()}
              disabled={!newPayment.invoice_id || !newPayment.amount || !newPayment.method || createPayment.isPending}
              className="w-full">
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsTab;
