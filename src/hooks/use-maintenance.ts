import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MaintenanceRecord } from "@/types/database";

export function useMaintenanceRecords(carId: string) {
  return useQuery({
    queryKey: ["maintenance", carId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_records")
        .select("*")
        .eq("car_id", carId)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data as MaintenanceRecord[]) ?? [];
    },
    enabled: !!carId,
  });
}

type MaintenanceInput = Omit<MaintenanceRecord, "id" | "created_at">;

export function useCreateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: MaintenanceInput) => {
      const { data, error } = await supabase
        .from("maintenance_records")
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data as MaintenanceRecord;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["maintenance", data.car_id] }),
  });
}

export function useUpdateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<MaintenanceInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("maintenance_records")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as MaintenanceRecord;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["maintenance", data.car_id] }),
  });
}

export function useDeleteMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, car_id }: { id: string; car_id: string }) => {
      const { error } = await supabase.from("maintenance_records").delete().eq("id", id);
      if (error) throw error;
      return car_id;
    },
    onSuccess: (car_id) => qc.invalidateQueries({ queryKey: ["maintenance", car_id] }),
  });
}
