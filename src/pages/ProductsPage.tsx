import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Package, AlertTriangle, ArrowLeftRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ProductsPage = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [movingStock, setMovingStock] = useState<any>(null);
    const [movementForm, setMovementForm] = useState({ quantity: "1", type: "adjustment", reason: "" });

    const [brandDialogOpen, setBrandDialogOpen] = useState(false);
    const [newBrand, setNewBrand] = useState({ name: "", description: "" });

    const emptyForm = {
        name: "", description: "", sku: "", price_ht: "", tva_rate: "19", brand_id: "",
    };
    const [form, setForm] = useState(emptyForm);

    const { data: brands = [] } = useQuery({
        queryKey: ["brands"],
        queryFn: async () => {
            const { data, error } = await supabase.from("brands").select("*").order("name");
            if (error) throw error;
            return data;
        },
    });

    const { data: products = [], isLoading } = useQuery({
        queryKey: ["products"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("products")
                .select("*, stock(quantity, min_quantity, location), product_categories(name), brands(name)")
                .order("name");
            if (error) throw error;
            return data;
        },
    });

    const upsertProduct = useMutation({
        // ... existing mutationFn logic ...
        mutationFn: async () => {
            const payload = {
                name: form.name,
                description: form.description || null,
                sku: form.sku || null,
                price_ht: parseFloat(form.price_ht) || 0,
                tva_rate: parseFloat(form.tva_rate) || 19,
                brand_id: form.brand_id || null,
            };
            if (editing) {
                const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from("products").insert(payload).select("id").single();
                if (error) throw error;
                await supabase.from("stock").insert({ product_id: data.id, quantity: 0, min_quantity: 5 });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            setDialogOpen(false);
            setForm(emptyForm);
            setEditing(null);
            toast({ title: editing ? "Produit modifié" : "Produit créé" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    const createBrand = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from("brands").insert(newBrand);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["brands"] });
            setBrandDialogOpen(false);
            setNewBrand({ name: "", description: "" });
            toast({ title: "Marque ajoutée" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    const recordMovement = useMutation({
        mutationFn: async () => {
            if (!movingStock) return;
            const qty = parseInt(movementForm.quantity) || 0;
            const finalQty = movementForm.type === "out" ? -Math.abs(qty) : (movementForm.type === "in" ? Math.abs(qty) : qty);
            const { error } = await supabase.from("stock_movements").insert({
                product_id: movingStock.id,
                quantity: finalQty,
                type: movementForm.type as any,
                reason: movementForm.reason || null,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
            setMovingStock(null);
            setMovementForm({ quantity: "1", type: "adjustment", reason: "" });
            toast({ title: "Mouvement enregistré" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    const openEdit = (p: any) => {
        setEditing(p);
        setForm({
            name: p.name || "", description: p.description || "",
            sku: p.sku || "", price_ht: p.price_ht?.toString() || "",
            tva_rate: p.tva_rate?.toString() || "19",
            brand_id: p.brand_id || "",
        });
        setDialogOpen(true);
    };

    const filtered = products.filter((p: any) =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase())
    );

    const lowStock = products.filter((p: any) =>
        p.stock?.[0]?.quantity <= (p.stock?.[0]?.min_quantity ?? 5)
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Produits & Stock</h1>
                    <p className="text-muted-foreground text-sm">{products.length} produit(s)</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setBrandDialogOpen(true)}>
                        Gérer les marques
                    </Button>
                    <Button onClick={() => { setEditing(null); setForm(emptyForm); setDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" /> Nouveau produit
                    </Button>
                </div>
            </div>

            {lowStock.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                        <strong>{lowStock.length} produit(s)</strong> en stock faible nécessitent un réapprovisionnement.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-card">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                            <Package className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{products.length}</p>
                            <p className="text-xs text-muted-foreground">Produits actifs</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-card">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{lowStock.length}</p>
                            <p className="text-xs text-muted-foreground">Stock faible</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-card">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-success flex items-center justify-center">
                            <Package className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {products.reduce((acc: number, p: any) => acc + (p.stock?.[0]?.quantity ?? 0), 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">Unités en stock</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher un produit..." value={search}
                    onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produit</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Prix HT</TableHead>
                                <TableHead>TVA</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun produit trouvé</TableCell></TableRow>
                            ) : filtered.map((p: any) => {
                                const qty = p.stock?.[0]?.quantity ?? 0;
                                const min = p.stock?.[0]?.min_quantity ?? 5;
                                const isLow = qty <= min;
                                return (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            <div className="font-medium text-primary">{p.brands?.name}</div>
                                            <div className="font-medium">{p.name}</div>
                                            {p.description && <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{p.sku || "—"}</TableCell>
                                        <TableCell>{p.price_ht?.toLocaleString("fr-TN")} TND</TableCell>
                                        <TableCell>{p.tva_rate}%</TableCell>
                                        <TableCell>
                                            <span className={`font-semibold ${isLow ? "text-destructive" : "text-success"}`}>{qty}</span>
                                            <span className="text-xs text-muted-foreground"> / min {min}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={isLow ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                                                {isLow ? "Stock faible" : "OK"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setMovingStock(p)}>
                                                    <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouveau produit"}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label>Marque</Label>
                                <Select value={form.brand_id} onValueChange={v => setForm(p => ({ ...p, brand_id: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Sélectionner une marque" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Aucune</SelectItem>
                                        {brands.map((b: any) => (
                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2">
                                <Label>Nom du produit *</Label>
                                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div>
                                <Label>SKU</Label>
                                <Input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Prix HT (TND)</Label>
                                <Input type="number" value={form.price_ht}
                                    onChange={e => setForm(p => ({ ...p, price_ht: e.target.value }))} />
                            </div>
                            <div>
                                <Label>TVA (%)</Label>
                                <Input type="number" value={form.tva_rate}
                                    onChange={e => setForm(p => ({ ...p, tva_rate: e.target.value }))} />
                            </div>
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea value={form.description}
                                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                        </div>
                        <Button onClick={() => upsertProduct.mutate()}
                            disabled={!form.name || upsertProduct.isPending} className="w-full">
                            {editing ? "Enregistrer" : "Créer"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!movingStock} onOpenChange={open => !open && setMovingStock(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mouvement de stock — {movingStock?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Type de mouvement</Label>
                                <Select value={movementForm.type}
                                    onValueChange={v => setMovementForm(p => ({ ...p, type: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="in">Entrée (+)</SelectItem>
                                        <SelectItem value="out">Sortie (-)</SelectItem>
                                        <SelectItem value="adjustment">Ajustement inventaire</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Quantité</Label>
                                <Input type="number" value={movementForm.quantity}
                                    onChange={e => setMovementForm(p => ({ ...p, quantity: e.target.value }))} />
                            </div>
                        </div>
                        <div>
                            <Label>Raison / Commentaire</Label>
                            <Input placeholder="Réception, Vente, Casse..." value={movementForm.reason}
                                onChange={e => setMovementForm(p => ({ ...p, reason: e.target.value }))} />
                        </div>
                        <Button onClick={() => recordMovement.mutate()}
                            disabled={recordMovement.isPending} className="w-full">
                            Enregistrer le mouvement
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Gérer les marques</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            {brands.map((b: any) => (
                                <div key={b.id} className="flex items-center justify-between p-2 border rounded-lg">
                                    <span className="font-medium">{b.name}</span>
                                    <span className="text-xs text-muted-foreground">{b.description?.substring(0, 30)}...</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 border-t space-y-3">
                            <h4 className="text-sm font-bold">Ajouter une marque</h4>
                            <div>
                                <Label>Nom</Label>
                                <Input value={newBrand.name} onChange={e => setNewBrand(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Input value={newBrand.description} onChange={e => setNewBrand(p => ({ ...p, description: e.target.value }))} />
                            </div>
                            <Button onClick={() => createBrand.mutate()} disabled={!newBrand.name || createBrand.isPending} className="w-full">
                                Ajouter la marque
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProductsPage;
