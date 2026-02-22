import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Wrench, Clock, CheckCircle, AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const stepColors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-emerald-100 text-emerald-800",
    delayed: "bg-red-100 text-red-800",
    blocked: "bg-orange-100 text-orange-800",
};

const stepLabels: Record<string, string> = {
    preparation_technique: "Préparation technique",
    livraison_installation: "Installation",
};

const TechnicalPage = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");

    const { data: steps = [], isLoading } = useQuery({
        queryKey: ["technical-steps"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("order_workflow_steps")
                .select("*, client_orders(reference, clients(full_name))")
                .in("step_name", ["preparation_technique", "livraison_installation"])
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const updateStep = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const payload: any = { status };
            if (status === "in_progress") payload.started_at = new Date().toISOString();
            if (status === "completed") payload.completed_at = new Date().toISOString();
            const { error } = await supabase.from("order_workflow_steps").update(payload).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["technical-steps"] });
            toast({ title: "Étape mise à jour" });
        },
    });

    const filtered = steps.filter((s: any) => {
        const matchSearch = s.client_orders?.reference?.toLowerCase().includes(search.toLowerCase()) ||
            s.client_orders?.clients?.full_name?.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "all" || s.status === filter;
        return matchSearch && matchFilter;
    });

    const counts = {
        pending: steps.filter((s: any) => s.status === "pending").length,
        in_progress: steps.filter((s: any) => s.status === "in_progress").length,
        completed: steps.filter((s: any) => s.status === "completed").length,
        delayed: steps.filter((s: any) => s.status === "delayed").length,
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Technique</h1>
                <p className="text-muted-foreground text-sm">Préparation et installation des commandes</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "En attente", count: counts.pending, color: "bg-gray-400", icon: Clock },
                    { label: "En cours", count: counts.in_progress, color: "gradient-primary", icon: Wrench },
                    { label: "Terminées", count: counts.completed, color: "bg-success", icon: CheckCircle },
                    { label: "En retard", count: counts.delayed, color: "bg-destructive", icon: AlertTriangle },
                ].map(({ label, count, color, icon: Icon }) => (
                    <Card key={label} className="shadow-card">
                        <CardContent className="p-5 flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center`}>
                                <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div><p className="text-xl font-bold">{count}</p><p className="text-xs text-muted-foreground">{label}</p></div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Input placeholder="Rechercher par commande ou client..."
                        value={search} onChange={e => setSearch(e.target.value)} className="pl-3" />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="in_progress">En cours</SelectItem>
                        <SelectItem value="completed">Terminé</SelectItem>
                        <SelectItem value="delayed">En retard</SelectItem>
                        <SelectItem value="blocked">Bloqué</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Commande</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Étape</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Démarré le</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune tâche technique</TableCell></TableRow>
                            ) : filtered.map((s: any) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-mono text-sm">{s.client_orders?.reference}</TableCell>
                                    <TableCell>{s.client_orders?.clients?.full_name}</TableCell>
                                    <TableCell className="text-sm">{stepLabels[s.step_name] || s.step_name}</TableCell>
                                    <TableCell>
                                        <Badge className={stepColors[s.status] || ""}>{s.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {s.started_at ? format(new Date(s.started_at), "dd/MM/yyyy", { locale: fr }) : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Select value={s.status} onValueChange={v => updateStep.mutate({ id: s.id, status: v })}>
                                            <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">En attente</SelectItem>
                                                <SelectItem value="in_progress">Démarrer</SelectItem>
                                                <SelectItem value="completed">Terminer</SelectItem>
                                                <SelectItem value="delayed">Signaler retard</SelectItem>
                                                <SelectItem value="blocked">Bloquer</SelectItem>
                                            </SelectContent>
                                        </Select>
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

export default TechnicalPage;
