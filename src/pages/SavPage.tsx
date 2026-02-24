import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, HeadphonesIcon, CheckCircle, Clock, AlertTriangle, Send, UserPlus, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusLabels: Record<string, string> = {
    ouvert: "Ouvert", en_cours: "En cours", resolu: "Résolu", ferme: "Fermé",
};
const statusColors: Record<string, string> = {
    ouvert: "bg-red-100 text-red-800", en_cours: "bg-amber-100 text-amber-800",
    resolu: "bg-emerald-100 text-emerald-800", ferme: "bg-gray-100 text-gray-600",
};
const priorityColors: Record<string, string> = {
    faible: "bg-blue-100 text-blue-800", normal: "bg-gray-100 text-gray-800",
    eleve: "bg-orange-100 text-orange-800", urgent: "bg-red-100 text-red-800",
};

const SavPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [comment, setComment] = useState("");
    const [isInternal, setIsInternal] = useState(false);
    const [form, setForm] = useState({ client_id: "", subject: "", description: "", priority: "normal" });

    const { data: tickets = [], isLoading } = useQuery({
        queryKey: ["sav-tickets"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("sav_tickets")
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

    const { data: staff = [] } = useQuery({
        queryKey: ["staff-list"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("user_id, full_name")
                .order("full_name");
            if (error) throw error;
            return data;
        },
    });

    const { data: comments = [], isLoading: loadingComments } = useQuery({
        queryKey: ["sav-comments", selectedTicket?.id],
        enabled: !!selectedTicket,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("sav_comments")
                .select("*, profiles:user_id(full_name)")
                .eq("ticket_id", selectedTicket.id)
                .order("created_at", { ascending: true });
            if (error) throw error;
            return data;
        },
    });

    const createTicket = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from("sav_tickets").insert({
                client_id: form.client_id,
                subject: form.subject,
                description: form.description || null,
                priority: form.priority,
                created_by: user?.id,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sav-tickets"] });
            setDialogOpen(false);
            setForm({ client_id: "", subject: "", description: "", priority: "normal" });
            toast({ title: "Ticket SAV créé" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const payload: any = { status };
            if (status === "resolu") payload.resolved_at = new Date().toISOString();
            const { error } = await supabase.from("sav_tickets").update(payload).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sav-tickets"] });
            toast({ title: "Statut mis à jour" });
        },
    });

    const assignTicket = useMutation({
        mutationFn: async (assigned_to: string) => {
            const { error } = await supabase.from("sav_tickets").update({ assigned_to }).eq("id", selectedTicket.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sav-tickets"] });
            toast({ title: "Ticket assigné" });
        },
    });

    const postComment = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from("sav_comments").insert({
                ticket_id: selectedTicket.id,
                user_id: user?.id,
                content: comment,
                is_internal: isInternal,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sav-comments", selectedTicket?.id] });
            setComment("");
            toast({ title: "Commentaire ajouté" });
        },
    });

    const filtered = tickets.filter((t: any) => {
        const matchSearch = t.reference?.toLowerCase().includes(search.toLowerCase()) ||
            t.subject?.toLowerCase().includes(search.toLowerCase()) ||
            t.clients?.full_name?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || t.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const counts = {
        ouvert: tickets.filter((t: any) => t.status === "ouvert").length,
        en_cours: tickets.filter((t: any) => t.status === "en_cours").length,
        resolu: tickets.filter((t: any) => t.status === "resolu").length,
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">SAV — Service Après-Vente</h1>
                    <p className="text-muted-foreground text-sm">{tickets.length} ticket(s) au total</p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Nouveau ticket
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-card">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-destructive flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <div><p className="text-2xl font-bold">{counts.ouvert}</p><p className="text-xs text-muted-foreground">Ouverts</p></div>
                    </CardContent>
                </Card>
                <Card className="shadow-card">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center">
                            <Clock className="h-6 w-6 text-white" />
                        </div>
                        <div><p className="text-2xl font-bold">{counts.en_cours}</p><p className="text-xs text-muted-foreground">En cours</p></div>
                    </CardContent>
                </Card>
                <Card className="shadow-card">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-success flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                        <div><p className="text-2xl font-bold">{counts.resolu}</p><p className="text-xs text-muted-foreground">Résolus</p></div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="ouvert">Ouvert</SelectItem>
                        <SelectItem value="en_cours">En cours</SelectItem>
                        <SelectItem value="resolu">Résolu</SelectItem>
                        <SelectItem value="ferme">Fermé</SelectItem>
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
                                <TableHead>Sujet</TableHead>
                                <TableHead>Assigné à</TableHead>
                                <TableHead>Priorité</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun ticket</TableCell></TableRow>
                            ) : filtered.map((t: any) => (
                                <TableRow key={t.id}>
                                    <TableCell className="font-mono text-sm">{t.reference}</TableCell>
                                    <TableCell>{t.clients?.full_name}</TableCell>
                                    <TableCell className="max-w-48 truncate">{t.subject}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-xs">
                                            {t.assigned_to ? (
                                                <>
                                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                                                        {staff.find((s: any) => s.user_id === t.assigned_to)?.full_name?.charAt(0) || "?"}
                                                    </div>
                                                    <span className="truncate max-w-[80px]">
                                                        {staff.find((s: any) => s.user_id === t.assigned_to)?.full_name}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-muted-foreground italic text-[10px]">Non assigné</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={priorityColors[t.priority] || ""}>{t.priority}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={statusColors[t.status] || ""}>{statusLabels[t.status] || t.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(t.created_at), "dd MMM yyyy", { locale: fr })}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => { setSelectedTicket(t); setDetailOpen(true); }}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouveau ticket SAV</DialogTitle>
                        <DialogDescription>
                            Créez un nouveau ticket pour suivre un problème ou une demande d'assistance client.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Client *</Label>
                            <Select value={form.client_id} onValueChange={v => setForm(p => ({ ...p, client_id: v }))}>
                                <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                                <SelectContent>
                                    {clients.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>{c.full_name}{c.company_name ? ` (${c.company_name})` : ""}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Sujet *</Label>
                            <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Priorité</Label>
                            <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="faible">Faible</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="eleve">Élevé</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
                        </div>
                        <Button onClick={() => createTicket.mutate()}
                            disabled={!form.client_id || !form.subject || createTicket.isPending} className="w-full">
                            Créer le ticket
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Detail dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HeadphonesIcon className="h-5 w-5" /> {selectedTicket?.reference}
                        </DialogTitle>
                        <DialogDescription>
                            Historique et gestion des commentaires pour ce ticket SAV.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedTicket && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-muted-foreground">Client:</span> {selectedTicket.clients?.full_name}</div>
                                <div><span className="text-muted-foreground">Priorité:</span> {selectedTicket.priority}</div>
                                <div>
                                    <span className="text-muted-foreground">Statut:</span>{" "}
                                    <Select value={selectedTicket.status}
                                        onValueChange={v => { updateStatus.mutate({ id: selectedTicket.id, status: v }); setSelectedTicket({ ...selectedTicket, status: v }); }}>
                                        <SelectTrigger className="w-36 h-8 inline-flex"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ouvert">Ouvert</SelectItem>
                                            <SelectItem value="en_cours">En cours</SelectItem>
                                            <SelectItem value="resolu">Résolu</SelectItem>
                                            <SelectItem value="ferme">Fermé</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Assigné à:</span>{" "}
                                    <Select value={selectedTicket.assigned_to || "none"}
                                        onValueChange={v => { assignTicket.mutate(v === "none" ? null : v); setSelectedTicket({ ...selectedTicket, assigned_to: v === "none" ? null : v }); }}>
                                        <SelectTrigger className="w-36 h-8 inline-flex"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Non assigné</SelectItem>
                                            {staff.map((s: any) => (
                                                <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2"><span className="text-muted-foreground">Date:</span> {format(new Date(selectedTicket.created_at), "dd/MM/yyyy HH:mm")}</div>
                            </div>

                            <Separator />

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 font-medium text-sm">
                                    <MessageSquare className="h-4 w-4" /> Discussion
                                </div>
                                <ScrollArea className="h-[250px] pr-4">
                                    <div className="space-y-4">
                                        <div className="bg-muted p-3 rounded-lg text-sm border-l-4 border-primary/50">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-xs uppercase">Description initiale</span>
                                                <span className="text-[10px] text-muted-foreground">{format(new Date(selectedTicket.created_at), "dd/MM HH:mm")}</span>
                                            </div>
                                            {selectedTicket.description}
                                        </div>

                                        {comments.map((c: any) => (
                                            <div key={c.id} className={`p-3 rounded-lg text-sm ${c.is_internal ? 'bg-amber-50 border border-amber-200' : 'bg-secondary'}`}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-xs">{c.profiles?.full_name} {c.is_internal && <Badge variant="outline" className="text-[10px] h-4 ml-1 border-amber-300 text-amber-600">Interne</Badge>}</span>
                                                    <span className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), "dd/MM HH:mm")}</span>
                                                </div>
                                                {c.content}
                                            </div>
                                        ))}
                                        {loadingComments && <div className="text-center text-xs text-muted-foreground py-2">Chargement des messages...</div>}
                                    </div>
                                </ScrollArea>

                                <div className="space-y-3 pt-2">
                                    <Textarea
                                        placeholder="Votre message..."
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        rows={2}
                                        className="text-sm"
                                    />
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Switch id="internal" checked={isInternal} onCheckedChange={setIsInternal} />
                                            <Label htmlFor="internal" className="text-xs cursor-pointer">Note interne</Label>
                                        </div>
                                        <Button size="sm" onClick={() => postComment.mutate()} disabled={!comment || postComment.isPending}>
                                            <Send className="h-3 w-3 mr-2" /> Répondre
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SavPage;
