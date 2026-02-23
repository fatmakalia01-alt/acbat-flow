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
    console.log("AuthContext: fetchUserData starting for", userId);
    setRolesLoading(true);
    try {
      // 1. Récupérer le profil
      console.log("AuthContext: Fetching profile...");
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.warn("AuthContext: Profile fetch error (might not exist yet):", profileError);
      } else {
        console.log("AuthContext: Profile fetched:", !!profileData);
        setProfile(profileData as Profile);
      }

      // 2. Récupérer les rôles
      console.log("AuthContext: Fetching roles...");
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesError) {
        console.error("AuthContext: Roles fetch error:", rolesError);
        setRoles([]);
      } else {
        const roleList = rolesData?.map(r => r.role) || [];
        console.log("AuthContext: Roles fetched:", roleList);
        setRoles(roleList as AppRole[]);
      }
    } catch (err) {
      console.error("AuthContext: Unexpected error in fetchUserData:", err);
    } finally {
      console.log("AuthContext: fetchUserData finished (rolesLoading -> false)");
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    console.log("AuthContext: Initializing effect...");
    console.log("AuthContext: Supabase URL:", import.meta.env.VITE_SUPABASE_URL);

    let initialized = false;

    // Failsafe: if Supabase doesn't respond in 15s, unblock the UI
    const failsafeTimer = setTimeout(() => {
      if (!initialized) {
        console.error("Auth timeout: Supabase did not respond in 15s, unblocking UI via failsafe.");
        setAuthLoading(false);
        setRolesLoading(false);
      }
    }, 15000);

    const markAsInitialized = () => {
      if (!initialized) {
        console.log("AuthContext: Mark as initialized (authLoading -> false)");
        initialized = true;
        setAuthLoading(false);
        clearTimeout(failsafeTimer);
      }
    };

    // 1. Vérifier la session existante au démarrage (une seule fois)
    console.log("AuthContext: getSession() call starting...");
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log("AuthContext: getSession() promise resolved", { session: !!session, error });
      if (session) {
        setSession(session);
        setUser(session.user);
        await fetchUserData(session.user.id);
      }
      markAsInitialized();
    }).catch((err) => {
      console.error("AuthContext: getSession() promise rejected:", err);
      markAsInitialized();
    });

    // 2. Écouter les changements suivants (login/logout)
    // IMPORTANT: onAuthStateChange peut déclencher SIGNED_IN avant que getSession ne résolve
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthContext: onAuthStateChange event:", event, "session:", !!session);

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserData(session.user.id);
      } else {
        setProfile(null);
        setRoles([]);
        setMockRole(null);
        setRolesLoading(false);
      }

      // Si on reçoit un événement auth, on peut considérer l'init terminée
      markAsInitialized();
    });

    return () => {
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
