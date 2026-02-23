import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = 'manager' | 'directeur_exploitation' | 'responsable_achat' | 'responsable_logistique' |
  'responsable_commercial' | 'commercial' | 'responsable_technique' | 'technicien_montage' |
  'responsable_sav' | 'responsable_comptabilite' | 'client' | 'livraison' | 'responsable_showroom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: AppRole[];
}

function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, roles: userRoles, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && !roles.some(r => userRoles.includes(r))) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-xl font-semibold text-foreground">Accès refusé</h2>
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm max-w-xs">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
          <p className="text-xs text-muted-foreground bg-muted p-2 rounded border">
            Connecté en tant que : <span className="font-mono">{user.email}</span>
          </p>
        </div>
        <button
          onClick={() => signOut()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Se déconnecter et changer de compte
        </button>
      </div>
    );
  }

  return <div>{children}</div>;
}

export default ProtectedRoute;
