import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { TrendingUp, AlertTriangle, DollarSign, FileText } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

const COLORS = ["hsl(205, 50%, 21%)", "hsl(28, 100%, 48%)", "hsl(195, 80%, 42%)", "hsl(122, 39%, 49%)", "hsl(4, 80%, 60%)", "hsl(270, 50%, 50%)"];

const ReportsTab = () => {
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*, clients(full_name, company_name)").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  // KPIs
  const totalCA = invoices.filter((i: any) => ["payee", "payee_partiel"].includes(i.status)).reduce((s: number, i: any) => s + (i.total_ttc || 0), 0);
  const totalEmitted = invoices.filter((i: any) => i.status !== "annulee").reduce((s: number, i: any) => s + (i.total_ttc || 0), 0);
  const totalUnpaid = invoices.filter((i: any) => i.status === "impayee").reduce((s: number, i: any) => s + (i.total_ttc || 0), 0);
  const totalPaid = payments.filter((p: any) => p.status === "confirme").reduce((s: number, p: any) => s + (p.amount || 0), 0);

  // Monthly CA chart (last 12 months)
  const monthlyCA = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), 11 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const monthInvoices = invoices.filter((inv: any) => {
      const d = new Date(inv.created_at);
      return d >= start && d <= end && inv.status !== "annulee";
    });
    return {
      month: format(date, "MMM yy", { locale: fr }),
      ca: monthInvoices.reduce((s: number, inv: any) => s + (inv.total_ttc || 0), 0),
      paid: payments.filter((p: any) => {
        const d = new Date(p.created_at);
        return d >= start && d <= end && p.status === "confirme";
      }).reduce((s: number, p: any) => s + (p.amount || 0), 0),
    };
  });

  // Invoice status distribution
  const statusCounts = invoices.reduce((acc: any, inv: any) => {
    const label = { brouillon: "Brouillon", emise: "Émise", payee_partiel: "Partiel", payee: "Payée", impayee: "Impayée", annulee: "Annulée" }[inv.status] || inv.status;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Top clients by revenue
  const clientRevenue = invoices.filter((i: any) => i.status !== "annulee").reduce((acc: any, inv: any) => {
    const name = inv.clients?.company_name || inv.clients?.full_name || "Inconnu";
    acc[name] = (acc[name] || 0) + (inv.total_ttc || 0);
    return acc;
  }, {});
  const topClients = Object.entries(clientRevenue)
    .map(([name, amount]) => ({ name, amount: amount as number }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // Payment method distribution
  const methodCounts = payments.filter((p: any) => p.status === "confirme").reduce((acc: any, p: any) => {
    const label = { especes: "Espèces", cheque: "Chèque", virement: "Virement", carte_bancaire: "CB", traite_bancaire: "Traite" }[p.method] || p.method;
    acc[label] = (acc[label] || 0) + (p.amount || 0);
    return acc;
  }, {});
  const methodData = Object.entries(methodCounts).map(([name, value]) => ({ name, value }));

  // Unpaid invoices list
  const unpaidInvoices = invoices.filter((i: any) => i.status === "impayee").sort((a: any, b: any) => (b.total_ttc || 0) - (a.total_ttc || 0));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">CA Encaissé</p>
              <p className="text-xl font-bold">{totalCA.toLocaleString("fr-TN")} TND</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center"><FileText className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">CA Facturé</p>
              <p className="text-xl font-bold">{totalEmitted.toLocaleString("fr-TN")} TND</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Impayés</p>
              <p className="text-xl font-bold text-destructive">{totalUnpaid.toLocaleString("fr-TN")} TND</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center"><DollarSign className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Paiements reçus</p>
              <p className="text-xl font-bold">{totalPaid.toLocaleString("fr-TN")} TND</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Évolution du CA (12 derniers mois)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyCA}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString("fr-TN")} TND`} />
                <Line type="monotone" dataKey="ca" stroke="hsl(205, 50%, 21%)" strokeWidth={2} name="Facturé" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="paid" stroke="hsl(122, 39%, 49%)" strokeWidth={2} name="Encaissé" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Répartition des factures</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top clients */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top clients par CA</CardTitle></CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topClients} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 90%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString("fr-TN")} TND`} />
                  <Bar dataKey="amount" fill="hsl(28, 100%, 48%)" radius={[0, 4, 4, 0]} name="CA" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment methods */}
        <Card>
          <CardHeader><CardTitle className="text-base">Répartition par mode de paiement</CardTitle></CardHeader>
          <CardContent>
            {methodData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={methodData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name }) => name}>
                    {methodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString("fr-TN")} TND`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Unpaid invoices */}
      {unpaidInvoices.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Factures impayées ({unpaidInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Montant TTC</TableHead>
                  <TableHead>Échéance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaidInvoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono">{inv.reference}</TableCell>
                    <TableCell>{inv.clients?.full_name}</TableCell>
                    <TableCell className="font-medium text-destructive">{(inv.total_ttc || 0).toLocaleString("fr-TN")} TND</TableCell>
                    <TableCell>
                      {inv.due_date ? (
                        <Badge variant={new Date(inv.due_date) < new Date() ? "destructive" : "outline"}>
                          {format(new Date(inv.due_date), "dd/MM/yyyy")}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportsTab;
