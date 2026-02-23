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
  const to = roles.includes("client") ? "/my-orders" : "/dashboard";
  return React.createElement("div", { key: "home-redirect-wrapper" }, React.createElement(Navigate, { to, replace: true }));
};

console.log("APP VERSION: FIXED_REF_v9_TIMEOUT_DIAG");

function App() {
  // We use React.createElement to evade automatic JSX ref injection by the lovable-tagger
  return React.createElement(
    QueryClientProvider,
    {
      client: queryClient, children: React.createElement(
        TooltipProvider,
        {
          children: React.createElement(
            React.Fragment,
            null,
            [
              React.createElement(Toaster, { key: "toaster" }),
              React.createElement(Sonner, { key: "sonner" }),
              React.createElement(
                BrowserRouter,
                {
                  key: "router",
                  future: { v7_startTransition: true, v7_relativeSplatPath: true },
                  children: React.createElement(
                    AuthProvider,
                    {
                      children: React.createElement(
                        Routes,
                        {
                          children: [
                            React.createElement(Route, { key: "login", path: "/login", element: React.createElement(Login, null) }),
                            React.createElement(
                              Route,
                              { key: "root", path: "/", element: React.createElement(AppLayout, null) },
                              [
                                React.createElement(Route, { key: "home", index: true, element: React.createElement(HomeRedirect, null) }),
                                React.createElement(Route, { key: "dashboard", path: "dashboard", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation", "responsable_showroom"], children: React.createElement(Dashboard, null) }) }),
                                React.createElement(Route, { key: "orders", path: "orders", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation", "responsable_commercial", "commercial", "responsable_showroom"], children: React.createElement(OrdersManagement, null) }) }),
                                React.createElement(Route, { key: "clients", path: "clients", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation", "responsable_commercial", "commercial", "responsable_showroom"], children: React.createElement(ClientsManagement, null) }) }),
                                React.createElement(Route, { key: "quotes", path: "quotes", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_commercial", "commercial", "responsable_showroom"], children: React.createElement(QuotesManagement, null) }) }),
                                React.createElement(Route, { key: "accounting", path: "accounting", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation", "responsable_comptabilite"], children: React.createElement(AccountingPage, null) }) }),
                                React.createElement(Route, { key: "products", path: "products", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_achat", "responsable_logistique"], children: React.createElement(ProductsPage, null) }) }),
                                React.createElement(Route, { key: "purchase-orders", path: "purchase-orders", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_achat", "directeur_exploitation"], children: React.createElement(PurchaseOrdersPage, null) }) }),
                                React.createElement(Route, { key: "logistics", path: "logistics", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_logistique", "responsable_achat"], children: React.createElement(LogisticsPage, null) }) }),
                                React.createElement(Route, { key: "technical", path: "technical", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_technique", "technicien_montage"], children: React.createElement(TechnicalPage, null) }) }),
                                React.createElement(Route, { key: "chantiers", path: "chantiers", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_technique", "directeur_exploitation"], children: React.createElement(JobsitesPage, null) }) }),
                                React.createElement(Route, { key: "sav", path: "sav", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_sav"], children: React.createElement(SavPage, null) }) }),
                                React.createElement(Route, { key: "notifications", path: "notifications", element: React.createElement(ProtectedRoute, { children: React.createElement(NotificationsPage, null) }) }),
                                React.createElement(Route, { key: "analytics", path: "analytics", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation"], children: React.createElement(AnalyticsPage, null) }) }),
                                React.createElement(Route, { key: "delegations", path: "delegations", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation"], children: React.createElement(DelegationPage, null) }) }),
                                React.createElement(Route, { key: "suppliers", path: "suppliers", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_achat", "directeur_exploitation"], children: React.createElement(SuppliersPage, null) }) }),
                                React.createElement(Route, { key: "stock-movements", path: "stock-movements", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_logistique", "directeur_exploitation"], children: React.createElement(StockMovements, null) }) }),
                                React.createElement(Route, { key: "delivery", path: "delivery", element: React.createElement(ProtectedRoute, { roles: ["manager", "responsable_logistique", "livraison"], children: React.createElement(DeliveryPage, null) }) }),
                                React.createElement(Route, { key: "users", path: "users", element: React.createElement(ProtectedRoute, { roles: ["manager"], children: React.createElement(UsersManagement, null) }) }),
                                React.createElement(Route, { key: "tracking", path: "tracking", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation", "responsable_commercial", "commercial", "responsable_achat", "responsable_logistique", "responsable_technique", "technicien_montage", "responsable_sav", "responsable_comptabilite"], children: React.createElement(CommandTracking, null) }) }),
                                React.createElement(Route, { key: "simulator", path: "simulator", element: React.createElement(ProtectedRoute, { roles: ["manager", "directeur_exploitation"], children: React.createElement(SimulatorPage, null) }) }),
                                React.createElement(Route, { key: "my-orders", path: "my-orders", element: React.createElement(ProtectedRoute, { roles: ["client"], children: React.createElement(ClientPortal, null) }) }),
                                React.createElement(Route, { key: "notfound", path: "*", element: React.createElement(NotFound, null) })
                              ]
                            )
                          ]
                        }
                      )
                    }
                  )
                }
              )
            ]
          )
        }
      )
    }
  );
}

export default App;

