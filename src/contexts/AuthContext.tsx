import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // Role flags
  isAdmin: boolean;
  isFaculty: boolean;
  isEmployer: boolean;
  isStudent: boolean;
  isPendingFaculty: boolean;
  roles: string[];
  // Helper functions
  hasRole: (role: string) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Fetch all user roles in a single query
  const fetchUserRoles = async (userId: string) => {
    try {
      setRolesLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching user roles:", error);
        setRoles([]);
        return;
      }

      const userRoles = data?.map((r) => r.role) || [];
      setRoles(userRoles);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  // Clear roles when user logs out
  const clearRoles = () => {
    setRoles([]);
  };

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch roles when user logs in
        // Use setTimeout to avoid potential race conditions with Supabase auth
        setTimeout(() => {
          fetchUserRoles(session.user.id);
        }, 0);
      } else {
        // Clear roles when user logs out
        clearRoles();
      }

      setLoading(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserRoles(session.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Computed role flags
  const isAdmin = roles.includes("admin");
  const isFaculty = roles.includes("faculty") || roles.includes("admin");
  const isEmployer = roles.includes("employer");
  const isStudent = roles.includes("student");
  const isPendingFaculty = roles.includes("pending_faculty");

  // Helper function to check if user has a specific role
  const hasRole = (role: string): boolean => {
    return roles.includes(role);
  };

  // Sign out function
  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
    clearRoles();
  };

  // Combined loading state - loading is true while either auth or roles are loading
  const isLoading = loading || rolesLoading;

  const value: AuthContextType = {
    user,
    session,
    loading: isLoading,
    isAdmin,
    isFaculty,
    isEmployer,
    isStudent,
    isPendingFaculty,
    roles,
    hasRole,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

export { AuthContext };
