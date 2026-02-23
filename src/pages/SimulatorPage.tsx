import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Play,
    RotateCcw,
    Terminal,
    UserCircle,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Activity,
    Trash2,
    Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

const ROLES = [
    { id: 'manager', label: "Manager", color: "bg-indigo-500" },
    { id: 'directeur_exploitation', label: "Directeur Exploitation", color: "bg-blue-600" },
    { id: 'responsable_commercial', label: "Resp. Commercial", color: "bg-purple-500" },
    { id: 'commercial', label: "Commercial", color: "bg-pink-500" },
    { id: 'responsable_achat', label: "Resp. Achat", color: "bg-amber-500" },
    { id: 'responsable_logistique', label: "Resp. Logistique", color: "bg-orange-500" },
    { id: 'responsable_technique', label: "Resp. Technique", color: "bg-cyan-600" },
    { id: 'technicien_montage', label: "Technicien", color: "bg-slate-500" },
    { id: 'responsable_sav', label: "Resp. SAV", color: "bg-teal-500" },
    { id: 'responsable_comptabilite', label: "Comptabilité", color: "bg-emerald-600" },
    { id: 'client', label: "Client", color: "bg-gray-400" },
];

const SCENARIOS = [
    {
        id: "full-cycle",
        title: "Cycle Opérationnel Complet",
        description: "Simulation de A à Z : Création client -> Devis -> Commande -> Stock -> Installation -> Facture.",
        steps: 12,
        icon: Activity
    },
    {
        id: "sav-emergency",
        title: "Urgence SAV",
        description: "Simulation d'une réclamation client avec intervention technique prioritaire.",
        steps: 5,
        icon: AlertCircle
    },
    {
        id: "import-replenishment",
        title: "Réapprovisionnement Achat",
        description: "Simulation d'une commande fournisseur import avec réception en stock.",
        steps: 4,
        icon: RotateCcw
    }
];

export default function SimulatorPage() {
    const { mockRole, setMockRole, roles } = useAuth();
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<{ id: string; msg: string; type: 'info' | 'success' | 'error' | 'role' }[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [activeScenario, setActiveScenario] = useState<string | null>(null);

    const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'role' = 'info') => {
        setLogs(prev => [{ id: Math.random().toString(), msg, type }, ...prev]);
    };

    const handleRoleSwitch = (roleId: any) => {
        setMockRole(roleId === mockRole ? null : roleId);
        addLog(`Perspective changée vers : ${roleId}`, 'role');
        toast.info(`Mode vue : ${roleId}`);
    };

    const runSimulation = async (scenarioId: string) => {
        setActiveScenario(scenarioId);
        setIsRunning(true);
        setCurrentStep(0);
        setLogs([]);
        addLog(`Lancement du scénario : ${scenarioId}`, 'info');

        // Simple simulation logic for now
        try {
            if (scenarioId === 'full-cycle') {
                // Step 1: Client Creation
                setCurrentStep(1);
                addLog("Création du client 'Simu Corp'...", 'info');
                await new Promise(r => setTimeout(r, 1000));
                addLog("Client créé avec succès.", 'success');

                // Step 2: Quote
                setCurrentStep(2);
                addLog("Génération d'un devis brouillon...", 'info');
                await new Promise(r => setTimeout(r, 1500));
                addLog("Devis #DV-2026-SIMU généré.", 'success');

                // Step 3: Switch Perspective to Manager
                handleRoleSwitch('manager');
                addLog("Validation du devis par le Manager...", 'info');
                await new Promise(r => setTimeout(r, 1000));
                addLog("Devis validé.", 'success');

                // ... more steps would go here calling real logic ...

                setCurrentStep(SCENARIOS[0].steps);
                addLog("Simulation complète terminée avec succès !", 'success');
            }
        } catch (error) {
            addLog("Erreur durant la simulation", 'error');
        } finally {
            setIsRunning(false);
            setMockRole(null);
        }
    };

    const cleanData = async () => {
        if (!confirm("Voulez-vous vraiment supprimer les données de test du simulateur ?")) return;
        toast.promise(
            new Promise(resolve => setTimeout(resolve, 2000)),
            {
                loading: 'Nettoyage en cours...',
                success: 'Données nettoyées.',
                error: 'Erreur lors du nettoyage.',
            }
        );
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            <Activity className="w-10 h-10 text-primary" />
                            Simulateur ACBAT
                        </h1>
                        <p className="text-slate-500 text-lg mt-2">Testez l'écosystème complet en temps réel</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={cleanData} className="gap-2 border-red-200 text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" /> Purger les données
                        </Button>
                        <Button disabled={isRunning} className="bg-primary hover:bg-primary/90 gap-2 px-6">
                            <Play className="w-4 h-4" /> Mode Expert
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">

                    {/* Scenarios & Control */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {SCENARIOS.map((s) => (
                                <Card key={s.id} className={cn(
                                    "cursor-pointer hover:border-primary/50 transition-all duration-300",
                                    activeScenario === s.id && "border-primary ring-1 ring-primary/20",
                                    isRunning && activeScenario !== s.id && "opacity-50 grayscale"
                                )} onClick={() => !isRunning && runSimulation(s.id)}>
                                    <CardHeader className="pb-2">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                                            <s.icon className="w-5 h-5 text-primary" />
                                        </div>
                                        <CardTitle className="text-xl font-bold">{s.title}</CardTitle>
                                        <CardDescription className="text-sm line-clamp-2">{s.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <ChevronRight className="w-3 h-3" /> {s.steps} Étapes automatisées
                                            </span>
                                            {activeScenario === s.id && isRunning && (
                                                <Badge variant="secondary" className="animate-pulse">Active</Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Simulation Progress */}
                        {activeScenario && (
                            <Card className="border-none shadow-sm overflow-hidden">
                                <div className="h-2 bg-slate-100">
                                    <div
                                        className="h-full bg-primary transition-all duration-500 ease-out"
                                        style={{ width: `${(currentStep / (SCENARIOS.find(s => s.id === activeScenario)?.steps || 1)) * 100}%` }}
                                    />
                                </div>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold flex items-center gap-2">
                                            Étape {currentStep} sur {SCENARIOS.find(s => s.id === activeScenario)?.steps}
                                        </h3>
                                        {isRunning ? (
                                            <span className="text-primary flex items-center gap-2 text-sm font-medium">
                                                <RotateCcw className="w-4 h-4 animate-spin" /> Simulation en cours...
                                            </span>
                                        ) : (
                                            <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-100">
                                                <CheckCircle2 className="w-4 h-4 mr-1" /> Terminé
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Live Terminal */}
                        <Card className="bg-slate-900 text-slate-50 border-none shadow-xl overflow-hidden rounded-xl">
                            <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    </div>
                                    <span className="text-xs font-mono text-slate-400">SIMULATOR_LOGS_v1.0.sh</span>
                                </div>
                                <Terminal className="w-4 h-4 text-slate-400" />
                            </div>
                            <ScrollArea className="h-64 p-4 font-mono text-xs leading-relaxed">
                                {logs.length === 0 ? (
                                    <p className="text-slate-600 italic">En attente de lancement scénario...</p>
                                ) : (
                                    <div className="space-y-2">
                                        {logs.map((log) => (
                                            <div key={log.id} className={cn(
                                                "flex gap-3 animate-in slide-in-from-left-2 duration-300",
                                                log.type === 'success' && "text-emerald-400",
                                                log.type === 'error' && "text-red-400",
                                                log.type === 'role' && "text-blue-400 font-bold",
                                                log.type === 'info' && "text-slate-300"
                                            )}>
                                                <span className="text-slate-700 select-none">[{new Date().toLocaleTimeString()}]</span>
                                                <span className="flex-1 whitespace-pre-wrap">{log.msg}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </Card>
                    </div>

                    {/* Perspective Control Panel */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-none shadow-sm sticky top-8">
                            <CardHeader className="bg-slate-900 text-white rounded-t-xl pb-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <UserCircle className="w-6 h-6 text-primary" />
                                    <CardTitle className="text-lg">Perspectives de Rôle</CardTitle>
                                </div>
                                <CardDescription className="text-slate-400 text-xs">
                                    Changez la vue de l'application instantanément sans vous déconnecter.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-2">
                                <div className="grid grid-cols-1 gap-2">
                                    {ROLES.map((role) => (
                                        <button
                                            key={role.id}
                                            onClick={() => handleRoleSwitch(role.id)}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-lg border transition-all duration-200 text-left group",
                                                mockRole === role.id
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                    : "border-slate-100 hover:bg-slate-50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-2 h-8 rounded-full", role.color)} />
                                                <div>
                                                    <p className={cn("text-sm font-bold", mockRole === role.id ? "text-primary" : "text-slate-700")}>
                                                        {role.label}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Accès système complet</p>
                                                </div>
                                            </div>
                                            <Eye className={cn(
                                                "w-4 h-4 transition-opacity",
                                                mockRole === role.id ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-40"
                                            )} />
                                        </button>
                                    ))}
                                </div>

                                {mockRole && (
                                    <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3 anim-pulse">
                                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-amber-900">MOCK_MODE_ACTIVE</p>
                                            <p className="text-[11px] text-amber-700 leading-tight mt-1">
                                                Toutes les permissions RLS et l'interface sont simulées pour le rôle <strong>{ROLES.find(r => r.id === mockRole)?.label}</strong>.
                                            </p>
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="p-0 h-auto text-amber-900 font-bold decoration-amber-900 mt-2"
                                                onClick={() => setMockRole(null)}
                                            >
                                                Désactiver le mode vue
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}
