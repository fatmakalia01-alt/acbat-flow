import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/formatters";
import { Plus, UserCheck, Clock, XCircle, CheckCircle2, History, Users } from "lucide-react";

const ALL_ROLES = [
    { value: "manager", label: "Manager" },
    { value: "directeur_exploitation", label: "Directeur d'exploitation" },
    { value: "responsable_commercial", label: "Responsable commercial" },
    { value: "commercial", label: "Commercial" },
    { value: "responsable_logistique", label: "Responsable logistique" },
    { value: "responsable_achat", label: "Responsable achat" },
    { value: "responsable_technique", label: "Responsable technique" },
    { value: "technicien_montage", label: "Technicien montage" },
    { value: "responsable_sav", label: "Responsable SAV" },
    { value: "responsable_comptabilite", label: "Responsable comptabilité" },
];

const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
        active: { label: "Active", variant: "default" },
        expired: { label: "Expirée", variant: "secondary" },
        revoked: { label: "Révoquée", variant: "destructive" },
    };
    const { label, variant } = map[status] ?? { label: status, variant: "outline" };
    return <Badge variant={variant}>{label}</Badge>;
};

const DelegationPage = () => {
    const { toast } = useToast();
    const qc = useQueryClient();
    const { user } = useAuth();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({
        to_user_id: "",
        role: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        reason: "",
    });

    // Fetch all users for the selector
    const { data: users = [] } = useQuery({
        queryKey: ["all-profiles"],
        queryFn: async () => {
            const { data } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .order("full_name");
            return data ?? [];
        },
    });

    // Fetch delegations
    const { data: delegations = [], isLoading } = useQuery({
        queryKey: ["delegations"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("delegations")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data ?? [];
        },
    });

    const activeDelegations = (delegations as any[]).filter((d) => d.status === "active");
    const historyDelegations = (delegations as any[]).filter((d) => d.status !== "active");

    // Create delegation
    const createMutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error("Non connecté");
            const { error } = await supabase.from("delegations").insert({
                from_user_id: user.id,
                to_user_id: form.to_user_id,
                role: form.role,
                start_date: form.start_date,
                end_date: form.end_date || null,
                reason: form.reason || null,
                status: "active",
            });
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["delegations"] });
            setDialogOpen(false);
            setForm({ to_user_id: "", role: "", start_date: new Date().toISOString().split("T")[0], end_date: "", reason: "" });
            toast({ title: "Délégation créée avec succès" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    // Revoke delegation
    const revokeMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("delegations")
                .update({ status: "revoked" })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["delegations"] });
            toast({ title: "Délégation révoquée" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    const getUserName = (id: string) => {
        const u = (users as any[]).find((u) => u.id === id);
        return u ? u.full_name || u.email : id.slice(0, 8) + "…";
    };

    const getRoleLabel = (role: string) =>
        ALL_ROLES.find((r) => r.value === role)?.label ?? role;

    const DelegationRow = ({ d, showRevoke }: { d: any; showRevoke?: boolean }) => (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <p className="font-medium text-sm">{getUserName(d.from_user_id)}</p>
                        <p className="text-xs text-muted-foreground">→ {getUserName(d.to_user_id)}</p>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <Badge variant="outline" className="text-xs">{getRoleLabel(d.role)}</Badge>
            </TableCell>
            <TableCell className="text-sm">{formatDate(d.start_date)}</TableCell>
            <TableCell className="text-sm">{d.end_date ? formatDate(d.end_date) : "—"}</TableCell>
            <TableCell>
                <StatusBadge status={d.status} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                {d.reason || "—"}
            </TableCell>
            {showRevoke && (
                <TableCell>
                    <Button
                        variant="ghost" size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => revokeMutation.mutate(d.id)}
                        disabled={revokeMutation.isPending}
                    >
                        <XCircle className="h-4 w-4 mr-1" /> Révoquer
                    </Button>
                </TableCell>
            )}
        </TableRow>
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                        <UserCheck className="h-6 w-6 text-primary" />
                        Délégations
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Gérez les délégations de responsabilités entre utilisateurs
                    </p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Nouvelle délégation
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/20">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{activeDelegations.length}</p>
                            <p className="text-xs text-muted-foreground">Délégations actives</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/20">
                            <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{historyDelegations.length}</p>
                            <p className="text-xs text-muted-foreground">Historique</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{(delegations as any[]).length}</p>
                            <p className="text-xs text-muted-foreground">Total délégations</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="active">
                <TabsList>
                    <TabsTrigger value="active" className="gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Actives ({activeDelegations.length})
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                        <History className="h-4 w-4" />
                        Historique ({historyDelegations.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Utilisateurs</TableHead>
                                        <TableHead>Rôle délégué</TableHead>
                                        <TableHead>Début</TableHead>
                                        <TableHead>Fin</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Raison</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
                                    ) : activeDelegations.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12">
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <UserCheck className="h-10 w-10 opacity-30" />
                                                    <p>Aucune délégation active</p>
                                                    <p className="text-xs">Créez votre première délégation avec le bouton ci-dessus</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        activeDelegations.map((d: any) => (
                                            <DelegationRow key={d.id} d={d} showRevoke />
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Utilisateurs</TableHead>
                                        <TableHead>Rôle délégué</TableHead>
                                        <TableHead>Début</TableHead>
                                        <TableHead>Fin</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Raison</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyDelegations.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun historique</TableCell></TableRow>
                                    ) : (
                                        historyDelegations.map((d: any) => (
                                            <DelegationRow key={d.id} d={d} showRevoke={false} />
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Create Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-primary" />
                            Nouvelle délégation
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Déléguer à *</Label>
                            <Select value={form.to_user_id} onValueChange={(v) => setForm((p) => ({ ...p, to_user_id: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir un utilisateur…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(users as any[])
                                        .filter((u) => u.id !== user?.id)
                                        .map((u) => (
                                            <SelectItem key={u.id} value={u.id}>
                                                {u.full_name || u.email}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Rôle à déléguer *</Label>
                            <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir un rôle…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ALL_ROLES.map((r) => (
                                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Date de début *</Label>
                                <Input
                                    type="date"
                                    value={form.start_date}
                                    onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Date de fin (optionnel)</Label>
                                <Input
                                    type="date"
                                    value={form.end_date}
                                    onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                                    min={form.start_date}
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Raison / motif (optionnel)</Label>
                            <Textarea
                                placeholder="Congés, mission externe, absence…"
                                value={form.reason}
                                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                                rows={3}
                            />
                        </div>

                        <Button
                            className="w-full"
                            onClick={() => createMutation.mutate()}
                            disabled={!form.to_user_id || !form.role || !form.start_date || createMutation.isPending}
                        >
                            {createMutation.isPending ? "Création…" : "Créer la délégation"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DelegationPage;
