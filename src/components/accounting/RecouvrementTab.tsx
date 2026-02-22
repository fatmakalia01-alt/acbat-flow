import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Phone, Mail, Search, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

const URGENCY_CONFIG = [
    { label: "Tous", value: "all" },
    { label: "< 30 jours", value: "low" },
    { label: "30–60 jours", value: "medium" },
    { label: "> 60 jours", value: "high" },
];

const getUrgency = (daysOverdue: number) => {
    if (daysOverdue > 60) return "high";
    if (daysOverdue > 30) return "medium";
    return "low";
};

const URGENCY_STYLES = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-orange-100 text-orange-800 border-orange-200",
    low: "bg-amber-100 text-amber-800 border-amber-200",
};

const ROW_STYLES = {
    high: "bg-red-50/40",
    medium: "bg-orange-50/30",
    low: "bg-amber-50/20",
};

const RecouvrementTab = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [urgencyFilter, setUrgencyFilter] = useState("all");

    const { data: overdueInvoices = [], isLoading } = useQuery({
        queryKey: ["overdue-invoices"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("invoices")
                .select("*, clients(full_name, company_name, phone, email)")
                .in("status", ["impayee", "emise", "payee_partiel"])
                .not("due_date", "is", null)
                .order("due_date", { ascending: true });
            if (error) throw error;

            const today = new Date();
            return (data || [])
                .map((inv: any) => {
                    const dueDate = new Date(inv.due_date);
                    const daysOverdue = differenceInDays(today, dueDate);
                    return { ...inv, daysOverdue };
                })
                .filter((inv: any) => inv.daysOverdue > 0); // only truly overdue
        },
    });

    const markContacted = useMutation({
        mutationFn: async (invoice: any) => {
            const now = format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr });
            const prevNotes = invoice.notes ? invoice.notes + "\n" : "";
            const newNotes = `${prevNotes}[Contacté le ${now}]`;
            const { error } = await supabase
                .from("invoices")
                .update({ notes: newNotes } as any)
                .eq("id", invoice.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["overdue-invoices"] });
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            toast({ title: "Contact enregistré", description: "Une note a été ajoutée à la facture." });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    /* KPIs */
    const total = overdueInvoices.reduce((s: number, i: any) => s + (i.total_ttc || 0), 0);
    const highCount = overdueInvoices.filter((i: any) => getUrgency(i.daysOverdue) === "high").length;
    const oldest = overdueInvoices.length > 0
        ? Math.max(...overdueInvoices.map((i: any) => i.daysOverdue))
        : 0;

    const filtered = overdueInvoices.filter((inv: any) => {
        const matchSearch =
            inv.reference?.toLowerCase().includes(search.toLowerCase()) ||
            inv.clients?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            inv.clients?.company_name?.toLowerCase().includes(search.toLowerCase());
        const matchUrgency = urgencyFilter === "all" || getUrgency(inv.daysOverdue) === urgencyFilter;
        return matchSearch && matchUrgency;
    });

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Total en souffrance</p>
                        <p className="text-2xl font-bold text-red-600">
                            {total.toLocaleString("fr-TN", { minimumFractionDigits: 0 })} TND
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{overdueInvoices.length} facture(s)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Urgentes (&gt;60 jours)</p>
                        <p className="text-2xl font-bold text-red-700">{highCount}</p>
                        <p className="text-xs text-muted-foreground mt-1">Nécessitent action immédiate</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Plus ancienne</p>
                        <p className="text-2xl font-bold text-foreground">{oldest} jours</p>
                        <p className="text-xs text-muted-foreground mt-1">Depuis la date d'échéance</p>
                    </CardContent>
                </Card>
            </div>

            {/* Alert banner */}
            {highCount > 0 && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-3 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-red-700">
                            {highCount} facture(s) impayée(s) depuis plus de 60 jours — action urgente requise
                        </span>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Réf., client..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 w-60"
                    />
                </div>
                <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                    <SelectTrigger className="w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {URGENCY_CONFIG.map((u) => (
                            <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Facture</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Échéance</TableHead>
                                <TableHead>Retard</TableHead>
                                <TableHead>Montant TTC</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                        Chargement...
                                    </TableCell>
                                </TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        Aucune facture en retard
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((inv: any) => {
                                    const urgency = getUrgency(inv.daysOverdue);
                                    return (
                                        <TableRow key={inv.id} className={ROW_STYLES[urgency]}>
                                            <TableCell className="font-mono font-medium text-sm">{inv.reference}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{inv.clients?.full_name}</div>
                                                {inv.clients?.company_name && (
                                                    <div className="text-xs text-muted-foreground">{inv.clients.company_name}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {inv.due_date
                                                    ? format(new Date(inv.due_date), "dd/MM/yyyy", { locale: fr })
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`border text-xs font-bold ${URGENCY_STYLES[urgency]}`}>
                                                    {inv.daysOverdue}j
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium tabular-nums">
                                                {(inv.total_ttc || 0).toLocaleString("fr-TN", { minimumFractionDigits: 0 })} TND
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={inv.status === "impayee"
                                                        ? "bg-red-100 text-red-700 border-red-200"
                                                        : inv.status === "payee_partiel"
                                                            ? "bg-amber-100 text-amber-700 border-amber-200"
                                                            : "bg-blue-100 text-blue-700 border-blue-200"}
                                                >
                                                    {inv.status === "impayee"
                                                        ? "Impayée"
                                                        : inv.status === "payee_partiel"
                                                            ? "Partiel"
                                                            : "Émise"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    {inv.clients?.phone && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title={`Appeler ${inv.clients.phone}`}
                                                            onClick={() => window.open(`tel:${inv.clients.phone}`)}
                                                        >
                                                            <Phone className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    {inv.clients?.email && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title={`Email ${inv.clients.email}`}
                                                            onClick={() => window.open(`mailto:${inv.clients.email}?subject=Rappel facture ${inv.reference}`)}
                                                        >
                                                            <Mail className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs h-7 px-2"
                                                        onClick={() => markContacted.mutate(inv)}
                                                        disabled={markContacted.isPending}
                                                    >
                                                        Contacté ✓
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default RecouvrementTab;
