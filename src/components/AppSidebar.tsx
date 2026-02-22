import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import acbatLogo from "@/assets/acbat-logo.jpeg";
import {
  LayoutDashboard, Users, ShoppingCart, Package, Truck, Wrench, FileText,
  CreditCard, HeadphonesIcon, Bell, Settings, LogOut, ChevronLeft, ChevronRight
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", path: "/dashboard", roles: ["manager", "directeur_exploitation"] },
  { icon: ShoppingCart, label: "Commandes", path: "/orders", roles: ["manager", "directeur_exploitation", "responsable_commercial", "commercial"] },
  { icon: Users, label: "Clients", path: "/clients", roles: ["manager", "directeur_exploitation", "responsable_commercial", "commercial"] },
  { icon: Package, label: "Produits & Stock", path: "/products", roles: ["manager", "responsable_achat", "responsable_logistique"] },
  { icon: Truck, label: "Logistique", path: "/logistics", roles: ["manager", "responsable_logistique", "responsable_achat"] },
  { icon: Wrench, label: "Technique", path: "/technical", roles: ["manager", "responsable_technique", "technicien_montage"] },
  { icon: FileText, label: "Devis", path: "/quotes", roles: ["manager", "responsable_commercial", "commercial"] },
  { icon: CreditCard, label: "Comptabilité", path: "/accounting", roles: ["manager", "directeur_exploitation", "responsable_comptabilite"] },
  { icon: HeadphonesIcon, label: "SAV", path: "/sav", roles: ["manager", "responsable_sav"] },
  { icon: Bell, label: "Notifications", path: "/notifications", roles: [] },
  { icon: Settings, label: "Utilisateurs", path: "/users", roles: ["manager"] },
];

const AppSidebar = () => {
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

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
        {visibleItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-sidebar-accent",
              location.pathname === item.path && "bg-sidebar-accent text-sidebar-primary font-medium"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="mb-3 px-1">
            <p className="text-sm font-medium truncate">{profile.full_name || "Utilisateur"}</p>
            <p className="text-xs text-sidebar-accent-foreground/60 truncate">{roles[0]?.replace(/_/g, ' ')}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="text-sidebar-foreground hover:bg-sidebar-accent">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          {!collapsed && (
            <Button variant="ghost" size="sm" onClick={signOut} className="text-sidebar-foreground hover:bg-sidebar-accent flex-1 justify-start gap-2">
              <LogOut className="h-4 w-4" /> Déconnexion
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
