import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppSidebar from "./AppSidebar";

function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      <div key="sidebar-wrapper">
        <AppSidebar />
      </div>
      <main className="flex-1 overflow-auto">
        <div key="outlet-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
