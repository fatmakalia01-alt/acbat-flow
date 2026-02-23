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
import { Plus, Search, Eye, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Constants } from "@/integrations/supabase/types";
import OrderPDF from "@/components/OrderPDF";
import { PDFDownloadLink } from "@react-pdf/renderer";

const statusLabels: Record<string, string> = {
  brouillon: "Brouillon", en_validation: "En validation",
  accepte: "Accepté", refuse: "Refusé", expire: "Expiré",
};

const statusColors: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground", en_validation: "bg-amber-100 text-amber-800",
  accepte: "bg-emerald-100 text-emerald-800", refuse: "bg-red-100 text-red-800",
  expire: "bg-gray-100 text-gray-600",
};

const QuotesManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newQuote, setNewQuote] = useState({ client_id: "", valid_until: "" });
  const [newItem, setNewItem] = useState({ product_id: "", quantity: 1 });

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, clients(full_name, company_name, address, phone)")
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
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: quoteItems = [], refetch: refetchItems } = useQuery({
    queryKey: ["quote-items", selectedQuote?.id],
    queryFn: async () => {
      if (!selectedQuote) return [];
      const { data, error } = await supabase
        .from("quote_items")
        .select("*, products(name, unit)")
        .eq("quote_id", selectedQuote.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedQuote,
  });

  const updateQuoteTotals = async (quoteId: string) => {
    const { data: items } = await supabase.from("quote_items").select("total_ht, total_ttc").eq("quote_id", quoteId);
    if (!items) return;
    const total_ht = items.reduce((sum, item) => sum + (Number(item.total_ht) || 0), 0);
    const total_ttc = items.reduce((sum, item) => sum + (Number(item.total_ttc) || 0), 0);
    const tva_amount = total_ttc - total_ht;
    await supabase.from("quotes").update({ total_ht, total_ttc, tva_amount }).eq("id", quoteId);
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
  };

  const addItem = useMutation({
    mutationFn: async () => {
      if (!selectedQuote || !newItem.product_id) return;
      const product = products.find(p => p.id === newItem.product_id);
      if (!product) return;
      const total_ht = Number(product.price_ht) * newItem.quantity;
      const total_ttc = total_ht * (1 + (Number(product.tva_rate) || 19) / 100);
      const { error } = await supabase.from("quote_items").insert({
        quote_id: selectedQuote.id,
        product_id: newItem.product_id,
        description: product.name,
        quantity: newItem.quantity,
        unit_price_ht: product.price_ht,
        tva_rate: product.tva_rate || 19,
        total_ht,
        total_ttc,
      });
      if (error) throw error;
      await updateQuoteTotals(selectedQuote.id);
    },
    onSuccess: () => {
      refetchItems();
      setNewItem({ product_id: "", quantity: 1 });
      toast({ title: "Article ajouté au devis" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("quote_items").delete().eq("id", itemId);
      if (error) throw error;
      if (selectedQuote) await updateQuoteTotals(selectedQuote.id);
    },
    onSuccess: () => {
      refetchItems();
      toast({ title: "Article supprimé" });
    },
  });

  const createQuote = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("quotes").insert({
        client_id: newQuote.client_id,
        valid_until: newQuote.valid_until || null,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setDialogOpen(false);
      setNewQuote({ client_id: "", valid_until: "" });
      setSelectedQuote(data);
      setDetailOpen(true);
      toast({ title: "Devis créé avec succès" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "brouillon" | "en_validation" | "accepte" | "refuse" | "expire" }) => {
      const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Statut mis à jour" });
    },
  });

  const filtered = quotes.filter((q: any) => {
    const matchSearch = q.reference.toLowerCase().includes(search.toLowerCase()) ||
      q.clients?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Devis</h1>
          <p className="text-muted-foreground text-sm">{quotes.length} devis au total</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nouveau devis</Button>
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
            {Constants.public.Enums.quote_status.map(s => (
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
                <TableHead>Validité</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun devis</TableCell></TableRow>
              ) : filtered.map((q: any) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono font-medium">{q.reference}</TableCell>
                  <TableCell>
                    <div>{q.clients?.full_name}</div>
                    {q.clients?.company_name && <div className="text-xs text-muted-foreground">{q.clients.company_name}</div>}
                  </TableCell>
                  <TableCell><Badge className={statusColors[q.status] || ""}>{statusLabels[q.status] || q.status}</Badge></TableCell>
                  <TableCell>{(q.total_ttc || 0).toLocaleString("fr-TN")} TND</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {q.valid_until ? format(new Date(q.valid_until), "dd/MM/yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedQuote(q); setDetailOpen(true); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New quote dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Créer un devis</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client</Label>
              <Select value={newQuote.client_id} onValueChange={v => setNewQuote(p => ({ ...p, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}{c.company_name ? ` (${c.company_name})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date de validité</Label>
              <Input type="date" value={newQuote.valid_until} onChange={e => setNewQuote(p => ({ ...p, valid_until: e.target.value }))} />
            </div>
            <Button onClick={() => createQuote.mutate()} disabled={!newQuote.client_id || createQuote.isPending} className="w-full">
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Devis {selectedQuote?.reference}</DialogTitle>
            {selectedQuote && quoteItems.length > 0 && (
              <PDFDownloadLink
                document={<OrderPDF order={selectedQuote} items={quoteItems} type="devis" />}
                fileName={`Devis_${selectedQuote.reference}.pdf`}
              >
                {({ loading }) => (
                  <Button variant="outline" size="sm" disabled={loading} className="gap-2">
                    <Download className="h-4 w-4" />
                    {loading ? "Génération..." : "Télécharger Devis"}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Client:</span> {selectedQuote.clients?.full_name}</div>
                <div><span className="text-muted-foreground">Total TTC:</span> {(selectedQuote.total_ttc || 0).toLocaleString("fr-TN")} TND</div>
                <div>
                  <span className="text-muted-foreground">Statut:</span>{" "}
                  <Select value={selectedQuote.status} onValueChange={(v: "brouillon" | "en_validation" | "accepte" | "refuse" | "expire") => { updateStatus.mutate({ id: selectedQuote.id, status: v }); setSelectedQuote({ ...selectedQuote, status: v }); }}>
                    <SelectTrigger className="w-44 inline-flex h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Constants.public.Enums.quote_status.map(s => (
                        <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><span className="text-muted-foreground">Validité:</span> {selectedQuote.valid_until ? format(new Date(selectedQuote.valid_until), "dd/MM/yyyy") : "—"}</div>
              </div>
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium flex items-center gap-2 border-b pb-2">
                  <FileText className="h-4 w-4" /> Articles du devis
                </h4>

                <div className="space-y-2">
                  {quoteItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">Aucun article dans ce devis.</p>
                  ) : (
                    <div className="space-y-1">
                      {quoteItems.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                          <div className="flex-1">
                            <span className="font-medium">{item.products?.name || item.description}</span>
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
                            {p.name} ({(p.base_price || 0).toLocaleString()} TND)
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
                  <div className="flex justify-between w-48"><span className="text-muted-foreground">Total HT:</span> <span>{(selectedQuote.total_ht || 0).toLocaleString("fr-TN")} TND</span></div>
                  <div className="flex justify-between w-48"><span className="text-muted-foreground">TVA:</span> <span>{(selectedQuote.tva_amount || 0).toLocaleString("fr-TN")} TND</span></div>
                  <div className="flex justify-between w-48 font-bold text-lg"><span className="text-foreground">Total TTC:</span> <span>{(selectedQuote.total_ttc || 0).toLocaleString("fr-TN")} TND</span></div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuotesManagement;
