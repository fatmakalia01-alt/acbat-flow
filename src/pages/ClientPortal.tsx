import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Package, Download, MessageSquare, FileWarning
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import OrderPDF from "@/components/OrderPDF";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AnimatedTimeline } from "@/components/AnimatedTimeline";

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon", en_validation: "En validation", validee: "Validée",
  en_cours: "En cours", terminee: "Terminée", annulee: "Annulée",
};

interface WorkflowStep {
  id: string;
  order_id: string;
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

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Hero header */}
      <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-2xl font-bold">
          Bonjour, {profile?.full_name || "Client"} 👋
        </h1>
        <p className="text-slate-400 mt-1">Votre espace ACBAT — Suivi de vos projets</p>
      </div>

      {orders.length === 0 ? (
        <Card className="border-none shadow-md">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="font-bold text-lg">Aucune commande</h3>
            <p className="text-slate-400 text-sm mt-1">Vos commandes apparaîtront ici</p>
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
              <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-50 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-slate-900">{selectedOrder.reference}</CardTitle>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                      {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="font-medium text-slate-900">{Number(selectedOrder.total_ttc).toLocaleString()} DT TTC</span>
                    <span>Créée le {format(new Date(selectedOrder.created_at), "dd MMMM yyyy", { locale: fr })}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-8">
                  {/* Timeline section */}
                  <AnimatedTimeline
                    steps={selectedOrder.steps}
                    canAdvance={false}
                  />
                </CardContent>
              </Card>

              {/* Documents */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold">Documents</CardTitle>
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
                          <Button variant="outline" className="justify-start gap-3 h-auto py-3 w-full" disabled={loading}>
                            <Download className="h-4 w-4 text-blue-600" />
                            <div className="text-left">
                              <p className="text-sm font-bold">Devis</p>
                              <p className="text-xs text-slate-500">{loading ? "Génération..." : "Télécharger PDF"}</p>
                            </div>
                          </Button>
                        )}
                      </PDFDownloadLink>
                    ) : null}

                    {/* Bon de livraison */}
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      <PDFDownloadLink
                        document={<OrderPDF order={selectedOrder} items={selectedOrder.items} type="livraison" />}
                        fileName={`BL_${selectedOrder.reference}.pdf`}
                      >
                        {({ loading }) => (
                          <Button variant="outline" className="justify-start gap-3 h-auto py-3 w-full" disabled={loading}>
                            <Download className="h-4 w-4 text-emerald-600" />
                            <div className="text-left">
                              <p className="text-sm font-bold">Bon de livraison</p>
                              <p className="text-xs text-slate-500">{loading ? "Génération..." : "Télécharger PDF"}</p>
                            </div>
                          </Button>
                        )}
                      </PDFDownloadLink>
                    ) : null}

                    {/* Facture PDF */}
                    {selectedOrder.items && selectedOrder.items.length > 0 && (
                      selectedOrder.status === "terminee" || selectedOrder.status === "en_cours" || selectedOrder.status === "validee"
                    ) ? (
                      <PDFDownloadLink
                        document={<OrderPDF order={selectedOrder} items={selectedOrder.items} type="facture" />}
                        fileName={`Facture_${selectedOrder.reference}.pdf`}
                      >
                        {({ loading }) => (
                          <Button variant="outline" className="justify-start gap-3 h-auto py-3 w-full" disabled={loading}>
                            <Download className="h-4 w-4 text-orange-600" />
                            <div className="text-left">
                              <p className="text-sm font-bold">Facture</p>
                              <p className="text-xs text-slate-500">{loading ? "Génération..." : "Télécharger PDF"}</p>
                            </div>
                          </Button>
                        )}
                      </PDFDownloadLink>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              {/* SAV CTA always visible */}
              <Card className="border-none shadow-sm bg-slate-50 border-dashed border-2">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-bold">Besoin d'assistance ?</p>
                      <p className="text-xs text-slate-500">Notre équipe SAV est disponible pour vous répondre.</p>
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
            <DialogDescription>
              Soumettez une demande de service après-vente pour votre commande.
            </DialogDescription>
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
