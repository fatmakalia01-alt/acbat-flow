import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
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
  const [authLoading, setAuthLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [mockRole, setMockRole] = useState<AppRole | null>(null);
  const navigate = useNavigate();
  
  // Track current fetch to avoid duplicate concurrent calls
  const fetchingForUserRef = useRef<string | null>(null);

  const fetchUserData = useCallback(async (userId: string) => {
    // Skip if we're already fetching for this user
    if (fetchingForUserRef.current === userId) {
      console.log("AuthContext: fetchUserData skipped (already fetching for", userId, ")");
      return;
    }
    
    fetchingForUserRef.current = userId;
    console.log("AuthContext: fetchUserData starting for", userId);
    setRolesLoading(true);
    
    try {
      // Fetch profile and roles in parallel, using user_id (not id)
      const [resProfile, resRoles] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);

      // Profile
      if (resProfile.error) {
        console.warn("AuthContext: Profile fetch error:", resProfile.error);
      } else if (resProfile.data) {
        console.log("AuthContext: Profile fetched OK");
        setProfile(resProfile.data as Profile);
      } else {
        console.log("AuthContext: No profile found for user");
      }

      // Roles
      if (resRoles.error) {
        console.error("AuthContext: Roles fetch error:", resRoles.error);
        setRoles([]);
      } else {
        const roleList = resRoles.data?.map((r: any) => r.role) || [];
        console.log("AuthContext: Roles fetched:", roleList);
        setRoles(roleList as AppRole[]);
      }
    } catch (err) {
      console.error("AuthContext: Error in fetchUserData:", err);
    } finally {
      fetchingForUserRef.current = null;
      setRolesLoading(false);
      console.log("AuthContext: fetchUserData finished");
    }
  }, []);

  useEffect(() => {
    console.log("AuthContext: Initializing...");
    let initialized = false;

    const failsafeTimer = setTimeout(() => {
      if (!initialized) {
        console.error("Auth timeout: unblocking UI via failsafe.");
        initialized = true;
        setAuthLoading(false);
        setRolesLoading(false);
      }
    }, 15000);

    const markInitialized = () => {
      if (!initialized) {
        initialized = true;
        setAuthLoading(false);
        clearTimeout(failsafeTimer);
      }
    };

    // Listen for auth changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      console.log("AuthContext: onAuthStateChange:", event, "session:", !!session);

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserData(session.user.id);
      } else {
        setProfile(null);
        setRoles([]);
        setMockRole(null);
        setRolesLoading(false);
        fetchingForUserRef.current = null;
      }

      markInitialized();
    });

    // Then check existing session
    supabase.auth.getSession().then(async ({ data: { session } }: any) => {
      console.log("AuthContext: getSession resolved, session:", !!session);
      if (session) {
        setSession(session);
        setUser(session.user);
        await fetchUserData(session.user.id);
      }
      markInitialized();
    }).catch((err: any) => {
      console.error("AuthContext: getSession error:", err);
      markInitialized();
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(failsafeTimer);
    };
  }, [fetchUserData]);

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
