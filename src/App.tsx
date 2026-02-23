import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ClientPortal from "./pages/ClientPortal";
import UsersManagement from "./pages/UsersManagement";
import OrdersManagement from "./pages/OrdersManagement";
import ClientsManagement from "./pages/ClientsManagement";
import QuotesManagement from "./pages/QuotesManagement";
import AccountingPage from "./pages/AccountingPage";
import ProductsPage from "./pages/ProductsPage";
import LogisticsPage from "./pages/LogisticsPage";
import TechnicalPage from "./pages/TechnicalPage";
import SavPage from "./pages/SavPage";
import NotificationsPage from "./pages/NotificationsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import DelegationPage from "./pages/DelegationPage";
import SuppliersPage from "./pages/SuppliersPage";
import StockMovements from "./pages/StockMovements";
import DeliveryPage from "./pages/DeliveryPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import JobsitesPage from "./pages/JobsitesPage";
import AppLayout from "./components/AppLayout";
import CommandTracking from "@/pages/CommandTracking";
import SimulatorPage from "@/pages/SimulatorPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const HomeRedirect = () => {
  const { roles, loading } = useAuth();
  if (loading) return null;
  if (roles.includes("client")) return <Navigate to="/my-orders" replace />;
  return <Navigate to="/dashboard" replace />;
};

console.log("APP VERSION: FIXED_REF_v6");

function App() {
  // We use React.createElement to evade automatic JSX ref injection by the lovable-tagger
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(
      TooltipProvider,
      null,
      React.createElement(Toaster, null),
      React.createElement(Sonner, null),
      React.createElement(
        BrowserRouter,
        null,
        React.createElement(
          AuthProvider,
          null,
          React.createElement(
            Routes,
            null,
            React.createElement(Route, { path: "/login", element: React.createElement(Login, null) }),
            React.createElement(
              Route,
              { path: "/", element: React.createElement(AppLayout, null) },
              React.createElement(Route, { index: true, element: React.createElement(HomeRedirect, null) }),
              React.createElement(Route, { path: "dashboard", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation", "responsable_showroom"] }, React.createElement(Dashboard, null)) }),
              React.createElement(Route, { path: "orders", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation", "responsable_commercial", "commercial", "responsable_showroom"] }, React.createElement(OrdersManagement, null)) }),
              React.createElement(Route, { path: "clients", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation", "responsable_commercial", "commercial", "responsable_showroom"] }, React.createElement(ClientsManagement, null)) }),
              React.createElement(Route, { path: "quotes", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_commercial", "commercial", "responsable_showroom"] }, React.createElement(QuotesManagement, null)) }),
              React.createElement(Route, { path: "accounting", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation", "responsable_comptabilite"] }, React.createElement(AccountingPage, null)) }),
              React.createElement(Route, { path: "products", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_achat", "responsable_logistique"] }, React.createElement(ProductsPage, null)) }),
              React.createElement(Route, { path: "purchase-orders", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_achat", "directeur_exploitation"] }, React.createElement(PurchaseOrdersPage, null)) }),
              React.createElement(Route, { path: "logistics", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_logistique", "responsable_achat"] }, React.createElement(LogisticsPage, null)) }),
              React.createElement(Route, { path: "technical", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_technique", "technicien_montage"] }, React.createElement(TechnicalPage, null)) }),
              React.createElement(Route, { path: "chantiers", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_technique", "directeur_exploitation"] }, React.createElement(JobsitesPage, null)) }),
              React.createElement(Route, { path: "sav", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_sav"] }, React.createElement(SavPage, null)) }),
              React.createElement(Route, { path: "notifications", element: React.createElement(ProtectedRoute, null, React.createElement(NotificationsPage, null)) }),
              React.createElement(Route, { path: "analytics", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation"] }, React.createElement(AnalyticsPage, null)) }),
              React.createElement(Route, { path: "delegations", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation"] }, React.createElement(DelegationPage, null)) }),
              React.createElement(Route, { path: "suppliers", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_achat", "directeur_exploitation"] }, React.createElement(SuppliersPage, null)) }),
              React.createElement(Route, { path: "stock-movements", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_logistique", "directeur_exploitation"] }, React.createElement(StockMovements, null)) }),
              React.createElement(Route, { path: "delivery", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_logistique", "livraison"] }, React.createElement(DeliveryPage, null)) }),
              React.createElement(Route, { path: "users", element: React.createElement(ProtectedRoute, { roles: ["manager"] }, React.createElement(UsersManagement, null)) }),
              React.createElement(Route, { path: "tracking", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation", "responsable_commercial", "commercial", "responsable_achat", "responsable_logistique", "responsable_technique", "technicien_montage", "responsable_sav", "responsable_comptabilite"] }, React.createElement(CommandTracking, null)) }),
              React.createElement(Route, { path: "simulator", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation"] }, React.createElement(SimulatorPage, null)) }),
              React.createElement(Route, { path: "my-orders", element: React.createElement(ProtectedRoute, { roles: ["client"] }, React.createElement(ClientPortal, null)) })
            ),
            React.createElement(Route, { path: "*", element: React.createElement(NotFound, null) })
          )
        )
      )
    )
  );
}

export default App;

