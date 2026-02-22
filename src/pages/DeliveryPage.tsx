import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// NB: roles loaded from AuthContext to scope delivery visibility
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
    Truck, MapPin, Camera, CheckCircle, ExternalLink,
    Navigation, Phone, PenTool, Image as ImageIcon, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusColors: Record<string, string> = {
    planifiee: "bg-blue-100 text-blue-800",
    en_route: "bg-amber-100 text-amber-800",
    livree: "bg-emerald-100 text-emerald-800",
    echouee: "bg-red-100 text-red-800",
};

const DeliveryPage = () => {
    const { user, hasRole } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [podData, setPodData] = useState({ photo_before: false, photo_after: false, signed: false });

    const [transportForm, setTransportForm] = useState({
        carrier_name: "",
        tracking_number: "",
        vehicle_plate: "",
        transport_cost: "0",
        carrier_type: "interne"
    });

    // Whether the current user is a delivery driver (restricted view)
    const isLivreur = hasRole("livraison") && !hasRole("manager") && !hasRole("responsable_logistique");

    const { data: deliveries = [], isLoading } = useQuery({
        queryKey: ["my-deliveries", user?.id, isLivreur],
        queryFn: async () => {
            let query = supabase
                .from("deliveries")
                .select("*, client_orders(reference, clients(*), sites(name))");

            if (isLivreur) {
                // Livreur: only their assigned deliveries OR unassigned planned ones
                query = query.or(
                    `technician_id.eq.${user?.id},and(technician_id.is.null,status.eq.planifiee)`
                );
            }
            // Managers / logistics: no extra filter — RLS on Supabase handles it
            const { data, error } = await query.order("scheduled_date", { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });


    const updateDelivery = useMutation({
        mutationFn: async (payload: any) => {
            const { error } = await supabase
                .from("deliveries")
                .update(payload)
                .eq("id", selectedDelivery.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
            toast({ title: "Livraison mise à jour" });
            setDetailOpen(false);
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });

    const openDetails = (d: any) => {
        setSelectedDelivery(d);
        setTransportForm({
            carrier_name: d.carrier_name || "",
            tracking_number: d.tracking_number || "",
            vehicle_plate: d.vehicle_plate || "",
            transport_cost: String(d.transport_cost || 0),
            carrier_type: d.carrier_type || "interne"
        });
        setPodData({
            photo_before: !!d.photo_before_url,
            photo_after: !!d.photo_after_url,
            signed: !!d.pv_signed
        });
        setDetailOpen(true);
    };

    const handleUpdateStatus = (status: string) => {
        if (status === "livree" && !podData.signed) {
            toast({ title: "Action requise", description: "Veuillez faire signer le PV de livraison avant de valider.", variant: "destructive" });
            return;
        }

        const payload: any = {
            status,
            ...transportForm,
            transport_cost: Number(transportForm.transport_cost),
            pv_signed: podData.signed
        };
        if (status === "livree") payload.actual_date = new Date().toISOString().split("T")[0];
        updateDelivery.mutate(payload);
    };

    const openInMaps = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank");
    };

    const handleCall = (phone: string) => {
        window.location.href = `tel:${phone}`;
    };

    const stats = {
        total: deliveries.length,
        today: deliveries.filter((d: any) => d.scheduled_date === new Date().toISOString().split("T")[0]).length,
        pending: deliveries.filter((d: any) => d.status !== "livree").length,
    };

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto pb-24 md:pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Espace Livraison</h1>
                    <p className="text-muted-foreground text-sm">Gérez vos expéditions et suivis de transport</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="px-3 py-1 border-primary/20 bg-primary/5">{stats.today} Aujourd'hui</Badge>
                    <Badge variant="secondary" className="px-3 py-1 font-bold">{stats.pending} En attente</Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    <div className="col-span-full py-20 text-center text-muted-foreground animate-pulse">Chargement des livraisons...</div>
                ) : deliveries.length === 0 ? (
                    <Card className="col-span-full py-20 bg-muted/30 border-dashed">
                        <CardContent className="flex flex-col items-center justify-center space-y-2">
                            <Truck className="h-12 w-12 text-muted-foreground/50" />
                            <p className="text-muted-foreground">Aucune livraison assignée pour le moment.</p>
                        </CardContent>
                    </Card>
                ) : deliveries.map((d: any) => (
                    <Card key={d.id} className="group shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 border-l-primary overflow-hidden" onClick={() => openDetails(d)}>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="font-mono text-xs font-bold text-primary">{d.client_orders?.reference}</p>
                                    <p className="font-bold text-base truncate max-w-[180px]">{d.client_orders?.clients?.full_name}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge className={statusColors[d.status] || ""}>{d.status}</Badge>
                                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">
                                        {d.client_orders?.sites?.name || "Siège"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4 text-primary/70" />
                                <span className="truncate">{d.client_orders?.clients?.city || "Adresse non fournie"}</span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                                <Navigation className="h-3 w-3" />
                                <span>Prévu le : {d.scheduled_date ? format(new Date(d.scheduled_date), "dd MMMM", { locale: fr }) : "À planifier"}</span>
                            </div>

                            <div className="pt-2 flex justify-between items-center group-hover:bg-primary/5 -mx-4 -mb-4 px-4 py-3 border-t">
                                <div className="flex gap-2">
                                    {d.pv_signed && <span title="Signé"><PenTool className="h-4 w-4 text-emerald-600" /></span>}
                                    {d.photo_after_url && <span title="Photo POD"><ImageIcon className="h-4 w-4 text-emerald-600" /></span>}
                                </div>
                                <Button size="sm" variant="ghost" className="h-8 text-xs font-bold text-primary uppercase tracking-wider">
                                    Ouvrir mission
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Truck className="h-6 w-6 text-primary" /> Livraison {selectedDelivery?.client_orders?.reference}
                        </DialogTitle>
                        <DialogDescription>Détails de l'expédition et justificatifs de livraison.</DialogDescription>
                    </DialogHeader>

                    {selectedDelivery && (
                        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                            {/* Site & Client Summary */}
                            <div className="bg-primary/5 p-4 rounded-xl space-y-3 border border-primary/10">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Site: {selectedDelivery.client_orders?.sites?.name || "Siège"}</p>
                                        </div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Destinataire</p>
                                        <p className="font-bold text-lg">{selectedDelivery.client_orders?.clients?.full_name}</p>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {selectedDelivery.client_orders?.clients?.address}<br />
                                            {selectedDelivery.client_orders?.clients?.postal_code} {selectedDelivery.client_orders?.clients?.city}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {selectedDelivery.client_orders?.clients?.phone && (
                                            <Button size="icon" className="rounded-full h-10 w-10 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleCall(selectedDelivery.client_orders?.clients?.phone)}>
                                                <Phone className="h-5 w-5" />
                                            </Button>
                                        )}
                                        {selectedDelivery.client_orders?.clients?.latitude && (
                                            <Button size="icon" variant="outline" className="rounded-full h-10 w-10" onClick={() => openInMaps(selectedDelivery.client_orders?.clients?.latitude, selectedDelivery.client_orders?.clients?.longitude)}>
                                                <Navigation className="h-5 w-5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Proof of Delivery (POD) Section */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-sm flex items-center gap-2 uppercase tracking-wide">
                                    <Camera className="h-4 w-4 text-primary" /> Justificatifs (POD)
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant={podData.photo_before ? "secondary" : "outline"}
                                        className={`h-24 flex-col gap-2 border-dashed ${podData.photo_before ? 'border-emerald-500' : ''}`}
                                        onClick={() => setPodData(p => ({ ...p, photo_before: true }))}
                                    >
                                        {podData.photo_before ? <CheckCircle className="h-6 w-6 text-emerald-600" /> : <Camera className="h-6 w-6" />}
                                        <span className="text-[10px] uppercase font-bold">Photo Montage</span>
                                    </Button>
                                    <Button
                                        variant={podData.photo_after ? "secondary" : "outline"}
                                        className={`h-24 flex-col gap-2 border-dashed ${podData.photo_after ? 'border-emerald-500' : ''}`}
                                        onClick={() => setPodData(p => ({ ...p, photo_after: true }))}
                                    >
                                        {podData.photo_after ? <CheckCircle className="h-6 w-6 text-emerald-600" /> : <Camera className="h-6 w-6" />}
                                        <span className="text-[10px] uppercase font-bold">Photo Finale</span>
                                    </Button>
                                    <Button
                                        variant={podData.signed ? "secondary" : "outline"}
                                        className={`h-20 col-span-2 flex-col gap-2 border-dashed ${podData.signed ? 'border-emerald-500' : ''}`}
                                        onClick={() => setPodData(p => ({ ...p, signed: true }))}
                                    >
                                        <div className="flex items-center gap-2">
                                            {podData.signed ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <PenTool className="h-5 w-5" />}
                                            <span className="text-xs font-bold uppercase">Signature Client PV</span>
                                        </div>
                                        {podData.signed && <span className="text-[10px] text-muted-foreground italic">Signé sur terminal le {format(new Date(), "dd/MM à HH:mm")}</span>}
                                    </Button>
                                </div>
                            </div>

                            {/* Transport Details (Optional for Driver) */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-sm flex items-center gap-2 uppercase tracking-wide">
                                    <Truck className="h-4 w-4 text-primary" /> Détails Transport
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="vehicle_plate" className="text-[10px] uppercase font-bold text-muted-foreground">Véhicule (Matricule)</Label>
                                        <Input id="vehicle_plate" className="h-10 text-xs" value={transportForm.vehicle_plate} onChange={e => setTransportForm(p => ({ ...p, vehicle_plate: e.target.value }))} placeholder="XX-XXX-XX" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="transport_cost" className="text-[10px] uppercase font-bold text-muted-foreground">Frais (TND)</Label>
                                        <Input id="transport_cost" type="number" className="h-10 text-xs" value={transportForm.transport_cost} onChange={e => setTransportForm(p => ({ ...p, transport_cost: e.target.value }))} />
                                    </div>
                                </div>
                            </div>

                            {/* Action Status */}
                            <div className="pt-4 border-t space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="outline" className="h-12 text-xs border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold uppercase tracking-wider" onClick={() => handleUpdateStatus("en_route")}>
                                        <Navigation className="h-4 w-4 mr-2" /> Démarrer Route
                                    </Button>
                                    <Button className="h-12 text-xs bg-emerald-600 hover:bg-emerald-700 font-bold uppercase tracking-wider" onClick={() => handleUpdateStatus("livree")}>
                                        <CheckCircle className="h-4 w-4 mr-2" /> Valider Livraison
                                    </Button>
                                </div>
                                <Button variant="ghost" size="sm" className="w-full text-xs text-destructive flex items-center gap-2" onClick={() => handleUpdateStatus("echouee")}>
                                    <AlertCircle className="h-4 w-4" /> Signaler un incident / échec
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DeliveryPage;
