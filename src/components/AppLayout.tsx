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

  return React.createElement(
    "div",
    { className: "flex min-h-screen bg-background" },
    [
      React.createElement("div", { key: "sidebar-wrapper" }, React.createElement(AppSidebar, null)),
      React.createElement(
        "main",
        { key: "main-content", className: "flex-1 overflow-auto" },
        React.createElement("div", { key: "outlet-wrapper" }, React.createElement(Outlet, null))
      )
    ]
  );
}

export default AppLayout;
