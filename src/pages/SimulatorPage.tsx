import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play, RotateCcw, Terminal, UserCircle, CheckCircle2, AlertCircle,
    Activity, Trash2, Eye, ShoppingCart, Package, Truck, Wrench,
    CreditCard, HeadphonesIcon, BarChart3, ClipboardCheck, Users,
    ChevronRight, Zap, Globe, Shield, Clock, Star, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = [
    { id: "manager", label: "Manager", color: "bg-indigo-500", icon: Shield },
    { id: "directeur_exploitation", label: "Dir. Exploitation", color: "bg-blue-600", icon: Star },
    { id: "responsable_commercial", label: "Resp. Commercial", color: "bg-purple-500", icon: Users },
    { id: "commercial", label: "Commercial", color: "bg-pink-500", icon: Users },
    { id: "responsable_achat", label: "Resp. Achat", color: "bg-amber-500", icon: Package },
    { id: "responsable_logistique", label: "Resp. Logistique", color: "bg-orange-500", icon: Truck },
    { id: "responsable_technique", label: "Resp. Technique", color: "bg-cyan-600", icon: Wrench },
    { id: "technicien_montage", label: "Technicien", color: "bg-slate-500", icon: Wrench },
    { id: "responsable_sav", label: "Resp. SAV", color: "bg-teal-500", icon: HeadphonesIcon },
    { id: "responsable_comptabilite", label: "Comptabilité", color: "bg-emerald-600", icon: CreditCard },
    { id: "client", label: "Client", color: "bg-gray-400", icon: UserCircle },
];

type LogType = "info" | "success" | "error" | "role" | "system" | "data" | "warning";

interface LogEntry {
    id: string;
    msg: string;
    type: LogType;
    ts: string;
    role?: string;
    detail?: string;
}

interface SimStep {
    label: string;
    role: string;
    service: string;
    action: string;
}

interface Scenario {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    gradient: string;
    badge: string;
    steps: SimStep[];
}

// ─── Scenarios ────────────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
    {
        id: "full-cycle",
        title: "Cycle Complet",
        description: "Le cycle intégral ACBAT : Client → Devis → Commande → Stock → Technique → Livraison → Facturation → Validation client → Clôture.",
        icon: Activity,
        gradient: "from-indigo-600 to-purple-600",
        badge: "★ Recommandé",
        steps: [
            { label: "Création du client SimCorp", role: "commercial", service: "Commercial", action: "create_client" },
            { label: "Génération du devis DV-SIMU", role: "commercial", service: "Commercial", action: "create_quote" },
            { label: "Validation du devis", role: "manager", service: "Commercial", action: "validate_quote" },
            { label: "Création de la commande", role: "responsable_commercial", service: "Commercial", action: "create_order" },
            { label: "Démarrage workflow commande", role: "manager", service: "Suivi", action: "start_workflow" },
            { label: "Ordre d'achat fournisseur", role: "responsable_achat", service: "Achat", action: "purchase_step" },
            { label: "Réception marchandises stock", role: "responsable_logistique", service: "Logistique", action: "stock_step" },
            { label: "Préparation chantier/technique", role: "responsable_technique", service: "Technique", action: "technical_step" },
            { label: "Installation & montage", role: "technicien_montage", service: "Technique", action: "installation_step" },
            { label: "Planification livraison", role: "responsable_logistique", service: "Livraison", action: "delivery_step" },
            { label: "Validation client reçue", role: "client", service: "Portail Client", action: "client_validate" },
            { label: "Facturation & clôture", role: "responsable_comptabilite", service: "Comptabilité", action: "invoice_step" },
        ],
    },
    {
        id: "sav-urgent",
        title: "Urgence SAV",
        description: "Réclamation client → Ticket prioritaire → Intervention technique → Résolution et clôture.",
        icon: HeadphonesIcon,
        gradient: "from-red-500 to-orange-500",
        badge: "Service SAV",
        steps: [
            { label: "Ouverture ticket SAV urgent", role: "client", service: "SAV", action: "open_ticket" },
            { label: "Réception et assignation ticket", role: "responsable_sav", service: "SAV", action: "assign_ticket" },
            { label: "Planification intervention technique", role: "responsable_technique", service: "Technique", action: "plan_intervention" },
            { label: "Réalisation de l'intervention", role: "technicien_montage", service: "Technique", action: "do_intervention" },
            { label: "Clôture ticket et rapport client", role: "responsable_sav", service: "SAV", action: "close_ticket" },
        ],
    },
    {
        id: "import-purchase",
        title: "Achat Import",
        description: "Réapprovisionnement : Commande fournisseur → Transit → Réception → Stock mis à jour.",
        icon: Package,
        gradient: "from-amber-500 to-orange-600",
        badge: "Service Achat",
        steps: [
            { label: "Détection besoin réapprovisionnement", role: "responsable_achat", service: "Achat", action: "detect_need" },
            { label: "Création commande fournisseur", role: "responsable_achat", service: "Achat", action: "create_po" },
            { label: "Validation diretion achat", role: "directeur_exploitation", service: "Achat", action: "validate_po" },
            { label: "Réception marchandises", role: "responsable_logistique", service: "Logistique", action: "receive_goods" },
            { label: "Mise à jour stock produits", role: "responsable_logistique", service: "Logistique", action: "update_stock" },
        ],
    },
    {
        id: "commercial-pipeline",
        title: "Pipeline Commercial",
        description: "Prospection → Devis → Relance → Gain affaire → Commande générée.",
        icon: ShoppingCart,
        gradient: "from-purple-500 to-pink-500",
        badge: "Service Commercial",
        steps: [
            { label: "Saisie nouveau prospect client", role: "commercial", service: "Commercial", action: "create_client" },
            { label: "Création devis personnalisé", role: "commercial", service: "Commercial", action: "create_quote" },
            { label: "Envoi devis au client", role: "commercial", service: "Commercial", action: "send_quote" },
            { label: "Relance client suivi", role: "responsable_commercial", service: "Commercial", action: "followup_quote" },
            { label: "Acceptation et conversion commande", role: "responsable_commercial", service: "Commercial", action: "create_order" },
        ],
    },
    {
        id: "delivery-mission",
        title: "Mission Livraison",
        description: "Préparation → Départ → En route → POD signé → Livraison validée.",
        icon: Truck,
        gradient: "from-teal-500 to-cyan-600",
        badge: "Service Livraison",
        steps: [
            { label: "Attribution mission livreur", role: "responsable_logistique", service: "Livraison", action: "assign_delivery" },
            { label: "Départ côté livreur", role: "responsable_logistique", service: "Livraison", action: "start_delivery" },
            { label: "Photo avant montage (POD)", role: "responsable_logistique", service: "Livraison", action: "pod_photo" },
            { label: "Signature PV client", role: "responsable_logistique", service: "Livraison", action: "sign_pv" },
            { label: "Confirmation livraison terminée", role: "responsable_logistique", service: "Livraison", action: "complete_delivery" },
        ],
    },
    {
        id: "accounting-cycle",
        title: "Cycle Comptable",
        description: "Facture générée → Paiement enregistré → Relance impayé → Recouvrement → Clôture.",
        icon: CreditCard,
        gradient: "from-emerald-500 to-green-600",
        badge: "Service Comptabilité",
        steps: [
            { label: "Génération facture commande", role: "responsable_comptabilite", service: "Comptabilité", action: "generate_invoice" },
            { label: "Envoi facture client", role: "responsable_comptabilite", service: "Comptabilité", action: "send_invoice" },
            { label: "Relance impayé J+30", role: "responsable_comptabilite", service: "Comptabilité", action: "send_reminder" },
            { label: "Enregistrement paiement reçu", role: "responsable_comptabilite", service: "Comptabilité", action: "record_payment" },
            { label: "Clôture dossier financier", role: "manager", service: "Comptabilité", action: "close_financial" },
        ],
    },
    {
        id: "tracking-multiservice",
        title: "Suivi Multi-Services",
        description: "Vision 360° du suivi commande : chaque service avance son étape en temps réel.",
        icon: ClipboardCheck,
        gradient: "from-blue-500 to-indigo-600",
        badge: "Suivi Commandes",
        steps: [
            { label: "Commande créée — Commercial", role: "commercial", service: "Suivi", action: "create_order" },
            { label: "Validation manager", role: "manager", service: "Suivi", action: "start_workflow" },
            { label: "Étape Achat démarrée", role: "responsable_achat", service: "Suivi", action: "purchase_step" },
            { label: "Étape Logistique démarrée", role: "responsable_logistique", service: "Suivi", action: "stock_step" },
            { label: "Étape Technique démarrée", role: "responsable_technique", service: "Suivi", action: "technical_step" },
            { label: "Étape Livraison démarrée", role: "responsable_logistique", service: "Suivi", action: "delivery_step" },
            { label: "Validation client reçue", role: "client", service: "Suivi", action: "client_validate" },
            { label: "Facturation clôturée", role: "responsable_comptabilite", service: "Suivi", action: "invoice_step" },
        ],
    },
    {
        id: "analytics-reporting",
        title: "Rapport Analytics",
        description: "Le manager consulte les KPIs, génère les rapports de performance et check les alertes stock.",
        icon: BarChart3,
        gradient: "from-slate-600 to-slate-800",
        badge: "Analytics",
        steps: [
            { label: "Consultation Dashboard KPIs", role: "manager", service: "Analytics", action: "view_kpis" },
            { label: "Analyse commandes en retard", role: "manager", service: "Analytics", action: "check_delayed" },
            { label: "Rapport commercial mensuel", role: "directeur_exploitation", service: "Analytics", action: "monthly_report" },
            { label: "Alerte stock faible détectée", role: "responsable_achat", service: "Analytics", action: "stock_alert" },
            { label: "Rapport SAV résolution tickets", role: "responsable_sav", service: "Analytics", action: "sav_report" },
        ],
    },
];

// ─── Action Executors ─────────────────────────────────────────────────────────

const DELAY = (ms: number) => new Promise(r => setTimeout(r, ms));

// Keep track of IDs created during simulation for potential cleanup
const simState = { clientId: "", orderId: "", quoteId: "", ticketId: "" };

async function executeAction(
    action: string,
    addLog: (msg: string, type: LogType, detail?: string) => void
): Promise<void> {
    switch (action) {

        case "create_client": {
            addLog("Insertion client de test dans la table `clients`...", "info");
            const { data, error } = await supabase.from("clients").insert({
                full_name: "SimCorp ACBAT",
                company_name: "SimCorp International",
                email: `sim-${Date.now()}@acbat-test.tn`,
                phone: "+216 99 000 000",
                city: "Tunis",
                address: "Zone Industrielle Simulateur, Bloc A",
            }).select("id").single();
            if (error) { addLog(`Erreur création client: ${error.message}`, "error"); return; }
            simState.clientId = data?.id || "";
            addLog(`✓ Client créé — ID: ${data?.id?.slice(0, 8)}...`, "success");
            break;
        }

        case "create_quote": {
            addLog("Génération devis avec articles réels...", "info");
            const clientId = simState.clientId;
            if (!clientId) { addLog("Aucun client trouvé.", "warning"); break; }

            const { data: products } = await supabase.from("products").select("id, price_ht").limit(2);
            const ref = `DV-SIMU-${Date.now().toString().slice(-6)}`;

            const { data: order, error } = await supabase.from("client_orders").insert({
                reference: ref,
                client_id: clientId,
                status: "brouillon",
                total_ht: 0,
                total_ttc: 0,
                notes: "Simulation ACBAT Flow — Test in-depth",
            }).select("id").single();

            if (error || !order) { addLog(`Erreur création: ${error?.message}`, "error"); return; }
            simState.orderId = order.id;
            simState.quoteId = ref;

            if (products && products.length > 0) {
                const items = products.map(p => ({
                    order_id: order.id,
                    product_id: p.id,
                    quantity: 2,
                    unit_price_ht: p.price_ht,
                    total_ht: p.price_ht * 2,
                    total_ttc: (p.price_ht * 2) * 1.19
                }));
                await supabase.from("order_items").insert(items);
                const totalHt = items.reduce((acc, i) => acc + i.total_ht, 0);
                await supabase.from("client_orders").update({
                    total_ht: totalHt,
                    total_ttc: totalHt * 1.19
                }).eq("id", order.id);
            }
            addLog(`✓ Devis ${ref} créé avec articles réels`, "success");
            break;
        }

        case "validate_quote":
        case "send_quote":
        case "followup_quote": {
            addLog(`Mise à jour statut devis...`, "info");
            if (simState.orderId) {
                await supabase.from("client_orders").update({ status: "en_validation" }).eq("id", simState.orderId);
                addLog(`✓ Devis validé par commercial`, "success");
            }
            break;
        }

        case "create_order": {
            addLog("Conversion devis → commande confirmée...", "info");
            if (simState.orderId) {
                await supabase.from("client_orders").update({ status: "validee" }).eq("id", simState.orderId);
                addLog(`✓ Commande validée par Manager`, "success");
            }
            break;
        }

        case "start_workflow": {
            addLog("Initialisation workflow réel (9 étapes)...", "info");
            if (!simState.orderId) break;

            const workflowSteps = [
                { step_name: "creation_commande", step_order: 1, status: "completed", completed_at: new Date().toISOString() },
                { step_name: "validation_commerciale", step_order: 2, status: "completed", completed_at: new Date().toISOString() },
                { step_name: "commande_fournisseur", step_order: 3, status: "in_progress", started_at: new Date().toISOString() },
                { step_name: "reception_marchandises", step_order: 4, status: "pending" },
                { step_name: "preparation_technique", step_order: 5, status: "pending" },
                { step_name: "livraison_installation", step_order: 6, status: "pending" },
                { step_name: "validation_client", step_order: 7, status: "pending" },
                { step_name: "facturation_paiement", step_order: 8, status: "pending" },
                { step_name: "cloture_archivage", step_order: 9, status: "pending" },
            ].map(s => ({ ...s, order_id: simState.orderId }));

            await supabase.from("order_workflow_steps").insert(workflowSteps);
            await supabase.from("client_orders").update({ status: "en_cours" }).eq("id", simState.orderId);
            addLog(`✓ Workflow démarré — État: EN COURS`, "success");
            break;
        }

        case "purchase_step":
        case "create_po":
        case "validate_po":
        case "detect_need": {
            addLog("Gestion Achat: Création commande fournisseur...", "info");
            if (simState.orderId) {
                const { data: supplier } = await supabase.from("suppliers").select("id").limit(1).single();
                if (supplier) {
                    await supabase.from("supplier_orders").insert({
                        reference: `PO-SIMU-${simState.quoteId}`,
                        supplier_id: supplier.id,
                        client_order_id: simState.orderId,
                        status: "commandé",
                        total_amount: 5000
                    });
                }
                await supabase.from("order_workflow_steps")
                    .update({ status: "completed", completed_at: new Date().toISOString() })
                    .eq("order_id", simState.orderId).eq("step_name", "commande_fournisseur");
                await supabase.from("order_workflow_steps")
                    .update({ status: "in_progress", started_at: new Date().toISOString() })
                    .eq("order_id", simState.orderId).eq("step_name", "reception_marchandises");
                addLog("✓ Commande fournisseur générée", "success");
            }
            break;
        }

        case "stock_step":
        case "receive_goods":
        case "update_stock": {
            addLog("Réception logistique et mise en stock...", "info");
            if (simState.orderId) {
                await supabase.from("order_workflow_steps")
                    .update({ status: "completed", completed_at: new Date().toISOString() })
                    .eq("order_id", simState.orderId).eq("step_name", "reception_marchandises");
                await supabase.from("order_workflow_steps")
                    .update({ status: "in_progress", started_at: new Date().toISOString() })
                    .eq("order_id", simState.orderId).eq("step_name", "preparation_technique");
                addLog("✓ Marchandises reçues en entrepôt", "success");
            }
            break;
        }

        case "technical_step":
        case "plan_intervention":
        case "do_intervention": {
            addLog("Création dossier chantier technique...", "info");
            if (simState.orderId) {
                await supabase.from("chantiers").insert({
                    name: `SIMU - ${simState.quoteId}`,
                    reference: `CH-${simState.quoteId}`,
                    order_id: simState.orderId,
                    client_id: simState.clientId,
                    status: "en_attente",
                    planned_start: new Date().toISOString()
                });
                await supabase.from("order_workflow_steps")
                    .update({ status: "completed", completed_at: new Date().toISOString() })
                    .eq("order_id", simState.orderId).eq("step_name", "preparation_technique");
                await supabase.from("order_workflow_steps")
                    .update({ status: "in_progress", started_at: new Date().toISOString() })
                    .eq("order_id", simState.orderId).eq("step_name", "livraison_installation");
                addLog("✓ Dossier chantier initialisé", "success");
            }
            break;
        }

        case "installation_step": {
            addLog("Technicien — Installation et montage sur site client...", "info");
            addLog("✓ Montage terminé — PV technique signé", "success");
            break;
        }

        case "delivery_step":
        case "assign_delivery":
        case "start_delivery":
        case "pod_photo": {
            addLog("Service Livraison — planification mission...", "info");
            if (simState.orderId) {
                await supabase.from("deliveries").insert({
                    order_id: simState.orderId,
                    status: "planifiee",
                    scheduled_date: new Date().toISOString().split('T')[0]
                });
                addLog("✓ Mission livraison créée et assignée", "success");
            }
            break;
        }

        case "client_validate":
        case "sign_pv":
        case "complete_delivery": {
            addLog("Validation client et réception finale...", "info");
            if (simState.orderId) {
                await supabase.from("deliveries").update({
                    status: "livree",
                    pv_signed: true,
                    actual_date: new Date().toISOString()
                }).eq("order_id", simState.orderId);

                await supabase.from("order_workflow_steps")
                    .update({ status: "completed", completed_at: new Date().toISOString() })
                    .eq("order_id", simState.orderId).eq("step_name", "livraison_installation");
                await supabase.from("order_workflow_steps")
                    .update({ status: "completed", completed_at: new Date().toISOString() })
                    .eq("order_id", simState.orderId).eq("step_name", "validation_client");
                await supabase.from("order_workflow_steps")
                    .update({ status: "in_progress", started_at: new Date().toISOString() })
                    .eq("order_id", simState.orderId).eq("step_name", "facturation_paiement");
                addLog("✓ Client a signé et validé la réception", "success");
            }
            break;
        }

        case "invoice_step":
        case "generate_invoice":
        case "send_invoice":
        case "record_payment":
        case "close_financial": {
            addLog("Cycle financier: Facturation + Paiement...", "info");
            if (simState.orderId) {
                const { data: inv } = await supabase.from("invoices").insert({
                    order_id: simState.orderId,
                    client_id: simState.clientId,
                    reference: `FAC-SIMU-${simState.quoteId}`,
                    status: "payee",
                    total_ttc: 14875
                }).select("id").single();

                if (inv) {
                    await supabase.from("payments").insert({
                        invoice_id: inv.id,
                        client_id: simState.clientId,
                        amount: 14875,
                        method: "virement",
                        status: "complete"
                    });
                }

                await supabase.from("order_workflow_steps")
                    .update({ status: "completed", completed_at: new Date().toISOString() })
                    .eq("order_id", simState.orderId).eq("step_name", "facturation_paiement");
                await supabase.from("order_workflow_steps")
                    .update({ status: "completed", completed_at: new Date().toISOString() })
                    .eq("order_id", simState.orderId).eq("step_name", "cloture_archivage");
                await supabase.from("client_orders").update({ status: "terminee" }).eq("id", simState.orderId);
                addLog("✓ Facture payée et dossier clos", "success");
            }
            break;
        }

        case "open_ticket": {
            addLog("Création ticket SAV réel...", "info");
            if (simState.clientId) {
                const { data } = await supabase.from("sav_tickets").insert({
                    client_id: simState.clientId,
                    order_id: simState.orderId || null,
                    subject: "[SIMU] Dysfonctionnement système",
                    description: "Simulation d'une panne signalée par le client après installation.",
                    priority: "haute",
                    status: "nouveau"
                }).select("id").single();
                simState.ticketId = data?.id || "";
                addLog(`✓ Ticket SAV ouvert — ID: ${data?.id?.slice(0, 8)}`, "success");
            }
            break;
        }

        case "assign_ticket": {
            addLog("Assignation ticket SAV...", "info");
            if (simState.ticketId) {
                await supabase.from("sav_tickets").update({ status: "en_cours" }).eq("id", simState.ticketId);
                addLog("✓ Ticket assigné à un technicien", "success");
            }
            break;
        }

        case "close_ticket": {
            addLog("Clôture ticket SAV...", "info");
            if (simState.ticketId) {
                await supabase.from("sav_tickets").update({ status: "resolu" }).eq("id", simState.ticketId);
                addLog("✓ Ticket SAV résolu", "success");
            }
            break;
        }

        case "view_kpis":
        case "check_delayed":
        case "monthly_report":
        case "stock_alert":
        case "sav_report": {
            addLog("Analytics — lecture des indicateurs...", "info");
            const { count: orders } = await supabase.from("client_orders").select("id", { count: "exact", head: true });
            addLog(`✓ KPIs lus: ${orders} commandes en base`, "success");
            break;
        }

        default:
            await DELAY(300);
            addLog(`Action simulée: ${action}`, "info");
    }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SimulatorPage() {
    const { roles } = useAuth();
    const [previewRole, setPreviewRole] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [currentStepIdx, setCurrentStepIdx] = useState(-1);
    const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const scrollRef = useRef<HTMLDivElement>(null);

    const ts = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const addLog = (msg: string, type: LogType = "info", detail?: string) => {
        setLogs(prev => [...prev, { id: crypto.randomUUID(), msg, type, ts: ts(), detail }]);
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const handleRoleSwitch = (roleId: string) => {
        const next = roleId === previewRole ? null : roleId;
        setPreviewRole(next);
        const label = ROLES.find(r => r.id === roleId)?.label;
        addLog(next ? `[↻ PERSPECTIVE] Vue basculée → ${label}` : "Mode aperçu désactivé", "role");
    };

    const runSimulation = async (scenario: Scenario) => {
        if (isRunning) return;
        // Reset sim state
        simState.clientId = "";
        simState.orderId = "";
        simState.quoteId = "";
        simState.ticketId = "";

        setActiveScenario(scenario);
        setIsRunning(true);
        setCurrentStepIdx(-1);
        setLogs([]);

        addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, "system");
        addLog(`ACBAT SIMULATOR v3.0 — Scénario: "${scenario.title}"`, "system");
        addLog(`${scenario.steps.length} étapes | Supabase: LIVE`, "system");
        addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, "system");

        try {
            for (let i = 0; i < scenario.steps.length; i++) {
                const step = scenario.steps[i];
                setCurrentStepIdx(i);
                setPreviewRole(step.role);

                await DELAY(400);
                addLog(``, "info");
                addLog(`▶ ÉTAPE ${i + 1}/${scenario.steps.length} — [${step.service.toUpperCase()}] — Rôle: ${ROLES.find(r => r.id === step.role)?.label || step.role}`, "role");
                addLog(`   ${step.label}`, "info");

                await DELAY(600);
                await executeAction(step.action, addLog);
                await DELAY(700);
            }

            addLog(``, "system");
            addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, "system");
            addLog(`✅ SIMULATION TERMINÉE AVEC SUCCÈS — ${scenario.title}`, "success");
            addLog(`${scenario.steps.length} étapes exécutées | Données réelles créées en base`, "system");
            addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, "system");

            setCompletedIds(prev => new Set([...prev, scenario.id]));
            toast.success(`Simulation "${scenario.title}" terminée !`);
        } catch (err: any) {
            addLog(`ERREUR FATALE: ${err.message}`, "error");
        } finally {
            setIsRunning(false);
            setCurrentStepIdx(-1);
            setPreviewRole(null);
        }
    };

    const cleanSimData = async () => {
        if (!confirm("Supprimer toutes les données de test créées par le simulateur ?")) return;
        try {
            addLog("Purge des données simulateur en cours...", "warning");

            // Delete in order of dependency
            await supabase.from("supplier_orders").delete().ilike("reference", "%SIMU%");
            await supabase.from("deliveries").delete().eq("order_id", simState.orderId); // Might need a better filter
            await supabase.from("chantiers").delete().ilike("reference", "%SIMU%");
            await supabase.from("invoices").delete().ilike("reference", "%SIMU%");
            await supabase.from("sav_tickets").delete().ilike("subject", "%SIMU%");
            await supabase.from("order_items").delete().eq("order_id", simState.orderId);
            await supabase.from("order_workflow_steps").delete().eq("order_id", simState.orderId);
            await supabase.from("client_orders").delete().ilike("reference", "%SIMU%");
            await supabase.from("clients").delete().ilike("email", "%acbat-test%");

            toast.success("Données simulateur purgées.");
            addLog("🗑 Données de simulation supprimées de la base", "warning");
        } catch (e: any) {
            toast.error("Erreur purge: " + e.message);
        }
    };

    const progress = activeScenario
        ? Math.round(((currentStepIdx + 1) / activeScenario.steps.length) * 100)
        : 0;

    const logColors: Record<LogType, string> = {
        info: "text-slate-300",
        success: "text-emerald-400",
        error: "text-red-400",
        role: "text-blue-300 font-semibold",
        system: "text-slate-500 italic",
        data: "text-amber-300",
        warning: "text-amber-400",
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
            <div className="max-w-screen-2xl mx-auto px-4 py-8 space-y-8">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                                <Zap className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white tracking-tight">Simulateur ACBAT</h1>
                                <p className="text-slate-400 text-sm">Testez le cycle complet de chaque service en temps réel</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            Supabase LIVE
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={cleanSimData}
                            className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
                        >
                            <Trash2 className="h-4 w-4" /> Purger données
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                    {/* ── Left: Scenarios ── */}
                    <div className="xl:col-span-5 space-y-4">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                            Scénarios disponibles ({SCENARIOS.length})
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
                            {SCENARIOS.map((s) => {
                                const isActive = activeScenario?.id === s.id && isRunning;
                                const isDone = completedIds.has(s.id);
                                const Icon = s.icon;

                                return (
                                    <motion.div
                                        key={s.id}
                                        whileHover={{ scale: isRunning ? 1 : 1.01 }}
                                        whileTap={{ scale: isRunning ? 1 : 0.99 }}
                                    >
                                        <button
                                            onClick={() => !isRunning && runSimulation(s)}
                                            disabled={isRunning}
                                            className={cn(
                                                "w-full text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden group",
                                                isActive
                                                    ? "border-white/30 bg-white/5 ring-1 ring-white/20"
                                                    : isDone
                                                        ? "border-emerald-500/30 bg-emerald-500/5"
                                                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8",
                                                isRunning && !isActive && "opacity-40 cursor-not-allowed"
                                            )}
                                        >
                                            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br", s.gradient)} />

                                            <div className="flex items-start gap-3">
                                                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br", s.gradient)}>
                                                    {isDone ? <CheckCircle2 className="h-5 w-5 text-white" /> : <Icon className="h-5 w-5 text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className="font-bold text-sm text-white">{s.title}</span>
                                                        <span className={cn(
                                                            "text-[10px] px-2 py-0.5 rounded-full font-semibold border",
                                                            isDone
                                                                ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                                                                : "text-slate-400 border-slate-500/30 bg-slate-500/10"
                                                        )}>
                                                            {isDone ? "✓ Terminé" : s.badge}
                                                        </span>
                                                        {isActive && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-blue-300 border border-blue-400/30 bg-blue-400/10 animate-pulse">
                                                                EN COURS
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{s.description}</p>
                                                    <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
                                                        <ChevronRight className="h-3 w-3" />
                                                        {s.steps.length} étapes
                                                    </div>
                                                </div>
                                                {!isRunning && <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0 mt-0.5" />}
                                            </div>

                                            {/* Step progress for active scenario */}
                                            {isActive && (
                                                <div className="mt-3">
                                                    <Progress value={progress} className="h-1 bg-white/10" />
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        Étape {currentStepIdx + 1} / {s.steps.length} — {s.steps[currentStepIdx]?.label}
                                                    </p>
                                                </div>
                                            )}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Right: Terminal + Role Panel ── */}
                    <div className="xl:col-span-7 space-y-5">

                        {/* Current Step Indicator */}
                        <AnimatePresence>
                            {isRunning && activeScenario && currentStepIdx >= 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <RotateCcw className="h-5 w-5 text-blue-400 animate-spin flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs text-blue-300 font-bold uppercase">
                                                    {activeScenario.steps[currentStepIdx]?.service}
                                                </span>
                                                <span className="text-xs text-slate-500">→</span>
                                                <span className="text-xs text-white font-medium truncate">
                                                    {activeScenario.steps[currentStepIdx]?.label}
                                                </span>
                                            </div>
                                            <div className="mt-2">
                                                <Progress value={progress} className="h-2 bg-white/10" />
                                            </div>
                                        </div>
                                        <div className="text-sm font-mono text-blue-300 font-bold flex-shrink-0">
                                            {progress}%
                                        </div>
                                    </div>
                                    {previewRole && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className={cn("h-2 w-2 rounded-full", ROLES.find(r => r.id === previewRole)?.color || "bg-gray-400")} />
                                            <span className="text-[11px] text-slate-400">
                                                Rôle actif: <strong className="text-slate-200">{ROLES.find(r => r.id === previewRole)?.label}</strong>
                                            </span>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Live Terminal ── */}
                        <div className="rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                            {/* Terminal title bar */}
                            <div className="bg-slate-800 px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="h-3 w-3 rounded-full bg-red-500" />
                                        <div className="h-3 w-3 rounded-full bg-amber-500" />
                                        <div className="h-3 w-3 rounded-full bg-emerald-500" />
                                    </div>
                                    <span className="text-xs font-mono text-slate-400">acbat_simulator@live:~$</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Terminal className="h-3.5 w-3.5 text-slate-500" />
                                    <span className="text-[10px] text-slate-500 font-mono">LOGS</span>
                                </div>
                            </div>

                            {/* Log output */}
                            <div
                                ref={scrollRef}
                                className="h-80 bg-slate-950 p-4 font-mono text-xs leading-relaxed overflow-y-auto space-y-0.5"
                            >
                                {logs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2">
                                        <Terminal className="h-8 w-8" />
                                        <p className="text-sm">Sélectionnez et lancez un scénario</p>
                                        <p className="text-xs text-slate-700">Les logs de simulation apparaîtront ici en temps réel</p>
                                    </div>
                                ) : (
                                    logs.map((log) => (
                                        <motion.div
                                            key={log.id}
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className={cn("flex gap-2 py-0.5", logColors[log.type])}
                                        >
                                            {log.type !== "system" && (
                                                <span className="text-slate-700 select-none flex-shrink-0">[{log.ts}]</span>
                                            )}
                                            <span className="flex-1 whitespace-pre-wrap break-words">{log.msg}</span>
                                            {log.detail && (
                                                <span className="text-slate-600 text-[10px] self-center flex-shrink-0 hidden sm:block">
                                                    ← {log.detail}
                                                </span>
                                            )}
                                        </motion.div>
                                    ))
                                )}
                                {isRunning && (
                                    <motion.div
                                        animate={{ opacity: [1, 0] }}
                                        transition={{ repeat: Infinity, duration: 0.8 }}
                                        className="text-emerald-400 inline-block"
                                    >
                                        █
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* ── Role Perspective Panel ── */}
                        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                                <UserCircle className="h-4 w-4 text-slate-400" />
                                <span className="text-sm font-semibold text-white">Perspectives de rôle</span>
                                <span className="text-xs text-slate-500 ml-auto">Clique pour basculer la vue</span>
                            </div>
                            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-3 gap-2">
                                {ROLES.map((role) => {
                                    const Icon = role.icon;
                                    const isActive = previewRole === role.id;
                                    return (
                                        <button
                                            key={role.id}
                                            onClick={() => handleRoleSwitch(role.id)}
                                            className={cn(
                                                "flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all duration-200",
                                                isActive
                                                    ? "border-white/30 bg-white/10 ring-1 ring-white/20"
                                                    : "border-white/5 bg-white/3 hover:bg-white/8 hover:border-white/15"
                                            )}
                                        >
                                            <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0", role.color)}>
                                                <Icon className="h-3.5 w-3.5 text-white" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={cn("text-xs font-medium truncate leading-tight", isActive ? "text-white" : "text-slate-300")}>
                                                    {role.label}
                                                </p>
                                                {isActive && <p className="text-[9px] text-blue-400">Actif</p>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {previewRole && (
                                <div className="mx-3 mb-3 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                                    <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-amber-300">MODE APERÇU ACTIF</p>
                                        <p className="text-[10px] text-amber-400/70">
                                            Vue visuelle : <strong className="text-amber-300">{ROLES.find(r => r.id === previewRole)?.label}</strong>. Authentification non modifiée.
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setPreviewRole(null)}
                                        className="text-amber-300 hover:text-amber-100 hover:bg-amber-500/10 h-7 px-2 text-xs flex-shrink-0"
                                    >
                                        ✕
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Service Pipeline Overview ── */}
                <div className="rounded-xl border border-white/10 bg-white/3 p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Globe className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-bold text-white">Pipeline des services ACBAT</span>
                        <span className="text-xs text-slate-500 ml-auto">Cycle standard d'une commande complète</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                        {[
                            { label: "Commercial", icon: ShoppingCart, color: "from-purple-600 to-pink-600" },
                            { label: "Achat", icon: Package, color: "from-amber-600 to-orange-600" },
                            { label: "Logistique", icon: Truck, color: "from-orange-600 to-red-600" },
                            { label: "Technique", icon: Wrench, color: "from-cyan-600 to-blue-600" },
                            { label: "Livraison", icon: Truck, color: "from-teal-600 to-cyan-600" },
                            { label: "Portail Client", icon: UserCircle, color: "from-slate-600 to-slate-700" },
                            { label: "Comptabilité", icon: CreditCard, color: "from-emerald-600 to-green-700" },
                            { label: "SAV", icon: HeadphonesIcon, color: "from-red-600 to-orange-600" },
                            { label: "Analytics", icon: BarChart3, color: "from-indigo-600 to-blue-700" },
                        ].map((s, i, arr) => {
                            const Icon = s.icon;
                            return (
                                <React.Fragment key={s.label}>
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg", s.color)}>
                                            <Icon className="h-4.5 w-4.5 text-white h-5 w-5" />
                                        </div>
                                        <span className="text-[9px] text-slate-500 font-medium text-center leading-tight max-w-[56px]">{s.label}</span>
                                    </div>
                                    {i < arr.length - 1 && (
                                        <ChevronRight className="h-4 w-4 text-slate-700 flex-shrink-0 mb-4" />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
