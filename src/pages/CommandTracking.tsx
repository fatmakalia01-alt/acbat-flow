import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedTimeline, WorkflowStep } from "@/components/AnimatedTimeline";
import { Loader2, Play, CheckCircle2, AlertCircle, MessageSquare, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { JustificationDialog } from "@/components/JustificationDialog";
import { Badge } from "@/components/ui/badge";

export default function CommandTracking() {
    const { user, profile, roles, loading: authLoading } = useAuth();
    const [order, setOrder] = useState<any>(null);
    const [steps, setSteps] = useState<WorkflowStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [isManagerAbsent, setIsManagerAbsent] = useState(false);
    const [selectedStepForJustify, setSelectedStepForJustify] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch latest order for demo purposes
            const { data: orderData, error: orderError } = await supabase
                .from("client_orders")
                .select(`
          *,
          clients (full_name, company_name)
        `)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (orderError) throw orderError;
            setOrder(orderData);

            if (orderData) {
                const { data: stepsData, error: stepsError } = await supabase
                    .from("order_workflow_steps")
                    .select("*")
                    .eq("order_id", orderData.id)
                    .order("step_order", { ascending: true });

                if (stepsError) throw stepsError;
                setSteps(stepsData || []);
            }

            // Check if any manager is absent
            const { data: absenceData, error: absenceError } = await supabase.rpc("is_manager_absent" as any);
            if (!absenceError) setIsManagerAbsent(!!absenceData);

        } catch (error: any) {
            console.error("Error fetching tracking data:", error);
            toast.error("Erreur de chargement des données");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && user) {
            fetchData();
        }
    }, [authLoading, user]);

    const handleLaunch = async () => {
        if (!order) return;
        try {
            const { error } = await supabase
                .from("client_orders")
                .update({ status: "en_validation" })
                .eq("id", order.id);

            if (error) throw error;
            toast.success("Commande lancée ! En attente de validation.");
            fetchData();
        } catch (error: any) {
            toast.error("Erreur lors du lancement");
        }
    };

    const handleConfirm = async () => {
        if (!order) return;
        try {
            const { error } = await supabase
                .from("client_orders")
                .update({ status: "validee" })
                .eq("id", order.id);

            if (error) throw error;
            toast.success("Commande validée !");
            fetchData();
        } catch (error: any) {
            toast.error("Erreur lors de la validation");
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin w-8 h-8 text-primary" />
            </div>
        );
    }

    if (!user) {
        return <div className="p-8">Accès non autorisé</div>;
    }

    if (!order) {
        return <div className="p-8 text-center">Aucune commande trouvée.</div>;
    }

    const canConfirm = roles.includes("manager") || (isManagerAbsent && roles.includes("directeur_exploitation"));
    const isDelayed = steps.some(s => s.status === "delayed");

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            Suivi de la Commande
                            <span className="text-primary">{order.reference || `#${order.id.slice(0, 8)}`}</span>
                        </h1>
                        <p className="text-slate-500 mt-1">Visualisation du flux opérationnel en temps réel</p>
                    </div>

                    <div className="flex gap-3">
                        {order.status === "brouillon" && (
                            <Button onClick={handleLaunch} className="bg-blue-600 hover:bg-blue-700 gap-2">
                                <Play className="w-4 h-4" /> Lancer la commande
                            </Button>
                        )}
                        {order.status === "en_validation" && canConfirm && (
                            <Button onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Confirmer le lancement
                            </Button>
                        )}
                        {order.status === "en_validation" && !canConfirm && (
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 py-2 px-4 h-auto">
                                {isManagerAbsent ? "Attente validation Directeur Exploitation" : "Attente validation Manager"}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Alerts for Overdue Steps */}
                {isDelayed && (
                    <Card className="mb-8 border-red-200 bg-red-50 shadow-sm animate-in fade-in slide-in-from-top-4">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-red-900">Alerte de Retard</h3>
                                    <p className="text-red-700 text-sm mt-1">
                                        Certaines étapes ont dépassé leur délai. Une justification est requise pour passer à l'étape suivante.
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {steps.filter(s => s.status === "delayed").map(s => (
                                            <Button
                                                key={s.id}
                                                size="sm"
                                                variant="destructive"
                                                className="gap-2"
                                                onClick={() => setSelectedStepForJustify(s.id)}
                                            >
                                                <MessageSquare className="w-4 h-4" /> Justifier {s.step_name.replace(/_/g, ' ')}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Progress Timeline */}
                    <div className="lg:col-span-2">
                        <Card className="border-none shadow-sm bg-white">
                            <CardHeader className="border-b bg-slate-50/50">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    État d'avancement
                                    <Badge variant="secondary" className="ml-2 capitalize">
                                        {order.status.replace(/_/g, ' ')}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-8">
                                <AnimatedTimeline steps={steps} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Side Info Panels */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-sm h-fit">
                            <CardHeader className="bg-slate-900 text-white rounded-t-xl">
                                <CardTitle className="text-lg">Informations Commande</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Client</label>
                                    <p className="font-semibold text-slate-900">{order.clients?.full_name || "N/A"}</p>
                                    <p className="text-sm text-slate-500">{order.clients?.company_name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Montant HT</label>
                                        <p className="font-semibold text-slate-900">{order.total_ht?.toLocaleString()}€</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Date</label>
                                        <p className="text-sm text-slate-900">{new Date(order.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <hr className="border-slate-100" />
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Notes</label>
                                    <p className="text-sm text-slate-600 mt-1 italic">
                                        {order.notes || "Pas de notes particulières"}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm bg-blue-600 text-white">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Headphones className="w-8 h-8 opacity-50" />
                                    <div>
                                        <p className="text-xs font-bold opacity-75 uppercase">Besoin d'aide ?</p>
                                        <p className="font-medium">Contacter le service support</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <JustificationDialog
                isOpen={!!selectedStepForJustify}
                onClose={() => setSelectedStepForJustify(null)}
                stepId={selectedStepForJustify || ""}
                onSuccess={fetchData}
            />
        </div>
    );
}
