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
  const [mockRole, setMockRole] = useState<AppRole | null>(null);
  const navigate = useNavigate();
  
  const fetchingForUserRef = useRef<string | null>(null);
  const dataLoadedRef = useRef(false);

  const fetchUserData = useCallback(async (userId: string) => {
    if (fetchingForUserRef.current === userId) return;
    fetchingForUserRef.current = userId;
    
    try {
      const [resProfile, resRoles] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);

      if (resProfile.data) {
        setProfile(resProfile.data as Profile);
      }

      if (!resRoles.error && resRoles.data) {
        const roleList = resRoles.data.map((r: any) => r.role) as AppRole[];
        setRoles(roleList);
      }
      
      dataLoadedRef.current = true;
    } catch (err) {
      console.error("AuthContext: fetchUserData error:", err);
    } finally {
      fetchingForUserRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Fast init: get session synchronously from cache if possible
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          await fetchUserData(currentSession.user.id);
        }
      } catch (err) {
        console.error("AuthContext: getSession error:", err);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    initAuth();

    // Listen for future auth changes (sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // Don't await - fire and forget to avoid blocking
        fetchUserData(newSession.user.id);
      } else {
        setProfile(null);
        setRoles([]);
        setMockRole(null);
        fetchingForUserRef.current = null;
        dataLoadedRef.current = false;
      }

      // If we were still loading (race with getSession), mark done
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
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

  return (
    <AuthContext.Provider value={{
      session, user, profile, roles: getActiveRoles(), mockRole, setMockRole, loading: authLoading,
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
