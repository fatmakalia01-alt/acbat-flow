import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

const JobsitesPage = () => {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Chantiers</h1>
                    <p className="text-muted-foreground text-sm">Planification et suivi des interventions techniques</p>
                </div>
            </div>

            <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                    <Construction className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                    <h2 className="text-xl font-semibold mb-2">Module en cours de développement</h2>
                    <p className="text-muted-foreground max-w-sm">
                        Ce module permettra de planifier les installations chez les clients,
                        gérer les équipes de pose et le matériel nécessaire.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default JobsitesPage;
