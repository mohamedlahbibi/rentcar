export type UserRole = "ADMIN" | "MANAGER" | "CLIENT";

export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED";

export type CarType = "Citadine" | "SUV" | "Berline" | "Utilitaire";
export type FuelType = "Essence" | "Diesel" | "Électrique" | "Hybride";
export type Transmission = "Manuelle" | "Automatique";

// ─── Tables ────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  cin: string;
  permis_id: string;
  address: string | null;
  is_blocked?: boolean;
  created_at: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER";
  created_at: string;
}

export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  type: CarType;
  fuel: FuelType;
  transmission: Transmission;
  seats: number;
  mileage: number;
  price_per_day: number;
  color: string;
  matricule: string;
  is_available: boolean;
  images: string[];
  notes: string | null;
  created_at: string;
}

export interface Reservation {
  id: string;
  client_id: string;
  car_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: ReservationStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  car_id: string;
  date: string;
  type: string;
  km_at_service: number;
  next_service_km: number | null;
  next_service_date: string | null;
  cost: number | null;
  provider: string | null;
  notes: string | null;
  created_at: string;
}

export interface Contract {
  id: string;
  reservation_id: string;
  fuel_level: string | null;
  km_at_pickup: number | null;
  car_condition_notes: string | null;
  deposit: number | null;
  additional_notes: string | null;
  generated_at: string;
}

export interface AgencySettings {
  id: 1;
  return_hour: string;
  updated_at: string;
}

// ─── Joined / enriched types used in the UI ────────────────────────────────

export interface ReservationWithDetails extends Reservation {
  user: User;
  car: Car;
}
