import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship } from "lucide-react";

const PurchaseOrdersPage = () => {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Achats Import</h1>
                    <p className="text-muted-foreground text-sm">Gestion des commandes fournisseurs internationales</p>
                </div>
            </div>

            <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                    <Ship className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                    <h2 className="text-xl font-semibold mb-2">Module en cours de développement</h2>
                    <p className="text-muted-foreground max-w-sm">
                        Ce module permettra de suivre les imports depuis l'Italie (ICA, Ermetika),
                        incluant le transit, la douane et l'intégration en stock.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default PurchaseOrdersPage;
