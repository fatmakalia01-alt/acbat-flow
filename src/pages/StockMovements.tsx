import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowDownCircle, ArrowUpCircle, AlertCircle, History } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const StockMovements = () => {
    const [search, setSearch] = useState("");

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

    const filtered = movements.filter((m: any) =>
        m.products?.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.products?.sku?.toLowerCase().includes(search.toLowerCase()) ||
        m.reason?.toLowerCase().includes(search.toLowerCase())
    );

    const TypeBadge = ({ type }: { type: string }) => {
        const config: Record<string, { label: string; className: string; icon: any }> = {
            in: { label: "Entrée", className: "bg-emerald-100 text-emerald-800", icon: ArrowUpCircle },
            out: { label: "Sortie", className: "bg-red-100 text-red-800", icon: ArrowDownCircle },
            adjustment: { label: "Ajustement", className: "bg-amber-100 text-amber-800", icon: AlertCircle },
        };
        const { label, className, icon: Icon } = config[type] || { label: type, className: "bg-gray-100", icon: History };
        return (
            <Badge className={`gap-1 ${className}`} variant="outline">
                <Icon className="h-3 w-3" />
                {label}
            </Badge>
        );
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Historique des Mouvements de Stock</h1>
                <p className="text-muted-foreground text-sm">Suivi détaillé des entrées, sorties et ajustements</p>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher un produit ou motif..." value={search}
                    onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Produit</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Quantité</TableHead>
                                <TableHead>Motif / Raison</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun mouvement trouvé</TableCell></TableRow>
                            ) : filtered.map((m: any) => (
                                <TableRow key={m.id}>
                                    <TableCell className="text-sm">
                                        {format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-sm">{m.products?.name}</div>
                                        <div className="text-xs text-muted-foreground font-mono">{m.products?.sku}</div>
                                    </TableCell>
                                    <TableCell>
                                        <TypeBadge type={m.type} />
                                    </TableCell>
                                    <TableCell className={`text-right font-bold ${m.quantity > 0 ? "text-emerald-600" : "text-red-600"}`}>
                                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground italic">
                                        {m.reason || "—"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default StockMovements;
