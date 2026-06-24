import fleetHero from "@/assets/tunisian-rental-fleet.jpg";
import type { ReservationStatus } from "@/types/database";

export const carTypes = ["Citadine", "SUV", "Berline", "Utilitaire"] as const;

// Mock cars — field names match the DB schema (snake_case)
export const cars = [
  {
    id: "clio-2023",
    brand: "Renault",
    model: "Clio 5",
    year: 2023,
    type: "Citadine",
    fuel: "Essence",
    transmission: "Automatique",
    seats: 5,
    mileage: 18500,
    price_per_day: 125,
    color: "Bleu nuit",
    matricule: "214 TN 7821",
    is_available: true,
    images: [fleetHero],
    notes: "Compacte premium pour ville et aéroport.",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "tucson-2022",
    brand: "Hyundai",
    model: "Tucson",
    year: 2022,
    type: "SUV",
    fuel: "Diesel",
    transmission: "Automatique",
    seats: 5,
    mileage: 40200,
    price_per_day: 240,
    color: "Gris graphite",
    matricule: "211 TN 4420",
    is_available: true,
    images: [fleetHero],
    notes: "SUV confortable pour longues distances.",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "corolla-2021",
    brand: "Toyota",
    model: "Corolla",
    year: 2021,
    type: "Berline",
    fuel: "Hybride",
    transmission: "Automatique",
    seats: 5,
    mileage: 52000,
    price_per_day: 190,
    color: "Blanc perle",
    matricule: "208 TN 5539",
    is_available: false,
    images: [fleetHero],
    notes: "Très économique, idéale business.",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "partner-2020",
    brand: "Peugeot",
    model: "Partner",
    year: 2020,
    type: "Utilitaire",
    fuel: "Diesel",
    transmission: "Manuelle",
    seats: 3,
    mileage: 73500,
    price_per_day: 165,
    color: "Argent",
    matricule: "205 TN 9014",
    is_available: true,
    images: [fleetHero],
    notes: "Volume utile pour livraisons locales.",
    created_at: "2026-01-01T00:00:00Z",
  },
];

export const reservations = [
  { id: "RS-1048", client: "Amira Ben Youssef", phone: "+216 22 456 890", car: "Renault Clio 5", dates: "24 Apr → 29 Apr", total: 625, status: "PENDING" as ReservationStatus },
  { id: "RS-1047", client: "Yassine Trabelsi", phone: "+216 98 113 020", car: "Hyundai Tucson", dates: "25 Apr → 2 May", total: 1680, status: "CONFIRMED" as ReservationStatus },
  { id: "RS-1046", client: "Nour Haddad", phone: "+216 55 781 300", car: "Toyota Corolla", dates: "18 Apr → 20 Apr", total: 380, status: "COMPLETED" as ReservationStatus },
];

export const clients = [
  { id: "CL-231", name: "Amira Ben Youssef", cin: "08456231", phone: "+216 22 456 890", email: "amira@mail.tn", reservations: 3 },
  { id: "CL-204", name: "Yassine Trabelsi", cin: "09234481", phone: "+216 98 113 020", email: "yassine@mail.tn", reservations: 6 },
  { id: "CL-198", name: "Nour Haddad", cin: "07129844", phone: "+216 55 781 300", email: "nour@mail.tn", reservations: 2 },
];

export const maintenanceRows = [
  { date: "2026-03-12", type: "Vidange", km: "18 120", next: "28 000 km", cost: "180 TND", provider: "Garage Ariana", notes: "Filtre remplacé" },
  { date: "2026-02-04", type: "Pneus", km: "16 900", next: "2027-02-04", cost: "620 TND", provider: "Pneu Express", notes: "Train avant" },
  { date: "2026-01-21", type: "Freins", km: "15 500", next: "30 000 km", cost: "340 TND", provider: "Service Plus", notes: "Plaquettes" },
];
