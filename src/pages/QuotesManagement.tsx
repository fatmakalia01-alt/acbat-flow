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
import { Plus, Search, Eye, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Constants } from "@/integrations/supabase/types";

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

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
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

  const { data: quoteItems = [] } = useQuery({
    queryKey: ["quote-items", selectedQuote?.id],
    enabled: !!selectedQuote,
    queryFn: async () => {
      const { data, error } = await supabase.from("quote_items").select("*, products(name)").eq("quote_id", selectedQuote.id);
      if (error) throw error;
      return data;
    },
  });

  const createQuote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quotes").insert({
        client_id: newQuote.client_id,
        valid_until: newQuote.valid_until || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setDialogOpen(false);
      setNewQuote({ client_id: "", valid_until: "" });
      toast({ title: "Devis créé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("quotes").update({ status: status as any }).eq("id", id);
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
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Devis {selectedQuote?.reference}</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Client:</span> {selectedQuote.clients?.full_name}</div>
                <div><span className="text-muted-foreground">Total TTC:</span> {(selectedQuote.total_ttc || 0).toLocaleString("fr-TN")} TND</div>
                <div>
                  <span className="text-muted-foreground">Statut:</span>{" "}
                  <Select value={selectedQuote.status} onValueChange={v => { updateStatus.mutate({ id: selectedQuote.id, status: v }); setSelectedQuote({ ...selectedQuote, status: v }); }}>
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
              {quoteItems.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Lignes du devis</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Qté</TableHead>
                        <TableHead>PU HT</TableHead>
                        <TableHead>Total TTC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quoteItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit_price_ht?.toLocaleString("fr-TN")} TND</TableCell>
                          <TableCell>{item.total_ttc?.toLocaleString("fr-TN")} TND</TableCell>
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

export default QuotesManagement;
