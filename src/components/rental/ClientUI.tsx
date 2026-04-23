import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Car, CheckCircle2, Clock, Filter, KeyRound, MapPin, Phone, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CarCard } from "./CarCard";
import { carTypes, cars, reservations } from "@/data/rentalMock";

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/82 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        <Link to="/" className="flex items-center gap-3 font-display text-lg font-extrabold text-primary"><span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground shadow-soft">TN</span>RouteRent</Link>
        <div className="hidden items-center gap-6 text-sm font-bold text-muted-foreground md:flex">
          <Link to="/" className="hover:text-primary">Véhicules</Link>
          <Link to="/account" className="hover:text-primary">Compte client</Link>
          <Link to="/admin" className="hover:text-primary">Admin</Link>
        </div>
        <div className="flex items-center gap-2"><Button asChild variant="ghost" size="sm"><Link to="/login">Login</Link></Button><Button asChild variant="hero" size="sm"><Link to="/register">Créer compte</Link></Button></div>
      </nav>
    </header>
  );
}

function SearchBox({ compact = false }: { compact?: boolean }) {
  return (
    <div className="glass-panel grid gap-3 rounded-lg p-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <label className="space-y-2 text-sm font-bold text-foreground">Départ<Input type="date" defaultValue="2026-04-24" className="h-12 bg-surface-elevated" /></label>
      <label className="space-y-2 text-sm font-bold text-foreground">Retour<Input type="date" defaultValue="2026-04-29" className="h-12 bg-surface-elevated" /></label>
      <Button variant="hero" size={compact ? "default" : "xl"} className="h-12"><CalendarDays className="size-5" />Chercher</Button>
    </div>
  );
}

export function LandingPage() {
  const [type, setType] = useState("Tous");
  const visibleCars = useMemo(() => cars.filter((car) => car.isAvailable && (type === "Tous" || car.type === type)), [type]);
  return (
    <div className="min-h-screen bg-hero-field">
      <Header />
      <main>
        <section className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-12 pt-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pt-16">
          <div className="z-10 flex flex-col justify-center space-y-8 animate-reveal-up">
            <div className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-surface-elevated/80 px-3 py-2 text-sm font-bold text-primary shadow-soft"><MapPin className="size-4" />Tunis · Hammamet · Aéroport</div>
            <div className="space-y-5"><h1 className="max-w-3xl text-5xl font-extrabold leading-[1.02] text-foreground md:text-7xl">Location auto rapide, claire, prête pour la route.</h1><p className="max-w-2xl text-lg font-medium leading-8 text-muted-foreground">Sélectionnez vos dates, comparez les voitures disponibles et envoyez une demande de réservation en quelques clics.</p></div>
            <SearchBox />
          </div>
          <div className="relative min-h-[430px] overflow-hidden rounded-lg shadow-glow lg:min-h-[590px]">
            <img src={cars[0].images[0]} alt="Flotte de voitures de location en Tunisie" className="h-full w-full object-cover" width={1600} height={960} />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/80 to-transparent p-6 text-primary-foreground"><p className="text-sm font-bold uppercase">Disponibilité live UI</p><p className="text-3xl font-extrabold">{visibleCars.length} voitures prêtes</p></div>
            <div className="absolute right-5 top-5 hidden rounded-lg bg-surface-elevated/90 p-4 shadow-card backdrop-blur md:block animate-float-drive"><p className="text-xs font-bold text-muted-foreground">Prix dès</p><p className="font-display text-3xl font-extrabold text-primary">125 TND</p></div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="font-bold text-secondary">Résultats disponibles</p><h2 className="text-3xl font-extrabold">Choisissez votre véhicule</h2></div><div className="flex flex-wrap gap-2"><Button variant={type === "Tous" ? "premium" : "outline"} size="sm" onClick={() => setType("Tous")}><Filter className="size-4" />Tous</Button>{carTypes.map((item) => <Button key={item} variant={type === item ? "premium" : "outline"} size="sm" onClick={() => setType(item)}>{item}</Button>)}<Button variant="outline" size="sm"><SlidersHorizontal className="size-4" />Prix</Button></div></div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{visibleCars.map((car) => <CarCard key={car.id} car={car} />)}</div>
        </section>
      </main>
    </div>
  );
}

export function CarDetailPage() {
  const { id } = useParams();
  const car = cars.find((item) => item.id === id) ?? cars[0];
  const days = 5;
  return (
    <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-7xl px-4 py-8 lg:px-8"><Button asChild variant="ghost" className="mb-6"><Link to="/"><ArrowLeft className="size-4" />Retour</Link></Button><div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]"><section className="space-y-4"><div className="overflow-hidden rounded-lg shadow-card"><img src={car.images[0]} alt={`${car.brand} ${car.model}`} className="aspect-[16/10] w-full object-cover" width={1600} height={960} /></div><div className="grid grid-cols-3 gap-3">{[1,2,3].map((n) => <div key={n} className="aspect-[4/3] rounded-md bg-metal shadow-soft" />)}</div></section><aside className="space-y-5"><div><p className="text-sm font-bold text-secondary">{car.type} · {car.matricule}</p><h1 className="text-4xl font-extrabold">{car.brand} {car.model}</h1><p className="mt-3 text-muted-foreground">{car.notes}</p></div><Card className="shadow-card"><CardContent className="grid grid-cols-2 gap-4 p-5 text-sm">{[["Année", car.year], ["Carburant", car.fuel], ["Transmission", car.transmission], ["Places", car.seats], ["Kilométrage", `${car.mileage.toLocaleString()} km`], ["Couleur", car.color]].map(([k, v]) => <div key={k} className="rounded-md bg-surface p-3"><p className="font-bold text-muted-foreground">{k}</p><p className="font-extrabold">{v}</p></div>)}</CardContent></Card><Card className="border-primary/30 shadow-glow"><CardHeader><CardTitle>Résumé réservation</CardTitle></CardHeader><CardContent className="space-y-4"><SearchBox compact /><div className="flex items-center justify-between border-t border-border pt-4"><span className="font-bold text-muted-foreground">{days} jours × {car.pricePerDay} TND</span><span className="font-display text-3xl font-extrabold text-primary">{days * car.pricePerDay} TND</span></div><Button variant="hero" size="xl" className="w-full"><CheckCircle2 className="size-5" />Réserver</Button></CardContent></Card></aside></div></main></div>
  );
}

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  return <div className="min-h-screen bg-hero-field"><Header /><main className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-2 lg:px-8"><section className="flex flex-col justify-center space-y-5"><p className="font-bold text-secondary">Espace client</p><h1 className="text-5xl font-extrabold">{register ? "Créer votre compte de réservation" : "Bon retour sur RouteRent"}</h1><p className="text-lg text-muted-foreground">Suivez vos demandes, annulez une réservation pending et gardez vos informations prêtes pour le contrat.</p></section><Card className="shadow-glow"><CardHeader><CardTitle>{register ? "Inscription" : "Connexion"}</CardTitle></CardHeader><CardContent className="grid gap-4">{register && <Input placeholder="Nom complet" />}<Input placeholder="Email" type="email" />{register && <><Input placeholder="Téléphone" /><Input placeholder="CIN" /><Input placeholder="Adresse" /></>}<Input placeholder="Mot de passe" type="password" /><Button variant="hero" size="xl">{register ? "Créer compte" : "Se connecter"}</Button></CardContent></Card></main></div>;
}

export function AccountPage() {
  return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-7xl px-4 py-8 lg:px-8"><div className="mb-8"><p className="font-bold text-secondary">Compte client</p><h1 className="text-4xl font-extrabold">Amira Ben Youssef</h1></div><div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]"><Card className="shadow-card"><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="size-5 text-primary" />Profil</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p><b>CIN:</b> 08456231</p><p><b>Email:</b> amira@mail.tn</p><p className="flex items-center gap-2"><Phone className="size-4 text-primary" />+216 22 456 890</p><Button variant="outline" className="w-full">Modifier profil</Button></CardContent></Card><Card className="shadow-card"><CardHeader><CardTitle>Historique réservations</CardTitle></CardHeader><CardContent className="space-y-3">{reservations.map((r) => <div key={r.id} className="flex flex-col justify-between gap-3 rounded-md border border-border bg-surface p-4 md:flex-row md:items-center"><div><p className="font-extrabold">{r.car}</p><p className="text-sm text-muted-foreground">{r.id} · {r.dates}</p></div><span className="rounded-md bg-warning px-3 py-1 text-sm font-extrabold text-warning-foreground">{r.status}</span><Button variant="ghost" size="sm">Détails</Button></div>)}</CardContent></Card></div></main></div>;
}
