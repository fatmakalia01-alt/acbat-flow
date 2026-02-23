import React, { forwardRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = 'manager' | 'directeur_exploitation' | 'responsable_achat' | 'responsable_logistique' |
  'responsable_commercial' | 'commercial' | 'responsable_technique' | 'technicien_montage' |
  'responsable_sav' | 'responsable_comptabilite' | 'client' | 'livraison' | 'responsable_showroom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: AppRole[];
}

const ProtectedRoute = forwardRef<HTMLDivElement, ProtectedRouteProps>(({ children, roles }, ref) => {
  const { user, roles: userRoles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div ref={ref} className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && !roles.some(r => userRoles.includes(r))) {
    return (
      <div ref={ref} className="flex flex-col items-center justify-center h-full p-12 text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-xl font-semibold">Accès refusé</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </p>
      </div>
    );
  }

  return <div ref={ref}>{children}</div>;
});

export default ProtectedRoute;
