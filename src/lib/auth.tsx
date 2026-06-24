import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Staff, User, UserRole } from "@/types/database";

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  profile: User | Staff | null;
}

interface AuthContextValue {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  signUpClient: (data: SignUpClientData) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

interface SignUpClientData {
  name: string;
  email: string;
  password: string;
  phone: string;
  cin: string;
  permis_id: string;
  address?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function resolveRole(supabaseUser: SupabaseUser): Promise<AuthUser> {
  const { data: staffRow } = await supabase
    .from("staff")
    .select("*")
    .eq("id", supabaseUser.id)
    .single();

  if (staffRow) {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      role: staffRow.role as "ADMIN" | "MANAGER",
      profile: staffRow as Staff,
    };
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("*")
    .eq("id", supabaseUser.id)
    .single();

  return {
    id: supabaseUser.id,
    email: supabaseUser.email!,
    role: "CLIENT",
    profile: (userRow as User) ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function handleSession(session: Session | null) {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        try {
          const resolved = await resolveRole(session.user);
          if (mounted) setUser(resolved);
        } catch {
          if (mounted) setUser(null);
        }
      } else {
        if (mounted) setUser(null);
      }
      if (mounted) setLoading(false);
    }

    // Read existing session from localStorage immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Listen for login / logout / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "INITIAL_SESSION") return; // already handled by getSession
      handleSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signUpClient(data: SignUpClientData) {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          phone: data.phone,
          cin: data.cin,
          permis_id: data.permis_id,
          address: data.address ?? null,
        },
      },
    });
    return { error: error?.message ?? null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signUpClient, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export const isStaff = (role: UserRole) => role === "ADMIN" || role === "MANAGER";
export const isAdmin = (role: UserRole) => role === "ADMIN";
