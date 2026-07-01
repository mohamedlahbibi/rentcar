import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Link, useLocation, useParams } from "react-router-dom";
import { BarChart3, Bell, Calendar, Car, Check, ChevronLeft, ChevronRight, Copy, Download, FileText, GripVertical, LayoutDashboard, LogOut, Plus, Trash2, UserCog, Users, Wrench, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAllCars, useCar, useCreateCar, useDeleteCar, useToggleAvailability, useUpdateCar } from "@/hooks/use-cars";
import { useCreateMaintenance, useDeleteMaintenance, useMaintenanceRecords, useUpdateMaintenance } from "@/hooks/use-maintenance";
import { useAdminCreateReservation, useAllClients, useAllReservations, useAutoCompleteReservations, useCreateClient, useMyReservations, useReservation, useToggleBlockClient, useUpdateProfile, useUpdateReservationStatus, useUserProfile } from "@/hooks/use-reservations";
import type { ReservationWithDetails } from "@/hooks/use-reservations";
import { useContract, useUpsertContract } from "@/hooks/use-contracts";
import { useAllStaff, useInviteStaff, useRemoveStaff } from "@/hooks/use-staff";
import { useAgencySettings, useUpdateReturnHour } from "@/hooks/use-settings";
import { useAuth } from "@/lib/auth";
import type { Car, CarType, Contract, FuelType, ReservationStatus, Transmission } from "@/types/database";

const nav: Array<[string, string, LucideIcon]> = [
  ["Dashboard", "/admin", LayoutDashboard], ["Cars", "/admin/cars", Car], ["Reservations", "/admin/reservations", Bell], ["Clients", "/admin/clients", Users], ["Managers", "/admin/managers", UserCog],
];

function AdminShell({ title, children, onNew }: { title: string; children: React.ReactNode; onNew?: () => void }) {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-[#0F172A] p-5 lg:flex">
        <Link to="/" className="mb-8 flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-sm font-black text-white">D</span>
          <span className="text-base font-bold tracking-tight text-white">DriveEasy CRM</span>
        </Link>
        <nav className="flex-1 space-y-0.5">
          {nav.map(([label, href, Icon]) => {
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link key={label} to={href} className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition ${active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/60 hover:text-white"}`}>
                {active && <span className="absolute left-0 inset-y-2 w-0.5 rounded-full bg-blue-500" />}
                <Icon className="size-4 shrink-0" />{label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 pt-4">
          <p className="mb-2 truncate px-3 text-xs text-slate-500">{user?.email}</p>
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="size-4" />Déconnexion
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6 lg:p-8">
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Administration</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{title}</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="admin"><Link to="/">Site client</Link></Button>
            {onNew && <Button variant="hero" onClick={onNew}><Plus className="size-4" />Nouveau</Button>}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <Card className={`border border-slate-200 bg-white text-slate-900 shadow-sm ${className}`}>{children}</Card>; }

// ─── Car form ──────────────────────────────────────────────────────────────

type CarFormState = Omit<Car, "id" | "created_at">;

const CAR_TYPES: CarType[] = ["Citadine", "SUV", "Berline", "Utilitaire"];
const FUEL_TYPES: FuelType[] = ["Essence", "Diesel", "Électrique", "Hybride"];
const TRANSMISSIONS: Transmission[] = ["Manuelle", "Automatique"];

function defaultForm(): CarFormState {
  return {
    brand: "", model: "", year: new Date().getFullYear(),
    matricule: "", type: "Citadine", fuel: "Essence",
    transmission: "Manuelle", seats: 5, mileage: 0,
    price_per_day: 0, color: "", notes: "", is_available: true, images: [],
  };
}

function CarDialog({
  open,
  onOpenChange,
  car,
  prefill,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  car: Car | null;
  prefill?: CarFormState | null;
  onSubmit: (form: CarFormState, files: File[]) => Promise<void>;
  loading: boolean;
}) {
  const [form, setForm] = useState<CarFormState>(defaultForm());
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [confirmDeleteImg, setConfirmDeleteImg] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setForm(car
        ? { brand: car.brand, model: car.model, year: car.year, matricule: car.matricule, type: car.type, fuel: car.fuel, transmission: car.transmission, seats: car.seats, mileage: car.mileage, price_per_day: car.price_per_day, color: car.color, notes: car.notes ?? "", is_available: car.is_available, images: car.images }
        : prefill ?? defaultForm()
      );
      setFiles([]);
      setPreviews([]);
      setDragIdx(null);
    }
  }, [open, car, prefill]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function set<K extends keyof CarFormState>(k: K, v: CarFormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function removeExisting(idx: number) {
    set("images", form.images.filter((_, i) => i !== idx));
    setConfirmDeleteImg(null);
  }

  function removeNew(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveImage(from: number, to: number) {
    const imgs = [...form.images];
    const [item] = imgs.splice(from, 1);
    imgs.splice(to, 0, item);
    set("images", imgs);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form, files);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{car ? "Modifier la voiture" : "Ajouter une voiture"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Marque</Label>
              <Input required value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Renault" />
            </div>
            <div className="grid gap-1.5">
              <Label>Modèle</Label>
              <Input required value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Clio 5" />
            </div>
            <div className="grid gap-1.5">
              <Label>Année</Label>
              <Input required type="number" min={2000} max={2030} value={form.year} onChange={(e) => set("year", Number(e.target.value))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Matricule</Label>
              <Input required value={form.matricule} onChange={(e) => set("matricule", e.target.value)} placeholder="214 TN 7821" />
            </div>
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v as CarType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CAR_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Carburant</Label>
              <Select value={form.fuel} onValueChange={(v) => set("fuel", v as FuelType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FUEL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Transmission</Label>
              <Select value={form.transmission} onValueChange={(v) => set("transmission", v as Transmission)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TRANSMISSIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Sièges</Label>
              <Input type="number" min={1} max={9} value={form.seats} onChange={(e) => set("seats", Number(e.target.value))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Kilométrage (km)</Label>
              <Input type="number" min={0} value={form.mileage} onChange={(e) => set("mileage", Number(e.target.value))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Prix / jour (TND)</Label>
              <Input required type="number" min={0} value={form.price_per_day} onChange={(e) => set("price_per_day", Number(e.target.value))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Couleur</Label>
              <Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="Bleu nuit" />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Switch id="avail" checked={form.is_available} onCheckedChange={(v) => set("is_available", v)} />
              <Label htmlFor="avail">Disponible</Label>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>

          {/* Image management */}
          <div className="grid gap-2">
            <Label>Photos</Label>

            {/* Existing images — draggable to reorder */}
            {form.images.length > 0 && (
              <div className="grid gap-1.5">
                <p className="text-xs text-muted-foreground">Images actuelles · glisser pour réordonner — la première est la photo de couverture</p>
                <div className="flex flex-wrap gap-3">
                  {form.images.map((url, idx) => (
                    <div
                      key={url}
                      draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragIdx !== null && dragIdx !== idx) moveImage(dragIdx, idx); setDragIdx(null); }}
                      onDragEnd={() => setDragIdx(null)}
                      className={`group relative h-36 w-36 shrink-0 cursor-grab overflow-hidden rounded-lg border-2 transition-opacity ${dragIdx === idx ? "opacity-40" : "opacity-100"} ${idx === 0 ? "border-secondary" : "border-border"}`}
                      onClick={() => setLightboxUrl(url)}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-secondary-foreground">COUVERTURE</span>
                      )}
                      <div className="absolute left-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <GripVertical className="size-4 text-white drop-shadow" />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteImg(idx); }}
                        className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New file previews */}
            {previews.length > 0 && (
              <div className="grid gap-1.5">
                <p className="text-xs text-muted-foreground">Nouvelles photos ({previews.length})</p>
                <div className="flex flex-wrap gap-3">
                  {previews.map((url, idx) => (
                    <div
                      key={url}
                      className="group relative h-36 w-36 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border"
                      onClick={() => setLightboxUrl(url)}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeNew(idx); }}
                        className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" variant="hero" disabled={loading}>{loading ? "Enregistrement…" : car ? "Sauvegarder" : "Ajouter"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <Dialog open={!!lightboxUrl} onOpenChange={(o) => { if (!o) setLightboxUrl(null); }}>
        <DialogContent className="max-w-3xl border-0 bg-transparent p-0 shadow-none [&>button:last-child]:hidden">
          {lightboxUrl && (
            <div className="relative">
              <img src={lightboxUrl} alt="" className="max-h-[80vh] w-full rounded-xl object-contain" />
              <DialogClose className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80">
                <X className="size-4" />
              </DialogClose>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteImg !== null} onOpenChange={(o) => { if (!o) setConfirmDeleteImg(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette photo ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action sera appliquée à la sauvegarde. Elle ne peut pas être annulée.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => confirmDeleteImg !== null && removeExisting(confirmDeleteImg)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

// ─── Shared constants ──────────────────────────────────────────────────────

const STATUS_LABELS: Record<ReservationStatus, { label: string; cls: string; bar: string }> = {
  PENDING:   { label: "En attente", cls: "bg-amber-50 text-amber-700 border border-amber-200",     bar: "bg-amber-400" },
  CONFIRMED: { label: "Confirmée",  cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", bar: "bg-emerald-500" },
  REJECTED:  { label: "Refusée",    cls: "bg-red-50 text-red-600 border border-red-200",           bar: "bg-red-400" },
  COMPLETED: { label: "Terminée",   cls: "bg-slate-100 text-slate-600 border border-slate-200",    bar: "bg-slate-400" },
  CANCELLED: { label: "Annulée",    cls: "bg-slate-100 text-slate-600 border border-slate-200",    bar: "bg-slate-300" },
};

const ALL_STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED", "REJECTED", "COMPLETED", "CANCELLED"];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-TN", { day: "numeric", month: "short" });
}

// ─── Admin pages ───────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { data: cars = [] } = useAllCars();
  const { data: allReservations = [] } = useAllReservations();
  const { data: allClients = [] } = useAllClients();
  const { data: settings } = useAgencySettings();
  const updateReturnHour = useUpdateReturnHour();
  const [returnHourInput, setReturnHourInput] = useState(settings?.return_hour ?? "10:00");
  useEffect(() => { if (settings?.return_hour) setReturnHourInput(settings.return_hour); }, [settings?.return_hour]);
  const pending = allReservations.filter((r) => r.status === "PENDING").length;
  const revenue = allReservations
    .filter((r) => r.status === "COMPLETED" || r.status === "CONFIRMED")
    .reduce((sum, r) => sum + r.total_price, 0);
  const stats: Array<[string, string | number, LucideIcon]> = [
    ["Total cars", cars.length, Car],
    ["En attente", pending, Bell],
    ["Clients", allClients.length, Users],
    ["Revenue", `${revenue.toLocaleString("fr-TN")} TND`, BarChart3],
  ];
  const recent = allReservations.slice(0, 5);
  return (
    <AdminShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map(([label, value, Icon]) => (
          <Panel key={label as string}>
            <CardContent className="flex items-start gap-4 p-5">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label as string}</p>
                <p className="mt-0.5 text-2xl font-bold text-slate-900 tabular-nums">{value as string}</p>
              </div>
            </CardContent>
          </Panel>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <CardHeader><CardTitle>Demandes récentes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recent.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Aucune réservation</p>
            ) : recent.map((r) => (
              <div key={r.id} className="grid gap-2 rounded-md bg-surface p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <p className="font-extrabold">{r.user.name}</p>
                  <p className="text-sm text-muted-foreground">{r.car.brand} {r.car.model} · {fmtDate(r.start_date)} → {fmtDate(r.end_date)}</p>
                </div>
                <span className="font-bold text-primary">{r.total_price} TND</span>
                <Button asChild variant="premium" size="sm"><Link to={`/admin/reservations/${r.id}`}>Voir</Link></Button>
              </div>
            ))}
          </CardContent>
        </Panel>
        <Panel>
          <CardHeader><CardTitle>Alertes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md bg-warning/20 p-4">
              <p className="font-extrabold">{pending} en attente de confirmation</p>
              <p className="text-sm text-muted-foreground">Traitez les demandes rapidement.</p>
            </div>
            <div className="rounded-md bg-success/15 p-4">
              <p className="font-extrabold">{cars.filter((c) => c.is_available).length} voitures disponibles</p>
              <p className="text-sm text-muted-foreground">Sur {cars.length} dans la flotte.</p>
            </div>
          </CardContent>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel>
          <CardHeader><CardTitle>Paramètres de l'agence</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="return-hour">Heure limite de retour des véhicules</Label>
                <p className="text-xs text-muted-foreground">Cette heure est affichée aux clients lors de la réservation.</p>
                <div className="flex items-center gap-2">
                  <Select
                    value={returnHourInput.split(":")[0]}
                    onValueChange={(h) => setReturnHourInput(`${h}:${returnHourInput.split(":")[1] ?? "00"}`)}
                  >
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                        <SelectItem key={h} value={h}>{h}h</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="font-bold text-muted-foreground">:</span>
                  <Select
                    value={returnHourInput.split(":")[1] ?? "00"}
                    onValueChange={(m) => setReturnHourInput(`${returnHourInput.split(":")[0]}:${m}`)}
                  >
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["00", "15", "30", "45"].map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                variant="premium"
                disabled={updateReturnHour.isPending || returnHourInput === settings?.return_hour}
                onClick={() => updateReturnHour.mutate(returnHourInput, { onSuccess: () => toast.success("Heure de retour mise à jour") })}
              >
                {updateReturnHour.isPending ? "…" : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Panel>
      </div>
    </AdminShell>
  );
}

export function AdminCars() {
  const { data: cars = [], isLoading } = useAllCars();
  const { data: allReservations = [] } = useAllReservations();
  const createCar = useCreateCar();
  const updateCar = useUpdateCar();
  const deleteCar = useDeleteCar();
  const toggleAvail = useToggleAvailability();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Car | null>(null);
  const [prefillForm, setPrefillForm] = useState<CarFormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Car | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Car | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isMutating = createCar.isPending || updateCar.isPending;

  const filtered = cars.filter((c) =>
    `${c.brand} ${c.model} ${c.matricule}`.toLowerCase().includes(search.toLowerCase())
  );

  function openNew() { setEditing(null); setPrefillForm(null); setDialogOpen(true); }
  function openEdit(car: Car) { setEditing(car); setPrefillForm(null); setDialogOpen(true); }
  function openDuplicate(car: Car) {
    setPrefillForm({ brand: car.brand, model: car.model, year: car.year, matricule: "", type: car.type, fuel: car.fuel, transmission: car.transmission, seats: car.seats, mileage: car.mileage, price_per_day: car.price_per_day, color: car.color, notes: car.notes ?? "", is_available: car.is_available, images: [] });
    setEditing(null);
    setDialogOpen(true);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function clearSelection() { setSelected(new Set()); }

  async function handleSubmit(form: Omit<Car, "id" | "created_at">, imageFiles: File[]) {
    try {
      if (editing) {
        await updateCar.mutateAsync({ id: editing.id, car: form, imageFiles });
        toast.success("Voiture mise à jour");
      } else {
        await createCar.mutateAsync({ car: form, imageFiles });
        toast.success("Voiture ajoutée");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCar.mutateAsync(deleteTarget.id);
      toast.success("Voiture supprimée");
      setDeleteTarget(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function confirmToggle() {
    if (!toggleTarget) return;
    try {
      await toggleAvail.mutateAsync({ id: toggleTarget.id, is_available: !toggleTarget.is_available });
      setToggleTarget(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function bulkSetAvailability(available: boolean) {
    try {
      await Promise.all([...selected].map((id) => toggleAvail.mutateAsync({ id, is_available: available })));
      toast.success(`${selected.size} voiture(s) mises à jour`);
      clearSelection();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function exportFleet() {
    const rows = filtered.map((c) => ({
      Marque: c.brand, Modèle: c.model, Année: c.year, Matricule: c.matricule,
      Type: c.type, Carburant: c.fuel, Transmission: c.transmission,
      Sièges: c.seats, "Kilométrage (km)": c.mileage,
      "Prix/jour (TND)": c.price_per_day, Couleur: c.color,
      Statut: c.is_available ? "Disponible" : "Indisponible",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Flotte");
    XLSX.writeFile(wb, `flotte-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <AdminShell title="Gestion des voitures" onNew={openNew}>
      <CarDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        car={editing}
        prefill={prefillForm}
        onSubmit={handleSubmit}
        loading={isMutating}
      />

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer la voiture</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Voulez-vous vraiment supprimer <strong>{deleteTarget?.brand} {deleteTarget?.model}</strong> ({deleteTarget?.matricule}) ? Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteCar.isPending}>{deleteCar.isPending ? "…" : "Supprimer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle availability confirm */}
      <AlertDialog open={!!toggleTarget} onOpenChange={(o) => { if (!o) setToggleTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changer la disponibilité ?</AlertDialogTitle>
            <AlertDialogDescription>
              Passer <strong>{toggleTarget?.brand} {toggleTarget?.model}</strong> en{" "}
              <strong>{toggleTarget?.is_available ? "Indisponible" : "Disponible"}</strong> ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle} disabled={toggleAvail.isPending}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Panel>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Flotte ({cars.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Input className="max-w-xs" placeholder="Rechercher marque, matricule…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Button variant="outline" size="sm" onClick={exportFleet}>Exporter</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Chargement…</p>
          ) : (
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-3 w-8">
                    <input type="checkbox" className="cursor-pointer"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={(e) => e.target.checked ? setSelected(new Set(filtered.map((c) => c.id))) : clearSelection()}
                    />
                  </th>
                  <th className="p-3">Voiture</th><th>Type</th><th>Carburant</th><th>Km</th><th>Prix</th><th>Statut</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const upcoming = allReservations.filter((r) => r.car_id === c.id && (r.status === "PENDING" || r.status === "CONFIRMED"));
                  return (
                    <tr key={c.id} className={`border-t border-border ${selected.has(c.id) ? "bg-muted/30" : ""}`}>
                      <td className="p-3">
                        <input type="checkbox" className="cursor-pointer" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Link to={`/admin/cars/${c.id}`} className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted hover:opacity-80 transition-opacity">
                            {c.images?.[0] ? <img src={c.images[0]} alt="" className="h-full w-full object-cover" /> : <Car className="m-auto mt-2 size-5 text-muted-foreground" />}
                          </Link>
                          <div>
                            <Link to={`/admin/cars/${c.id}`} className="font-extrabold hover:underline">{c.brand} {c.model}</Link>
                            <p className="text-xs font-medium text-muted-foreground">{c.matricule}</p>
                          </div>
                        </div>
                      </td>
                      <td>{c.type}</td>
                      <td>{c.fuel}</td>
                      <td>{c.mileage.toLocaleString()}</td>
                      <td>{c.price_per_day} TND</td>
                      <td>
                        <button
                          onClick={() => setToggleTarget(c)}
                          className={`rounded-md px-2 py-1 font-bold transition-opacity hover:opacity-70 ${c.is_available ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}
                        >
                          {c.is_available ? "Disponible" : "Indisponible"}
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {upcoming.length > 0 && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground hover:opacity-80">
                                  <Bell className="size-3" />{upcoming.length}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-3" align="end">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Réservations à venir</p>
                                <div className="space-y-2">
                                  {upcoming.map((r) => (
                                    <div key={r.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs">
                                      <span>{fmtDate(r.start_date)} → {fmtDate(r.end_date)}</span>
                                      <span className={`rounded-full px-2 py-0.5 font-bold ${r.status === "CONFIRMED" ? "bg-success/20 text-success-foreground" : "bg-yellow-100 text-yellow-800"}`}>
                                        {r.status === "CONFIRMED" ? "Confirmé" : "En attente"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Modifier</Button>
                          <Button variant="ghost" size="sm" onClick={() => openDuplicate(c)}><Copy className="size-3.5" /></Button>
                          <Button asChild variant="ghost" size="sm"><Link to={`/admin/cars/${c.id}/maintenance`}><Wrench className="size-3.5" /></Link></Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(c)}><Trash2 className="size-3.5 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !isLoading && (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Aucune voiture trouvée</td></tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Panel>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-xl border border-border bg-background px-5 py-3 shadow-2xl z-50">
          <span className="text-sm font-bold">{selected.size} voiture(s) sélectionnée(s)</span>
          <Button size="sm" variant="premium" onClick={() => bulkSetAvailability(true)} disabled={toggleAvail.isPending}>Disponible</Button>
          <Button size="sm" variant="outline" onClick={() => bulkSetAvailability(false)} disabled={toggleAvail.isPending}>Indisponible</Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}><X className="size-3.5" /></Button>
        </div>
      )}
    </AdminShell>
  );
}

// ─── Admin Car Detail (F) ─────────────────────────────────────────────────

export function AdminCarDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: car, isLoading } = useCar(id);
  const { data: allReservations = [] } = useAllReservations();
  const { data: records = [] } = useMaintenanceRecords(id);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const updateCar = useUpdateCar();

  const reservations = allReservations
    .filter((r) => r.car_id === id)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));

  async function handleEdit(form: CarFormState, imageFiles: File[]) {
    try {
      await updateCar.mutateAsync({ id, car: form, imageFiles });
      toast.success("Voiture mise à jour");
      setDialogOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (isLoading) return <AdminShell title="…"><p className="py-8 text-center text-muted-foreground">Chargement…</p></AdminShell>;
  if (!car) return <AdminShell title="Voiture introuvable"><p className="py-8 text-center text-muted-foreground">Cette voiture n'existe pas.</p></AdminShell>;

  const specs: [string, string | number][] = [
    ["Marque", car.brand], ["Modèle", car.model], ["Année", car.year],
    ["Matricule", car.matricule], ["Type", car.type], ["Carburant", car.fuel],
    ["Transmission", car.transmission], ["Sièges", car.seats],
    ["Kilométrage", `${car.mileage.toLocaleString()} km`],
    ["Prix / jour", `${car.price_per_day} TND`],
    ["Couleur", car.color || "—"],
    ["Disponible", car.is_available ? "Oui" : "Non"],
  ];

  return (
    <AdminShell title={`${car.brand} ${car.model}`}>
      <CarDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        car={car}
        onSubmit={handleEdit}
        loading={updateCar.isPending}
      />
      <div className="mb-4 flex items-center gap-2">
        <Button asChild variant="admin" size="sm"><Link to="/admin/cars"><ChevronLeft className="size-3.5" />Retour</Link></Button>
        <Button variant="hero" size="sm" onClick={() => setDialogOpen(true)}>Modifier</Button>
        <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900"><Link to={`/admin/cars/${id}/maintenance`}><Wrench className="mr-1.5 size-3.5" />Maintenance</Link></Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Specs */}
        <Panel>
          <CardHeader><CardTitle>Fiche technique</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {specs.map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            {car.notes && <p className="mt-4 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">{car.notes}</p>}
          </CardContent>
        </Panel>

        {/* Images — carousel */}
        <Panel>
          <CardHeader><CardTitle>Photos ({car.images.length})</CardTitle></CardHeader>
          <CardContent>
            {car.images.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucune photo</p>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Main image */}
                <div className="relative overflow-hidden rounded-xl bg-muted" style={{ aspectRatio: "16/9" }}>
                  <img
                    src={car.images[carouselIdx]}
                    alt=""
                    className="h-full w-full cursor-pointer object-cover transition-opacity duration-300"
                    onClick={() => setLightbox(car.images[carouselIdx])}
                  />
                  {carouselIdx === 0 && (
                    <span className="absolute bottom-2 left-2 rounded bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">COUVERTURE</span>
                  )}
                  {/* Prev / Next */}
                  {car.images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCarouselIdx((i) => (i - 1 + car.images.length) % car.images.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 grid size-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCarouselIdx((i) => (i + 1) % car.images.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 grid size-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                      {/* Dot indicators */}
                      <div className="absolute bottom-2 right-2 flex items-center gap-1">
                        {car.images.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setCarouselIdx(i)}
                            style={{
                              height: "4px",
                              width: i === carouselIdx ? "16px" : "6px",
                              borderRadius: "999px",
                              background: i === carouselIdx ? "white" : "rgba(255,255,255,0.45)",
                              transition: "width 0.2s",
                            }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {/* Thumbnail strip */}
                {car.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {car.images.map((url, i) => (
                      <div
                        key={url}
                        onClick={() => setCarouselIdx(i)}
                        className={`relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition ${i === carouselIdx ? "border-secondary opacity-100" : "border-transparent opacity-55 hover:opacity-80"}`}
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Panel>
      </div>

      {/* Reservations */}
      <Panel className="mt-6">
        <CardHeader><CardTitle>Réservations ({reservations.length})</CardTitle></CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucune réservation</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="pb-2">Client</th><th>Dates</th><th>Prix</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2 font-semibold">{r.user.name}</td>
                    <td className="text-muted-foreground">{fmtDate(r.start_date)} → {fmtDate(r.end_date)}</td>
                    <td>{r.total_price} TND</td>
                    <td><span className={`rounded-md px-2 py-0.5 text-xs font-bold ${STATUS_LABELS[r.status]?.cls ?? ""}`}>{STATUS_LABELS[r.status]?.label ?? r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Panel>

      {/* Recent maintenance */}
      {records.length > 0 && (
        <Panel className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Dernières maintenances</CardTitle>
              <Button asChild variant="ghost" size="sm"><Link to={`/admin/cars/${id}/maintenance`}>Voir tout</Link></Button>
            </div>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="pb-2">Date</th><th>Type</th><th>Km</th><th>Coût</th></tr>
              </thead>
              <tbody>
                {records.slice(0, 5).map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2">{fmtDate(r.date)}</td>
                    <td>{r.type}</td>
                    <td>{r.km_at_service.toLocaleString()}</td>
                    <td>{r.cost != null ? `${r.cost} TND` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Panel>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
        <DialogContent className="max-w-3xl border-0 bg-transparent p-0 shadow-none [&>button:last-child]:hidden">
          {lightbox && (
            <div className="relative">
              <img src={lightbox} alt="" className="max-h-[80vh] w-full rounded-xl object-contain" />
              <DialogClose className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80">
                <X className="size-4" />
              </DialogClose>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

// ─── Maintenance ──────────────────────────────────────────────────────────

type LocalRow = {
  _key: string;
  isNew: boolean;
  car_id: string;
  id: string;
  date: string;
  type: string;
  km_at_service: number;
  next_service_km: number | null;
  next_service_date: string | null;
  cost: number | null;
  provider: string | null;
  notes: string | null;
};

function blankRow(carId: string): LocalRow {
  return {
    _key: `new-${Date.now()}`,
    isNew: true,
    car_id: carId,
    id: "",
    date: new Date().toISOString().slice(0, 10),
    type: "",
    km_at_service: 0,
    next_service_km: null,
    next_service_date: null,
    cost: null,
    provider: null,
    notes: null,
  };
}

export function MaintenancePage() {
  const { id: carId = "" } = useParams<{ id: string }>();
  const { data: car } = useCar(carId);
  const { data: records = [], isLoading } = useMaintenanceRecords(carId);
  const createMaint = useCreateMaintenance();
  const updateMaint = useUpdateMaintenance();
  const deleteMaint = useDeleteMaintenance();

  const [rows, setRows] = useState<LocalRow[]>([]);
  const [deleteRowTarget, setDeleteRowTarget] = useState<LocalRow | null>(null);

  useEffect(() => {
    setRows(records.map((r) => ({ _key: r.id, isNew: false, ...r })));
  }, [records]);

  function setField<K extends keyof LocalRow>(key: string, field: K, value: LocalRow[K]) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  }

  async function saveRow(row: LocalRow) {
    const { _key, isNew, ...payload } = row;
    try {
      if (isNew) {
        const { id: _id, ...insertPayload } = payload;
        await createMaint.mutateAsync(insertPayload);
        toast.success("Record added");
      } else {
        const { id, ...fields } = payload;
        await updateMaint.mutateAsync({ id, ...fields });
        toast.success("Record saved");
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function requestDeleteRow(row: LocalRow) {
    if (row.isNew) {
      setRows((prev) => prev.filter((r) => r._key !== row._key));
    } else {
      setDeleteRowTarget(row);
    }
  }

  async function confirmDeleteRow() {
    if (!deleteRowTarget) return;
    try {
      await deleteMaint.mutateAsync({ id: deleteRowTarget.id, car_id: deleteRowTarget.car_id });
      toast.success("Enregistrement supprimé");
      setDeleteRowTarget(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const carLabel = car ? `${car.brand} ${car.model} · ${car.matricule}` : carId;

  function handleExport() {
    const sheetData = rows.map((r) => ({
      Date: r.date,
      Type: r.type,
      "Km au service": r.km_at_service,
      "Prochain km": r.next_service_km ?? "",
      "Prochaine date": r.next_service_date ?? "",
      "Coût (TND)": r.cost ?? "",
      Prestataire: r.provider ?? "",
      Notes: r.notes ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Entretien");
    const filename = car
      ? `entretien_${car.brand}_${car.model}_${car.matricule}.xlsx`.replace(/\s+/g, "_")
      : `entretien_${carId}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  return (
    <AdminShell title="Fiche entretien">
      <Dialog open={!!deleteRowTarget} onOpenChange={(o) => { if (!o) setDeleteRowTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'enregistrement</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Supprimer <strong>{deleteRowTarget?.type || "cet enregistrement"}</strong> du {deleteRowTarget?.date} ? Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRowTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={confirmDeleteRow} disabled={deleteMaint.isPending}>
              {deleteMaint.isPending ? "…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Panel>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-5 text-primary" />{carLabel}
            </CardTitle>
            <Button variant="hero" onClick={handleExport} disabled={rows.length === 0}>Export Excel</Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Loading…</p>
          ) : (
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  {["Date", "Type", "Km", "Next km", "Next date", "Cost (TND)", "Provider", "Notes", ""].map((h) => (
                    <th key={h} className="p-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._key} className="border-t border-border">
                    <td className="p-2"><Input type="date" value={row.date} onChange={(e) => setField(row._key, "date", e.target.value)} /></td>
                    <td className="p-2"><Input value={row.type} onChange={(e) => setField(row._key, "type", e.target.value)} placeholder="Vidange" /></td>
                    <td className="p-2"><Input type="number" min={0} value={row.km_at_service} onChange={(e) => setField(row._key, "km_at_service", Number(e.target.value))} /></td>
                    <td className="p-2"><Input type="number" min={0} value={row.next_service_km ?? ""} onChange={(e) => setField(row._key, "next_service_km", e.target.value ? Number(e.target.value) : null)} placeholder="—" /></td>
                    <td className="p-2"><Input type="date" value={row.next_service_date ?? ""} onChange={(e) => setField(row._key, "next_service_date", e.target.value || null)} /></td>
                    <td className="p-2"><Input type="number" min={0} value={row.cost ?? ""} onChange={(e) => setField(row._key, "cost", e.target.value ? Number(e.target.value) : null)} placeholder="—" /></td>
                    <td className="p-2"><Input value={row.provider ?? ""} onChange={(e) => setField(row._key, "provider", e.target.value || null)} placeholder="Garage…" /></td>
                    <td className="p-2"><Input value={row.notes ?? ""} onChange={(e) => setField(row._key, "notes", e.target.value || null)} placeholder="…" /></td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => saveRow(row)} disabled={createMaint.isPending || updateMaint.isPending}><Check className="size-3.5 text-success" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => requestDeleteRow(row)}><Trash2 className="size-3.5 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No records yet</td></tr>
                )}
              </tbody>
            </table>
          )}
          <Button variant="premium" className="mt-4" onClick={() => setRows((prev) => [...prev, blankRow(carId)])}>
            <Plus className="size-4" />Add row
          </Button>
        </CardContent>
      </Panel>
    </AdminShell>
  );
}

// ─── Reservation calendar (Gantt) ─────────────────────────────────────────

const CAL_COLORS: Record<string, string> = {
  PENDING:   "bg-yellow-400/80 text-yellow-900",
  CONFIRMED: "bg-green-500/70 text-white",
  COMPLETED: "bg-gray-400/70 text-white",
  REJECTED:  "bg-red-400/70 text-white",
  CANCELLED: "bg-gray-300/70 text-gray-500",
};

function ReservationCalendar({ reservations, year, month }: {
  reservations: ReservationWithDetails[];
  year: number;
  month: number;
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthStr = `${year}-${pad(month + 1)}`;

  const monthStart = `${monthStr}-01`;
  const monthEnd = `${monthStr}-${pad(daysInMonth)}`;
  const monthRes = reservations.filter((r) => r.start_date <= monthEnd && r.end_date > monthStart);

  const carMap = new Map<string, { car: ReservationWithDetails["car"]; items: ReservationWithDetails[] }>();
  for (const r of monthRes) {
    if (!carMap.has(r.car_id)) carMap.set(r.car_id, { car: r.car, items: [] });
    carMap.get(r.car_id)!.items.push(r);
  }
  const carRows = Array.from(carMap.values());

  type Seg = { span: number; res?: ReservationWithDetails };

  function buildSegments(items: ReservationWithDetails[]): Seg[] {
    const map = new Map<number, ReservationWithDetails>();
    for (const r of items) {
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${monthStr}-${pad(d)}`;
        if (r.start_date <= dateStr && r.end_date > dateStr) map.set(d, r);
      }
    }
    const segs: Seg[] = [];
    let d = 1;
    while (d <= daysInMonth) {
      const r = map.get(d);
      if (r) {
        let span = 1;
        while (d + span <= daysInMonth && map.get(d + span) === r) span++;
        segs.push({ span, res: r });
        d += span;
      } else {
        let span = 1;
        while (d + span <= daysInMonth && !map.get(d + span)) span++;
        segs.push({ span });
        d += span;
      }
    }
    return segs;
  }

  const today = new Date().getDate();
  const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() === month;

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="min-w-max w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/40">
            <th className="sticky left-0 z-10 bg-muted/50 w-40 text-left px-3 py-2 font-bold border-r border-border">Voiture</th>
            {days.map((d) => (
              <th key={d} className={`w-7 text-center py-2 px-0 font-medium border-r border-border/40 ${isCurrentMonth && d === today ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground"}`}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {carRows.map(({ car, items }) => (
            <tr key={car.id} className="border-t border-border hover:bg-muted/10">
              <td className="sticky left-0 z-10 bg-surface-elevated/95 px-3 py-1.5 border-r border-border whitespace-nowrap">
                <span className="font-bold">{car.brand} {car.model}</span>
                <span className="ml-1.5 text-muted-foreground text-[10px]">{car.matricule}</span>
              </td>
              {buildSegments(items).map((seg, i) =>
                seg.res ? (
                  <td
                    key={i}
                    colSpan={seg.span}
                    className={`px-1 py-1 border-r border-border/20 cursor-default ${CAL_COLORS[seg.res.status]}`}
                    title={`${seg.res.user.name} · ${seg.res.start_date} → ${seg.res.end_date} · ${seg.res.total_price} TND`}
                  >
                    <span className="block truncate font-bold text-[10px] leading-tight">{seg.res.user.name.split(" ")[0]}</span>
                  </td>
                ) : (
                  <td key={i} colSpan={seg.span} className="border-r border-border/20 bg-surface/20" />
                )
              )}
            </tr>
          ))}
          {carRows.length === 0 && (
            <tr>
              <td colSpan={daysInMonth + 1} className="py-8 text-center text-muted-foreground">
                Aucune réservation ce mois
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── New client mini-dialog ────────────────────────────────────────────────

function NewClientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const createClient = useCreateClient();
  const [name, setName] = useState("");
  const [cin, setCin] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [permisId, setPermisId] = useState("");

  function reset() {
    setName(""); setCin(""); setPhone(""); setEmail(""); setPermisId("");
  }

  async function handleSave() {
    if (!name.trim() || !cin.trim() || !phone.trim()) {
      toast.error("Nom, CIN et téléphone sont obligatoires.");
      return;
    }
    try {
      const user = await createClient.mutateAsync({ name: name.trim(), cin: cin.trim(), phone: phone.trim(), email: email.trim(), permis_id: permisId.trim() });
      toast.success(`Client "${user.name}" créé`);
      reset();
      onOpenChange(false);
      onCreated(user.id);
    } catch (err) { toast.error((err as Error).message); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Nouveau client walk-in</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Nom complet <span className="text-destructive">*</span></Label>
            <Input placeholder="Ex: Mohamed Ben Ali" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>CIN <span className="text-destructive">*</span></Label>
            <Input placeholder="Ex: 12345678" value={cin} onChange={(e) => setCin(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Téléphone <span className="text-destructive">*</span></Label>
            <Input placeholder="Ex: +216 20 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Email</Label>
            <Input type="email" placeholder="optionnel" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>N° permis</Label>
            <Input placeholder="optionnel" value={permisId} onChange={(e) => setPermisId(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Annuler</Button>
          <Button variant="premium" onClick={handleSave} disabled={createClient.isPending}>
            {createClient.isPending ? "…" : "Créer le client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Walk-in dialog ────────────────────────────────────────────────────────

function CreateWalkInDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: allClients = [] } = useAllClients();
  const { data: allCars = [] } = useAllCars();
  const createRes = useAdminCreateReservation();

  const [clientId, setClientId] = useState("");
  const [carId, setCarId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priceOverride, setPriceOverride] = useState("");
  const [newClientOpen, setNewClientOpen] = useState(false);

  const selectedCar = allCars.find((c) => c.id === carId);
  const days = startDate && endDate
    ? Math.max(0, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))
    : 0;
  const autoPrice = selectedCar ? days * selectedCar.price_per_day : 0;
  const finalPrice = priceOverride !== "" ? parseFloat(priceOverride) : autoPrice;

  function reset() {
    setClientId(""); setCarId(""); setStartDate(""); setEndDate(""); setPriceOverride("");
  }

  async function handleSubmit() {
    if (!clientId || !carId || !startDate || !endDate || days <= 0) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    try {
      await createRes.mutateAsync({
        client_id: clientId, car_id: carId,
        start_date: startDate, end_date: endDate,
        total_price: isNaN(finalPrice) ? autoPrice : finalPrice,
      });
      toast.success("Réservation walk-in créée et confirmée");
      reset();
      onOpenChange(false);
    } catch (err) { toast.error((err as Error).message); }
  }

  return (
    <>
      <NewClientDialog
        open={newClientOpen}
        onOpenChange={setNewClientOpen}
        onCreated={(id) => setClientId(id)}
      />
      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouvelle réservation — Walk-in</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Client</Label>
                <button
                  type="button"
                  className="text-xs text-secondary underline-offset-2 hover:underline"
                  onClick={() => setNewClientOpen(true)}
                >
                  + Nouveau client
                </button>
              </div>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un client…" /></SelectTrigger>
                <SelectContent>
                  {allClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — CIN {c.cin}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Voiture</Label>
              <Select value={carId} onValueChange={(v) => { setCarId(v); setPriceOverride(""); }}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une voiture…" /></SelectTrigger>
                <SelectContent>
                  {allCars.filter((c) => c.is_available).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.brand} {c.model} — {c.matricule} ({c.price_per_day} TND/j)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Début</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Fin</Label>
                <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Prix total (TND)</Label>
              <Input
                type="number" min={0}
                placeholder={autoPrice > 0 ? String(autoPrice) : "Ex: 250"}
                value={priceOverride}
                onChange={(e) => setPriceOverride(e.target.value)}
              />
              {days > 0 && selectedCar && (
                <p className="text-xs text-muted-foreground">{days} jour(s) × {selectedCar.price_per_day} TND = {autoPrice} TND</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Annuler</Button>
            <Button variant="premium" onClick={handleSubmit} disabled={createRes.isPending}>
              {createRes.isPending ? "…" : "Confirmer Walk-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Admin reservations page ───────────────────────────────────────────────

type ContractModalForm = { fuel_level: string; km_at_pickup: string; car_condition_notes: string; deposit: string; additional_notes: string };
function defaultContractModal(): ContractModalForm {
  return { fuel_level: "", km_at_pickup: "", car_condition_notes: "", deposit: "", additional_notes: "" };
}

export function AdminReservations() {
  const { data: reservations = [], isLoading } = useAllReservations();
  const updateStatus = useUpdateReservationStatus();
  const updateCar = useUpdateCar();
  const upsertContract = useUpsertContract();
  const autoComplete = useAutoCompleteReservations();

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const lastRun = localStorage.getItem("autoComplete_lastRun");
    if (lastRun === today) return;
    autoComplete.mutate(undefined, {
      onSuccess: () => localStorage.setItem("autoComplete_lastRun", today),
    });
  }, []);

  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [calView, setCalView] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [newResOpen, setNewResOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [completeTarget, setCompleteTarget] = useState<{ id: string; carId: string; carName: string } | null>(null);
  const [returnKm, setReturnKm] = useState("");
  const [contractTarget, setContractTarget] = useState<ReservationWithDetails | null>(null);
  const [contractModalForm, setContractModalForm] = useState<ContractModalForm>(defaultContractModal());

  useEffect(() => { setPage(0); }, [statusFilter, search, dateFrom, dateTo, pageSize]);

  const byStatus = statusFilter === "ALL"
    ? reservations
    : reservations.filter((r) => r.status === statusFilter);

  const needle = search.trim().toLowerCase();
  const bySearch = needle
    ? byStatus.filter((r) =>
        `${r.user.name} ${r.user.cin} ${r.car.brand} ${r.car.model} ${r.car.matricule}`
          .toLowerCase()
          .includes(needle)
      )
    : byStatus;

  const filtered = (dateFrom || dateTo)
    ? bySearch.filter((r) => {
        const fStart = dateFrom || "0000-01-01";
        const fEnd = dateTo || "9999-12-31";
        return r.start_date < fEnd && r.end_date > fStart;
      })
    : bySearch;

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  function handleConfirm(r: ReservationWithDetails) {
    setContractTarget(r);
    setContractModalForm(defaultContractModal());
  }

  async function handleConfirmWithContract() {
    if (!contractTarget) return;
    try {
      await upsertContract.mutateAsync({
        reservation_id: contractTarget.id,
        fuel_level: contractModalForm.fuel_level || null,
        km_at_pickup: contractModalForm.km_at_pickup ? Number(contractModalForm.km_at_pickup) : null,
        car_condition_notes: contractModalForm.car_condition_notes || null,
        deposit: contractModalForm.deposit ? Number(contractModalForm.deposit) : null,
        additional_notes: contractModalForm.additional_notes || null,
      });
      await updateStatus.mutateAsync({ id: contractTarget.id, status: "CONFIRMED" });
      printContract(contractTarget, {
        fuel_level: contractModalForm.fuel_level,
        km_at_pickup: contractModalForm.km_at_pickup ? Number(contractModalForm.km_at_pickup) : null,
        car_condition_notes: contractModalForm.car_condition_notes,
        deposit: contractModalForm.deposit ? Number(contractModalForm.deposit) : null,
        additional_notes: contractModalForm.additional_notes,
      });
      toast.success("Réservation confirmée et contrat généré");
      setContractTarget(null);
    } catch (err) { toast.error((err as Error).message); }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    try {
      await updateStatus.mutateAsync({ id: rejectTarget, status: "REJECTED", rejection_reason: rejectReason.trim() || undefined });
      toast.success("Réservation refusée");
      setRejectTarget(null);
      setRejectReason("");
    } catch (err) { toast.error((err as Error).message); }
  }

  async function handleComplete() {
    if (!completeTarget) return;
    try {
      await updateStatus.mutateAsync({ id: completeTarget.id, status: "COMPLETED" });
      const km = parseInt(returnKm);
      if (!isNaN(km) && km > 0) {
        await updateCar.mutateAsync({ id: completeTarget.carId, car: { mileage: km }, imageFiles: [] });
      }
      toast.success("Réservation terminée");
      setCompleteTarget(null);
      setReturnKm("");
    } catch (err) { toast.error((err as Error).message); }
  }

  function handleExport() {
    const rows = filtered.map((r) => {
      const days = Math.ceil(
        (new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / 86400000
      );
      return {
        Client: r.user.name,
        CIN: r.user.cin,
        Voiture: `${r.car.brand} ${r.car.model}`,
        Matricule: r.car.matricule,
        Début: r.start_date,
        Fin: r.end_date,
        Jours: days,
        "Prix (TND)": r.total_price,
        Statut: STATUS_LABELS[r.status].label,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Réservations");
    XLSX.writeFile(wb, `reservations-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function prevCalMonth() {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  }
  function nextCalMonth() {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  }

  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = reservations.filter((r) => r.status === s).length;
    return acc;
  }, {} as Record<ReservationStatus, number>);

  return (
    <AdminShell title="Réservations">
      {/* Complete + odometer dialog */}
      <Dialog open={!!completeTarget} onOpenChange={(o) => { if (!o) { setCompleteTarget(null); setReturnKm(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Terminer la location</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">Voiture : <strong>{completeTarget?.carName}</strong></p>
            <Label>Kilométrage au retour (optionnel)</Label>
            <Input type="number" min={0} placeholder="Ex: 45200" value={returnKm} onChange={(e) => setReturnKm(e.target.value)} />
            <p className="text-xs text-muted-foreground">Si renseigné, le kilométrage de la voiture sera mis à jour.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteTarget(null)}>Annuler</Button>
            <Button variant="premium" onClick={handleComplete} disabled={updateStatus.isPending}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motif de refus</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Label>Raison (optionnelle)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: dates déjà réservées, documents manquants…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleReject} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "…" : "Refuser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept + contract modal */}
      <Dialog open={!!contractTarget} onOpenChange={(o) => { if (!o) setContractTarget(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmer la réservation</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {contractTarget && `${contractTarget.user.name} · ${contractTarget.car.brand} ${contractTarget.car.model} · ${contractTarget.start_date} → ${contractTarget.end_date}`}
            </p>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Niveau carburant</Label>
                <Input value={contractModalForm.fuel_level} onChange={(e) => setContractModalForm((f) => ({ ...f, fuel_level: e.target.value }))} placeholder="Ex: Plein, 3/4…" />
              </div>
              <div className="grid gap-1.5">
                <Label>Km au départ</Label>
                <Input type="number" min={0} value={contractModalForm.km_at_pickup} onChange={(e) => setContractModalForm((f) => ({ ...f, km_at_pickup: e.target.value }))} placeholder="Ex: 45200" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Caution / Dépôt (TND)</Label>
              <Input type="number" min={0} value={contractModalForm.deposit} onChange={(e) => setContractModalForm((f) => ({ ...f, deposit: e.target.value }))} placeholder="Ex: 500" />
            </div>
            <div className="grid gap-1.5">
              <Label>État de la carrosserie</Label>
              <Textarea value={contractModalForm.car_condition_notes} onChange={(e) => setContractModalForm((f) => ({ ...f, car_condition_notes: e.target.value }))} placeholder="Ex: Rayure légère aile avant gauche…" rows={2} />
            </div>
            <div className="grid gap-1.5">
              <Label>Remarques générales</Label>
              <Textarea value={contractModalForm.additional_notes} onChange={(e) => setContractModalForm((f) => ({ ...f, additional_notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractTarget(null)}>Annuler</Button>
            <Button variant="premium" onClick={handleConfirmWithContract} disabled={upsertContract.isPending || updateStatus.isPending}>
              {(upsertContract.isPending || updateStatus.isPending) ? "Confirmation…" : "Confirmer et générer le contrat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateWalkInDialog open={newResOpen} onOpenChange={setNewResOpen} />

      <Panel>
        <CardHeader className="pb-0">
          {/* Status filter tabs */}
          <div className="-mx-6 flex overflow-x-auto border-b border-slate-200 px-6">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${statusFilter === "ALL" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700"}`}
            >
              Toutes <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">{reservations.length}</span>
            </button>
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${statusFilter === s ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700"}`}
              >
                {STATUS_LABELS[s].label}
                {counts[s] > 0 && <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-bold ${STATUS_LABELS[s].cls}`}>{counts[s]}</span>}
              </button>
            ))}
          </div>
          {/* Toolbar: search + date filters + actions */}
          <div className="mt-8 flex flex-wrap items-end gap-3">
            <Input
              className="w-52"
              placeholder="Rechercher client, CIN, voiture…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex items-center gap-1.5">
              <Label className="text-xs whitespace-nowrap">Du</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-8 text-sm" />
            </div>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs whitespace-nowrap">Au</Label>
              <Input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-8 text-sm" />
            </div>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs whitespace-nowrap">Lignes</Label>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-20 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
                <Download className="size-3.5 mr-1" />Exporter
              </Button>
              <Button variant={calView ? "premium" : "outline"} size="sm" onClick={() => setCalView((v) => !v)}>
                <Calendar className="size-3.5 mr-1" />{calView ? "Vue liste" : "Calendrier"}
              </Button>
              <Button variant="hero" size="sm" onClick={() => setNewResOpen(true)}>
                <Plus className="size-3.5 mr-1" />Walk-in
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="mt-6 space-y-4">
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Chargement…</p>
          ) : calView ? (
            <>
              <div className="flex items-center justify-between pb-2">
                <Button variant="ghost" size="sm" onClick={prevCalMonth}><ChevronLeft className="size-4" /></Button>
                <span className="font-bold capitalize">
                  {new Date(calYear, calMonth).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                </span>
                <Button variant="ghost" size="sm" onClick={nextCalMonth}><ChevronRight className="size-4" /></Button>
              </div>
              <ReservationCalendar reservations={filtered} year={calYear} month={calMonth} />
            </>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Aucune réservation</p>
          ) : (
            <>
              {paginated.map((r) => {
                const cfg = STATUS_LABELS[r.status];
                return (
                  <div key={r.id} className="relative overflow-hidden rounded-lg border border-slate-100 bg-white transition hover:border-slate-200 hover:shadow-sm">
                    <div className={`absolute inset-y-0 left-0 w-1 ${cfg.bar}`} />
                    <div className="grid gap-3 p-4 pl-5 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
                      <div>
                        <p className="font-bold text-slate-900">{r.user.name}</p>
                        <p className="text-sm text-slate-500">CIN {r.user.cin} · {r.user.phone}</p>
                        {r.rejection_reason && (
                          <p className="mt-1 text-xs text-red-500">{r.rejection_reason}</p>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{r.car.brand} {r.car.model}</p>
                        <p className="text-sm text-slate-500">
                          {fmtDate(r.start_date)} → {fmtDate(r.end_date)} · <span className="font-semibold text-slate-700">{r.total_price} TND</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-md px-2 py-1 text-xs font-bold ${cfg.cls}`}>{cfg.label}</span>
                        {r.status === "PENDING" && (
                          <>
                            <Button variant="premium" size="sm" onClick={() => handleConfirm(r)} disabled={updateStatus.isPending}>Confirmer</Button>
                            <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setRejectTarget(r.id)}>Refuser</Button>
                          </>
                        )}
                        {r.status === "CONFIRMED" && (
                          <Button size="sm" variant="outline" className="border-slate-200 text-slate-700" onClick={() => { setCompleteTarget({ id: r.id, carId: r.car.id, carName: `${r.car.brand} ${r.car.model}` }); setReturnKm(""); }}>
                            <Check className="mr-1 size-3.5" />Terminer
                          </Button>
                        )}
                        {(r.status === "CONFIRMED" || r.status === "COMPLETED") && (
                          <Button asChild variant="ghost" size="sm" className="text-slate-500 hover:text-slate-800">
                            <Link to={`/admin/reservations/${r.id}`}><FileText className="size-3.5 mr-1" />Contrat</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3 border-t border-border pt-6">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground">
                    Page {page + 1} sur {totalPages}
                    <span className="ml-2 text-xs opacity-70">({filtered.length} total)</span>
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Panel>
    </AdminShell>
  );
}

type ContractForm = Omit<Contract, "id" | "generated_at" | "reservation_id">;

function defaultContractForm(): ContractForm {
  return { fuel_level: "", km_at_pickup: null, car_condition_notes: "", deposit: null, additional_notes: "" };
}

function printContract(r: NonNullable<ReturnType<typeof useReservation>["data"]>, form: ContractForm) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-TN", { day: "numeric", month: "long", year: "numeric" });
  const isSansPlomb = r.car.fuel === "Essence";
  const isGasoil    = r.car.fuel === "Diesel";
  const cbS = isSansPlomb ? "&#10003;" : "&nbsp;";
  const cbG = isGasoil    ? "&#10003;" : "&nbsp;";
  const win = window.open("", "_blank", "width=1050,height=820");
  if (!win) return;

  win.document.write(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Contrat de Location</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:9.5px;color:#000;background:#fff}
.page{width:210mm;padding:7mm 7mm 5mm;margin:0 auto}
/* header */
.hdr{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:start;border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:4px}
.co{font-size:8.5px;line-height:1.55}.co b{font-size:11px}
.logo{text-align:center}
.logo-txt{font-size:30px;font-weight:900;font-family:"Arial Black",Arial,sans-serif;letter-spacing:-1px;line-height:1}
.logo-sub{font-size:8px;letter-spacing:3px;color:#555}
.ttl{text-align:right}.ttl .fr{font-size:17px;font-weight:bold}.ttl .ar{font-size:17px;font-family:Arial,sans-serif;direction:rtl}
/* two columns */
.cols{display:grid;grid-template-columns:1fr 1px 1fr;gap:0}
.cl{padding-right:5px}.cr{padding-left:5px}
.div{background:#000}
/* section headers */
.sh{background:#F5B800;display:flex;justify-content:space-between;align-items:center;padding:2px 5px;margin:3px 0 2px;border:1px solid #C9A000}
.sh .fr{font-weight:bold;font-size:9px}
.sh .fri{font-weight:bold;font-style:italic;font-size:9px}
.sh .ar{font-weight:bold;font-size:9px;direction:rtl;font-family:Arial,sans-serif}
/* fields */
.f{display:flex;align-items:baseline;gap:2px;border-bottom:1px dotted #aaa;min-height:13px;margin-bottom:1px;padding-bottom:1px}
.fl{font-size:8px;white-space:nowrap;flex-shrink:0}
.fv{flex:1;font-size:9px;font-weight:bold;min-width:0}
.fa{font-size:8px;white-space:nowrap;direction:rtl;font-family:Arial,sans-serif;flex-shrink:0}
/* two-col sub-grid */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:4px}
/* fuel */
.fuel{display:flex;align-items:center;gap:6px;margin:3px 0}
.fb{display:flex;align-items:center;gap:3px;font-size:11px;font-weight:bold;border:2px solid #000;padding:2px 6px}
.cb{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border:1px solid #000;font-size:10px;margin-right:2px}
/* car diagram */
.diag{text-align:center;margin:3px 0}
.legend{text-align:center;font-size:8px;margin-top:1px}
/* sigs */
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:5px;padding-top:4px;border-top:1px solid #000}
.sb{font-size:8px}.sl{border-bottom:1px solid #000;min-height:26px;margin:3px 0}
/* footnote */
.fn{font-size:7px;margin-top:3px;border-top:1px solid #ccc;padding-top:2px}
/* conditions */
.cond{font-size:7px;line-height:1.3;margin-top:2px}
@media print{.page{padding:5mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head>
<body><div class="page">

<!-- HEADER -->
<div class="hdr">
  <div class="co">
    <b>FALCON RENT A CAR</b><br>
    Rue Banou Houd - 1057 La Marsa, Tunis<br>
    GSM : 28 778 392 / 27 490 097<br>
    E-mail : falconrentcar2022@gmail.com<br>
    Code TVA : 1776178V
  </div>
  <div class="logo">
    <div class="logo-txt">FALCON</div>
    <div class="logo-sub">RENT A CAR</div>
  </div>
  <div class="ttl">
    <div class="fr">Contrat de Location</div>
    <div class="ar">عقد كراء</div>
  </div>
</div>

<!-- COLUMNS -->
<div class="cols">

<!-- ══ LEFT ══ -->
<div class="cl">

  <div class="sh"><span class="fr">Identité du Locataire</span><span class="ar">هوية المستأجر</span></div>
  <div class="f"><span class="fl">Sté :</span><span class="fv"></span><span class="fl" style="margin-left:6px">MF :</span><span class="fv"></span></div>

  <div class="sh"><span class="fr">Identité du 1<sup>er</sup> Conducteur</span><span class="ar">هوية السائق الأول</span></div>
  <div class="f"><span class="fl">Nom et Prénom :</span><span class="fv">${r.user.name}</span><span class="fa">: الاسم واللقب</span></div>
  <div class="f"><span class="fl">Date et Lieu de naissance :</span><span class="fv"></span><span class="fa">: تاريخ ومكان الولادة</span></div>
  <div class="f"><span class="fl">Nationalité :</span><span class="fv"></span><span class="fa">: الجنسية</span></div>
  <div class="f"><span class="fl">C.I.N. N° :</span><span class="fv">${r.user.cin}</span><span class="fa">: رقم بطاقة تعريف وطنية</span></div>
  <div class="f"><span class="fl">Passeport n° :</span><span class="fv"></span><span class="fa">: رقم جواز السفر</span></div>
  <div class="f"><span class="fl">Délivrée le :</span><span class="fv"></span><span class="fa">: تاريخ الإصدار</span></div>
  <div class="f"><span class="fl">Permis de conduire n° :</span><span class="fv">${r.user.permis_id}</span><span class="fa">: رخصة السياقة</span></div>
  <div class="f"><span class="fl">Délivrée le :</span><span class="fv"></span><span class="fa">: تاريخ الإصدار</span></div>
  <div class="f"><span class="fl">Adresse :</span><span class="fv">${r.user.address ?? ""}</span><span class="fa">: العنوان</span></div>
  <div class="f"><span class="fl">Tél. :</span><span class="fv">${r.user.phone}</span><span class="fl">GSM :</span><span class="fv"></span><span class="fa">: المحمول</span></div>

  <div class="sh"><span class="fr">Identité du 2<sup>ème</sup> Conducteur</span><span class="ar">هوية السائق الثاني</span></div>
  <div class="f"><span class="fl">Nom et Prénom :</span><span class="fv"></span><span class="fa">: الاسم واللقب</span></div>
  <div class="f"><span class="fl">Date et Lieu de naissance :</span><span class="fv"></span><span class="fa">: تاريخ ومكان الولادة</span></div>
  <div class="f"><span class="fl">Nationalité :</span><span class="fv"></span><span class="fa">: الجنسية</span></div>
  <div class="f"><span class="fl">C.I.N. N° :</span><span class="fv"></span><span class="fa">: رقم بطاقة تعريف وطنية</span></div>
  <div class="f"><span class="fl">Passeport n° :</span><span class="fv"></span><span class="fa">: رقم جواز السفر</span></div>
  <div class="f"><span class="fl">Délivrée le :</span><span class="fv"></span><span class="fa">: تاريخ الإصدار</span></div>
  <div class="f"><span class="fl">Permis de conduire n° :</span><span class="fv"></span><span class="fa">: رخصة السياقة</span></div>
  <div class="f"><span class="fl">Délivrée le :</span><span class="fv"></span><span class="fa">: تاريخ الإصدار</span></div>
  <div class="f"><span class="fl">Adresse :</span><span class="fv"></span><span class="fa">: العنوان</span></div>
  <div class="f"><span class="fl">Tél. :</span><span class="fv"></span><span class="fl">GSM :</span><span class="fv"></span><span class="fa">: المحمول</span></div>

  <div class="sh"><span class="fr">Etat du véhicule</span><span class="ar">حالة السيارة</span></div>
  <div class="diag">
    <svg width="195" height="145" viewBox="0 0 195 145" xmlns="http://www.w3.org/2000/svg">
      <rect x="52" y="13" width="91" height="119" rx="20" fill="#f8f8f8" stroke="#333" stroke-width="1.5"/>
      <path d="M62,13 Q97,5 133,13" fill="none" stroke="#333" stroke-width="1"/>
      <path d="M62,132 Q97,140 133,132" fill="none" stroke="#333" stroke-width="1"/>
      <line x1="57" y1="37" x2="138" y2="37" stroke="#333" stroke-width="1.5"/>
      <line x1="57" y1="108" x2="138" y2="108" stroke="#333" stroke-width="1.5"/>
      <line x1="52" y1="72" x2="143" y2="72" stroke="#888" stroke-width="0.5" stroke-dasharray="2,2"/>
      <rect x="33" y="19" width="19" height="33" rx="5" fill="#ddd" stroke="#333" stroke-width="1.5"/>
      <rect x="143" y="19" width="19" height="33" rx="5" fill="#ddd" stroke="#333" stroke-width="1.5"/>
      <rect x="33" y="93" width="19" height="33" rx="5" fill="#ddd" stroke="#333" stroke-width="1.5"/>
      <rect x="143" y="93" width="19" height="33" rx="5" fill="#ddd" stroke="#333" stroke-width="1.5"/>
      <text x="18" y="76" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle">G</text>
      <text x="177" y="76" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle">D</text>
      <text x="97" y="7" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle">Av</text>
      <text x="97" y="144" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle">Ar</text>
    </svg>
  </div>
  <div class="legend">-- Rayure &nbsp;&nbsp; 0 Manquant &nbsp;&nbsp; X Bosselure</div>
  ${form.car_condition_notes ? `<div style="font-size:8px;margin-top:2px;border:1px solid #ccc;padding:2px 4px">${form.car_condition_notes}</div>` : ""}

  <div class="sigs">
    <div class="sb"><b>Le Client :</b><br>Lu et Approuvé (1)<br><em>Signature</em><div class="sl"></div></div>
    <div class="sb"><b>Votre Agent :</b><div class="sl"></div>Fait A ............... le ...............<br><em>Cachet de l'agence</em></div>
  </div>
  <div class="fn">
    (1) J'ai lu et j'ai approuvé les informations et les conditions générales recto-verso de ce contrat, ainsi que les informations portés sur le reçu.<br>
    <span style="direction:rtl;display:block;text-align:right;font-family:Arial">اطلعت على المعلومات و الشروط الموجودة في العقد و خلفة وصادقت عليها</span>
  </div>

</div><!-- /left -->

<div class="div"></div>

<!-- ══ RIGHT ══ -->
<div class="cr">

  <div class="sh"><span class="fri">Identification du Véhicule</span><span class="ar">هوية السيارة</span></div>
  <div style="display:flex;justify-content:space-between;font-size:8px;margin-bottom:1px">
    <span>Marque et Type</span><span style="direction:rtl;font-family:Arial">نوع السيارة</span>
  </div>
  <div class="f"><span class="fv">${r.car.brand} ${r.car.model} (${r.car.year})</span></div>
  <div style="display:flex;justify-content:space-between;font-size:8px;margin-bottom:1px">
    <span>Immatriculation</span><span style="direction:rtl;font-family:Arial">الرقم المنجمي</span>
  </div>
  <div class="f"><span class="fv">${r.car.matricule}</span></div>
  <div class="fuel">
    <div class="fb"><span class="cb">${cbS}</span>Super Sans Plomb</div>
    <div class="fb"><span class="cb">${cbG}</span>Gasoil 50</div>
  </div>

  <div class="sh"><span class="fri">Changement du Véhicule</span><span class="ar">تغيير السيارة</span></div>
  <div style="display:flex;justify-content:space-between;font-size:8px;margin-bottom:1px"><span>Marque et Type</span><span style="direction:rtl;font-family:Arial">نوع السيارة</span></div>
  <div class="f"><span class="fv"></span></div>
  <div style="display:flex;justify-content:space-between;font-size:8px;margin-bottom:1px"><span>Immatriculation</span><span style="direction:rtl;font-family:Arial">الرقم المنجمي</span></div>
  <div class="f"><span class="fv"></span></div>
  <div class="f"><span class="fl">Date et Heure :</span><span class="fv"></span><span class="fa">: (التاريخ والساعة)</span></div>

  <div class="sh"><span class="fri">Durée de Location</span><span class="ar">مدة الكراء</span></div>
  <div class="g2" style="font-size:8px;margin-bottom:1px">
    <div><em>Date de départ</em> <span style="direction:rtl;font-family:Arial">تاريخ الخروج</span></div>
    <div><em>Date de retour prévu</em> <span style="direction:rtl;font-family:Arial">تاريخ العودة</span></div>
  </div>
  <div class="g2" style="margin-bottom:2px">
    <div class="f"><span class="fv">${fmt(r.start_date)}</span></div>
    <div class="f"><span class="fv">${fmt(r.end_date)}</span></div>
  </div>
  <div class="g2">
    <div class="f"><span class="fl"><em>Heure</em> :</span><span class="fv"></span><span class="fa">الساعة</span></div>
    <div class="f"><span class="fl"><em>Heure</em> :</span><span class="fv"></span><span class="fa">الساعة</span></div>
  </div>
  <div class="g2">
    <div class="f"><span class="fl"><em>Lieu</em></span><span class="fv"></span><span class="fa">المكان</span></div>
    <div class="f"><span class="fl"><em>Lieu</em></span><span class="fv"></span><span class="fa">المكان</span></div>
  </div>

  <div class="sh"><span class="fri">Prolongations</span><span class="ar">التمـديـد</span></div>
  <div class="g2">
    <div class="f"><span class="fl">du</span><span class="fv"></span><span class="fa">إلى يوم</span></div>
    <div class="f"><span class="fl">du</span><span class="fv"></span><span class="fa">من يوم</span></div>
  </div>
  <div class="g2">
    <div class="f"><span class="fl"><em>Heure</em> :</span><span class="fv"></span><span class="fa">الساعة</span></div>
    <div class="f"><span class="fl"><em>Heure</em> :</span><span class="fv"></span><span class="fa">الساعة</span></div>
  </div>

  <div class="sh"><span class="fri">Encaissement</span><span class="ar">معلوم الخلاص</span></div>
  <div class="g2">
    <div class="f"><span class="fl">Date</span><span class="fv"></span><span class="fa">التاريخ</span></div>
    <div class="f"><span class="fl">Nature</span><span class="fv"></span><span class="fa">طريقة الدفع</span></div>
  </div>
  <div class="f"><span class="fl">Montant HT</span><span class="fv"></span><span class="fa">المبلغ .................................</span></div>
  <div class="f"><span class="fl">TVA 19%</span><span class="fv"></span><span style="font-size:8px">.................................</span></div>
  <div class="f"><span class="fl">Timbre</span><span class="fv"></span><span style="font-size:8px">.................................</span></div>
  <div class="f"><span class="fl">Prix Total TTC</span><span class="fv" style="font-weight:bold">${r.total_price} TND</span><span class="fa">المبلغ الجملي .................</span></div>

  <div class="sh"><span class="fri">Kilométrage</span><span class="ar">كيلوماتر</span></div>
  <div class="g2">
    <div class="f"><span class="fl"><em>Kilomètre départ</em></span><span class="fv">${form.km_at_pickup ?? ""}</span><span class="fa">كيلوماتر الخروج</span></div>
    <div class="f"><span class="fl"><em>Kilomètre retour</em></span><span class="fv"></span><span class="fa">كيلوماتر الدخول</span></div>
  </div>

  <div class="sh"><span class="fri">Garantie</span><span class="ar">الضمـان</span></div>
  <div class="g2">
    <div class="f"><span class="fl">Montant</span><span class="fv">${form.deposit != null ? form.deposit + " TND" : ""}</span><span class="fa">المبلغ</span></div>
    <div class="f"><span class="fl">Nature</span><span class="fv"></span><span class="fa">طريقة الدفع</span></div>
  </div>

  <div class="f" style="margin-top:3px">
    <span class="fl"><em>Date de retour effectif</em></span><span class="fv"></span>
    <span class="fl"><em>Heure</em></span><span class="fv"></span>
    <span class="fa">التاريخ الفعلي للعودة &nbsp; الساعة</span>
  </div>
  <div style="font-size:8.5px;font-style:italic;margin:2px 0 3px"><em>Signature Client (e) au retour</em></div>
  <div style="border-bottom:1px solid #000;min-height:18px;margin-bottom:4px"></div>

  <div class="sh"><span class="fri">Conditions / Modalités</span><span class="ar">شروط الكراء</span></div>
  <div class="cond">
    Le Locataire reconnait sa responsabilité pour toute contravention relative à la circulation routière, radar automatique, stationnement et transport de marchandises. Admet que :<br>
    * Le véhicule loué est assuré avec une formule au tiers. En cas d'accident le locataire doit payer tous frais nécessaires à la prise en charge et l'immobilisation du véhicule ainsi qu'à la réparation des dégâts causés. La responsabilité du locataire est déterminée sur la base du constat amiable ou à travers le rapport des organisations spécialisées.<br>
    * Il est strictement interdit de faire des travaux de réparation (Quelle qu'en soit la nature) sur le véhicule loué sans une autorisation écrite par le loueur.<br>
    * Le kilométrage est limité à 400 km/jour. Tout excès sera facturé sur la base de 500ml/km.<br>
    <div style="direction:rtl;text-align:right;font-family:Arial;margin-top:2px">
      يتحمل المستأجر مسؤولية كل المخالفات المتعلقة بضوابط الطريق، الرادار الآلي، الوقوف، الشواهد، البضائع المنقولة. يصرح بأنه يعلم أن السيارة مؤمنة حسب نظام المسؤولية المدنية. وفي حالة وقوع حادث فالمستأجر يتحمل معاملة المصاريف المتعلقة بالإصلاحات وفي نقل السيارة. يمنع منعاً باتاً القيام بأي نوع من أنواع تحسين السيارة بدون تصريح كتابي من المسؤول. ولا يجوز تجاوز معدل الكيلومترات المقطوعة 400كم/اليوم، يقع إحتساب الكيلومترات الزائدة حسب سعر 500م/الكم.
    </div>
    ${form.additional_notes ? `<div style="margin-top:2px;border-top:1px solid #ccc;padding-top:2px"><b>Notes :</b> ${form.additional_notes}</div>` : ""}
  </div>

</div><!-- /right -->
</div><!-- /cols -->
</div><!-- /page -->
</body></html>`);

  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

export function ContractPage() {
  const { id: reservationId = "" } = useParams<{ id: string }>();
  const { data: reservation, isLoading } = useReservation(reservationId);
  const { data: existingContract } = useContract(reservationId);
  const upsertContract = useUpsertContract();

  const [form, setForm] = useState<ContractForm>(defaultContractForm());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existingContract) {
      setForm({
        fuel_level: existingContract.fuel_level ?? "",
        km_at_pickup: existingContract.km_at_pickup,
        car_condition_notes: existingContract.car_condition_notes ?? "",
        deposit: existingContract.deposit,
        additional_notes: existingContract.additional_notes ?? "",
      });
    }
  }, [existingContract]);

  function setF<K extends keyof ContractForm>(k: K, v: ContractForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  async function handleSave() {
    try {
      await upsertContract.mutateAsync({ reservation_id: reservationId, ...form });
      setSaved(true);
      toast.success("Contrat enregistré");
    } catch (err) { toast.error((err as Error).message); }
  }

  if (isLoading) return <AdminShell title="Contrat"><p className="py-20 text-center text-muted-foreground">Chargement…</p></AdminShell>;
  if (!reservation) return <AdminShell title="Contrat"><p className="py-20 text-center text-muted-foreground">Réservation introuvable.</p></AdminShell>;

  const isConfirmed = reservation.status === "CONFIRMED";
  const days = Math.max(1, Math.round((new Date(reservation.end_date).getTime() - new Date(reservation.start_date).getTime()) / 86_400_000));
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-TN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <AdminShell title="Contrat de location">
      {!isConfirmed && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Cette réservation est <strong>{reservation.status}</strong> — le contrat ne peut être généré que pour une réservation confirmée.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        {/* Manual fields */}
        <Panel>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />Champs manuels
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Niveau de carburant au départ</Label>
              <Input value={form.fuel_level ?? ""} onChange={(e) => setF("fuel_level", e.target.value)} placeholder="Ex: Plein, 3/4, 1/2…" />
            </div>
            <div className="grid gap-1.5">
              <Label>Kilométrage au départ</Label>
              <Input type="number" min={0} value={form.km_at_pickup ?? ""} onChange={(e) => setF("km_at_pickup", e.target.value ? Number(e.target.value) : null)} placeholder="Ex: 45200" />
            </div>
            <div className="grid gap-1.5">
              <Label>État de la carrosserie</Label>
              <Textarea value={form.car_condition_notes ?? ""} onChange={(e) => setF("car_condition_notes", e.target.value)} placeholder="Ex: Rayure légère aile avant gauche…" rows={2} />
            </div>
            <div className="grid gap-1.5">
              <Label>Caution / Dépôt (TND)</Label>
              <Input type="number" min={0} value={form.deposit ?? ""} onChange={(e) => setF("deposit", e.target.value ? Number(e.target.value) : null)} placeholder="Ex: 500" />
            </div>
            <div className="grid gap-1.5">
              <Label>Remarques générales</Label>
              <Textarea value={form.additional_notes ?? ""} onChange={(e) => setF("additional_notes", e.target.value)} rows={2} />
            </div>
            <div className="flex gap-3">
              <Button variant="hero" className="flex-1" onClick={handleSave} disabled={upsertContract.isPending || !isConfirmed}>
                {upsertContract.isPending ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer"}
              </Button>
              <Button variant="premium" className="flex-1" onClick={() => printContract(reservation, form)} disabled={!saved || !isConfirmed}>
                <FileText className="size-4" />Imprimer PDF
              </Button>
            </div>
          </CardContent>
        </Panel>

        {/* Auto-filled summary */}
        <Panel>
          <CardHeader><CardTitle>Récapitulatif</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md bg-surface p-4 space-y-2">
              <p className="text-xs font-bold uppercase text-muted-foreground">Client</p>
              <p className="font-extrabold text-base">{reservation.user.name}</p>
              <p>CIN : {reservation.user.cin}</p>
              <p>Tél : {reservation.user.phone}</p>
              <p>Permis : {reservation.user.permis_id}</p>
            </div>
            <div className="rounded-md bg-surface p-4 space-y-2">
              <p className="text-xs font-bold uppercase text-muted-foreground">Véhicule</p>
              <p className="font-extrabold text-base">{reservation.car.brand} {reservation.car.model}</p>
              <p>Matricule : {reservation.car.matricule}</p>
              <p>Couleur : {reservation.car.color}</p>
            </div>
            <div className="rounded-md bg-surface p-4 space-y-2">
              <p className="text-xs font-bold uppercase text-muted-foreground">Location</p>
              <p>{fmt(reservation.start_date)} → {fmt(reservation.end_date)}</p>
              <p>{days} jour(s) × {reservation.car.price_per_day} TND</p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 p-4">
              <span className="font-bold">Total</span>
              <span className="font-display text-2xl font-extrabold text-primary">{reservation.total_price} TND</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-surface p-3 text-xs text-muted-foreground">
              <span>Statut</span>
              <span className={`rounded px-2 py-0.5 font-bold ${STATUS_LABELS[reservation.status].cls}`}>{STATUS_LABELS[reservation.status].label}</span>
            </div>
          </CardContent>
        </Panel>
      </div>
    </AdminShell>
  );
}

// ─── Admin clients list ───────────────────────────────────────────────────

export function AdminClients() {
  const { data: allClients = [], isLoading } = useAllClients();
  const { data: allReservations = [] } = useAllReservations();
  const [search, setSearch] = useState("");

  const filtered = allClients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.cin.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  });

  function clientStats(clientId: string) {
    const done = allReservations.filter((r) => r.user?.id === clientId && r.status === "COMPLETED");
    const total = done.reduce((s, r) => s + r.total_price, 0);
    return { count: done.length, total };
  }

  function handleExport() {
    const rows = filtered.map((c) => {
      const { count, total } = clientStats(c.id);
      return {
        Nom: c.name,
        CIN: c.cin,
        Permis: c.permis_id,
        Email: c.email,
        Téléphone: c.phone,
        Adresse: c.address ?? "",
        "Membre depuis": new Date(c.created_at).toLocaleDateString("fr-TN"),
        "Nb locations": count,
        "Total dépensé (TND)": total,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    XLSX.writeFile(wb, `clients_${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  return (
    <AdminShell title="Clients" onNew={undefined}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Rechercher par nom, CIN, email, téléphone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-surface text-foreground"
        />
        <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="mr-2 size-4" />Exporter
        </Button>
      </div>

      <Panel>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-center text-muted-foreground">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Aucun client trouvé.</p>
          ) : (
            <div className="divide-y divide-primary-foreground/10">
              {filtered.map((c) => {
                const { count, total } = clientStats(c.id);
                return (
                  <div key={c.id} className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto] md:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/clients/${c.id}`} className="font-extrabold hover:underline">
                          {c.name}
                        </Link>
                        {c.is_blocked && (
                          <span className="rounded bg-destructive/20 px-1.5 py-0.5 text-xs font-bold text-destructive">Bloqué</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">CIN {c.cin}</p>
                    </div>
                    <div>
                      <p className="text-sm">{c.email}</p>
                      <p className="text-sm text-muted-foreground">{c.phone}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <p className="font-bold">{count} location{count !== 1 ? "s" : ""}</p>
                        <p className="text-muted-foreground">{total.toLocaleString("fr-TN")} TND</p>
                      </div>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/admin/clients/${c.id}`}>Voir</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Panel>
    </AdminShell>
  );
}

// ─── Admin client detail ──────────────────────────────────────────────────

export function AdminClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: client, isLoading: loadingClient } = useUserProfile(id);
  const { data: reservations = [], isLoading: loadingRes } = useMyReservations(id);
  const updateProfile = useUpdateProfile();
  const toggleBlock = useToggleBlockClient();

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");

  function openEdit() {
    if (!client) return;
    setEditName(client.name);
    setEditPhone(client.phone);
    setEditAddress(client.address ?? "");
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!id || !editName.trim()) { toast.error("Le nom est obligatoire."); return; }
    try {
      await updateProfile.mutateAsync({ userId: id, data: { name: editName.trim(), phone: editPhone.trim(), address: editAddress.trim() || null } });
      toast.success("Profil mis à jour");
      setEditOpen(false);
    } catch (err) { toast.error((err as Error).message); }
  }

  async function handleToggleBlock() {
    if (!client || id === undefined) return;
    const next = !client.is_blocked;
    try {
      await toggleBlock.mutateAsync({ id, is_blocked: next });
      toast.success(next ? "Client bloqué" : "Client débloqué");
    } catch (err) { toast.error((err as Error).message); }
  }

  const completed = reservations.filter((r) => r.status === "COMPLETED");
  const totalSpent = completed.reduce((s, r) => s + r.total_price, 0);

  if (loadingClient) return <AdminShell title="Client"><p className="text-muted-foreground">Chargement…</p></AdminShell>;
  if (!client) return <AdminShell title="Client"><p className="text-muted-foreground">Client introuvable.</p></AdminShell>;

  return (
    <AdminShell title={client.name}>
      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Modifier le profil</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Nom</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Téléphone</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Adresse</Label>
              <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Email, CIN et n° permis ne peuvent pas être modifiés.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button variant="premium" onClick={handleSaveEdit} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Back */}
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/clients"><ChevronLeft className="size-4" />Retour aux clients</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Profile card */}
        <Panel>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg">{client.name}</CardTitle>
              {client.is_blocked && (
                <span className="rounded bg-destructive/20 px-2 py-0.5 text-xs font-bold text-destructive">Bloqué</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              <span className="text-muted-foreground">CIN</span><span className="font-mono">{client.cin}</span>
              <span className="text-muted-foreground">Permis</span><span className="font-mono">{client.permis_id || "—"}</span>
              <span className="text-muted-foreground">Email</span><span className="break-all">{client.email}</span>
              <span className="text-muted-foreground">Tél.</span><span>{client.phone}</span>
              <span className="text-muted-foreground">Adresse</span><span>{client.address || "—"}</span>
              <span className="text-muted-foreground">Membre depuis</span>
              <span>{new Date(client.created_at).toLocaleDateString("fr-TN")}</span>
            </div>
            <div className="mt-4 flex gap-2 border-t border-primary-foreground/10 pt-4">
              <div className="flex-1 text-center">
                <p className="text-xl font-extrabold">{completed.length}</p>
                <p className="text-xs text-muted-foreground">locations</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-xl font-extrabold">{totalSpent.toLocaleString("fr-TN")}</p>
                <p className="text-xs text-muted-foreground">TND dépensés</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={openEdit}>Modifier le profil</Button>
              <Button
                variant={client.is_blocked ? "outline" : "ghost"}
                size="sm"
                className={client.is_blocked ? "border-green-500 text-green-400 hover:bg-green-500/10" : "text-destructive hover:bg-destructive/10"}
                onClick={handleToggleBlock}
                disabled={toggleBlock.isPending}
              >
                {client.is_blocked ? "Débloquer" : "Bloquer le client"}
              </Button>
            </div>
          </CardContent>
        </Panel>

        {/* Reservation history */}
        <Panel>
          <CardHeader><CardTitle>Historique des réservations</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loadingRes ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Chargement…</p>
            ) : reservations.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Aucune réservation.</p>
            ) : (
              <div className="divide-y divide-primary-foreground/10">
                {reservations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                    <div>
                      <p className="font-bold">{r.car.brand} {r.car.model}</p>
                      <p className="text-xs text-muted-foreground">{r.car.matricule}</p>
                    </div>
                    <div className="text-center">
                      <p>{new Date(r.start_date).toLocaleDateString("fr-TN")} → {new Date(r.end_date).toLocaleDateString("fr-TN")}</p>
                      <p className="text-xs text-muted-foreground">{r.total_price.toLocaleString("fr-TN")} TND</p>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${STATUS_LABELS[r.status].cls}`}>
                      {STATUS_LABELS[r.status].label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Panel>
      </div>
    </AdminShell>
  );
}

export function AdminManagers() {
  const { user: currentUser } = useAuth();
  const { data: staff = [], isLoading } = useAllStaff();
  const removeStaff = useRemoveStaff();
  const inviteStaff = useInviteStaff();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER">("MANAGER");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [createdCreds, setCreatedCreds] = useState<{ name: string; email: string; password: string } | null>(null);

  function validate() {
    const e: typeof errors = {};
    if (!name.trim() || name.trim().length < 2) e.name = "Minimum 2 caractères.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Email invalide.";
    if (!password || password.length < 8) e.password = "Minimum 8 caractères.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleInvite() {
    if (!validate()) return;
    try {
      const result = await inviteStaff.mutateAsync({ name: name.trim(), email: email.trim(), password, role });
      setCreatedCreds(result);
      setName(""); setEmail(""); setPassword(""); setRole("MANAGER"); setErrors({});
    } catch (err) { toast.error((err as Error).message); }
  }

  async function handleRemove(id: string) {
    try {
      await removeStaff.mutateAsync(id);
      toast.success("Accès CRM révoqué.");
      setConfirmRemoveId(null);
    } catch (err) { toast.error((err as Error).message); }
  }

  const confirmTarget = staff.find((s) => s.id === confirmRemoveId);

  return (
    <AdminShell title="Managers">
      {/* Remove confirmation */}
      <AlertDialog open={!!confirmRemoveId} onOpenChange={(v) => { if (!v) setConfirmRemoveId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer l'accès de {confirmTarget?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette personne ne pourra plus accéder à l'administration. Son compte Supabase reste actif mais sans rôle CRM.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmRemoveId && handleRemove(confirmRemoveId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Révoquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Created credentials dialog */}
      <Dialog open={!!createdCreds} onOpenChange={(v) => { if (!v) setCreatedCreds(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Compte créé</DialogTitle></DialogHeader>
          <div className="grid gap-3 text-sm">
            <p>Communiquez ces identifiants au manager par un canal sécurisé :</p>
            <div className="rounded bg-surface p-3 font-mono text-xs space-y-1">
              <p><span className="text-muted-foreground">Nom :</span> {createdCreds?.name}</p>
              <p><span className="text-muted-foreground">Email :</span> {createdCreds?.email}</p>
              <p><span className="text-muted-foreground">Mot de passe :</span> {createdCreds?.password}</p>
            </div>
            <p className="text-xs text-muted-foreground">Le manager doit changer son mot de passe à la première connexion.</p>
          </div>
          <DialogFooter>
            <Button variant="premium" onClick={() => setCreatedCreds(null)}>Compris</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Invite form */}
        <Panel>
          <CardHeader><CardTitle>Inviter un manager</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Nom complet</Label>
              <Input placeholder="Ex: Mouna Rekik" value={name} onChange={(e) => setName(e.target.value)} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="manager@agence.tn" value={email} onChange={(e) => setEmail(e.target.value)} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label>Mot de passe temporaire</Label>
              <Input type="password" placeholder="Min. 8 caractères" value={password} onChange={(e) => setPassword(e.target.value)} />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label>Rôle</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "ADMIN" | "MANAGER")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="hero" onClick={handleInvite} disabled={inviteStaff.isPending}>
              {inviteStaff.isPending ? "Création…" : "Créer le compte"}
            </Button>
          </CardContent>
        </Panel>

        {/* Staff list */}
        <Panel>
          <CardHeader><CardTitle>Équipe</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Chargement…</p>
            ) : staff.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Aucun manager pour l'instant.</p>
            ) : (
              <div className="divide-y divide-primary-foreground/10">
                {staff.map((s) => {
                  const isSelf = s.id === currentUser?.id;
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold">{s.name}</span>
                          <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${s.role === "ADMIN" ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"}`}>
                            {s.role === "ADMIN" ? "Admin" : "Manager"}
                          </span>
                          {isSelf && <span className="rounded bg-secondary/20 px-1.5 py-0.5 text-xs font-bold text-secondary">Vous</span>}
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{s.email}</p>
                        <p className="text-xs text-muted-foreground">Depuis le {new Date(s.created_at).toLocaleDateString("fr-TN")}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSelf || removeStaff.isPending}
                        title={isSelf ? "Vous ne pouvez pas vous supprimer vous-même" : undefined}
                        onClick={() => setConfirmRemoveId(s.id)}
                        className={isSelf ? "opacity-40" : "border-destructive/50 text-destructive hover:bg-destructive/10"}
                      >
                        Supprimer
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Panel>
      </div>
    </AdminShell>
  );
}
