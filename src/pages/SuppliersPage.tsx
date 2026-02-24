import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Users, Mail, Phone, MapPin, Package } from "lucide-react";

const SuppliersPage = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const emptyForm = {
        name: "", contact_person: "", email: "", phone: "", address: "", country: "Italie", notes: ""
    };
    const [form, setForm] = useState(emptyForm);

    const { data: suppliers = [], isLoading } = useQuery({
        queryKey: ["suppliers"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("suppliers")
                .select("*")
                .order("name");
            if (error) throw error;
            return data || [];
        },
    });

    const upsertSupplier = useMutation({
        mutationFn: async () => {
            if (editing) {
                const { error } = await supabase.from("suppliers").update(form).eq("id", editing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("suppliers").insert(form);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            setDialogOpen(false);
            setForm(emptyForm);
            setEditing(null);
            toast({ title: editing ? "Fournisseur modifié" : "Fournisseur créé" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    const deleteSupplier = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("suppliers").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            setDeleteId(null);
            toast({ title: "Fournisseur supprimé" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    const openEdit = (s: any) => {
        setEditing(s);
        setForm({
            name: s.name || "", contact_person: s.contact_person || "",
            email: s.email || "", phone: s.phone || "",
            address: s.address || "", country: s.country || "Italie", notes: s.notes || ""
        });
        setDialogOpen(true);
    };

    const filtered = suppliers.filter((s: any) =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.contact_person?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Gestion Fournisseurs</h1>
                    <p className="text-muted-foreground text-sm">{suppliers.length} fournisseur(s)</p>
                </div>
                <Button onClick={() => { setEditing(null); setForm(emptyForm); setDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Nouveau fournisseur
                </Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher un fournisseur..." value={search}
                    onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fournisseur</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Coordonnées</TableHead>
                                <TableHead>Pays</TableHead>
                                <TableHead className="text-center">Commandes</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun fournisseur trouvé</TableCell></TableRow>
                            ) : filtered.map((s: any) => (
                                <TableRow key={s.id}>
                                    <TableCell>
                                        <div className="font-medium">{s.name}</div>
                                        {s.notes && <div className="text-xs text-muted-foreground line-clamp-1">{s.notes}</div>}
                                    </TableCell>
                                    <TableCell>{s.contact_person || "—"}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 text-xs">
                                            {s.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {s.email}</div>}
                                            {s.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {s.phone}</div>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-sm">
                                            <MapPin className="h-3 w-3 text-muted-foreground" />
                                            {s.country}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="inline-flex items-center gap-1 text-sm font-medium">
                                            <Package className="h-3 w-3 text-muted-foreground" />
                                            {s.supplier_orders_count ?? 0}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(s.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Modifier" : "Nouveau fournisseur"}</DialogTitle>
                        <DialogDescription>
                            Saisissez les informations de contact et les détails du fournisseur.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label>Raison sociale *</Label>
                                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Contact principal</Label>
                                <Input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Pays</Label>
                                <Input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Email</Label>
                                <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Téléphone</Label>
                                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                            </div>
                        </div>
                        <div>
                            <Label>Adresse</Label>
                            <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Notes internaes</Label>
                            <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
                        </div>
                        <Button onClick={() => upsertSupplier.mutate()}
                            disabled={!form.name || upsertSupplier.isPending} className="w-full">
                            {editing ? "Enregistrer" : "Créer"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce fournisseur ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Le fournisseur et toutes ses données associées seront supprimés.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteId && deleteSupplier.mutate(deleteId)}
                        >
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default SuppliersPage;
