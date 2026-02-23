import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import acbatLogo from "@/assets/acbat-logo.jpeg";
import {
  LayoutDashboard, Users, ShoppingCart, Package, Truck, Wrench, FileText,
  CreditCard, HeadphonesIcon, Bell, Settings, LogOut, ChevronLeft, ChevronRight,
  BarChart3, UserCheck, Ship, Construction
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", path: "/dashboard", roles: ["manager", "directeur_exploitation", "responsable_showroom"] },
  { icon: BarChart3, label: "Analytics", path: "/analytics", roles: ["manager", "directeur_exploitation"] },
  { icon: ShoppingCart, label: "Commandes", path: "/orders", roles: ["manager", "directeur_exploitation", "responsable_commercial", "commercial", "responsable_showroom"] },
  { icon: Bell, label: "Suivi Commandes", path: "/tracking", roles: ["manager", "directeur_exploitation", "responsable_commercial", "commercial", "responsable_achat", "responsable_logistique", "responsable_technique", "technicien_montage", "responsable_sav", "responsable_comptabilite"] },
  { icon: Users, label: "Clients", path: "/clients", roles: ["manager", "directeur_exploitation", "responsable_commercial", "commercial", "responsable_showroom"] },
  { icon: FileText, label: "Devis", path: "/quotes", roles: ["manager", "responsable_commercial", "commercial", "responsable_showroom"] },
  { icon: Package, label: "Produits & Stock", path: "/products", roles: ["manager", "responsable_achat", "responsable_logistique"] },
  { icon: Ship, label: "Achats Import", path: "/purchase-orders", roles: ["manager", "responsable_achat", "directeur_exploitation"] },
  { icon: Truck, label: "Logistique", path: "/logistics", roles: ["manager", "responsable_logistique", "responsable_achat"] },
  { icon: Package, label: "Livraisons", path: "/delivery", roles: ["manager", "responsable_logistique", "livraison"] },
  { icon: Construction, label: "Chantiers", path: "/chantiers", roles: ["manager", "responsable_technique", "directeur_exploitation"] },
  { icon: Wrench, label: "Technique", path: "/technical", roles: ["manager", "responsable_technique", "technicien_montage"] },
  { icon: CreditCard, label: "Comptabilité", path: "/accounting", roles: ["manager", "directeur_exploitation", "responsable_comptabilite"] },
  { icon: HeadphonesIcon, label: "SAV", path: "/sav", roles: ["manager", "responsable_sav"] },
  { icon: Bell, label: "Notifications", path: "/notifications", roles: [] }, // visible to all
  { icon: UserCheck, label: "Délégations", path: "/delegations", roles: ["manager", "directeur_exploitation"] },
  { icon: Users, label: "Fournisseurs", path: "/suppliers", roles: ["manager", "responsable_achat", "directeur_exploitation"] },
  { icon: Package, label: "Mouvements Stock", path: "/stock-movements", roles: ["manager", "responsable_logistique", "directeur_exploitation"] },
  { icon: Settings, label: "Utilisateurs", path: "/users", roles: ["manager"] },
];

const AppSidebar = () => {
  const { profile, roles, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Unread notifications count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // refetch every 30s
  });

  const visibleItems = menuItems.filter(item =>
    item.roles.length === 0 || item.roles.some(r => roles.includes(r as any))
  );

  return (
    <aside className={cn(
      "h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 sticky top-0",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
        <img src={acbatLogo} alt="ACBAT" className="h-9 w-9 rounded-lg object-cover flex-shrink-0" />
        {!collapsed && <span className="font-display font-bold text-lg">ACBAT</span>}
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {visibleItems.map(item => {
          const isNotif = item.path === "/notifications";
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-sidebar-accent relative",
                isActive && "bg-sidebar-accent text-sidebar-primary font-medium"
              )}
            >
              <div className="relative flex-shrink-0">
                <item.icon className="h-5 w-5" />
                {isNotif && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && isNotif && unreadCount > 0 && (
                <span className="ml-auto text-xs bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 font-semibold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="mb-3 px-1">
            <p className="text-sm font-medium truncate">{profile.full_name || "Utilisateur"}</p>
            <p className="text-xs text-sidebar-accent-foreground/60 truncate capitalize">
              {roles[0]?.replace(/_/g, ' ')}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          {!collapsed && (
            <Button variant="ghost" size="sm" onClick={signOut}
              className="text-sidebar-foreground hover:bg-sidebar-accent flex-1 justify-start gap-2">
              <LogOut className="h-4 w-4" /> Déconnexion
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
