import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type AppRole = 'manager' | 'directeur_exploitation' | 'responsable_achat' | 'responsable_logistique' |
  'responsable_commercial' | 'commercial' | 'responsable_technique' | 'technicien_montage' |
  'responsable_sav' | 'responsable_comptabilite' | 'client' | 'livraison' | 'responsable_showroom';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  mockRole: AppRole | null;
  setMockRole: (role: AppRole | null) => void;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isManager: () => boolean;
  isInternalStaff: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  // authLoading = on attend encore la session initiale
  const [authLoading, setAuthLoading] = useState(true);
  // rolesLoading = on attend que les roles soient chargés depuis la DB
  const [rolesLoading, setRolesLoading] = useState(false);
  const [mockRole, setMockRole] = useState<AppRole | null>(null);
  const navigate = useNavigate();

  const fetchUserData = async (userId: string) => {
    setRolesLoading(true);
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (profileRes.data) setProfile(profileRes.data as Profile);
      if (rolesRes.data && rolesRes.data.length > 0) {
        setRoles(rolesRes.data.map((r: any) => r.role as AppRole));
      } else {
        setRoles([]);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des données utilisateur:", err);
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    // Failsafe: if Supabase doesn't respond in 5s, unblock the UI
    const failsafeTimer = setTimeout(() => {
      console.warn("Auth timeout: Supabase did not respond in 5s, unblocking UI.");
      setAuthLoading(false);
      setRolesLoading(false);
    }, 5000);

    // 1. Vérifier la session existante au démarrage (une seule fois)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(failsafeTimer);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
      setAuthLoading(false);
    }).catch((err) => {
      clearTimeout(failsafeTimer);
      console.error("Erreur getSession:", err);
      setAuthLoading(false);
    });

    // 2. Écouter les changements suivants (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      } else {
        setProfile(null);
        setRoles([]);
        setMockRole(null);
      }
      setAuthLoading(false);
    });

    return () => {
      clearTimeout(failsafeTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setMockRole(null);
    navigate("/login");
  };

  const getActiveRoles = () => mockRole ? [mockRole] : roles;

  const hasRole = (role: AppRole) => getActiveRoles().includes(role);
  const isManager = () => hasRole('manager');
  const isInternalStaff = () => getActiveRoles().some(r => r !== 'client');

  // loading = true tant que l'auth OU les rôles ne sont pas encore résolus
  const loading = authLoading || rolesLoading;

  return (
    <AuthContext.Provider value={{
      session, user, profile, roles: getActiveRoles(), mockRole, setMockRole, loading,
      signIn, signOut, hasRole, isManager, isInternalStaff
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
