import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadCarImages } from "@/lib/cloudinary";
import { supabase } from "@/lib/supabase";
import type { Car } from "@/types/database";
import { cars as MOCK_CARS_RAW } from "@/data/rentalMock";

const MOCK_CARS = MOCK_CARS_RAW as unknown as Car[];

// ─── Queries ───────────────────────────────────────────────────────────────

async function fetchAvailableCars(start: string, end: string): Promise<Car[]> {
  const { data: booked } = await supabase
    .from("reservations")
    .select("car_id")
    .in("status", ["PENDING", "CONFIRMED"])
    .lte("start_date", end)
    .gte("end_date", start);

  const bookedIds = (booked ?? []).map((r) => r.car_id as string);

  const base = supabase.from("cars").select("*");
  const { data, error } = bookedIds.length
    ? await base.not("id", "in", `(${bookedIds.join(",")})`)
    : await base;

  if (error) throw error;
  const result = (data as Car[]) ?? [];
  if (result.length === 0) return MOCK_CARS.filter((c) => !bookedIds.includes(c.id));
  return result;
}

async function fetchCar(id: string): Promise<Car | null> {
  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .eq("id", id)
    .single();
  if (!error && data) return data as Car;
  return MOCK_CARS.find((c) => c.id === id) ?? null;
}

export function useAvailableCars(start: string, end: string) {
  return useQuery({
    queryKey: ["cars", "available", start, end],
    queryFn: () => fetchAvailableCars(start, end),
    enabled: !!start && !!end && start <= end,
  });
}

export function useCar(id: string) {
  return useQuery({
    queryKey: ["cars", id],
    queryFn: () => fetchCar(id),
    enabled: !!id,
  });
}

export function useAllCars() {
  return useQuery({
    queryKey: ["cars", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const result = (data as Car[]) ?? [];
      return result.length > 0 ? result : MOCK_CARS;
    },
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────

type CarInput = Omit<Car, "id" | "created_at">;

export function useCreateCar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ car, imageFiles }: { car: CarInput; imageFiles: File[] }) => {
      const uploadedUrls = imageFiles.length ? await uploadCarImages(imageFiles) : [];
      const images = [...car.images, ...uploadedUrls];
      const { data, error } = await supabase
        .from("cars")
        .insert({ ...car, images })
        .select()
        .single();
      if (error) throw error;
      return data as Car;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cars"] }),
  });
}

export function useUpdateCar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      car,
      imageFiles,
    }: {
      id: string;
      car: Partial<CarInput>;
      imageFiles: File[];
    }) => {
      let images = car.images ?? [];
      if (imageFiles.length) {
        const newUrls = await uploadCarImages(imageFiles);
        images = [...images, ...newUrls];
      }
      const { data, error } = await supabase
        .from("cars")
        .update({ ...car, images })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Car;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cars"] }),
  });
}

export function useDeleteCar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cars").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cars"] }),
  });
}

export function useToggleAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { error } = await supabase
        .from("cars")
        .update({ is_available })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cars"] }),
  });
}
