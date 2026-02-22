import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  ShoppingCart, Users, TrendingUp, AlertTriangle, Clock,
  UserCheck, UserX, Shield
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Mock data for charts (will be replaced with real data)
const caEvolution = [
  { mois: "Mar", ca: 45000 }, { mois: "Avr", ca: 52000 }, { mois: "Mai", ca: 49000 },
  { mois: "Jun", ca: 63000 }, { mois: "Jul", ca: 58000 }, { mois: "Aoû", ca: 71000 },
  { mois: "Sep", ca: 67000 }, { mois: "Oct", ca: 74000 }, { mois: "Nov", ca: 82000 },
  { mois: "Déc", ca: 78000 }, { mois: "Jan", ca: 85000 }, { mois: "Fév", ca: 91000 },
];

const statusData = [
  { name: "En cours", value: 24, color: "hsl(28, 100%, 48%)" },
  { name: "Terminées", value: 45, color: "hsl(122, 39%, 49%)" },
  { name: "En retard", value: 8, color: "hsl(4, 80%, 60%)" },
  { name: "En attente", value: 12, color: "hsl(210, 20%, 70%)" },
];

const topCommerciaux = [
  { nom: "Ahmed B.", ca: 32000 }, { nom: "Sonia M.", ca: 28500 },
  { nom: "Karim L.", ca: 25000 }, { nom: "Fatma H.", ca: 22000 }, { nom: "Youssef T.", ca: 19500 },
];

const Dashboard = () => {
  const { user, profile, isManager } = useAuth();
  const [delegationActive, setDelegationActive] = useState(false);
  const [delegationReason, setDelegationReason] = useState("");
  const [showDelegation, setShowDelegation] = useState(false);
  const [stats, setStats] = useState({ orders: 0, clients: 0, delayed: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [ordersRes, clientsRes, delayedRes, delegRes] = await Promise.all([
        supabase.from("client_orders").select("id", { count: "exact", head: true }),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("order_workflow_steps").select("id", { count: "exact", head: true }).eq("status", "delayed"),
        supabase.from("delegations").select("*").eq("active", true).eq("delegator_id", user?.id ?? ""),
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

  const toggleDelegation = async () => {
    if (!user) return;
    if (delegationActive) {
      await supabase.from("delegations").update({ active: false, ended_at: new Date().toISOString() })
        .eq("delegator_id", user.id).eq("active", true);
      setDelegationActive(false);
      toast({ title: "Mode absence désactivé" });
    } else {
      // Find directeur_exploitation
      const { data: directeurs } = await supabase.from("user_roles")
        .select("user_id").eq("role", "directeur_exploitation").limit(1);
      if (!directeurs?.length) {
        toast({ title: "Aucun Directeur d'Exploitation trouvé", variant: "destructive" });
        return;
      }
      await supabase.from("delegations").insert({
        delegator_id: user.id,
        delegatee_id: directeurs[0].user_id,
        reason: delegationReason || "Absence manager",
        active: true,
      });
      setDelegationActive(true);
      setShowDelegation(false);
      toast({ title: "Mode absence activé", description: "Validations transférées au Directeur d'Exploitation" });
    }
  };

  return (
    <div className="p-6 space-y-6">
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
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Toutes les validations seront transférées au Directeur d'Exploitation.
                  </p>
                  <div className="space-y-2">
                    <Label>Raison (optionnel)</Label>
                    <Textarea value={delegationReason} onChange={e => setDelegationReason(e.target.value)} placeholder="Congés, déplacement..." />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-2xl font-bold">91K</p>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CA Evolution */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Évolution CA (12 mois)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={caEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mois" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${v / 1000}K`} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString()} TND`, "CA"]} />
                <Line type="monotone" dataKey="ca" stroke="hsl(28, 100%, 48%)" strokeWidth={3} dot={{ r: 4, fill: "hsl(28, 100%, 48%)" }} />
              </LineChart>
            </ResponsiveContainer>
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
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
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
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topCommerciaux} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${v / 1000}K`} />
                <YAxis type="category" dataKey="nom" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={80} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString()} TND`, "CA"]} />
                <Bar dataKey="ca" fill="hsl(205, 50%, 21%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Satisfaction */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Taux de satisfaction</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-36 h-36">
                  <circle cx="72" cy="72" r="60" fill="none" stroke="hsl(var(--border))" strokeWidth="12" />
                  <circle cx="72" cy="72" r="60" fill="none" stroke="hsl(122, 39%, 49%)" strokeWidth="12"
                    strokeDasharray={`${0.92 * 377} ${377}`} strokeLinecap="round" transform="rotate(-90 72 72)" />
                </svg>
                <span className="absolute text-3xl font-bold">92%</span>
              </div>
              <p className="text-sm text-muted-foreground">Basé sur 80 000+ clients satisfaits</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
