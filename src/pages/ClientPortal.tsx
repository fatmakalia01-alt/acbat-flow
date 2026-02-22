import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  ClipboardList, CheckCircle2, Truck, Wrench, Package, FileCheck,
  CreditCard, Archive, Download, AlertCircle, Clock
} from "lucide-react";

const STEP_CONFIG = [
  { name: "creation_commande", label: "Création commande", icon: ClipboardList, delay: "2j" },
  { name: "validation_commerciale", label: "Validation commerciale", icon: CheckCircle2, delay: "1j" },
  { name: "commande_fournisseur", label: "Commande fournisseur", icon: Package, delay: "30j" },
  { name: "reception_marchandises", label: "Réception marchandises", icon: Truck, delay: "2j" },
  { name: "preparation_technique", label: "Préparation technique", icon: Wrench, delay: "3j" },
  { name: "livraison_installation", label: "Livraison & Installation", icon: Truck, delay: "1j" },
  { name: "validation_client", label: "Validation client", icon: FileCheck, delay: "—" },
  { name: "facturation_paiement", label: "Facturation", icon: CreditCard, delay: "7j" },
  { name: "cloture_archivage", label: "Clôture", icon: Archive, delay: "—" },
];

interface WorkflowStep {
  id: string;
  step_name: string;
  step_order: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  due_date: string | null;
}

interface Order {
  id: string;
  reference: string;
  status: string;
  total_ttc: number;
  created_at: string;
  steps: WorkflowStep[];
}

const ClientPortal = () => {
  const { profile, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      const { data: ordersData } = await supabase
        .from("client_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersData) {
        const enriched = await Promise.all(
          ordersData.map(async (order: any) => {
            const { data: steps } = await supabase
              .from("order_workflow_steps")
              .select("*")
              .eq("order_id", order.id)
              .order("step_order");
            return { ...order, steps: steps || [] };
          })
        );
        setOrders(enriched);
        if (enriched.length > 0) setSelectedOrder(enriched[0]);
      }
    };
    fetchOrders();
  }, [user]);

  const getStepColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success text-success-foreground";
      case "in_progress": return "bg-secondary text-secondary-foreground";
      case "delayed": return "bg-destructive text-destructive-foreground";
      case "blocked": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getProgressPercent = (steps: WorkflowStep[]) => {
    if (!steps.length) return 0;
    const completed = steps.filter(s => s.status === "completed").length;
    return Math.round((completed / steps.length) * 100);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="gradient-hero rounded-2xl p-8 text-primary-foreground">
        <h1 className="text-2xl font-display font-bold">
          Bonjour, {profile?.full_name || "Client"} 👋
        </h1>
        <p className="text-primary-foreground/80 mt-1">Votre espace ACBAT — Suivi de vos projets</p>
      </div>

      {orders.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-lg">Aucune commande</h3>
            <p className="text-muted-foreground text-sm mt-1">Vos commandes apparaîtront ici</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {orders.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {orders.map(order => (
                <Button
                  key={order.id}
                  variant={selectedOrder?.id === order.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedOrder(order)}
                  className="flex-shrink-0"
                >
                  {order.reference}
                </Button>
              ))}
            </div>
          )}

          {selectedOrder && (
            <div className="space-y-6">
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-lg">{selectedOrder.reference}</CardTitle>
                    <Badge variant="secondary">{selectedOrder.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Montant: {Number(selectedOrder.total_ttc).toLocaleString()} TND</span>
                    <span>Créée le: {new Date(selectedOrder.created_at).toLocaleDateString("fr-TN")}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Progress bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progression</span>
                      <span className="text-sm font-bold text-secondary">{getProgressPercent(selectedOrder.steps)}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full gradient-accent"
                        initial={{ width: 0 }}
                        animate={{ width: `${getProgressPercent(selectedOrder.steps)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-1">
                    {STEP_CONFIG.map((config, idx) => {
                      const step = selectedOrder.steps.find(s => s.step_name === config.name);
                      const status = step?.status || "pending";
                      const Icon = config.icon;
                      const isActive = status === "in_progress";

                      return (
                        <motion.div
                          key={config.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${isActive ? "bg-secondary/10 border border-secondary/30" : ""}`}
                        >
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${getStepColor(status)}`}>
                            {status === "completed" ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : status === "delayed" ? (
                              <AlertCircle className="h-5 w-5" />
                            ) : (
                              <Icon className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${status === "completed" ? "text-success" : isActive ? "text-secondary font-semibold" : "text-muted-foreground"}`}>
                              {config.label}
                            </p>
                            {step?.completed_at && (
                              <p className="text-xs text-muted-foreground">
                                Terminé le {new Date(step.completed_at).toLocaleDateString("fr-TN")}
                              </p>
                            )}
                            {isActive && (
                              <p className="text-xs text-secondary flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" /> En cours — Délai standard: {config.delay}
                              </p>
                            )}
                          </div>
                          {idx < 8 && <div className="h-px flex-shrink-0 w-4 bg-border" />}
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Documents */}
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base">Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {["Devis", "Bon de livraison", "Facture"].map(doc => (
                      <Button key={doc} variant="outline" className="justify-start gap-2 h-auto py-3">
                        <Download className="h-4 w-4 text-secondary" />
                        <div className="text-left">
                          <p className="text-sm font-medium">{doc}</p>
                          <p className="text-xs text-muted-foreground">PDF</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Validation button */}
              {selectedOrder.steps.find(s => s.step_name === "validation_client" && s.status === "in_progress") && (
                <Card className="shadow-card border-success/30">
                  <CardContent className="p-6 text-center space-y-4">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
                    <h3 className="font-display font-semibold">Votre commande est prête</h3>
                    <p className="text-sm text-muted-foreground">Confirmez que tout est conforme</p>
                    <div className="flex gap-3 justify-center">
                      <Button className="bg-success hover:bg-success/90 text-success-foreground">
                        ✅ Tout est conforme
                      </Button>
                      <Button variant="outline" className="text-destructive border-destructive/30">
                        Signaler un problème
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClientPortal;
