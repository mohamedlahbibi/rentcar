import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AgencySettings } from "@/types/database";

const FALLBACK: AgencySettings = { id: 1, return_hour: "10:00", updated_at: "" };

export function useAgencySettings() {
  return useQuery<AgencySettings>({
    queryKey: ["agency_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_settings")
        .select("*")
        .single();
      if (error) return FALLBACK;
      return data as AgencySettings;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateReturnHour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (return_hour: string) => {
      const { error } = await supabase
        .from("agency_settings")
        .update({ return_hour, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agency_settings"] }),
  });
}
