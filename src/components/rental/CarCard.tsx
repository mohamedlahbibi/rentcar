import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Fuel, Cog } from "lucide-react";

interface CarCardCar {
  id: string;
  brand: string;
  model: string;
  year: number;
  type: string;
  fuel: string;
  transmission: string;
  seats: number;
  mileage: number;
  price_per_day: number;
  images: string[];
  featured?: boolean;
}

interface CarCardProps {
  car: CarCardCar;
  dateSuffix?: string;
}

export function CarCard({ car, dateSuffix = "" }: CarCardProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realImages = car.images.filter((s) => s && !s.includes("placeholder"));
  const images = realImages.length > 0 ? realImages : [];

  function startScroll() {
    if (images.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setImgIdx((i) => (i + 1) % images.length);
    }, 2000);
  }

  function stopScroll() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setImgIdx(0);
  }

  return (
    <Link
      to={`/cars/${car.id}${dateSuffix}`}
      className="group block"
      onMouseEnter={startScroll}
      onMouseLeave={stopScroll}
    >
      {/* Photo */}
      <div
        className="relative overflow-hidden"
        style={{ borderRadius: "14px", aspectRatio: "4/3", background: "linear-gradient(135deg, var(--paper-2) 0%, var(--paper-3) 100%)" }}
      >
        {images.length > 0 ? (
          <img
            src={images[imgIdx]}
            alt={`${car.brand} ${car.model}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            width={640}
            height={480}
          />
        ) : (
          /* Styled placeholder when no real photo */
          <div className="flex h-full w-full flex-col items-center justify-center gap-3">
            <span
              className="text-[56px] font-medium leading-none opacity-20"
              style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}
            >
              {car.brand[0]}
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest opacity-30"
              style={{ color: "var(--ink)" }}>
              {car.brand} {car.model}
            </span>
          </div>
        )}

        {/* Featured pill */}
        {car.featured && (
          <div
            className="absolute left-3 top-3 flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white"
            style={{ background: "rgba(26,23,19,0.75)", borderRadius: "999px", backdropFilter: "blur(6px)" }}
          >
            ✦ NOUVEAU
          </div>
        )}

        {/* Image pips */}
        {images.length > 1 && (
          <div className="absolute right-3 top-3 flex items-center gap-1">
            {images.slice(0, 4).map((_, i) => (
              <span
                key={i}
                style={{
                  height: "4px",
                  width: i === imgIdx ? "16px" : "6px",
                  borderRadius: "999px",
                  background: i === imgIdx ? "white" : "rgba(255,255,255,0.5)",
                  transition: "width 0.2s",
                }}
              />
            ))}
          </div>
        )}

        {/* Hover lift */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "linear-gradient(to top, rgba(26,23,19,0.12) 0%, transparent 50%)" }}
        />
      </div>

      {/* Meta below photo */}
      <div className="mt-1.5 flex items-start justify-between gap-2 px-0.5 pt-1">
        {/* Left: brand·year + model */}
        <div className="min-w-0">
          <p
            className="truncate text-[11px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: "var(--ink-3)" }}
          >
            {car.brand} · {car.year}
          </p>
          <h3
            className="truncate text-[22px] font-medium leading-snug"
            style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}
          >
            {car.model}
          </h3>
        </div>

        {/* Right: price */}
        <div className="shrink-0 text-right">
          <p
            className="text-[22px] font-semibold leading-snug"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ink)" }}
          >
            {car.price_per_day}
          </p>
          <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>
            TND/jour
          </p>
        </div>
      </div>

      {/* Chips */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 px-0.5">
        <Chip icon={<Users className="size-3" />} label={String(car.seats)} />
        <Chip icon={<Fuel className="size-3" />} label={car.fuel} />
        <Chip icon={<Cog className="size-3" />} label={car.transmission} />
      </div>
    </Link>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium"
      style={{
        borderRadius: "999px",
        background: "var(--paper-2)",
        color: "var(--ink-2)",
        border: "1px solid var(--line-2)",
      }}
    >
      {icon}
      {label}
    </span>
  );
}
