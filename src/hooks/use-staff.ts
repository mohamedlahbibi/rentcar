import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Staff } from "@/types/database";

export function useAllStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Staff[]) ?? [];
    },
  });
}

export function useRemoveStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

// Uses a session-less client so the admin's current session is not replaced.
const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const anonClient = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function useInviteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; email: string; password: string; role: "ADMIN" | "MANAGER" }) => {
      const { data, error } = await anonClient.auth.signUp({
        email: input.email,
        password: input.password,
      });

      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("Impossible de créer le compte.");

      const { error: staffError } = await supabase
        .from("staff")
        .insert({ id: data.user.id, name: input.name, email: input.email, role: input.role });

      if (staffError) throw new Error(staffError.message);

      return { name: input.name, email: input.email, password: input.password };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}
