import React from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert } from "lucide-react";

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
    return (
      <div key="redirect-login-wrapper">
        <Navigate to="/login" state={{ from: location }} replace />
      </div>
    );
  }

  if (roles && roles.length > 0 && !roles.some(r => userRoles.includes(r))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card p-8 rounded-lg shadow-lg border border-border text-center">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Accès refusé</h1>
          <p className="text-muted-foreground mb-6">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            <br />
            <span className="text-xs mt-2 block opacity-70">Connecté en tant que : {user.email}</span>
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Se déconnecter et changer de compte
            </button>
            <Link
              to="/"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key="protected-content-wrapper">
      {children}
    </div>
  );
}

export default ProtectedRoute;
