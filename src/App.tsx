import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ClientPortal from "./pages/ClientPortal";
import UsersManagement from "./pages/UsersManagement";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const HomeRedirect = () => {
  const { roles, loading } = useAuth();
  if (loading) return null;
  if (roles.includes("client")) return <Navigate to="/my-orders" replace />;
  return <Navigate to="/dashboard" replace />;
};

const App = () => (
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
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="users" element={<UsersManagement />} />
              <Route path="my-orders" element={<ClientPortal />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
