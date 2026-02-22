import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, Info, AlertTriangle, Zap, Clock, AlertOctagon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, any> = {
    info: Info,
    alerte_delai: Clock,
    depassement: AlertTriangle,
    transition: Zap,
    urgente: AlertOctagon,
};

const typeColors: Record<string, string> = {
    info: "text-blue-500",
    alerte_delai: "text-amber-500",
    depassement: "text-orange-500",
    transition: "text-purple-500",
    urgente: "text-destructive",
};

const NotificationsPage = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ["notifications", user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    const markRead = useMutation({
        mutationFn: async (id: string) => {
            await supabase.from("notifications").update({ read: true, read_at: new Date().toISOString() }).eq("id", id);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
    });

    const markAllRead = useMutation({
        mutationFn: async () => {
            if (!user) return;
            await supabase.from("notifications")
                .update({ read: true, read_at: new Date().toISOString() })
                .eq("user_id", user.id)
                .eq("read", false);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
    });

    const unreadCount = notifications.filter((n: any) => !n.read).length;

    // Real-time subscription
    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel("notifications-realtime")
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${user.id}`,
            }, () => {
                queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user, queryClient]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Notifications</h1>
                    <p className="text-muted-foreground text-sm">
                        {unreadCount > 0 ? `${unreadCount} non lue(s)` : "Tout est lu"}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}
                        disabled={markAllRead.isPending} className="gap-2">
                        <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : notifications.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                        <Bell className="h-12 w-12 opacity-30" />
                        <p className="text-sm">Aucune notification</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {notifications.map((n: any) => {
                        const Icon = typeIcons[n.type] || Info;
                        const iconColor = typeColors[n.type] || "text-blue-500";
                        return (
                            <Card key={n.id} className={cn("transition-all", !n.read && "border-primary/30 bg-primary/5")}>
                                <CardContent className="p-4 flex items-start gap-4">
                                    <div className={cn("mt-0.5 flex-shrink-0", iconColor)}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className={cn("text-sm font-medium", !n.read && "font-semibold")}>{n.title}</p>
                                                <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {n.alert_level && (
                                                    <Badge variant="outline" className="text-xs">{n.alert_level}</Badge>
                                                )}
                                                {!n.read && (
                                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                                        onClick={() => markRead.mutate(n.id)}>
                                                        <Check className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {format(new Date(n.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
