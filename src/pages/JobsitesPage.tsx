import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
    Plus, Search, Construction, MapPin, Calendar, User,
    CheckCircle2, Clock, AlertCircle, XCircle, PlayCircle,
    Pencil, Eye
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/* ─── helpers ──────────────────────────────────────────────────── */

type ChantierStatus = "planifie" | "en_cours" | "en_attente" | "termine" | "annule";

const STATUS_LABELS: Record<string, string> = {
    planifie: "Planifié",
    en_cours: "En cours",
    en_attente: "En attente",
    termine: "Terminé",
    annule: "Annulé",
};

const STATUS_COLORS: Record<string, string> = {
    planifie: "bg-blue-100 text-blue-800 border-blue-200",
    en_cours: "bg-emerald-100 text-emerald-800 border-emerald-200",
    en_attente: "bg-amber-100 text-amber-800 border-amber-200",
    termine: "bg-muted text-muted-foreground border-muted",
    annule: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    planifie: <Clock className="h-4 w-4" />,
    en_cours: <PlayCircle className="h-4 w-4" />,
    en_attente: <AlertCircle className="h-4 w-4" />,
    termine: <CheckCircle2 className="h-4 w-4" />,
    annule: <XCircle className="h-4 w-4" />,
};

const ALL_STATUSES: ChantierStatus[] = ["planifie", "en_cours", "en_attente", "termine", "annule"];

/* ─── component ─────────────────────────────────────────────────── */

const JobsitesPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState<any>(null);
    const [editing, setEditing] = useState<string | null>(null);

    const emptyForm = {
        reference: "",
        name: "",
        client_id: "",
        order_id: "",
        site_id: "",
        status: "planifie" as ChantierStatus,
        planned_start: "",
        planned_end: "",
        actual_start: "",
        actual_end: "",
        team_lead: "",
        team_members_str: "",      // comma-separated, converted to array on save
        address_chantier: "",
        notes: "",
        technical_notes: "",
    };
    const [form, setForm] = useState(emptyForm);

    /* queries */
    const { data: chantiers = [], isLoading } = useQuery({
        queryKey: ["chantiers"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("chantiers")
                .select("*, clients(full_name, company_name), sites(name)")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const { data: clients = [] } = useQuery({
        queryKey: ["clients-list-chantiers"],
        queryFn: async () => {
            const { data, error } = await supabase.from("clients").select("id, full_name, company_name").order("full_name");
            if (error) throw error;
            return data;
        },
    });

    const { data: orders = [] } = useQuery({
        queryKey: ["orders-list-chantiers"],
        queryFn: async () => {
            const { data, error } = await supabase.from("client_orders").select("id, reference, client_id").order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const { data: sites = [] } = useQuery({
        queryKey: ["sites-list"],
        queryFn: async () => {
            const { data, error } = await supabase.from("sites").select("id, name, city").order("name");
            if (error) throw error;
            return data;
        },
    });

    /* mutations */
    const upsertChantier = useMutation({
        mutationFn: async () => {
            const members = form.team_members_str
                ? form.team_members_str.split(",").map((s) => s.trim()).filter(Boolean)
                : [];

            const payload: any = {
                name: form.name,
                client_id: form.client_id || null,
                order_id: form.order_id || null,
                site_id: form.site_id || null,
                status: form.status,
                planned_start: form.planned_start || null,
                planned_end: form.planned_end || null,
                actual_start: form.actual_start || null,
                actual_end: form.actual_end || null,
                team_lead: form.team_lead || null,
                team_members: members.length ? members : null,
                address_chantier: form.address_chantier || null,
                notes: form.notes || null,
                technical_notes: form.technical_notes || null,
            };

            if (editing) {
                const { error } = await supabase.from("chantiers").update(payload).eq("id", editing);
                if (error) throw error;
            } else {
                payload.reference = form.reference;
                payload.created_by = user?.id;
                const { error } = await supabase.from("chantiers").insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chantiers"] });
            setDialogOpen(false);
            setForm(emptyForm);
            setEditing(null);
            toast({ title: editing ? "Chantier mis à jour" : "Chantier créé" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { error } = await supabase.from("chantiers").update({ status: status as any }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ["chantiers"] });
            if (selected?.id === vars.id) setSelected((prev: any) => ({ ...prev, status: vars.status }));
            toast({ title: "Statut mis à jour" });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    /* derived */
    const kpi = {
        planifie: chantiers.filter((c: any) => c.status === "planifie").length,
        en_cours: chantiers.filter((c: any) => c.status === "en_cours").length,
        en_attente: chantiers.filter((c: any) => c.status === "en_attente").length,
        termine: chantiers.filter((c: any) => c.status === "termine").length,
    };

    const filtered = chantiers.filter((c: any) => {
        const matchSearch =
            c.reference?.toLowerCase().includes(search.toLowerCase()) ||
            c.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.clients?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            c.team_lead?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || c.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // Group by status for kanban view
    const groups: Record<ChantierStatus, any[]> = {
        planifie: [], en_cours: [], en_attente: [], termine: [], annule: [],
    };
    const displayList = statusFilter === "all" ? filtered : filtered;

    const openEdit = (ch: any) => {
        setEditing(ch.id);
        setForm({
            reference: ch.reference || "",
            name: ch.name || "",
            client_id: ch.client_id || "",
            order_id: ch.order_id || "",
            site_id: ch.site_id || "",
            status: ch.status || "planifie",
            planned_start: ch.planned_start || "",
            planned_end: ch.planned_end || "",
            actual_start: ch.actual_start || "",
            actual_end: ch.actual_end || "",
            team_lead: ch.team_lead || "",
            team_members_str: (ch.team_members || []).join(", "),
            address_chantier: ch.address_chantier || "",
            notes: ch.notes || "",
            technical_notes: ch.technical_notes || "",
        });
        setDialogOpen(true);
    };

    const openNew = () => {
        setEditing(null);
        const yr = new Date().getFullYear();
        const seq = String(chantiers.length + 1).padStart(4, "0");
        setForm({ ...emptyForm, reference: `CH-${yr}-${seq}` });
        setDialogOpen(true);
    };

    const filteredOrders = form.client_id
        ? orders.filter((o: any) => o.client_id === form.client_id)
        : orders;

    /* render */
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                        <Construction className="h-6 w-6 text-primary" /> Chantiers
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Planification et suivi des interventions techniques chez les clients
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="h-4 w-4 mr-2" /> Nouveau chantier
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { key: "planifie", label: "Planifiés", icon: <Clock className="h-7 w-7 text-blue-500" />, count: kpi.planifie },
                    { key: "en_cours", label: "En cours", icon: <PlayCircle className="h-7 w-7 text-emerald-500" />, count: kpi.en_cours },
                    { key: "en_attente", label: "En attente", icon: <AlertCircle className="h-7 w-7 text-amber-500" />, count: kpi.en_attente },
                    { key: "termine", label: "Terminés", icon: <CheckCircle2 className="h-7 w-7 text-muted-foreground" />, count: kpi.termine },
                ].map((item) => (
                    <button key={item.key} onClick={() => setStatusFilter(statusFilter === item.key ? "all" : item.key)} className="text-left">
                        <Card className={`transition-all hover:shadow-md ${statusFilter === item.key ? "ring-2 ring-primary" : ""}`}>
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="flex-shrink-0">{item.icon}</div>
                                <div>
                                    <p className="text-2xl font-bold">{item.count}</p>
                                    <p className="text-xs text-muted-foreground">{item.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Réf., nom, client, chef d'équipe..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 w-72"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        {ALL_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Chantier Cards Grid */}
            {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Chargement...</div>
            ) : displayList.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Construction className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                        <p className="text-lg font-medium mb-1">Aucun chantier</p>
                        <p className="text-sm text-muted-foreground">Créez votre premier chantier avec le bouton ci-dessus.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {displayList.map((ch: any) => (
                        <Card key={ch.id} className="hover:shadow-md transition-all group">
                            <CardContent className="p-4 space-y-3">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-mono text-xs text-muted-foreground">{ch.reference}</p>
                                        <p className="font-semibold text-sm leading-tight mt-0.5 line-clamp-2">{ch.name}</p>
                                    </div>
                                    <Badge className={`flex-shrink-0 border text-xs flex items-center gap-1 ${STATUS_COLORS[ch.status]}`}>
                                        {STATUS_ICONS[ch.status]}
                                        {STATUS_LABELS[ch.status]}
                                    </Badge>
                                </div>

                                {/* Client */}
                                {ch.clients && (
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <User className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span className="truncate">{ch.clients.full_name}{ch.clients.company_name ? ` · ${ch.clients.company_name}` : ""}</span>
                                    </div>
                                )}

                                {/* Address */}
                                {ch.address_chantier && (
                                    <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                        <span className="line-clamp-1">{ch.address_chantier}</span>
                                    </div>
                                )}

                                {/* Dates */}
                                {(ch.planned_start || ch.planned_end) && (
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>
                                            {ch.planned_start ? format(new Date(ch.planned_start), "dd MMM yyyy", { locale: fr }) : "—"}
                                            {" → "}
                                            {ch.planned_end ? format(new Date(ch.planned_end), "dd MMM yyyy", { locale: fr }) : "—"}
                                        </span>
                                    </div>
                                )}

                                {/* Team lead + Site */}
                                <div className="flex items-center justify-between text-xs">
                                    {ch.team_lead && (
                                        <span className="bg-primary/10 text-primary rounded px-2 py-0.5 font-medium truncate max-w-[60%]">
                                            Chef: {ch.team_lead}
                                        </span>
                                    )}
                                    {ch.sites && (
                                        <span className="text-muted-foreground">{ch.sites.name}</span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-1 border-t">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => { setSelected(ch); setDetailOpen(true); }}
                                    >
                                        <Eye className="h-3.5 w-3.5 mr-1" /> Voir
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => openEdit(ch)}
                                    >
                                        <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* ── Create / Edit Dialog ───────────────────────────────────── */}
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? "Modifier le chantier" : "Nouveau chantier"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Row 1 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Référence *</Label>
                                <Input value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} disabled={!!editing} />
                            </div>
                            <div>
                                <Label>Statut</Label>
                                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as ChantierStatus }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label>Intitulé du chantier *</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                placeholder="Pose porte blindée - Mme Dupont"
                            />
                        </div>

                        {/* Client + Order */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Client</Label>
                                <Select value={form.client_id} onValueChange={(v) => setForm((p) => ({ ...p, client_id: v, order_id: "" }))}>
                                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                    <SelectContent>
                                        {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Commande liée</Label>
                                <Select value={form.order_id} onValueChange={(v) => setForm((p) => ({ ...p, order_id: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                    <SelectContent>
                                        {filteredOrders.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.reference}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Site + Address */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Site ACBAT</Label>
                                <Select value={form.site_id} onValueChange={(v) => setForm((p) => ({ ...p, site_id: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                    <SelectContent>
                                        {sites.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.city})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Adresse chantier</Label>
                                <Input value={form.address_chantier} onChange={(e) => setForm((p) => ({ ...p, address_chantier: e.target.value }))} placeholder="Adresse d'intervention" />
                            </div>
                        </div>

                        <Separator />

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Début prévu</Label>
                                <Input type="date" value={form.planned_start} onChange={(e) => setForm((p) => ({ ...p, planned_start: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Fin prévue</Label>
                                <Input type="date" value={form.planned_end} onChange={(e) => setForm((p) => ({ ...p, planned_end: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Début réel</Label>
                                <Input type="date" value={form.actual_start} onChange={(e) => setForm((p) => ({ ...p, actual_start: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Fin réelle</Label>
                                <Input type="date" value={form.actual_end} onChange={(e) => setForm((p) => ({ ...p, actual_end: e.target.value }))} />
                            </div>
                        </div>

                        <Separator />

                        {/* Team */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Chef d'équipe</Label>
                                <Input value={form.team_lead} onChange={(e) => setForm((p) => ({ ...p, team_lead: e.target.value }))} placeholder="Prénom Nom" />
                            </div>
                            <div>
                                <Label>Membres de l'équipe</Label>
                                <Input
                                    value={form.team_members_str}
                                    onChange={(e) => setForm((p) => ({ ...p, team_members_str: e.target.value }))}
                                    placeholder="Nom1, Nom2, Nom3..."
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <Label>Notes générales</Label>
                            <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} />
                        </div>
                        <div>
                            <Label>Notes techniques</Label>
                            <Textarea value={form.technical_notes} onChange={(e) => setForm((p) => ({ ...p, technical_notes: e.target.value }))} placeholder="Modèles, dimensions, particularités de pose..." rows={2} />
                        </div>

                        <Button
                            onClick={() => upsertChantier.mutate()}
                            disabled={!form.reference || !form.name || upsertChantier.isPending}
                            className="w-full"
                        >
                            {editing ? "Enregistrer" : "Créer le chantier"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Detail Dialog ─────────────────────────────────────────── */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Construction className="h-5 w-5" />
                            {selected?.reference} — {selected?.name}
                        </DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <div className="space-y-4">
                            {/* Status Selector */}
                            <div>
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Changer le statut</Label>
                                <div className="flex gap-2 flex-wrap mt-2">
                                    {ALL_STATUSES.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => updateStatus.mutate({ id: selected.id, status: s })}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${selected.status === s ? `${STATUS_COLORS[s]} ring-2 ring-primary` : `${STATUS_COLORS[s]} opacity-60 hover:opacity-100`
                                                }`}
                                        >
                                            {STATUS_ICONS[s]}
                                            {STATUS_LABELS[s]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Info */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                {selected.clients && (
                                    <>
                                        <div>
                                            <span className="text-muted-foreground">Client</span>
                                            <p className="font-medium">{selected.clients.full_name}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Société</span>
                                            <p className="font-medium">{selected.clients.company_name || "—"}</p>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <span className="text-muted-foreground">Début prévu</span>
                                    <p className="font-medium">{selected.planned_start ? format(new Date(selected.planned_start), "dd MMMM yyyy", { locale: fr }) : "—"}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Fin prévue</span>
                                    <p className="font-medium">{selected.planned_end ? format(new Date(selected.planned_end), "dd MMMM yyyy", { locale: fr }) : "—"}</p>
                                </div>
                                {selected.actual_start && (
                                    <div>
                                        <span className="text-muted-foreground">Début réel</span>
                                        <p className="font-medium">{format(new Date(selected.actual_start), "dd MMMM yyyy", { locale: fr })}</p>
                                    </div>
                                )}
                                {selected.actual_end && (
                                    <div>
                                        <span className="text-muted-foreground">Fin réelle</span>
                                        <p className="font-medium">{format(new Date(selected.actual_end), "dd MMMM yyyy", { locale: fr })}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-muted-foreground">Site ACBAT</span>
                                    <p className="font-medium">{selected.sites?.name || "—"}</p>
                                </div>
                            </div>

                            {selected.address_chantier && (
                                <div className="flex items-start gap-2 text-sm rounded-lg bg-muted/60 p-3">
                                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                                    <span>{selected.address_chantier}</span>
                                </div>
                            )}

                            <Separator />

                            {/* Team */}
                            {(selected.team_lead || selected.team_members?.length) && (
                                <div>
                                    <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><User className="h-4 w-4" /> Équipe</p>
                                    {selected.team_lead && (
                                        <p className="text-sm"><span className="text-muted-foreground">Chef : </span>{selected.team_lead}</p>
                                    )}
                                    {selected.team_members?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {selected.team_members.map((m: string, i: number) => (
                                                <Badge key={i} variant="secondary">{m}</Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {selected.technical_notes && (
                                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                                    <p className="font-medium mb-1">Notes techniques</p>
                                    <p className="text-muted-foreground whitespace-pre-line">{selected.technical_notes}</p>
                                </div>
                            )}
                            {selected.notes && (
                                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                                    <p className="font-medium mb-1">Notes</p>
                                    <p className="text-muted-foreground whitespace-pre-line">{selected.notes}</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => { setDetailOpen(false); openEdit(selected); }}>
                                    <Pencil className="h-4 w-4 mr-2" /> Modifier
                                </Button>
                                <Button onClick={() => setDetailOpen(false)}>Fermer</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default JobsitesPage;
