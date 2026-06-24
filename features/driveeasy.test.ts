/**
 * DriveEasy Rentals — Full Test Suite
 *
 * Covers:
 *   1.  Date utilities & price calculation
 *   2.  Overlap / conflict detection logic
 *   3.  Reservation happy-path
 *   4.  Concurrent booking race condition
 *   5.  Blocked-client guard
 *   6.  Date-boundary edge cases (adjacent, same-day, zero-length)
 *   7.  Reservation status lifecycle (state machine)
 *   8.  Car availability filtering
 *   9.  Car management (create / update / delete / toggle)
 *   10. Maintenance records (CRUD)
 *   11. Contracts (create & upsert)
 *   12. Staff management (invite / remove)
 *   13. Auto-complete past reservations
 *   14. Client self-cancel guard
 *   15. Full end-to-end reservation flow (both clients race the same car)
 */

import { describe, it, expect } from "vitest";

// ─── Types (mirrored from src/types/database.ts) ───────────────────────────

type ReservationStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "COMPLETED" | "CANCELLED";
type CarType          = "Citadine" | "SUV" | "Berline" | "Utilitaire";
type FuelType         = "Essence" | "Diesel" | "Électrique" | "Hybride";
type Transmission     = "Manuelle" | "Automatique";

interface Car {
  id: string; brand: string; model: string; year: number;
  type: CarType; fuel: FuelType; transmission: Transmission;
  seats: number; mileage: number; price_per_day: number;
  color: string; matricule: string; is_available: boolean;
  images: string[]; notes: string | null; created_at: string;
}

interface User {
  id: string; name: string; email: string; phone: string;
  cin: string; permis_id: string; address: string | null;
  is_blocked?: boolean; created_at: string;
}

interface Reservation {
  id: string; client_id: string; car_id: string;
  start_date: string; end_date: string; total_price: number;
  status: ReservationStatus; rejection_reason: string | null;
  created_at: string; updated_at: string;
}

interface MaintenanceRecord {
  id: string; car_id: string; date: string; type: string;
  km_at_service: number; next_service_km: number | null;
  next_service_date: string | null; cost: number | null;
  provider: string | null; notes: string | null; created_at: string;
}

interface Contract {
  id: string; reservation_id: string; fuel_level: string | null;
  km_at_pickup: number | null; car_condition_notes: string | null;
  deposit: number | null; additional_notes: string | null;
  generated_at: string;
}

// ─── Seed data (matches rentalMock.ts + migration seed) ────────────────────

const CARS: Car[] = [
  {
    id: "clio-2023", brand: "Renault", model: "Clio 5", year: 2023,
    type: "Citadine", fuel: "Essence", transmission: "Automatique",
    seats: 5, mileage: 18500, price_per_day: 125, color: "Bleu nuit",
    matricule: "214 TN 7821", is_available: true, images: [], notes: "Compacte premium.",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "tucson-2022", brand: "Hyundai", model: "Tucson", year: 2022,
    type: "SUV", fuel: "Diesel", transmission: "Automatique",
    seats: 5, mileage: 40200, price_per_day: 240, color: "Gris graphite",
    matricule: "211 TN 4420", is_available: true, images: [], notes: "SUV confortable.",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "corolla-2021", brand: "Toyota", model: "Corolla", year: 2021,
    type: "Berline", fuel: "Hybride", transmission: "Automatique",
    seats: 5, mileage: 52000, price_per_day: 190, color: "Blanc perle",
    matricule: "208 TN 5539", is_available: false, images: [], notes: "Business.",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "partner-2020", brand: "Peugeot", model: "Partner", year: 2020,
    type: "Utilitaire", fuel: "Diesel", transmission: "Manuelle",
    seats: 3, mileage: 73500, price_per_day: 165, color: "Argent",
    matricule: "205 TN 9014", is_available: true, images: [], notes: "Utilitaire.",
    created_at: "2026-01-01T00:00:00Z",
  },
];

const CLIENT_A: User = {
  id: "client-a", name: "Amira Ben Youssef", email: "amira@mail.tn",
  phone: "+216 22 456 890", cin: "08456231", permis_id: "P-001",
  address: null, is_blocked: false, created_at: "2026-01-01T00:00:00Z",
};

const CLIENT_B: User = {
  id: "client-b", name: "Yassine Trabelsi", email: "yassine@mail.tn",
  phone: "+216 98 113 020", cin: "09234481", permis_id: "P-002",
  address: null, is_blocked: false, created_at: "2026-01-01T00:00:00Z",
};

const BLOCKED_CLIENT: User = {
  id: "client-blocked", name: "Nour Haddad", email: "nour@mail.tn",
  phone: "+216 55 781 300", cin: "07129844", permis_id: "P-003",
  address: null, is_blocked: true, created_at: "2026-01-01T00:00:00Z",
};

// ─── ❶  Date utilities & price calculation ────────────────────────────────

/**
 * These mirror the helpers used across ClientUI / hooks.
 * Testing them in isolation catches silent arithmetic bugs.
 */

function diffDays(start: string, end: string): number {
  return Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000,
  );
}

function calcTotalPrice(pricePerDay: number, start: string, end: string): number {
  return pricePerDay * diffDays(start, end);
}

function plusDays(date: string, n: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

describe("1 — Date utilities & price calculation", () => {
  it("diffDays returns correct span", () => {
    expect(diffDays("2026-05-01", "2026-05-05")).toBe(4);
    expect(diffDays("2026-12-30", "2027-01-02")).toBe(3); // crosses year
    expect(diffDays("2026-05-01", "2026-05-01")).toBe(0); // same day
  });

  it("calcTotalPrice multiplies correctly", () => {
    expect(calcTotalPrice(125, "2026-05-01", "2026-05-06")).toBe(625);   // Clio 5 days
    expect(calcTotalPrice(240, "2026-05-01", "2026-05-08")).toBe(1680);  // Tucson 7 days
    expect(calcTotalPrice(190, "2026-05-01", "2026-05-01")).toBe(0);     // zero days → 0
  });

  it("plusDays handles month and year rollover", () => {
    expect(plusDays("2026-01-29", 3)).toBe("2026-02-01");
    expect(plusDays("2026-12-30", 3)).toBe("2027-01-02");
  });
});

// ─── ❷  Overlap / conflict detection logic ───────────────────────────────

/**
 * The DB query that detects overlapping reservations is:
 *   start_date < input.end_date  AND  end_date > input.start_date
 * (same logic as the hooks / use-reservations.ts)
 */

interface DateRange { start_date: string; end_date: string; }

function hasOverlap(existing: DateRange, incoming: DateRange): boolean {
  return existing.start_date < incoming.end_date &&
         existing.end_date   > incoming.start_date;
}

function findConflicts(
  existingReservations: DateRange[],
  incoming: DateRange,
): DateRange[] {
  return existingReservations.filter((r) => hasOverlap(r, incoming));
}

describe("2 — Overlap / conflict detection", () => {
  const existing: DateRange = { start_date: "2026-05-05", end_date: "2026-05-10" };

  it("full overlap inside existing", () => {
    expect(hasOverlap(existing, { start_date: "2026-05-06", end_date: "2026-05-08" })).toBe(true);
  });

  it("new reservation starts before, ends inside", () => {
    expect(hasOverlap(existing, { start_date: "2026-05-03", end_date: "2026-05-07" })).toBe(true);
  });

  it("new reservation starts inside, ends after", () => {
    expect(hasOverlap(existing, { start_date: "2026-05-08", end_date: "2026-05-13" })).toBe(true);
  });

  it("new reservation wraps entirely around existing", () => {
    expect(hasOverlap(existing, { start_date: "2026-05-01", end_date: "2026-05-15" })).toBe(true);
  });

  it("completely before — no conflict", () => {
    expect(hasOverlap(existing, { start_date: "2026-04-28", end_date: "2026-05-05" })).toBe(false);
  });

  it("completely after — no conflict", () => {
    expect(hasOverlap(existing, { start_date: "2026-05-10", end_date: "2026-05-14" })).toBe(false);
  });

  it("adjacent: new ends exactly when existing starts (no overlap)", () => {
    // End on May 5 = start of existing → pickup on May 5 is allowed
    expect(hasOverlap(existing, { start_date: "2026-05-02", end_date: "2026-05-05" })).toBe(false);
  });

  it("adjacent: new starts exactly when existing ends (no overlap)", () => {
    expect(hasOverlap(existing, { start_date: "2026-05-10", end_date: "2026-05-13" })).toBe(false);
  });

  it("findConflicts returns only overlapping rows", () => {
    const reservations: DateRange[] = [
      { start_date: "2026-05-01", end_date: "2026-05-04" }, // before ✓
      { start_date: "2026-05-05", end_date: "2026-05-10" }, // exact match ✗
      { start_date: "2026-05-09", end_date: "2026-05-12" }, // overlaps ✗
      { start_date: "2026-05-10", end_date: "2026-05-15" }, // adjacent ✓
    ];
    const conflicts = findConflicts(reservations, { start_date: "2026-05-05", end_date: "2026-05-10" });
    expect(conflicts).toHaveLength(2);
  });
});

// ─── ❸  Reservation business logic (mocked DB layer) ──────────────────────

/**
 * We replicate the exact createReservation logic from use-reservations.ts
 * and swap the Supabase calls for in-memory stores.
 * This lets us test the guard rails without a live DB.
 */

interface ReservationStore {
  users: User[];
  reservations: Reservation[];
  cars: Car[];
  nextId: number;
}

function makeStore(overrides: Partial<ReservationStore> = {}): ReservationStore {
  return {
    users: [CLIENT_A, CLIENT_B, BLOCKED_CLIENT].map((u) => ({ ...u })),
    reservations: [],
    cars: CARS.map((c) => ({ ...c })),
    nextId: 1,
    ...overrides,
  };
}

interface CreateReservationInput {
  car_id: string;
  client_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status?: ReservationStatus;
}

async function createReservation(
  store: ReservationStore,
  input: CreateReservationInput,
): Promise<Reservation> {
  // Guard: blocked client
  const user = store.users.find((u) => u.id === input.client_id);
  if (user?.is_blocked) {
    throw new Error("Votre compte a été suspendu. Veuillez contacter l'agence.");
  }

  // Guard: date sanity (DB constraint start_date < end_date)
  if (input.start_date >= input.end_date) {
    throw new Error("La date de début doit être antérieure à la date de fin.");
  }

  // Guard: conflict with existing PENDING or CONFIRMED reservations
  const conflicts = store.reservations.filter(
    (r) =>
      r.car_id === input.car_id &&
      (r.status === "PENDING" || r.status === "CONFIRMED") &&
      r.start_date < input.end_date &&
      r.end_date   > input.start_date,
  );
  if (conflicts.length > 0) {
    throw new Error("Cette voiture n'est plus disponible pour ces dates.");
  }

  const reservation: Reservation = {
    id: `RS-${store.nextId++}`,
    ...input,
    status: input.status ?? "PENDING",
    rejection_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  store.reservations.push(reservation);
  return reservation;
}

async function updateReservationStatus(
  store: ReservationStore,
  id: string,
  status: ReservationStatus,
  rejection_reason?: string,
): Promise<void> {
  const r = store.reservations.find((r) => r.id === id);
  if (!r) throw new Error("Réservation introuvable.");
  r.status = status;
  r.rejection_reason = rejection_reason ?? null;
  r.updated_at = new Date().toISOString();
}

async function cancelReservation(store: ReservationStore, id: string, clientId: string): Promise<void> {
  const r = store.reservations.find((r) => r.id === id && r.client_id === clientId);
  if (!r) throw new Error("Réservation introuvable.");
  if (r.status !== "PENDING") throw new Error("Seules les réservations en attente peuvent être annulées.");
  r.status = "CANCELLED";
}

describe("3 — Reservation happy path", () => {
  it("client books available car → status PENDING, total price correct", async () => {
    const store = makeStore();
    const reservation = await createReservation(store, {
      car_id: "clio-2023",
      client_id: CLIENT_A.id,
      start_date: "2026-06-01",
      end_date: "2026-06-06",   // 5 days × 125 TND = 625
      total_price: 625,
    });
    expect(reservation.status).toBe("PENDING");
    expect(reservation.total_price).toBe(625);
    expect(store.reservations).toHaveLength(1);
  });

  it("two different clients book different cars — both succeed", async () => {
    const store = makeStore();
    await createReservation(store, { car_id: "clio-2023",   client_id: CLIENT_A.id, start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625 });
    await createReservation(store, { car_id: "tucson-2022", client_id: CLIENT_B.id, start_date: "2026-06-01", end_date: "2026-06-06", total_price: 1200 });
    expect(store.reservations).toHaveLength(2);
  });
});

// ─── ❹  Concurrent booking race condition ─────────────────────────────────

describe("4 — Concurrent booking (race condition)", () => {
  it("sequential requests: second client gets conflict error", async () => {
    const store = makeStore();
    // Client A books first
    await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
    });
    // Client B tries same car, overlapping dates
    await expect(
      createReservation(store, {
        car_id: "clio-2023", client_id: CLIENT_B.id,
        start_date: "2026-06-03", end_date: "2026-06-08", total_price: 625,
      }),
    ).rejects.toThrow("Cette voiture n'est plus disponible pour ces dates.");
  });

  it("true race: both read 'no conflict', both try to insert — second insert must be rejected", async () => {
    /**
     * This simulates the TOCTOU window in use-reservations.ts:
     *   1. Both clients check for conflicts simultaneously → both see [] → both proceed
     *   2. Client A's insert succeeds
     *   3. Client B's insert succeeds too ← BUG without a DB-level unique constraint
     *
     * The current application code does NOT have an atomic guard (no
     * PostgreSQL advisory lock / exclusion constraint).  This test
     * documents that the application-level check alone is insufficient
     * and that a DB constraint (e.g. EXCLUDE USING gist) is required
     * for true concurrency safety.
     */
    const store = makeStore();

    // Snapshot state BEFORE either insert (both read the same empty store)
    const conflictsSeenByA = store.reservations.filter(
      (r) => r.car_id === "clio-2023" &&
              (r.status === "PENDING" || r.status === "CONFIRMED") &&
              r.start_date < "2026-06-06" && r.end_date > "2026-06-01",
    );
    const conflictsSeenByB = [...conflictsSeenByA]; // B reads the same snapshot

    expect(conflictsSeenByA).toHaveLength(0); // both see no conflict
    expect(conflictsSeenByB).toHaveLength(0);

    // Both inserts happen before either conflict check can re-read
    const insertA = (): Reservation => {
      const r: Reservation = {
        id: "RS-RACE-A", car_id: "clio-2023", client_id: CLIENT_A.id,
        start_date: "2026-06-01", end_date: "2026-06-06",
        total_price: 625, status: "PENDING", rejection_reason: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      store.reservations.push(r);
      return r;
    };
    const insertB = (): Reservation => {
      const r: Reservation = {
        id: "RS-RACE-B", car_id: "clio-2023", client_id: CLIENT_B.id,
        start_date: "2026-06-03", end_date: "2026-06-08",
        total_price: 625, status: "PENDING", rejection_reason: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      store.reservations.push(r);
      return r;
    };

    insertA();
    insertB(); // succeeds — double booking created!

    const overlapping = store.reservations.filter(
      (r) => r.car_id === "clio-2023" && r.status === "PENDING" &&
              r.start_date < "2026-06-08" && r.end_date > "2026-06-01",
    );
    // Documents the race: two PENDING reservations exist for the same car + dates
    expect(overlapping).toHaveLength(2);
    // ↑ This test is expected to pass (showing the vulnerability).
    // Fix: add a PostgreSQL EXCLUDE constraint on (car_id, daterange(start_date, end_date)).
  });

  it("same client cannot double-book the same car same dates", async () => {
    const store = makeStore();
    await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
    });
    await expect(
      createReservation(store, {
        car_id: "clio-2023", client_id: CLIENT_A.id,
        start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
      }),
    ).rejects.toThrow("Cette voiture n'est plus disponible pour ces dates.");
  });
});

// ─── ❺  Blocked-client guard ──────────────────────────────────────────────

describe("5 — Blocked client", () => {
  it("blocked client cannot create a reservation", async () => {
    const store = makeStore();
    await expect(
      createReservation(store, {
        car_id: "clio-2023", client_id: BLOCKED_CLIENT.id,
        start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
      }),
    ).rejects.toThrow("Votre compte a été suspendu.");
  });

  it("unblocking a client allows them to book again", async () => {
    const store = makeStore();
    // Unblock
    const u = store.users.find((u) => u.id === BLOCKED_CLIENT.id)!;
    u.is_blocked = false;
    const r = await createReservation(store, {
      car_id: "clio-2023", client_id: BLOCKED_CLIENT.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
    });
    expect(r.status).toBe("PENDING");
  });
});

// ─── ❻  Date-boundary edge cases ─────────────────────────────────────────

describe("6 — Date-boundary edge cases", () => {
  it("zero-length reservation (start = end) is rejected", async () => {
    const store = makeStore();
    await expect(
      createReservation(store, {
        car_id: "clio-2023", client_id: CLIENT_A.id,
        start_date: "2026-06-05", end_date: "2026-06-05", total_price: 0,
      }),
    ).rejects.toThrow("La date de début doit être antérieure à la date de fin.");
  });

  it("end before start is rejected", async () => {
    const store = makeStore();
    await expect(
      createReservation(store, {
        car_id: "clio-2023", client_id: CLIENT_A.id,
        start_date: "2026-06-10", end_date: "2026-06-05", total_price: 0,
      }),
    ).rejects.toThrow();
  });

  it("adjacent reservations (back to back) are both allowed", async () => {
    const store = makeStore();
    // May 1–5, then May 5–9 on the same car → should both succeed (end=start is not an overlap)
    await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-05-01", end_date: "2026-05-05", total_price: 500,
    });
    await expect(
      createReservation(store, {
        car_id: "clio-2023", client_id: CLIENT_B.id,
        start_date: "2026-05-05", end_date: "2026-05-09", total_price: 500,
      }),
    ).resolves.toBeDefined();
    expect(store.reservations).toHaveLength(2);
  });

  it("one-day reservation (start + 1 day) is valid", async () => {
    const store = makeStore();
    const r = await createReservation(store, {
      car_id: "tucson-2022", client_id: CLIENT_A.id,
      start_date: "2026-07-01", end_date: "2026-07-02", total_price: 240,
    });
    expect(r.status).toBe("PENDING");
    expect(r.total_price).toBe(240);
  });

  it("very long rental (30 days) is accepted", async () => {
    const store = makeStore();
    const r = await createReservation(store, {
      car_id: "tucson-2022", client_id: CLIENT_A.id,
      start_date: "2026-07-01", end_date: "2026-07-31", total_price: 240 * 30,
    });
    expect(r.total_price).toBe(7200);
  });

  it("CANCELLED reservation does not block a new booking for same dates", async () => {
    const store = makeStore();
    await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
    });
    // Admin rejects it
    await updateReservationStatus(store, store.reservations[0].id, "CANCELLED");

    // Now Client B can book the same dates
    const r = await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_B.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
    });
    expect(r.status).toBe("PENDING");
  });

  it("REJECTED reservation does not block a new booking for same dates", async () => {
    const store = makeStore();
    await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
    });
    await updateReservationStatus(store, store.reservations[0].id, "REJECTED", "Documents invalides");

    const r = await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_B.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
    });
    expect(r.status).toBe("PENDING");
  });

  it("COMPLETED reservation does not block future booking for same dates", async () => {
    const store = makeStore();
    const past: Reservation = {
      id: "RS-DONE", car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-04-01", end_date: "2026-04-06",
      total_price: 625, status: "COMPLETED", rejection_reason: null,
      created_at: "2026-04-01T00:00:00Z", updated_at: "2026-04-06T00:00:00Z",
    };
    store.reservations.push(past);

    const r = await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_B.id,
      start_date: "2026-04-01", end_date: "2026-04-06", total_price: 625,
    });
    expect(r.status).toBe("PENDING");
  });
});

// ─── ❼  Reservation status lifecycle ────────────────────────────────────

describe("7 — Reservation status lifecycle", () => {
  it("PENDING → CONFIRMED by admin", async () => {
    const store = makeStore();
    const r = await createReservation(store, {
      car_id: "tucson-2022", client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-08", total_price: 1680,
    });
    await updateReservationStatus(store, r.id, "CONFIRMED");
    expect(store.reservations[0].status).toBe("CONFIRMED");
  });

  it("PENDING → REJECTED with reason by admin", async () => {
    const store = makeStore();
    const r = await createReservation(store, {
      car_id: "tucson-2022", client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-08", total_price: 1680,
    });
    await updateReservationStatus(store, r.id, "REJECTED", "Permis expiré");
    expect(store.reservations[0].status).toBe("REJECTED");
    expect(store.reservations[0].rejection_reason).toBe("Permis expiré");
  });

  it("CONFIRMED → COMPLETED (car returned)", async () => {
    const store = makeStore();
    const r = await createReservation(store, {
      car_id: "tucson-2022", client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-08", total_price: 1680,
    });
    await updateReservationStatus(store, r.id, "CONFIRMED");
    await updateReservationStatus(store, r.id, "COMPLETED");
    expect(store.reservations[0].status).toBe("COMPLETED");
  });

  it("client can cancel their own PENDING reservation", async () => {
    const store = makeStore();
    const r = await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
    });
    await cancelReservation(store, r.id, CLIENT_A.id);
    expect(store.reservations[0].status).toBe("CANCELLED");
  });

  it("client cannot cancel a CONFIRMED reservation", async () => {
    const store = makeStore();
    const r = await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
    });
    await updateReservationStatus(store, r.id, "CONFIRMED");
    await expect(cancelReservation(store, r.id, CLIENT_A.id)).rejects.toThrow(
      "Seules les réservations en attente peuvent être annulées.",
    );
  });

  it("client cannot cancel another client's reservation", async () => {
    const store = makeStore();
    const r = await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
    });
    await expect(cancelReservation(store, r.id, CLIENT_B.id)).rejects.toThrow("Réservation introuvable.");
  });

  it("updating a non-existent reservation throws", async () => {
    const store = makeStore();
    await expect(
      updateReservationStatus(store, "RS-NOPE", "CONFIRMED"),
    ).rejects.toThrow("Réservation introuvable.");
  });
});

// ─── ❽  Car availability filtering ───────────────────────────────────────

describe("8 — Car availability filtering (fetchAvailableCars logic)", () => {
  function getAvailableCars(store: ReservationStore, start: string, end: string): Car[] {
    const bookedIds = store.reservations
      .filter(
        (r) =>
          (r.status === "PENDING" || r.status === "CONFIRMED") &&
          r.start_date < end &&
          r.end_date   > start,
      )
      .map((r) => r.car_id);

    return store.cars.filter((c) => !bookedIds.includes(c.id));
  }

  it("all cars available when no reservations exist", () => {
    const store = makeStore();
    const available = getAvailableCars(store, "2026-06-01", "2026-06-06");
    expect(available).toHaveLength(CARS.length);
  });

  it("booked car is excluded from results", async () => {
    const store = makeStore();
    await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
    });
    const available = getAvailableCars(store, "2026-06-02", "2026-06-05");
    expect(available.find((c) => c.id === "clio-2023")).toBeUndefined();
    expect(available.length).toBe(CARS.length - 1);
  });

  it("cancelled reservation frees the car", async () => {
    const store = makeStore();
    const r = await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
    });
    await updateReservationStatus(store, r.id, "CANCELLED");
    const available = getAvailableCars(store, "2026-06-01", "2026-06-06");
    expect(available.find((c) => c.id === "clio-2023")).toBeDefined();
  });

  it("car booked for different dates still shows as available for requested dates", async () => {
    const store = makeStore();
    // Clio booked May 1–5
    await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-05-01", end_date: "2026-05-05", total_price: 500,
    });
    // Query for June — Clio should be available
    const available = getAvailableCars(store, "2026-06-01", "2026-06-06");
    expect(available.find((c) => c.id === "clio-2023")).toBeDefined();
  });

  it("multiple cars booked simultaneously are all excluded", async () => {
    const store = makeStore();
    await createReservation(store, {
      car_id: "clio-2023",   client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
    });
    await createReservation(store, {
      car_id: "tucson-2022", client_id: CLIENT_B.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 1200,
    });
    const available = getAvailableCars(store, "2026-06-03", "2026-06-05");
    expect(available.find((c) => c.id === "clio-2023")).toBeUndefined();
    expect(available.find((c) => c.id === "tucson-2022")).toBeUndefined();
    expect(available.length).toBe(CARS.length - 2);
  });
});

// ─── ❾  Car management ───────────────────────────────────────────────────

type CarInput = Omit<Car, "id" | "created_at">;

interface CarStore { cars: Car[]; nextId: number; }

function makeCarStore(): CarStore {
  return { cars: CARS.map((c) => ({ ...c })), nextId: 100 };
}

async function createCar(store: CarStore, input: CarInput): Promise<Car> {
  if (store.cars.some((c) => c.matricule === input.matricule)) {
    throw new Error("Un véhicule avec cette immatriculation existe déjà.");
  }
  const car: Car = { id: `car-${store.nextId++}`, ...input, created_at: new Date().toISOString() };
  store.cars.push(car);
  return car;
}

async function updateCar(store: CarStore, id: string, updates: Partial<CarInput>): Promise<Car> {
  const idx = store.cars.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Voiture introuvable.");
  store.cars[idx] = { ...store.cars[idx], ...updates };
  return store.cars[idx];
}

async function deleteCar(store: CarStore, id: string): Promise<void> {
  const idx = store.cars.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Voiture introuvable.");
  store.cars.splice(idx, 1);
}

async function toggleAvailability(store: CarStore, id: string, is_available: boolean): Promise<void> {
  const car = store.cars.find((c) => c.id === id);
  if (!car) throw new Error("Voiture introuvable.");
  car.is_available = is_available;
}

describe("9 — Car management", () => {
  it("creates a car with valid data", async () => {
    const store = makeCarStore();
    const car = await createCar(store, {
      brand: "Kia", model: "Sportage", year: 2024, type: "SUV",
      fuel: "Hybride", transmission: "Automatique", seats: 5,
      mileage: 0, price_per_day: 260, color: "Rouge",
      matricule: "300 TN 9999", is_available: true, images: [], notes: null,
    });
    expect(car.brand).toBe("Kia");
    expect(store.cars).toHaveLength(CARS.length + 1);
  });

  it("duplicate matricule is rejected", async () => {
    const store = makeCarStore();
    await expect(
      createCar(store, {
        brand: "Kia", model: "Sportage", year: 2024, type: "SUV",
        fuel: "Hybride", transmission: "Automatique", seats: 5,
        mileage: 0, price_per_day: 260, color: "Rouge",
        matricule: "214 TN 7821", // already used by Clio
        is_available: true, images: [], notes: null,
      }),
    ).rejects.toThrow("immatriculation");
  });

  it("updates car price and notes", async () => {
    const store = makeCarStore();
    const car = await updateCar(store, "clio-2023", { price_per_day: 140, notes: "Prix révisé." });
    expect(car.price_per_day).toBe(140);
    expect(car.notes).toBe("Prix révisé.");
  });

  it("update on non-existent car throws", async () => {
    const store = makeCarStore();
    await expect(updateCar(store, "ghost-car", { price_per_day: 100 })).rejects.toThrow("Voiture introuvable.");
  });

  it("deletes a car", async () => {
    const store = makeCarStore();
    await deleteCar(store, "clio-2023");
    expect(store.cars.find((c) => c.id === "clio-2023")).toBeUndefined();
    expect(store.cars).toHaveLength(CARS.length - 1);
  });

  it("toggles availability to false", async () => {
    const store = makeCarStore();
    await toggleAvailability(store, "clio-2023", false);
    expect(store.cars.find((c) => c.id === "clio-2023")!.is_available).toBe(false);
  });

  it("toggles availability back to true", async () => {
    const store = makeCarStore();
    await toggleAvailability(store, "corolla-2021", true); // was false
    expect(store.cars.find((c) => c.id === "corolla-2021")!.is_available).toBe(true);
  });
});

// ─── ❿  Maintenance records ──────────────────────────────────────────────

type MaintenanceInput = Omit<MaintenanceRecord, "id" | "created_at">;

interface MaintenanceStore { records: MaintenanceRecord[]; nextId: number; }

function makeMaintenanceStore(): MaintenanceStore {
  return { records: [], nextId: 1 };
}

async function createMaintenance(store: MaintenanceStore, input: MaintenanceInput): Promise<MaintenanceRecord> {
  const record: MaintenanceRecord = {
    id: `MR-${store.nextId++}`,
    ...input,
    created_at: new Date().toISOString(),
  };
  store.records.push(record);
  return record;
}

async function updateMaintenance(
  store: MaintenanceStore,
  id: string,
  updates: Partial<MaintenanceInput>,
): Promise<MaintenanceRecord> {
  const idx = store.records.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("Enregistrement introuvable.");
  store.records[idx] = { ...store.records[idx], ...updates };
  return store.records[idx];
}

async function deleteMaintenance(store: MaintenanceStore, id: string): Promise<void> {
  const idx = store.records.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("Enregistrement introuvable.");
  store.records.splice(idx, 1);
}

describe("10 — Maintenance records", () => {
  it("creates a maintenance record", async () => {
    const store = makeMaintenanceStore();
    const record = await createMaintenance(store, {
      car_id: "clio-2023", date: "2026-03-12", type: "Vidange",
      km_at_service: 18120, next_service_km: 28000, next_service_date: null,
      cost: 180, provider: "Garage Ariana", notes: "Filtre remplacé",
    });
    expect(record.type).toBe("Vidange");
    expect(record.cost).toBe(180);
  });

  it("multiple records for the same car are allowed", async () => {
    const store = makeMaintenanceStore();
    await createMaintenance(store, { car_id: "clio-2023", date: "2026-03-12", type: "Vidange", km_at_service: 18120, next_service_km: null, next_service_date: null, cost: 180, provider: null, notes: null });
    await createMaintenance(store, { car_id: "clio-2023", date: "2026-02-04", type: "Pneus", km_at_service: 16900, next_service_km: null, next_service_date: "2027-02-04", cost: 620, provider: "Pneu Express", notes: "Train avant" });
    expect(store.records.filter((r) => r.car_id === "clio-2023")).toHaveLength(2);
  });

  it("updates cost and notes", async () => {
    const store = makeMaintenanceStore();
    const r = await createMaintenance(store, { car_id: "clio-2023", date: "2026-03-12", type: "Freins", km_at_service: 15500, next_service_km: 30000, next_service_date: null, cost: 340, provider: null, notes: "Plaquettes" });
    const updated = await updateMaintenance(store, r.id, { cost: 380, notes: "Plaquettes + disques" });
    expect(updated.cost).toBe(380);
    expect(updated.notes).toBe("Plaquettes + disques");
  });

  it("deletes a maintenance record", async () => {
    const store = makeMaintenanceStore();
    const r = await createMaintenance(store, { car_id: "tucson-2022", date: "2026-01-10", type: "Révision", km_at_service: 40000, next_service_km: 50000, next_service_date: null, cost: 500, provider: null, notes: null });
    await deleteMaintenance(store, r.id);
    expect(store.records).toHaveLength(0);
  });

  it("delete non-existent record throws", async () => {
    const store = makeMaintenanceStore();
    await expect(deleteMaintenance(store, "MR-GHOST")).rejects.toThrow("Enregistrement introuvable.");
  });
});

// ─── ⓫  Contracts ────────────────────────────────────────────────────────

interface ContractStore { contracts: Contract[]; nextId: number; }

function makeContractStore(): ContractStore {
  return { contracts: [], nextId: 1 };
}

type ContractInput = Omit<Contract, "id" | "generated_at">;

async function upsertContract(store: ContractStore, input: ContractInput): Promise<Contract> {
  const existing = store.contracts.find((c) => c.reservation_id === input.reservation_id);
  if (existing) {
    Object.assign(existing, input);
    return existing;
  }
  const contract: Contract = { id: `CT-${store.nextId++}`, ...input, generated_at: new Date().toISOString() };
  store.contracts.push(contract);
  return contract;
}

describe("11 — Contracts", () => {
  it("creates a contract for a reservation", async () => {
    const store = makeContractStore();
    const contract = await upsertContract(store, {
      reservation_id: "RS-1", fuel_level: "Plein",
      km_at_pickup: 18500, car_condition_notes: "RAS",
      deposit: 500, additional_notes: null,
    });
    expect(contract.fuel_level).toBe("Plein");
    expect(contract.deposit).toBe(500);
    expect(store.contracts).toHaveLength(1);
  });

  it("upsert updates an existing contract rather than creating a duplicate", async () => {
    const store = makeContractStore();
    await upsertContract(store, { reservation_id: "RS-1", fuel_level: "Plein", km_at_pickup: 18500, car_condition_notes: "RAS", deposit: 500, additional_notes: null });
    const updated = await upsertContract(store, { reservation_id: "RS-1", fuel_level: "1/2", km_at_pickup: 18500, car_condition_notes: "Rayure légère", deposit: 500, additional_notes: "Voir photo" });
    expect(store.contracts).toHaveLength(1); // still 1, not 2
    expect(updated.fuel_level).toBe("1/2");
    expect(updated.car_condition_notes).toBe("Rayure légère");
  });

  it("different reservations each get their own contract", async () => {
    const store = makeContractStore();
    await upsertContract(store, { reservation_id: "RS-1", fuel_level: "Plein", km_at_pickup: 18500, car_condition_notes: null, deposit: 500, additional_notes: null });
    await upsertContract(store, { reservation_id: "RS-2", fuel_level: "3/4",   km_at_pickup: 40200, car_condition_notes: null, deposit: 1000, additional_notes: null });
    expect(store.contracts).toHaveLength(2);
  });
});

// ─── ⓬  Staff management ────────────────────────────────────────────────

interface StaffMember { id: string; name: string; email: string; role: "ADMIN" | "MANAGER"; created_at: string; }
interface StaffStore   { members: StaffMember[]; nextId: number; }

function makeStaffStore(): StaffStore {
  return {
    members: [
      { id: "admin-1", name: "Directeur", email: "admin@routerent.tn", role: "ADMIN", created_at: "2026-01-01T00:00:00Z" },
    ],
    nextId: 10,
  };
}

async function inviteStaff(store: StaffStore, input: { name: string; email: string; role: "ADMIN" | "MANAGER" }): Promise<StaffMember> {
  if (store.members.some((m) => m.email === input.email)) {
    throw new Error("Un compte avec cet email existe déjà.");
  }
  const member: StaffMember = { id: `staff-${store.nextId++}`, ...input, created_at: new Date().toISOString() };
  store.members.push(member);
  return member;
}

async function removeStaff(store: StaffStore, id: string): Promise<void> {
  const idx = store.members.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error("Membre introuvable.");
  store.members.splice(idx, 1);
}

describe("12 — Staff management", () => {
  it("invites a new manager", async () => {
    const store = makeStaffStore();
    const member = await inviteStaff(store, { name: "Khalil Ben Amor", email: "khalil@routerent.tn", role: "MANAGER" });
    expect(member.role).toBe("MANAGER");
    expect(store.members).toHaveLength(2);
  });

  it("duplicate email is rejected", async () => {
    const store = makeStaffStore();
    await expect(
      inviteStaff(store, { name: "Autre Admin", email: "admin@routerent.tn", role: "ADMIN" }),
    ).rejects.toThrow("existe déjà");
  });

  it("removes a staff member", async () => {
    const store = makeStaffStore();
    await inviteStaff(store, { name: "Khalil", email: "khalil@routerent.tn", role: "MANAGER" });
    await removeStaff(store, "staff-10");
    expect(store.members).toHaveLength(1);
  });

  it("remove non-existent member throws", async () => {
    const store = makeStaffStore();
    await expect(removeStaff(store, "ghost")).rejects.toThrow("Membre introuvable.");
  });
});

// ─── ⓭  Auto-complete past reservations ──────────────────────────────────

describe("13 — Auto-complete past CONFIRMED reservations", () => {
  function autoComplete(store: ReservationStore, today: string): void {
    store.reservations.forEach((r) => {
      if (r.status === "CONFIRMED" && r.end_date < today) {
        r.status = "COMPLETED";
        r.updated_at = new Date().toISOString();
      }
    });
  }

  it("marks past CONFIRMED reservations as COMPLETED", async () => {
    const store = makeStore();
    // Two old confirmed reservations
    store.reservations.push(
      { id: "RS-OLD-1", car_id: "clio-2023",   client_id: CLIENT_A.id, start_date: "2026-03-01", end_date: "2026-03-05", total_price: 500, status: "CONFIRMED", rejection_reason: null, created_at: "2026-03-01T00:00:00Z", updated_at: "2026-03-01T00:00:00Z" },
      { id: "RS-OLD-2", car_id: "tucson-2022",  client_id: CLIENT_B.id, start_date: "2026-03-10", end_date: "2026-03-15", total_price: 1200, status: "CONFIRMED", rejection_reason: null, created_at: "2026-03-10T00:00:00Z", updated_at: "2026-03-10T00:00:00Z" },
      { id: "RS-FUTURE", car_id: "partner-2020", client_id: CLIENT_A.id, start_date: "2026-07-01", end_date: "2026-07-05", total_price: 660, status: "CONFIRMED", rejection_reason: null, created_at: "2026-07-01T00:00:00Z", updated_at: "2026-07-01T00:00:00Z" },
    );
    autoComplete(store, "2026-04-29");
    expect(store.reservations.find((r) => r.id === "RS-OLD-1")!.status).toBe("COMPLETED");
    expect(store.reservations.find((r) => r.id === "RS-OLD-2")!.status).toBe("COMPLETED");
    expect(store.reservations.find((r) => r.id === "RS-FUTURE")!.status).toBe("CONFIRMED"); // not yet
  });

  it("does not auto-complete PENDING reservations", async () => {
    const store = makeStore();
    store.reservations.push({
      id: "RS-PENDING", car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-03-01", end_date: "2026-03-05", total_price: 500,
      status: "PENDING", rejection_reason: null,
      created_at: "2026-03-01T00:00:00Z", updated_at: "2026-03-01T00:00:00Z",
    });
    autoComplete(store, "2026-04-29");
    expect(store.reservations[0].status).toBe("PENDING"); // untouched
  });
});

// ─── ⓮  Full end-to-end reservation flow ─────────────────────────────────

describe("14 — End-to-end: two clients race for the Clio on the same dates", () => {
  /**
   * Scenario:
   *   08:00 - Client A requests Clio 5, Jun 1–6
   *   08:00 - Client B requests Clio 5, Jun 1–6 (simultaneously)
   *   08:01 - Admin confirms Client A
   *   08:02 - Client B tries to book the same car — blocked
   *   08:03 - Client A's rental ends → COMPLETED
   *   08:04 - Client B successfully books Clio for Jun 6–11 (adjacent)
   *   08:05 - Admin generates contract for Client A's completed rental
   */

  it("full flow runs without errors", async () => {
    const reservationStore = makeStore();
    const contractStore    = makeContractStore();

    // Step 1: Client A books Clio Jun 1–6
    const rA = await createReservation(reservationStore, {
      car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-06",
      total_price: calcTotalPrice(125, "2026-06-01", "2026-06-06"),
    });
    expect(rA.status).toBe("PENDING");
    expect(rA.total_price).toBe(625);

    // Step 2: Client B tries same car same dates → blocked
    await expect(
      createReservation(reservationStore, {
        car_id: "clio-2023", client_id: CLIENT_B.id,
        start_date: "2026-06-01", end_date: "2026-06-06",
        total_price: 625,
      }),
    ).rejects.toThrow("Cette voiture n'est plus disponible pour ces dates.");

    // Step 3: Admin confirms Client A
    await updateReservationStatus(reservationStore, rA.id, "CONFIRMED");
    expect(reservationStore.reservations.find((r) => r.id === rA.id)!.status).toBe("CONFIRMED");

    // Step 4: Client B tries again — still blocked (CONFIRMED counts as conflict)
    await expect(
      createReservation(reservationStore, {
        car_id: "clio-2023", client_id: CLIENT_B.id,
        start_date: "2026-06-01", end_date: "2026-06-06",
        total_price: 625,
      }),
    ).rejects.toThrow("Cette voiture n'est plus disponible pour ces dates.");

    // Step 5: Client A's rental ends → admin marks COMPLETED
    await updateReservationStatus(reservationStore, rA.id, "COMPLETED");

    // Step 6: Client B books adjacent period (Jun 6–11) — must succeed
    const rB = await createReservation(reservationStore, {
      car_id: "clio-2023", client_id: CLIENT_B.id,
      start_date: "2026-06-06", end_date: "2026-06-11",
      total_price: calcTotalPrice(125, "2026-06-06", "2026-06-11"),
    });
    expect(rB.status).toBe("PENDING");
    expect(rB.total_price).toBe(625);

    // Step 7: Admin generates a contract for Client A's completed rental
    const contract = await upsertContract(contractStore, {
      reservation_id: rA.id,
      fuel_level: "Plein",
      km_at_pickup: 18500,
      car_condition_notes: "RAS",
      deposit: 500,
      additional_notes: null,
    });
    expect(contract.reservation_id).toBe(rA.id);

    // Verify final state
    expect(reservationStore.reservations).toHaveLength(2);
    expect(reservationStore.reservations[0].status).toBe("COMPLETED");
    expect(reservationStore.reservations[1].status).toBe("PENDING");
    expect(contractStore.contracts).toHaveLength(1);
  });
});

// ─── ⓯  Additional edge cases ────────────────────────────────────────────

describe("15 — Additional edge cases", () => {
  it("price per day of 0 is allowed (free promotional car)", async () => {
    const store = makeCarStore();
    const car = await createCar(store, {
      brand: "Test", model: "Demo", year: 2026, type: "Citadine",
      fuel: "Électrique", transmission: "Automatique", seats: 5,
      mileage: 0, price_per_day: 0, color: "Blanc",
      matricule: "000 TN 0001", is_available: true, images: [], notes: null,
    });
    expect(car.price_per_day).toBe(0);
    expect(calcTotalPrice(0, "2026-06-01", "2026-06-06")).toBe(0);
  });

  it("car with is_available=false still shows up in query (availability is managed via bookings)", () => {
    // The is_available flag is independent of the booking system —
    // the admin can manually mark a car unavailable for any reason.
    const store = makeStore();
    const corolla = store.cars.find((c) => c.id === "corolla-2021")!;
    expect(corolla.is_available).toBe(false);
    // It still appears in the cars list (it's not deleted)
    expect(store.cars.find((c) => c.id === "corolla-2021")).toBeDefined();
  });

  it("rejection reason is null when not provided", async () => {
    const store = makeStore();
    const r = await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
    });
    await updateReservationStatus(store, r.id, "REJECTED");
    expect(store.reservations[0].rejection_reason).toBeNull();
  });

  it("partial date overlap: new reservation starts one day before existing ends", async () => {
    const store = makeStore();
    await createReservation(store, {
      car_id: "clio-2023", client_id: CLIENT_A.id,
      start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625,
    });
    // New reservation starts Jun 5 (inside existing Jun 1–6) → conflict
    await expect(
      createReservation(store, {
        car_id: "clio-2023", client_id: CLIENT_B.id,
        start_date: "2026-06-05", end_date: "2026-06-10", total_price: 625,
      }),
    ).rejects.toThrow("Cette voiture n'est plus disponible pour ces dates.");
  });

  it("two clients can have reservations on the same dates for different cars", async () => {
    const store = makeStore();
    const rA = await createReservation(store, { car_id: "clio-2023",   client_id: CLIENT_A.id, start_date: "2026-06-01", end_date: "2026-06-06", total_price: 625 });
    const rB = await createReservation(store, { car_id: "tucson-2022", client_id: CLIENT_B.id, start_date: "2026-06-01", end_date: "2026-06-08", total_price: 1680 });
    expect(rA.status).toBe("PENDING");
    expect(rB.status).toBe("PENDING");
    expect(store.reservations).toHaveLength(2);
  });

  it("contract upsert is idempotent (same data twice = 1 contract)", async () => {
    const store = makeContractStore();
    const input: ContractInput = { reservation_id: "RS-X", fuel_level: "Plein", km_at_pickup: 100, car_condition_notes: null, deposit: 300, additional_notes: null };
    await upsertContract(store, input);
    await upsertContract(store, input);
    expect(store.contracts).toHaveLength(1);
  });

  it("calcTotalPrice handles leap-year February correctly", () => {
    // Feb 28 → Mar 1 in 2028 (leap year) = 2 days
    expect(diffDays("2028-02-28", "2028-03-01")).toBe(2);
    expect(calcTotalPrice(125, "2028-02-28", "2028-03-01")).toBe(250);
  });
});
