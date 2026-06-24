import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Car, Reservation, ReservationStatus, User } from "@/types/database";

export interface ReservationWithCar extends Reservation {
  car: Car;
}

async function fetchMyReservations(userId: string): Promise<ReservationWithCar[]> {
  const { data, error } = await supabase
    .from("reservations")
    .select("*, car:cars(*)")
    .eq("client_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ReservationWithCar[]) ?? [];
}

async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return (data as User) ?? null;
}

export function useMyReservations(userId: string | undefined) {
  return useQuery({
    queryKey: ["reservations", "mine", userId],
    queryFn: () => fetchMyReservations(userId!),
    enabled: !!userId,
  });
}

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["users", userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
  });
}

interface CreateReservationInput {
  car_id: string;
  client_id: string;
  start_date: string;
  end_date: string;
}

// Admin walk-in: staff trusted, price override allowed, sets CONFIRMED directly
export function useAdminCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      car_id: string;
      client_id: string;
      start_date: string;
      end_date: string;
      total_price: number;
    }) => {
      const { data, error } = await supabase
        .from("reservations")
        .insert({ ...input, status: "CONFIRMED" })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["cars"] });
    },
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateReservationInput) => {
      const { data, error } = await supabase.rpc("create_reservation", {
        p_car_id:     input.car_id,
        p_client_id:  input.client_id,
        p_start_date: input.start_date,
        p_end_date:   input.end_date,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["cars"] });
    },
  });
}

export function useCancelReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reservations")
        .update({ status: "CANCELLED" })
        .eq("id", id)
        .eq("status", "PENDING");
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
    },
  });
}

// ─── Admin hooks ───────────────────────────────────────────────────────────

export interface ReservationWithDetails extends Reservation {
  user: User;
  car: Car;
}

export function useAllReservations() {
  return useQuery({
    queryKey: ["reservations", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, user:users(*), car:cars(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as ReservationWithDetails[]) ?? [];
    },
  });
}

export function useReservation(id: string) {
  return useQuery({
    queryKey: ["reservations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, user:users(*), car:cars(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as ReservationWithDetails;
    },
    enabled: !!id,
  });
}

export function useUpdateReservationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      rejection_reason,
    }: {
      id: string;
      status: ReservationStatus;
      rejection_reason?: string;
    }) => {
      const { error } = await supabase
        .from("reservations")
        .update({ status, rejection_reason: rejection_reason ?? null, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["cars"] });
    },
  });
}

export function useCarBookedRanges(carId: string) {
  return useQuery({
    queryKey: ["reservations", "booked", carId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("start_date, end_date")
        .eq("car_id", carId)
        .in("status", ["PENDING", "CONFIRMED"]);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        from: new Date(r.start_date),
        to: new Date(r.end_date),
      }));
    },
    enabled: !!carId,
  });
}

export function useAutoCompleteReservations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase
        .from("reservations")
        .update({ status: "COMPLETED", updated_at: new Date().toISOString() })
        .eq("status", "CONFIRMED")
        .lt("end_date", today);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations"] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<Pick<User, "name" | "phone" | "address">> }) => {
      const { error } = await supabase
        .from("users")
        .update(data)
        .eq("id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["users", vars.userId] });
    },
  });
}

export function useAllClients() {
  return useQuery({
    queryKey: ["users", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as User[]) ?? [];
    },
  });
}

export function useToggleBlockClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_blocked }: { id: string; is_blocked: boolean }) => {
      const { error } = await supabase.from("users").update({ is_blocked }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      cin: string;
      phone: string;
      email: string;
      permis_id?: string;
    }): Promise<User> => {
      const { data, error } = await supabase
        .from("users")
        .insert({ ...input, permis_id: input.permis_id ?? "", address: null })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as User;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
