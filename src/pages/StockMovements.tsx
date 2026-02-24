import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    Search, ArrowDownCircle, ArrowUpCircle, AlertCircle, History,
    Plus, TrendingUp, TrendingDown, Package, BarChart3, Filter
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const TYPE_CONFIG: Record<string, { label: string; className: string; icon: any; sign: string }> = {
    in: { label: "Entrée", className: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: ArrowUpCircle, sign: "+" },
    out: { label: "Sortie", className: "bg-red-100 text-red-800 border-red-200", icon: ArrowDownCircle, sign: "-" },
    adjustment: { label: "Ajustement", className: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertCircle, sign: "±" },
};

const StockMovements = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({
        product_id: "",
        type: "in",
        quantity: "",
        reason: "",
        reference: "",
    });

    // Movements
    const { data: movements = [], isLoading } = useQuery({
        queryKey: ["stock-movements"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("stock_movements")
                .select("*, products(name, sku)")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    // Products for select
    const { data: products = [] } = useQuery({
        queryKey: ["products-for-movement"],
        queryFn: async () => {
            const { data, error } = await supabase.from("products").select("id, name, sku, stock(quantity)").order("name");
            if (error) throw error;
            return data || [];
        },
    });

    // Add movement
    const addMovement = useMutation({
        mutationFn: async () => {
            if (!form.product_id || !form.quantity) throw new Error("Produit et quantité requis");
            const qty = form.type === "out"
                ? -Math.abs(parseInt(form.quantity))
                : Math.abs(parseInt(form.quantity));
            const { error } = await supabase.from("stock_movements").insert({
                product_id: form.product_id,
                type: form.type,
                quantity: qty,
                reason: form.reason,
                reference: form.reference,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
            queryClient.invalidateQueries({ queryKey: ["products-for-movement"] });
            setDialogOpen(false);
            setForm({ product_id: "", type: "in", quantity: "", reason: "", reference: "" });
            toast({ title: "Mouvement enregistré avec succès" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    // Stats
    const totalIn = movements.filter((m: any) => m.type === "in").reduce((s: number, m: any) => s + Math.abs(m.quantity), 0);
    const totalOut = movements.filter((m: any) => m.type === "out").reduce((s: number, m: any) => s + Math.abs(m.quantity), 0);
    const totalAdj = movements.filter((m: any) => m.type === "adjustment").length;

    const filtered = movements.filter((m: any) => {
        const matchSearch = m.products?.name?.toLowerCase().includes(search.toLowerCase()) ||
            m.products?.sku?.toLowerCase().includes(search.toLowerCase()) ||
            m.reason?.toLowerCase().includes(search.toLowerCase());
        const matchType = typeFilter === "all" || m.type === typeFilter;
        return matchSearch && matchType;
    });

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Mouvements de Stock</h1>
                    <p className="text-muted-foreground text-sm">Historique des entrées, sorties et ajustements</p>
                </div>
                <Button onClick={() => setDialogOpen(true)} className="gap-2 self-start sm:self-auto">
                    <Plus className="h-4 w-4" /> Nouveau mouvement
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                            <ArrowUpCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-emerald-600">+{totalIn}</p>
                            <p className="text-xs text-muted-foreground">Unités entrées</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
                            <ArrowDownCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600">-{totalOut}</p>
                            <p className="text-xs text-muted-foreground">Unités sorties</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-amber-600">{totalAdj}</p>
                            <p className="text-xs text-muted-foreground">Ajustements</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher produit ou motif..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-44">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        <SelectItem value="in">Entrées seulement</SelectItem>
                        <SelectItem value="out">Sorties seulement</SelectItem>
                        <SelectItem value="adjustment">Ajustements</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <Card>
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Historique ({filtered.length} mouvement{filtered.length !== 1 ? "s" : ""})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date & Heure</TableHead>
                                <TableHead>Produit</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Quantité</TableHead>
                                <TableHead>Stock après</TableHead>
                                <TableHead>Motif / Référence</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Chargement...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Aucun mouvement trouvé</TableCell></TableRow>
                            ) : filtered.map((m: any) => {
                                const cfg = TYPE_CONFIG[m.type] || { label: m.type, className: "bg-gray-100", icon: History, sign: "" };
                                const Icon = cfg.icon;
                                return (
                                    <TableRow key={m.id} className="hover:bg-muted/30">
                                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                            {format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-sm">{m.products?.name}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{m.products?.sku}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`gap-1 text-xs ${cfg.className}`} variant="outline">
                                                <Icon className="h-3 w-3" />
                                                {cfg.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={`font-bold text-sm ${m.quantity > 0 ? "text-emerald-600" : "text-red-600"}`}>
                                                {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm">
                                                <Package className="h-3 w-3 text-muted-foreground" />
                                                <span className="font-medium">{m.products?.stock?.[0]?.quantity ?? "—"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            <div>{m.reason || "—"}</div>
                                            {m.reference && <div className="text-xs font-mono text-primary">{m.reference}</div>}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add Movement Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Enregistrer un mouvement de stock
                        </DialogTitle>
                        <DialogDescription>
                            Saisissez les détails du mouvement de stock (entrée, sortie ou ajustement).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Produit *</Label>
                            <Select value={form.product_id} onValueChange={v => setForm(p => ({ ...p, product_id: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un produit..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            <span className="font-medium">{p.name}</span>
                                            <span className="text-xs text-muted-foreground ml-2">({p.sku}) — Stock: {(p as any).stock?.[0]?.quantity ?? 0}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Type *</Label>
                                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="in">Entrée stock</SelectItem>
                                        <SelectItem value="out">Sortie stock</SelectItem>
                                        <SelectItem value="adjustment">Ajustement</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Quantité *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    placeholder="ex: 10"
                                    value={form.quantity}
                                    onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Référence (optionnel)</Label>
                            <Input
                                placeholder="ex: BC-2026-001"
                                value={form.reference}
                                onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label>Motif / Description</Label>
                            <Textarea
                                placeholder="Raison du mouvement..."
                                value={form.reason}
                                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                                rows={2}
                            />
                        </div>
                        <Button
                            onClick={() => addMovement.mutate()}
                            disabled={!form.product_id || !form.quantity || addMovement.isPending}
                            className="w-full"
                        >
                            {addMovement.isPending ? "Enregistrement..." : "Enregistrer le mouvement"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default StockMovements;
