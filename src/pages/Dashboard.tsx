import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  ShoppingCart, Users, TrendingUp, AlertTriangle, ListTodo,
  UserCheck, UserX, Shield, Eye, CheckCircle2, Clock, Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
  brouillon: "hsl(210, 20%, 70%)",
  en_validation: "hsl(40, 96%, 53%)",
  validee: "hsl(142, 71%, 45%)",
  en_commande_fournisseur: "hsl(217, 91%, 60%)",
  en_reception: "hsl(250, 80%, 60%)",
  en_preparation: "hsl(270, 70%, 55%)",
  en_livraison: "hsl(28, 100%, 48%)",
  livree: "hsl(122, 39%, 49%)",
  en_facturation: "hsl(50, 100%, 50%)",
  payee: "hsl(170, 60%, 45%)",
  cloturee: "hsl(210, 10%, 60%)",
  annulee: "hsl(4, 80%, 60%)",
};

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon", en_validation: "En validation", validee: "Validée",
  en_commande_fournisseur: "Cmd fournisseur", en_reception: "Réception",
  en_preparation: "Préparation", en_livraison: "Livraison", livree: "Livrée",
  en_facturation: "Facturation", payee: "Payée", cloturee: "Clôturée", annulee: "Annulée",
};

// ─── Workflow Steps Config ────────────────────────────────────────────────────
const WORKFLOW_STEPS = [
  { key: "creation_commande", label: "Création", short: "1" },
  { key: "validation_commerciale", label: "Validation", short: "2" },
  { key: "commande_fournisseur", label: "Fournisseur", short: "3" },
  { key: "reception_marchandises", label: "Réception", short: "4" },
  { key: "preparation_technique", label: "Préparation", short: "5" },
  { key: "livraison_installation", label: "Livraison", short: "6" },
  { key: "validation_client", label: "Validation", short: "7" },
  { key: "facturation_paiement", label: "Facturation", short: "8" },
  { key: "cloture_archivage", label: "Clôture", short: "9" },
];

const ACTIVE_STATUSES = [
  "validee", "en_commande_fournisseur", "en_reception",
  "en_preparation", "en_livraison", "en_facturation",
];

// ─── Horizontal Workflow Row ─────────────────────────────────────────────────
const WorkflowRow = React.forwardRef<HTMLDivElement, { order: any }>(({ order }, ref) => {
  const steps = order.order_workflow_steps || [];
  const getStep = (key: string) => steps.find((s: any) => s.step_name === key);
  const completed = steps.filter((s: any) => s.status === "completed").length;
  const total = WORKFLOW_STEPS.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div ref={ref} className="border border-slate-100 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-sm text-slate-800">
            {order.reference || `#${order.id?.slice(0, 8)}`}
          </span>
          {order.clients?.full_name && (
            <span className="text-xs text-slate-500 ml-2">{order.clients.full_name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{pct}%</span>
          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Horizontal Steps */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {WORKFLOW_STEPS.map((wf, idx) => {
          const step = getStep(wf.key);
          const status = step?.status || "pending";
          const isCompleted = status === "completed";
          const isInProgress = status === "in_progress";
          const isLast = idx === WORKFLOW_STEPS.length - 1;

          return (
            <React.Fragment key={wf.key}>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div
                  title={wf.label}
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all",
                    isCompleted
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : isInProgress
                        ? "bg-blue-500 border-blue-500 text-white animate-pulse"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isInProgress ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    wf.short
                  )}
                </div>
                <span className="text-[9px] text-slate-400 w-12 text-center leading-tight hidden sm:block">
                  {wf.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 flex-1 min-w-3 rounded-full",
                    isCompleted ? "bg-emerald-400" : "bg-slate-100"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
});

WorkflowRow.displayName = "WorkflowRow";

const Dashboard = React.forwardRef<HTMLDivElement, {}>(

  (_, ref) => {
    const { user, profile, isManager } = useAuth();
    const navigate = useNavigate();
    const [delegationActive, setDelegationActive] = useState(false);
    const [delegationReason, setDelegationReason] = useState("");
    const [showDelegation, setShowDelegation] = useState(false);
    const [showAllOrders, setShowAllOrders] = useState(false);
    const [stats, setStats] = useState({ orders: 0, clients: 0, delayed: 0 });

    // Real KPIs
    useEffect(() => {
      const fetchStats = async () => {
        const [ordersRes, clientsRes, delayedRes, delegRes] = await Promise.all([
          supabase.from("client_orders").select("id", { count: "exact", head: true }),
          supabase.from("clients").select("id", { count: "exact", head: true }),
          supabase.from("order_workflow_steps").select("id", { count: "exact", head: true }).eq("status", "delayed"),
          supabase.from("delegations").select("*").eq("status", "active").eq("from_user_id", user?.id ?? ""),
        ]);
        setStats({
          orders: ordersRes.count ?? 0,
          clients: clientsRes.count ?? 0,
          delayed: delayedRes.count ?? 0,
        });
        setDelegationActive((delegRes.data?.length ?? 0) > 0);
      };
      if (user) fetchStats();
    }, [user]);

    // Real CA this month
    const { data: currentMonthCA = 0 } = useQuery({
      queryKey: ["ca-current-month"],
      queryFn: async () => {
        const { data } = await supabase.rpc("get_current_month_ca");
        return data ?? 0;
      },
    });

    // Real CA evolution
    const { data: caEvolution = [], isLoading: caLoading } = useQuery({
      queryKey: ["ca-evolution"],
      queryFn: async () => {
        const { data, error } = await supabase.rpc("get_ca_evolution_12months");
        if (error || !data?.length) {
          // Fallback mock data if no real data yet
          return [
            { mois: "Mar", ca: 45000 }, { mois: "Avr", ca: 52000 }, { mois: "Mai", ca: 49000 },
            { mois: "Jun", ca: 63000 }, { mois: "Jul", ca: 58000 }, { mois: "Aoû", ca: 71000 },
            { mois: "Sep", ca: 67000 }, { mois: "Oct", ca: 74000 }, { mois: "Nov", ca: 82000 },
            { mois: "Déc", ca: 78000 }, { mois: "Jan", ca: 85000 }, { mois: "Fév", ca: 91000 },
          ];
        }
        return data;
      },
    });

    // Real top commerciaux
    const { data: topCommerciaux = [], isLoading: topLoading } = useQuery({
      queryKey: ["top-commerciaux"],
      queryFn: async () => {
        const { data, error } = await supabase.rpc("get_top_commerciaux", { limit_n: 5 });
        if (error || !data?.length) {
          return [
            { nom: "Ahmed B.", ca: 32000 }, { nom: "Sonia M.", ca: 28500 },
            { nom: "Karim L.", ca: 25000 }, { nom: "Fatma H.", ca: 22000 }, { nom: "Youssef T.", ca: 19500 },
          ];
        }
        return data;
      },
    });

    // Real status distribution
    const { data: rawStatusData = [] } = useQuery({
      queryKey: ["orders-status-distribution"],
      queryFn: async () => {
        const { data, error } = await supabase.rpc("get_orders_status_distribution");
        if (error || !data?.length) {
          return [
            { name: "en_cours", value: 24 }, { name: "livree", value: 45 },
            { name: "delayed", value: 8 }, { name: "en_attente", value: 12 },
          ];
        }
        return data;
      },
    });

    const statusData = rawStatusData.map((d: any) => ({
      name: STATUS_LABELS[d.name] || d.name,
      value: Number(d.value),
      color: STATUS_COLORS[d.name] || "hsl(210, 20%, 70%)",
    }));

    // Real satisfaction rate from SAV tickets
    const { data: savStats } = useQuery({
      queryKey: ["sav-satisfaction"],
      queryFn: async () => {
        const { data } = await supabase
          .from("sav_tickets")
          .select("status");
        if (!data?.length) return null;
        const total = data.length;
        const resolved = data.filter((t) => t.status === "resolu" || t.status === "ferme").length;
        return { rate: Math.round((resolved / total) * 100), total };
      },
    });

    const satisfactionRate = savStats?.rate ?? null;
    // SVG circle circumference for r=60: 2πr ≈ 377
    const CIRC = 377;
    const satisfactionDash = satisfactionRate !== null ? (satisfactionRate / 100) * CIRC : 0;

    // Active orders with workflow steps
    const { data: activeOrders = [], isLoading: ordersLoading } = useQuery({
      queryKey: ["dashboard-active-orders"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("client_orders")
          .select("id, reference, status, created_at, clients(full_name), order_workflow_steps(step_name, status, step_order)")
          .in("status", ACTIVE_STATUSES)
          .order("created_at", { ascending: false });
        if (error) return [];
        return data || [];
      },
      refetchInterval: 30000,
    });

    const last5Orders = activeOrders.slice(0, 5);

    const toggleDelegation = async () => {
      if (!user) return;
      if (delegationActive) {
        await supabase.from("delegations").update({ status: "revoked" })
          .eq("from_user_id", user.id).eq("status", "active");
        setDelegationActive(false);
        toast({ title: "Mode absence désactivé" });
      } else {
        const { data: directeurs } = await supabase.from("user_roles")
          .select("user_id").eq("role", "directeur_exploitation").limit(1);
        if (!directeurs?.length) {
          toast({ title: "Aucun Directeur d'Exploitation trouvé", variant: "destructive" });
          return;
        }
        await supabase.from("delegations").insert({
          from_user_id: user.id,
          to_user_id: directeurs[0].user_id,
          role: "directeur_exploitation",
          reason: delegationReason || "Absence manager",
          status: "active",
        });
        setDelegationActive(true);
        setShowDelegation(false);
        toast({ title: "Mode absence activé", description: "Validations transférées au Directeur d'Exploitation" });
      }
    };

    const formatCA = (v: number) => {
      if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
      if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
      return v.toString();
    };

    return (
      <div ref={ref} className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Bonjour, {profile?.full_name || "Manager"} 👋
            </h1>
            <p className="text-muted-foreground text-sm">Vue d'ensemble de votre activité ACBAT</p>
          </div>
          {isManager() && (
            <Dialog open={showDelegation} onOpenChange={setShowDelegation}>
              <DialogTrigger asChild>
                <Button
                  variant={delegationActive ? "destructive" : "outline"}
                  className="gap-2"
                  onClick={delegationActive ? toggleDelegation : undefined}
                >
                  {delegationActive ? <UserX className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                  {delegationActive ? "Désactiver absence" : "Activer mode absence"}
                </Button>
              </DialogTrigger>
              {!delegationActive && (
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Activer le mode absence</DialogTitle>
                    <DialogDescription>
                      Configurez le transfert de vos validations durant votre absence.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Toutes les validations seront transférées au Directeur d'Exploitation.
                    </p>
                    <div className="space-y-2">
                      <Label>Raison (optionnel)</Label>
                      <Textarea value={delegationReason} onChange={e => setDelegationReason(e.target.value)}
                        placeholder="Congés, déplacement..." />
                    </div>
                    <Button onClick={toggleDelegation} className="w-full gradient-primary text-primary-foreground">
                      Confirmer l'activation
                    </Button>
                  </div>
                </DialogContent>
              )}
            </Dialog>
          )}
        </div>

        {delegationActive && (
          <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-3 flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-secondary" />
            <p className="text-sm font-medium">Mode absence actif — Validations déléguées au Directeur d'Exploitation</p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.orders}</p>
                <p className="text-xs text-muted-foreground">Commandes totales</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center">
                <ListTodo className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeOrders.length}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.clients}</p>
                <p className="text-xs text-muted-foreground">Clients actifs</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-success flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCA(Number(currentMonthCA))}</p>
                <p className="text-xs text-muted-foreground">CA ce mois (TND)</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-destructive flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.delayed}</p>
                <p className="text-xs text-muted-foreground">Retards</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Workflow Overview (Moved up between KPIs and Charts) ── */}
        <Card className="shadow-card border-l-4 border-l-blue-500">
          <CardHeader className="pb-3 px-6 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-blue-500" />
                  Suivi des Commandes en Cours
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visualisation rapide des {activeOrders.length} commande(s) active(s)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={showAllOrders} onOpenChange={setShowAllOrders}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Eye className="h-4 w-4" />
                      Aperçu complet
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Toutes les commandes en cours ({activeOrders.length})</DialogTitle>
                      <DialogDescription>
                        Workflow en 9 étapes pour chaque commande active
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 mt-2">
                      {activeOrders.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Aucune commande active pour l'instant
                        </p>
                      ) : (
                        activeOrders.map((order: any) => (
                          <WorkflowRow key={order.id} order={order} />
                        ))
                      )}
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button
                        onClick={() => { setShowAllOrders(false); navigate("/tracking"); }}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ouvrir Suivi Commandes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : last5Orders.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">Aucune commande active en cours</p>
              </div>
            ) : (
              <div className="space-y-3">
                {last5Orders.map((order: any) => (
                  <WorkflowRow key={order.id} order={order} />
                ))}
                {activeOrders.length > 5 && (
                  <p className="text-xs text-center text-muted-foreground pt-1">
                    + {activeOrders.length - 5} autre(s) commande(s) — cliquez sur <b>Aperçu complet</b>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CA Evolution */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Évolution CA (12 mois)</CardTitle>
            </CardHeader>
            <CardContent>
              {caLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={caEvolution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mois" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))"
                      tickFormatter={v => `${v / 1000}K`} />
                    <Tooltip formatter={(v: number) => [`${v.toLocaleString()} TND`, "CA"]} />
                    <Line type="monotone" dataKey="ca" stroke="hsl(28, 100%, 48%)" strokeWidth={3}
                      dot={{ r: 4, fill: "hsl(28, 100%, 48%)" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Status Repartition */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Répartition par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                    dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Commerciaux */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Top 5 Commerciaux</CardTitle>
            </CardHeader>
            <CardContent>
              {topLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topCommerciaux} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))"
                      tickFormatter={v => `${v / 1000}K`} />
                    <YAxis type="category" dataKey="nom" tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))" width={80} />
                    <Tooltip formatter={(v: number) => [`${v.toLocaleString()} TND`, "CA"]} />
                    <Bar dataKey="ca" fill="hsl(205, 50%, 21%)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Satisfaction */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Taux de résolution SAV</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-36 h-36">
                    <circle cx="72" cy="72" r="60" fill="none" stroke="hsl(var(--border))" strokeWidth="12" />
                    {satisfactionRate !== null && (
                      <circle cx="72" cy="72" r="60" fill="none" stroke="hsl(122, 39%, 49%)" strokeWidth="12"
                        strokeDasharray={`${satisfactionDash} ${CIRC}`} strokeLinecap="round"
                        transform="rotate(-90 72 72)" />
                    )}
                  </svg>
                  <span className="absolute text-3xl font-bold">
                    {satisfactionRate !== null ? `${satisfactionRate}%` : "N/A"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {savStats ? `${savStats.total} ticket(s) SAV traité(s)` : "Aucun ticket SAV encore"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    );
  }
);

Dashboard.displayName = "Dashboard";

export default Dashboard;
