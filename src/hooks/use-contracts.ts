import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Contract } from "@/types/database";

export function useContract(reservationId: string) {
  return useQuery({
    queryKey: ["contracts", reservationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contracts")
        .select("*")
        .eq("reservation_id", reservationId)
        .maybeSingle();
      return (data as Contract) ?? null;
    },
    enabled: !!reservationId,
  });
}

type ContractInput = Omit<Contract, "id" | "generated_at">;

export function useUpsertContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ContractInput) => {
      const { data: existing } = await supabase
        .from("contracts")
        .select("id")
        .eq("reservation_id", input.reservation_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("contracts")
          .update(input)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as Contract;
      } else {
        const { data, error } = await supabase
          .from("contracts")
          .insert(input)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as Contract;
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["contracts", vars.reservation_id] });
    },
  });
}
