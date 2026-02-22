import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Truck, MapPin, Camera, CheckCircle, Package, ExternalLink, Navigation } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusColors: Record<string, string> = {
    planifiee: "bg-blue-100 text-blue-800",
    en_route: "bg-amber-100 text-amber-800",
    livree: "bg-emerald-100 text-emerald-800",
    echouee: "bg-red-100 text-red-800",
};

const DeliveryPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const [transportForm, setTransportForm] = useState({
        carrier_name: "",
        tracking_number: "",
        vehicle_plate: "",
        transport_cost: "0",
        carrier_type: "interne"
    });

    const { data: deliveries = [], isLoading } = useQuery({
        queryKey: ["my-deliveries", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("deliveries")
                .select("*, client_orders(reference, clients(*))")
                .or(`technician_id.eq.${user?.id},status.eq.planifiee`) // Show assigned to me OR unassigned planned
                .order("scheduled_date", { ascending: true });
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
        setDetailOpen(true);
    };

    const handleUpdateStatus = (status: string) => {
        const payload: any = { status };
        if (status === "livree") payload.actual_date = new Date().toISOString().split("T")[0];
        updateDelivery.mutate({ ...payload, ...transportForm, transport_cost: Number(transportForm.transport_cost) });
    };

    const openInMaps = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank");
    };

    const stats = {
        total: deliveries.length,
        today: deliveries.filter((d: any) => d.scheduled_date === new Date().toISOString().split("T")[0]).length,
        pending: deliveries.filter((d: any) => d.status !== "livree").length,
    };

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Espace Livraison</h1>
                    <p className="text-muted-foreground text-sm">Gérez vos expéditions et suivis de transport</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="px-3 py-1">{stats.today} Aujourd'hui</Badge>
                    <Badge variant="secondary" className="px-3 py-1 font-bold">{stats.pending} En attente</Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    <div className="col-span-full py-20 text-center text-muted-foreground">Chargement des livraisons...</div>
                ) : deliveries.length === 0 ? (
                    <Card className="col-span-full py-20 bg-muted/30 border-dashed">
                        <CardContent className="flex flex-col items-center justify-center space-y-2">
                            <Truck className="h-12 w-12 text-muted-foreground/50" />
                            <p className="text-muted-foreground">Aucune livraison assignée pour le moment.</p>
                        </CardContent>
                    </Card>
                ) : deliveries.map((d: any) => (
                    <Card key={d.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary" onClick={() => openDetails(d)}>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="font-mono text-xs font-bold text-primary">{d.client_orders?.reference}</p>
                                    <p className="font-bold text-sm truncate max-w-[180px]">{d.client_orders?.clients?.full_name}</p>
                                </div>
                                <Badge className={statusColors[d.status] || ""}>{d.status}</Badge>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{d.client_orders?.clients?.city || "Adresse non fournie"}</span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Navigation className="h-3 w-3" />
                                <span>Prévu pour : {d.scheduled_date ? format(new Date(d.scheduled_date), "dd MMMM", { locale: fr }) : "Non planifiée"}</span>
                            </div>

                            <div className="pt-2 flex justify-between items-center bg-muted/30 -mx-4 -mb-4 p-3 rounded-b-lg">
                                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{d.carrier_type || 'interne'}</span>
                                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                                    <ExternalLink className="h-3 w-3" /> Détails
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5" /> Livraison {selectedDelivery?.client_orders?.reference}
                        </DialogTitle>
                        <DialogDescription>
                            Détails de l'expédition et mise à jour du transport pour cette commande.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedDelivery && (
                        <div className="space-y-6 py-2">
                            <div className="bg-muted p-3 rounded-lg space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Client</p>
                                <p className="font-bold">{selectedDelivery.client_orders?.clients?.full_name}</p>
                                <p className="text-sm">{selectedDelivery.client_orders?.clients?.address}, {selectedDelivery.client_orders?.clients?.city}</p>
                                {selectedDelivery.client_orders?.clients?.latitude && (
                                    <Button variant="link" className="p-0 h-auto text-primary text-xs" onClick={() => openInMaps(selectedDelivery.client_orders?.clients?.latitude, selectedDelivery.client_orders?.clients?.longitude)}>
                                        <MapPin className="h-3 w-3 mr-1" /> Ouvrir dans Maps
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-bold text-sm border-b pb-1">Détails du Transport</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="carrier_type" className="text-xs">Type</Label>
                                        <Select value={transportForm.carrier_type} onValueChange={v => setTransportForm(p => ({ ...p, carrier_type: v }))}>
                                            <SelectTrigger id="carrier_type" className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="interne">Interne</SelectItem>
                                                <SelectItem value="externe">Externe (Transporteur)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="carrier_name" className="text-xs">Transporteur / Véhicule</Label>
                                        <Input id="carrier_name" className="h-9 text-xs" value={transportForm.carrier_name} onChange={e => setTransportForm(p => ({ ...p, carrier_name: e.target.value }))} placeholder="Ex: Van 01 ou DHL" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="vehicle_plate" className="text-xs">Plaque / Matricule</Label>
                                        <Input id="vehicle_plate" className="h-9 text-xs" value={transportForm.vehicle_plate} onChange={e => setTransportForm(p => ({ ...p, vehicle_plate: e.target.value }))} placeholder="XX-XXX-XX" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="transport_cost" className="text-xs">Coût Transport (TND)</Label>
                                        <Input id="transport_cost" type="number" className="h-9 text-xs" value={transportForm.transport_cost} onChange={e => setTransportForm(p => ({ ...p, transport_cost: e.target.value }))} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <h4 className="font-bold text-sm border-b pb-1">Mise à jour statut</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" className="h-10 text-xs border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" onClick={() => handleUpdateStatus("en_route")}>
                                        <Navigation className="h-4 w-4 mr-2" /> En route
                                    </Button>
                                    <Button className="h-10 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleUpdateStatus("livree")}>
                                        <CheckCircle className="h-4 w-4 mr-2" /> Confirmé / Livré
                                    </Button>
                                </div>
                                <Button variant="ghost" size="sm" className="text-xs text-destructive mt-1" onClick={() => handleUpdateStatus("echouee")}>Échec de livraison</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DeliveryPage;
