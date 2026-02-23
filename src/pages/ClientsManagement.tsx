import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Phone, Mail, MapPin, List, Map } from "lucide-react";
import ClientsMap from "@/components/ClientsMap";

const ClientsManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const emptyForm = { full_name: "", company_name: "", email: "", phone: "", address: "", city: "", postal_code: "", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const upsertClient = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("clients").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDialogOpen(false);
      setForm(emptyForm);
      setEditing(null);
      toast({ title: editing ? "Client modifié" : "Client créé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      full_name: c.full_name || "", company_name: c.company_name || "",
      email: c.email || "", phone: c.phone || "", address: c.address || "",
      city: c.city || "", postal_code: c.postal_code || "", notes: c.notes || "",
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const filtered = clients.filter((c: any) =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const Field = ({ label, name, type = "text" }: { label: string; name: string; type?: string }) => (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={(form as any)[name]} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))} />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground text-sm">{clients.length} client(s)</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nouveau client</Button>
      </div>

      <Tabs defaultValue="list">
        <div className="flex items-center gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="list" className="gap-1.5"><List className="h-4 w-4" /> Liste</TabsTrigger>
            <TabsTrigger value="map" className="gap-1.5"><Map className="h-4 w-4" /> Carte</TabsTrigger>
          </TabsList>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un client..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <TabsContent value="list" className="mt-4">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Société</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun client trouvé</TableCell></TableRow>
                ) : filtered.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.company_name || "—"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {c.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{c.email}</div>}
                        {c.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{c.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.city && <div className="flex items-center gap-1 text-sm"><MapPin className="h-3 w-3 text-muted-foreground" />{c.city}</div>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </TabsContent>

        <TabsContent value="map" className="mt-4 relative">
          <ClientsMap clients={clients} />
        </TabsContent>
      </Tabs>

    const validate = () => {
      if (!form.full_name.trim()) {
        toast({ title: "Validation Error", description: "Nom complet est requis", variant: "destructive" });
      return false;
      }
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        toast({ title: "Validation Error", description: "Format d'email invalide", variant: "destructive" });
      return false;
      }
      if (form.phone && !/^\+?[0-9\s-]{8,}$/.test(form.phone)) {
        toast({ title: "Validation Error", description: "Format de téléphone invalide", variant: "destructive" });
      return false;
      }
      return true;
    };

      return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier le client" : "Nouveau client"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nom complet *" name="full_name" />
              <Field label="Société" name="company_name" />
              <Field label="Email" name="email" type="email" />
              <Field label="Téléphone" name="phone" type="tel" />
              <Field label="Adresse" name="address" />
              <Field label="Ville" name="city" />
              <Field label="Code postal" name="postal_code" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <Button onClick={() => validate() && upsertClient.mutate()} disabled={!form.full_name || upsertClient.isPending} className="w-full">
              {editing ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsManagement;
