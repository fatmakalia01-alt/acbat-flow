import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList, CheckCircle2, Truck, Wrench, Package, FileCheck,
  CreditCard, Archive, Download, AlertCircle, Clock, MessageSquare, FileWarning
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import OrderPDF from "@/components/OrderPDF";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon", en_validation: "En validation", validee: "Validée",
  en_cours: "En cours", terminee: "Terminée", annulee: "Annulée",
};

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
  total_ht: number;
  tva_amount: number;
  created_at: string;
  notes: string | null;
  client_id: string;
  clients?: any;
  steps: WorkflowStep[];
  items?: any[];
}

const ClientPortal = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [savOpen, setSavOpen] = useState(false);
  const [savForm, setSavForm] = useState({ subject: "", description: "", priority: "normal" });
  const [savLoading, setSavLoading] = useState(false);

  const fetchOrders = async () => {
    if (!user) return;
    const { data: ordersData } = await supabase
      .from("client_orders")
      .select("*, clients(*)")
      .order("created_at", { ascending: false });

    if (ordersData) {
      const enriched = await Promise.all(
        ordersData.map(async (order: any) => {
          const [stepsRes, itemsRes] = await Promise.all([
            supabase.from("order_workflow_steps").select("*").eq("order_id", order.id).order("step_order"),
            supabase.from("order_items").select("*, products(name, unit)").eq("order_id", order.id),
          ]);
          return { ...order, steps: stepsRes.data || [], items: itemsRes.data || [] };
        })
      );
      setOrders(enriched);
      if (enriched.length > 0) setSelectedOrder(enriched[0]);
    }
  };

  useEffect(() => { fetchOrders(); }, [user]);

  const getStepColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-500 text-white";
      case "in_progress": return "bg-blue-500 text-white";
      case "delayed": return "bg-red-500 text-white";
      case "blocked": return "bg-red-500 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getProgressPercent = (steps: WorkflowStep[]) => {
    if (!steps.length) return 0;
    const completed = steps.filter(s => s.status === "completed").length;
    return Math.round((completed / steps.length) * 100);
  };

  const submitSavTicket = async () => {
    if (!selectedOrder || !savForm.subject) return;
    setSavLoading(true);
    const { error } = await supabase.from("sav_tickets").insert({
      client_id: selectedOrder.client_id,
      subject: savForm.subject,
      description: savForm.description || null,
      priority: savForm.priority,
      created_by: user?.id,
    });
    setSavLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ticket SAV créé", description: "Notre équipe vous contactera rapidement." });
      setSavOpen(false);
      setSavForm({ subject: "", description: "", priority: "normal" });
    }
  };

  const confirmValidation = async () => {
    if (!selectedOrder) return;
    const step = selectedOrder.steps.find(s => s.step_name === "validation_client" && s.status === "in_progress");
    if (!step) return;
    await supabase.from("order_workflow_steps").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", step.id);
    toast({ title: "Validation confirmée", description: "Merci ! Votre commande passe en facturation." });
    fetchOrders();
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Hero header */}
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
          {/* Order selector */}
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
              {/* Main order card */}
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-lg">{selectedOrder.reference}</CardTitle>
                    <Badge variant="secondary">{STATUS_LABELS[selectedOrder.status] || selectedOrder.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Montant: {Number(selectedOrder.total_ttc).toLocaleString("fr-TN")} TND</span>
                    <span>Créée le: {format(new Date(selectedOrder.created_at), "dd MMMM yyyy", { locale: fr })}</span>
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
                      const isCompleted = status === "completed";

                      return (
                        <motion.div
                          key={config.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${isActive ? "bg-secondary/10 border border-secondary/30" : ""}`}
                        >
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${getStepColor(status)}`}>
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : status === "delayed" ? (
                              <AlertCircle className="h-5 w-5" />
                            ) : (
                              <Icon className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isCompleted ? "text-emerald-600" : isActive ? "text-secondary font-semibold" : "text-muted-foreground"}`}>
                              {config.label}
                            </p>
                            {step?.completed_at && (
                              <p className="text-xs text-muted-foreground">
                                Terminé le {format(new Date(step.completed_at), "dd/MM/yyyy", { locale: fr })}
                              </p>
                            )}
                            {isActive && (
                              <p className="text-xs text-secondary flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" /> En cours — Délai standard: {config.delay}
                              </p>
                            )}
                          </div>
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
                    {/* Devis PDF */}
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      <PDFDownloadLink
                        document={<OrderPDF order={selectedOrder} items={selectedOrder.items} type="devis" />}
                        fileName={`Devis_${selectedOrder.reference}.pdf`}
                      >
                        {({ loading }) => (
                          <Button variant="outline" className="justify-start gap-2 h-auto py-3 w-full" disabled={loading}>
                            <Download className="h-4 w-4 text-secondary" />
                            <div className="text-left">
                              <p className="text-sm font-medium">Devis</p>
                              <p className="text-xs text-muted-foreground">{loading ? "Génération..." : "PDF"}</p>
                            </div>
                          </Button>
                        )}
                      </PDFDownloadLink>
                    ) : (
                      <Button variant="outline" className="justify-start gap-2 h-auto py-3" disabled>
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-muted-foreground">Devis</p>
                          <p className="text-xs text-muted-foreground">Non disponible</p>
                        </div>
                      </Button>
                    )}

                    {/* Bon de livraison placeholder */}
                    <Button variant="outline" className="justify-start gap-2 h-auto py-3" disabled>
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-muted-foreground">Bon de livraison</p>
                        <p className="text-xs text-muted-foreground">Après livraison</p>
                      </div>
                    </Button>

                    {/* Facture PDF */}
                    {selectedOrder.items && selectedOrder.items.length > 0 && (
                      selectedOrder.status === "terminee" || selectedOrder.status === "en_cours"
                    ) ? (
                      <PDFDownloadLink
                        document={<OrderPDF order={selectedOrder} items={selectedOrder.items} type="facture" />}
                        fileName={`Facture_${selectedOrder.reference}.pdf`}
                      >
                        {({ loading }) => (
                          <Button variant="outline" className="justify-start gap-2 h-auto py-3 w-full" disabled={loading}>
                            <Download className="h-4 w-4 text-secondary" />
                            <div className="text-left">
                              <p className="text-sm font-medium">Facture</p>
                              <p className="text-xs text-muted-foreground">{loading ? "Génération..." : "PDF"}</p>
                            </div>
                          </Button>
                        )}
                      </PDFDownloadLink>
                    ) : (
                      <Button variant="outline" className="justify-start gap-2 h-auto py-3" disabled>
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-muted-foreground">Facture</p>
                          <p className="text-xs text-muted-foreground">Après validation</p>
                        </div>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Client validation step */}
              {selectedOrder.steps.find(s => s.step_name === "validation_client" && s.status === "in_progress") && (
                <Card className="shadow-card border-success/30">
                  <CardContent className="p-6 text-center space-y-4">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
                    <h3 className="font-display font-semibold">Votre commande est prête</h3>
                    <p className="text-sm text-muted-foreground">Confirmez que tout est conforme</p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <Button
                        className="bg-success hover:bg-success/90 text-success-foreground"
                        onClick={confirmValidation}
                      >
                        ✅ Tout est conforme
                      </Button>
                      <Button
                        variant="outline"
                        className="text-destructive border-destructive/30"
                        onClick={() => setSavOpen(true)}
                      >
                        Signaler un problème
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SAV CTA always visible */}
              <Card className="shadow-card bg-muted/30 border-dashed">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Besoin d'assistance ?</p>
                      <p className="text-xs text-muted-foreground">Notre équipe SAV est disponible</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setSavOpen(true)}>
                    <FileWarning className="h-4 w-4" />
                    Signaler un problème
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* SAV Dialog */}
      <Dialog open={savOpen} onOpenChange={setSavOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Signaler un problème
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sujet *</Label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                placeholder="Ex: Pièce manquante, défaut de montage..."
                value={savForm.subject}
                onChange={e => setSavForm(p => ({ ...p, subject: e.target.value }))}
              />
            </div>
            <div>
              <Label>Priorité</Label>
              <Select value={savForm.priority} onValueChange={v => setSavForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
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
              <Textarea
                className="mt-1"
                placeholder="Décrivez le problème en détail..."
                value={savForm.description}
                onChange={e => setSavForm(p => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              disabled={!savForm.subject || savLoading}
              onClick={submitSavTicket}
            >
              {savLoading ? "Envoi en cours..." : "Envoyer la demande"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientPortal;
