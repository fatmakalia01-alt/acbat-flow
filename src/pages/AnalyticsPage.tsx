import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
    TrendingUp, TrendingDown, Users, ShoppingCart, FileText,
    Euro, Lightbulb, AlertTriangle, CheckCircle2, ArrowUpRight
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { calcConversionRate } from "@/lib/calculations";

// ── Palette ──────────────────────────────────────
const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#a78bfa"];

// ── LLM-style insights generator (deterministic, no API) ─────────────────────
function generateInsights(data: {
    totalCA: number;
    caGrowth: number;
    orderCount: number;
    clientCount: number;
    conversionRate: number;
    topMonth: string;
    lowMonth: string;
    pendingOrders: number;
    canceledOrders: number;
}) {
    const insights: { type: "success" | "warning" | "info"; text: string }[] = [];

    // Revenue trend
    if (data.caGrowth > 10) {
        insights.push({ type: "success", text: `📈 Croissance du CA de ${data.caGrowth.toFixed(1)}% ce mois — excellente dynamique commerciale.` });
    } else if (data.caGrowth < -10) {
        insights.push({ type: "warning", text: `📉 Baisse du CA de ${Math.abs(data.caGrowth).toFixed(1)}% — action commerciale recommandée.` });
    } else {
        insights.push({ type: "info", text: `📊 CA stable (variation de ${data.caGrowth > 0 ? "+" : ""}${data.caGrowth.toFixed(1)}%) — maintenir le rythme.` });
    }

    // Conversion rate
    if (data.conversionRate >= 0.6) {
        insights.push({ type: "success", text: `✅ Taux de conversion devis → commande de ${formatPercent(data.conversionRate)} — performance commerciale élevée.` });
    } else if (data.conversionRate < 0.3) {
        insights.push({ type: "warning", text: `⚠️ Taux de conversion de ${formatPercent(data.conversionRate)} — analyser les devis non convertis et relancer les prospects.` });
    } else {
        insights.push({ type: "info", text: `🎯 Taux de conversion de ${formatPercent(data.conversionRate)} — marge de progression identifiée sur le suivi des devis.` });
    }

    // Pending orders
    if (data.pendingOrders > 5) {
        insights.push({ type: "warning", text: `🕐 ${data.pendingOrders} commandes en attente — vérifier les délais logistiques et prioriser le traitement.` });
    }

    // Cancellations
    if (data.canceledOrders > 0) {
        insights.push({ type: "warning", text: `❌ ${data.canceledOrders} annulation(s) détectée(s) — identifier les causes (stock, délai, client).` });
    }

    // Client base
    if (data.clientCount > 50) {
        insights.push({ type: "success", text: `👥 Base clients solide (${data.clientCount} clients) — envisager un programme de fidélisation.` });
    } else if (data.clientCount < 10) {
        insights.push({ type: "info", text: `👥 ${data.clientCount} clients actifs — prioriser la prospection pour élargir le portefeuille.` });
    }

    // Peak month
    if (data.topMonth) {
        insights.push({ type: "info", text: `📅 Meilleure performance: ${data.topMonth} — analyser les facteurs de succès pour les reproduire.` });
    }

    return insights;
}

// ── Helpers ───────────────────────────────────────
const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const KPICard = ({
    title, value, sub, icon: Icon, trend, color = "text-primary"
}: {
    title: string; value: string; sub?: string;
    icon: any; trend?: number; color?: string;
}) => (
    <Card className="relative overflow-hidden">
        <CardContent className="p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-muted-foreground mb-1">{title}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
            </div>
            {trend !== undefined && (
                <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trend >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {trend >= 0 ? "+" : ""}{trend.toFixed(1)}% vs mois dernier
                </div>
            )}
        </CardContent>
    </Card>
);

const InsightIcon = ({ type }: { type: "success" | "warning" | "info" }) => {
    if (type === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />;
    if (type === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />;
    return <Lightbulb className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />;
};

// ── Main Page ─────────────────────────────────────
const AnalyticsPage = () => {
    const [period] = useState<"6m" | "12m">("12m");

    const { data: orders = [] } = useQuery({
        queryKey: ["analytics-orders"],
        queryFn: async () => {
            const { data } = await supabase
                .from("orders")
                .select("id, total_amount, status, created_at")
                .order("created_at");
            return data ?? [];
        },
    });

    const { data: clients = [] } = useQuery({
        queryKey: ["analytics-clients"],
        queryFn: async () => {
            const { data } = await supabase.from("clients").select("id, created_at");
            return data ?? [];
        },
    });

    const { data: quotes = [] } = useQuery({
        queryKey: ["analytics-quotes"],
        queryFn: async () => {
            const { data } = await supabase.from("quotes").select("id, status, total_amount");
            return data ?? [];
        },
    });

    // ── Computed metrics ──────────────────────────────
    const metrics = useMemo(() => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;

        const validOrders = (orders as any[]).filter((o) => o.status !== "cancelled");
        const totalCA = validOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
        const thisMonthCA = validOrders
            .filter((o: any) => {
                const d = new Date(o.created_at);
                return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
            })
            .reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
        const lastMonthCA = validOrders
            .filter((o: any) => {
                const d = new Date(o.created_at);
                return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
            })
            .reduce((s: number, o: any) => s + (o.total_amount || 0), 0);

        const caGrowth = lastMonthCA > 0 ? ((thisMonthCA - lastMonthCA) / lastMonthCA) * 100 : 0;

        // Monthly CA for chart (last 12 months)
        const monthlyData: Record<string, number> = {};
        for (let i = 11; i >= 0; i--) {
            const d = new Date(thisYear, thisMonth - i, 1);
            const key = `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
            monthlyData[key] = 0;
        }
        validOrders.forEach((o: any) => {
            const d = new Date(o.created_at);
            const key = `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
            if (key in monthlyData) monthlyData[key] += o.total_amount || 0;
        });
        const monthlyChart = Object.entries(monthlyData).map(([month, ca]) => ({ month: month.split(" ")[0], ca }));

        // Top month
        const topEntry = Object.entries(monthlyData).sort((a, b) => b[1] - a[1])[0];
        const topMonth = topEntry ? topEntry[0] : "";
        const lowEntry = Object.entries(monthlyData).sort((a, b) => a[1] - b[1])[0];
        const lowMonth = lowEntry ? lowEntry[0] : "";

        // Status distribution
        const statusCount: Record<string, number> = {};
        (orders as any[]).forEach((o: any) => {
            statusCount[o.status] = (statusCount[o.status] || 0) + 1;
        });
        const statusChart = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

        // Conversion
        const quotesTotal = (quotes as any[]).length;
        const quotesConverted = (quotes as any[]).filter((q: any) => q.status === "accepted").length;
        const conversionRate = calcConversionRate(quotesConverted, quotesTotal);

        const pendingOrders = (orders as any[]).filter((o: any) => o.status === "pending").length;
        const canceledOrders = (orders as any[]).filter((o: any) => o.status === "cancelled").length;

        return {
            totalCA, thisMonthCA, caGrowth,
            orderCount: orders.length,
            clientCount: clients.length,
            quotesTotal, quotesConverted, conversionRate,
            monthlyChart, statusChart,
            topMonth, lowMonth,
            pendingOrders, canceledOrders,
        };
    }, [orders, clients, quotes]);

    const insights = useMemo(
        () => generateInsights(metrics),
        [metrics]
    );

    const statuses: Record<string, string> = {
        pending: "En attente", confirmed: "Confirmée", delivered: "Livrée",
        cancelled: "Annulée", processing: "En traitement",
    };

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Analytics</h1>
                    <p className="text-muted-foreground text-sm">Tableau de bord analytique avec insights IA</p>
                </div>
                <Badge variant="outline" className="gap-1.5 text-xs">
                    <ArrowUpRight className="h-3 w-3" /> Données en temps réel
                </Badge>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                    title="CA Total"
                    value={formatCurrency(metrics.totalCA)}
                    sub={`Ce mois: ${formatCurrency(metrics.thisMonthCA)}`}
                    icon={Euro}
                    trend={metrics.caGrowth}
                    color="text-primary"
                />
                <KPICard
                    title="Commandes"
                    value={String(metrics.orderCount)}
                    sub={`${metrics.pendingOrders} en attente`}
                    icon={ShoppingCart}
                />
                <KPICard
                    title="Clients"
                    value={String(metrics.clientCount)}
                    sub="Base clients totale"
                    icon={Users}
                    color="text-cyan-500"
                />
                <KPICard
                    title="Taux conversion"
                    value={formatPercent(metrics.conversionRate)}
                    sub={`${metrics.quotesConverted}/${metrics.quotesTotal} devis`}
                    icon={FileText}
                    color="text-emerald-500"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* CA Mensuel */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Chiffre d'Affaires Mensuel</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={metrics.monthlyChart} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Bar dataKey="ca" name="CA (€)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Répartition statuts */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Statuts commandes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={metrics.statusChart}
                                    cx="50%" cy="50%"
                                    innerRadius={55} outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                    nameKey="name"
                                    label={({ name, value }) => `${statuses[name] ?? name} (${value})`}
                                    labelLine={false}
                                >
                                    {metrics.statusChart.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v, name: string) => [v, statuses[name] ?? name]} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Evolution commandes line chart */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Évolution des commandes (CA mensuel)</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={metrics.monthlyChart} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Line
                                type="monotone" dataKey="ca" name="CA (€)"
                                stroke="#22d3ee" strokeWidth={2.5}
                                dot={{ fill: "#22d3ee", r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* IA Insights */}
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        Insights IA — Analyse automatique
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                        Analyse générée automatiquement à partir des données de votre activité.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {insights.map((insight, i) => (
                            <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-background/60 border border-border">
                                <InsightIcon type={insight.type} />
                                <p className="text-sm leading-relaxed">{insight.text}</p>
                            </div>
                        ))}
                        {insights.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Pas assez de données pour générer des insights.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AnalyticsPage;
