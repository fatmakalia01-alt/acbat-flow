import * as React from "react";
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
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const HomeRedirect = () => {
  const { roles, loading } = useAuth();
  if (loading) return null;
  if (roles.includes("client")) return <Navigate to="/my-orders" replace />;
  return <Navigate to="/dashboard" replace />;
};

const App = React.forwardRef<HTMLDivElement>((props, ref) => (
  <div ref={ref}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<AppLayout />}>
                <Route index element={<HomeRedirect />} />
                <Route path="dashboard" element={
                  <ProtectedRoute roles={["manager", "directeur_exploitation"]}>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="orders" element={
                  <ProtectedRoute roles={["manager", "directeur_exploitation", "responsable_commercial", "commercial"]}>
                    <OrdersManagement />
                  </ProtectedRoute>
                } />
                <Route path="clients" element={
                  <ProtectedRoute roles={["manager", "directeur_exploitation", "responsable_commercial", "commercial"]}>
                    <ClientsManagement />
                  </ProtectedRoute>
                } />
                <Route path="quotes" element={
                  <ProtectedRoute roles={["manager", "responsable_commercial", "commercial"]}>
                    <QuotesManagement />
                  </ProtectedRoute>
                } />
                <Route path="accounting" element={
                  <ProtectedRoute roles={["manager", "directeur_exploitation", "responsable_comptabilite"]}>
                    <AccountingPage />
                  </ProtectedRoute>
                } />
                <Route path="products" element={
                  <ProtectedRoute roles={["manager", "responsable_achat", "responsable_logistique"]}>
                    <ProductsPage />
                  </ProtectedRoute>
                } />
                <Route path="logistics" element={
                  <ProtectedRoute roles={["manager", "responsable_logistique", "responsable_achat"]}>
                    <LogisticsPage />
                  </ProtectedRoute>
                } />
                <Route path="technical" element={
                  <ProtectedRoute roles={["manager", "responsable_technique", "technicien_montage"]}>
                    <TechnicalPage />
                  </ProtectedRoute>
                } />
                <Route path="sav" element={
                  <ProtectedRoute roles={["manager", "responsable_sav"]}>
                    <SavPage />
                  </ProtectedRoute>
                } />
                <Route path="notifications" element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                } />
                <Route path="analytics" element={
                  <ProtectedRoute roles={["manager", "directeur_exploitation"]}>
                    <AnalyticsPage />
                  </ProtectedRoute>
                } />
                <Route path="delegations" element={
                  <ProtectedRoute roles={["manager", "directeur_exploitation"]}>
                    <DelegationPage />
                  </ProtectedRoute>
                } />
                <Route path="suppliers" element={
                  <ProtectedRoute roles={["manager", "responsable_achat", "directeur_exploitation"]}>
                    <SuppliersPage />
                  </ProtectedRoute>
                } />
                <Route path="stock-movements" element={
                  <ProtectedRoute roles={["manager", "responsable_logistique", "directeur_exploitation"]}>
                    <StockMovements />
                  </ProtectedRoute>
                } />
                <Route path="delivery" element={
                  <ProtectedRoute roles={["manager", "responsable_logistique", "livraison"]}>
                    <DeliveryPage />
                  </ProtectedRoute>
                } />
                <Route path="users" element={
                  <ProtectedRoute roles={["manager"]}>
                    <UsersManagement />
                  </ProtectedRoute>
                } />
                <Route path="my-orders" element={
                  <ProtectedRoute roles={["client"]}>
                    <ClientPortal />
                  </ProtectedRoute>
                } />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </div>
));

App.displayName = "App";

export default App;
