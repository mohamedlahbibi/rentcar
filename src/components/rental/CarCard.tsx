import { Link } from "react-router-dom";
import { ArrowRight, Fuel, Gauge, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { cars } from "@/data/rentalMock";

type Car = (typeof cars)[number];

export function CarCard({ car }: { car: Car }) {
  return (
    <Card className="group overflow-hidden border-border/70 bg-card/90 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
      <div className="relative aspect-[4/3] overflow-hidden bg-metal">
        <img src={car.images[0]} alt={`${car.brand} ${car.model}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" width={640} height={480} />
        <div className="absolute left-3 top-3 rounded-md bg-surface-elevated/90 px-3 py-1 text-xs font-bold text-primary shadow-soft backdrop-blur">{car.type}</div>
        <div className="absolute bottom-3 right-3 rounded-md bg-primary px-3 py-1 text-sm font-extrabold text-primary-foreground shadow-soft">{car.pricePerDay} TND/j</div>
      </div>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{car.year} · {car.color}</p>
          <h3 className="text-xl font-extrabold text-foreground">{car.brand} {car.model}</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="size-4 text-primary" />{car.seats}</span>
          <span className="flex items-center gap-1"><Fuel className="size-4 text-primary" />{car.fuel}</span>
          <span className="flex items-center gap-1"><Gauge className="size-4 text-primary" />{Math.round(car.mileage / 1000)}k</span>
        </div>
        <Button asChild variant="premium" className="w-full">
          <Link to={`/cars/${car.id}`}>Voir détails <ArrowRight className="size-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}
