import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Link, useLocation, useNavigate, useParams, useSearchParams,
} from "react-router-dom";
import {
  AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2,
  MapPin, Phone, UserRound, XCircle, Eye, EyeOff,
  Mail, ShieldCheck, Zap, Clock, BadgeCheck, Globe, ChevronDown, LogOut,
} from "lucide-react";
import { type DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CarCard } from "./CarCard";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useLang, type Lang } from "@/lib/i18n";
import { useAllCars, useAvailableCars, useCar } from "@/hooks/use-cars";
import { useAgencySettings } from "@/hooks/use-settings";
import {
  useCancelReservation, useCarBookedRanges, useCreateReservation,
  useMyReservations, useUpdateProfile, useUserProfile,
} from "@/hooks/use-reservations";
import type { ReservationStatus } from "@/types/database";
import fleetHero from "@/assets/heroimage.jpeg"
import logoImg from "@/assets/logo.png";

// ─── Constants ────────────────────────────────────────────────────────────────

const CAR_TYPES = ["Citadine", "SUV", "Berline", "Utilitaire"] as const;

const STATUS_CONFIG: Record<ReservationStatus, { label: string; bg: string; color: string }> = {
  PENDING: { label: "En attente", bg: "#FEF3C7", color: "#92400E" },
  CONFIRMED: { label: "Confirmée", bg: "#D1FAE5", color: "#065F46" },
  REJECTED: { label: "Refusée", bg: "#FEE2E2", color: "#991B1B" },
  COMPLETED: { label: "Terminée", bg: "#F3F4F6", color: "#374151" },
  CANCELLED: { label: "Annulée", bg: "#F3F4F6", color: "#374151" },
};


function nextDay(dateStr: string) { return new Date(new Date(dateStr + "T12:00:00").getTime() + 86_400_000).toISOString().split("T")[0]; }
function diffDays(start: string, end: string) {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-TN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtShort(d: string) {
  return new Date(d).toLocaleDateString("fr-TN", { day: "numeric", month: "short" });
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ overlay = false }: { overlay?: boolean }) {
  const { lang, setLang, t } = useLang();
  const { user, signOut } = useAuth();
  const [langOpen, setLangOpen] = useState(false);

  const LANGS: { code: Lang; label: string }[] = [
    { code: "fr", label: "Français" },
    { code: "en", label: "English" },
    { code: "ar", label: "العربية" },
  ];

  return (
    <header
      className="w-full z-40 sticky top-0 border-b"
      style={{ background: "rgba(244,239,230,0.92)", backdropFilter: "blur(12px)", borderBottomColor: "var(--line-2)" }}
    >
      <nav
        className="mx-auto flex max-w-[1280px] items-center justify-between px-4 md:px-8 py-0"
        style={{ height: "72px" }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src={logoImg} alt="Rentcar Group" style={{ height: "110px", width: "auto" }} />
        </Link>

        {/* Nav links */}
        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          <Link
            to="/"
            className="py-1 transition-colors hover:opacity-70"
            style={{ color: "var(--ink-2)" }}
          >
            {t.chooseVehicle}
          </Link>
          {user?.role === "CLIENT" && (
            <Link
              to="/account"
              className="py-1 transition-colors hover:opacity-70"
              style={{ color: "var(--ink-2)" }}
            >
              {t.myAccount}
            </Link>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Language picker */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{ color: "var(--ink-3)" }}
            >
              <Globe className="size-3.5" />
              {lang.toUpperCase()}
              <ChevronDown className="size-3" />
            </button>
            {langOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-36 overflow-hidden py-1 shadow-lg"
                style={{ background: "white", borderRadius: "10px", border: "1px solid var(--line-2)" }}
              >
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); setLangOpen(false); }}
                    className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-paper"
                    style={{ color: lang === l.code ? "#B7452B" : "var(--ink-2)", fontWeight: lang === l.code ? 600 : 400 }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user ? (
            user.role === "ADMIN" || user.role === "MANAGER" ? (
              <Button asChild variant="hero" size="sm">
                <Link to="/admin">Admin</Link>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                style={{ color: "var(--ink-2)" }}
              >
                {t.logout}
              </Button>
            )
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                style={{ color: "var(--ink-2)" }}
              >
                <Link to="/login">{t.login}</Link>
              </Button>
              <Button asChild variant="hero" size="sm">
                <Link to="/register">{t.createAccount}</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

// ─── Date Range Picker ────────────────────────────────────────────────────────

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  bookedRanges?: Array<{ from: Date; to: Date }>;
  className?: string;
  variant?: "hero" | "inline" | "default";
}

function DateRangePicker({ startDate, endDate, onChange, bookedRanges = [], className, variant = "default" }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<Date | undefined>(undefined);
  const [pickingEnd, setPickingEnd] = useState(false);
  const [pendingStart, setPendingStart] = useState<Date | undefined>(undefined);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedStart = startDate ? new Date(startDate + "T12:00:00") : undefined;
  const selectedEnd = endDate ? new Date(endDate + "T12:00:00") : undefined;

  function toStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function handleDayClick(day: Date) {
    if (!pickingEnd) {
      setPendingStart(day);
      setPickingEnd(true);
    } else {
      const start = pendingStart!;
      if (day < start) { onChange(toStr(day), toStr(start)); }
      else { onChange(toStr(start), toStr(day)); }
      setPickingEnd(false);
      setPendingStart(undefined);
      setHovered(undefined);
      setOpen(false);
    }
  }

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (o) { setPickingEnd(false); setPendingStart(undefined); setHovered(undefined); }
  }

  const previewStart = pickingEnd ? pendingStart : selectedStart;
  const previewEnd = pickingEnd ? hovered : selectedEnd;

  const selected: DateRange | undefined =
    previewStart && previewEnd
      ? previewStart <= previewEnd
        ? { from: previewStart, to: previewEnd }
        : { from: previewEnd, to: previewStart }
      : previewStart
        ? { from: previewStart, to: previewStart }
        : undefined;

  const { t } = useLang();
  const hint = pickingEnd ? t.chooseEndDate : selectedStart ? t.modifyDates : t.chooseStartDate;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("h-12 justify-start text-left", !selectedStart && "text-muted-foreground", className)}
        >
          <CalendarDays className="mr-2 size-4 shrink-0" />
          {selectedStart && selectedEnd
            ? `${fmtShort(toStr(selectedStart))} → ${fmtShort(toStr(selectedEnd))}`
            : t.chooseStartDate}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm">
          <span className={cn("size-2 rounded-full", pickingEnd ? "animate-pulse bg-primary" : "bg-muted-foreground")} />
          <span className="font-medium text-muted-foreground">{hint}</span>
          {pickingEnd && pendingStart && (
            <span className="ml-auto font-semibold text-primary">
              {t.start} : {fmtShort(toStr(pendingStart))}
            </span>
          )}
        </div>
        <Calendar
          mode="range"
          selected={selected}
          onDayClick={handleDayClick}
          onDayMouseEnter={(day) => pickingEnd && setHovered(day)}
          numberOfMonths={1}
          disabled={[{ before: today }, ...bookedRanges]}
          modifiers={{ booked: bookedRanges }}
          modifiersClassNames={{ booked: "!bg-destructive/15 !text-destructive line-through" }}
          fromDate={today}
          initialFocus
        />
        <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm bg-primary" /> {t.yourSelection}
          </span>
          {pickingEnd && (
            <button
              className="ml-auto font-semibold text-destructive hover:underline"
              onClick={() => { setPickingEnd(false); setPendingStart(undefined); }}
            >
              {t.cancel}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Hero Search Bar ──────────────────────────────────────────────────────────

interface HeroSearchBarProps {
  startDate: string;
  endDate: string;
  onDatesChange: (start: string, end: string) => void;
  onSearch: () => void;
}

function HeroSearchBar({ startDate, endDate, onDatesChange, onSearch }: HeroSearchBarProps) {
  const { t } = useLang();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedStart = startDate ? new Date(startDate + "T12:00:00") : undefined;
  const selectedEnd = endDate ? new Date(endDate + "T12:00:00") : undefined;

  function toStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const [calOpen, setCalOpen] = useState(false);
  const [pickingEnd, setPickingEnd] = useState(false);
  const [pendingStart, setPendingStart] = useState<Date | undefined>(undefined);
  const [hovered, setHovered] = useState<Date | undefined>(undefined);

  function openFor(type: "start" | "end") {
    setPickingEnd(type === "end");
    if (type === "start") setPendingStart(undefined);
    setCalOpen(true);
  }

  function handleDayClick(day: Date) {
    if (!pickingEnd) {
      setPendingStart(day);
      setPickingEnd(true);
    } else {
      const start = pendingStart ?? selectedStart;
      if (!start) return;
      if (day < start) { onDatesChange(toStr(day), toStr(start)); }
      else { onDatesChange(toStr(start), toStr(day)); }
      setPickingEnd(false);
      setPendingStart(undefined);
      setHovered(undefined);
      setCalOpen(false);
    }
  }

  const previewStart = pickingEnd ? pendingStart : selectedStart;
  const previewEnd = pickingEnd ? hovered : selectedEnd;
  const selected: DateRange | undefined =
    previewStart && previewEnd
      ? previewStart <= previewEnd
        ? { from: previewStart, to: previewEnd }
        : { from: previewEnd, to: previewStart }
      : previewStart
        ? { from: previewStart, to: previewStart }
        : undefined;

  const canSearch = !!(startDate && endDate && startDate <= endDate);

  const daysCount = (startDate && endDate) ? diffDays(startDate, endDate) : null;
  const pendingStartStr = pendingStart ? toStr(pendingStart) : null;

  const calendarPopover = (
    <PopoverContent
      className="w-auto p-0 overflow-hidden bg-white"
      align="start"
      side="bottom"
      sideOffset={10}
      avoidCollisions={false}
      style={{
        zIndex: 100,
        borderRadius: "16px",
        border: "1px solid rgba(26,23,19,0.09)",
        boxShadow: "0 12px 40px -4px rgba(26,23,19,0.18), 0 4px 12px -2px rgba(26,23,19,0.08)",
        minWidth: "320px",
      }}
    >
      {/* ── Instruction header ── */}
      <div className="px-6 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(26,23,19,0.07)" }}>
        <p
          className="text-[20px] font-semibold mb-1 transition-all"
          style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)", letterSpacing: "-0.01em" }}
        >
          {pickingEnd ? t.chooseEndDate : t.chooseStartDate}
        </p>
        <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--ink-3)" }}>
          {pendingStartStr || startDate ? (
            <>
              <span
                className="font-semibold"
                style={{ color: !pickingEnd ? "var(--accent-color)" : "var(--ink)" }}
              >
                {pendingStartStr ? fmtShort(pendingStartStr) : (startDate ? fmtShort(startDate) : "—")}
              </span>
              <span style={{ color: "var(--line)" }}>→</span>
              <span
                className="font-semibold"
                style={{ color: pickingEnd ? "var(--accent-color)" : "var(--ink)" }}
              >
                {(!pickingEnd && endDate) ? fmtShort(endDate) : "—"}
              </span>
              {daysCount && !pickingEnd && (
                <span
                  className="ml-2 px-2 py-0.5 text-[11px] font-semibold rounded-full"
                  style={{ background: "var(--accent-tint)", color: "var(--accent-color)" }}
                >
                  {daysCount} j
                </span>
              )}
            </>
          ) : (
            <span>{t.chooseStartDate}</span>
          )}
        </div>
      </div>

      {/* ── Calendar (single month, Airbnb-style band) ── */}
      <div className="drp-hero">
        <Calendar
          mode="range"
          selected={selected}
          onDayClick={handleDayClick}
          onDayMouseEnter={(day) => pickingEnd && setHovered(day)}
          numberOfMonths={1}
          disabled={{ before: today }}
          fromDate={today}
          initialFocus
          classNames={{
            months: "p-3 pb-1",
            month: "space-y-1",
            caption: "flex justify-center relative items-center py-2 px-8",
            caption_label: "text-[14px] font-semibold capitalize",
            nav: "flex items-center",
            nav_button: cn(
              "h-8 w-8 p-0 rounded-full flex items-center justify-center transition-all",
              "border border-transparent hover:border-stone-200 hover:bg-stone-50 opacity-60 hover:opacity-100"
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse",
            head_row: "flex",
            head_cell: "w-10 h-8 flex items-center justify-center text-[11px] font-semibold uppercase tracking-widest text-stone-400",
            row: "flex w-full",
            cell: "drp-cell relative w-10 h-10 p-0 text-center text-sm focus-within:relative focus-within:z-20",
            day: "h-10 w-10 p-0 font-normal text-[13px] rounded-full transition-colors duration-100 hover:bg-stone-100 aria-selected:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7452B] focus-visible:ring-offset-1",
            day_range_start: "day-range-start !bg-[#B7452B] !text-white hover:!bg-[#9E3A23] !rounded-full font-semibold",
            day_range_end: "day-range-end !bg-[#B7452B] !text-white hover:!bg-[#9E3A23] !rounded-full font-semibold",
            day_selected: "!bg-[#B7452B] !text-white !rounded-full font-semibold",
            day_today: "font-bold text-[#B7452B] underline underline-offset-2",
            day_outside: "opacity-0 pointer-events-none",
            day_disabled: "!text-stone-400 line-through cursor-not-allowed opacity-60 hover:!bg-transparent",
            day_range_middle: "day-range-middle !rounded-none",
            day_hidden: "invisible",
          }}
        />
      </div>

      {/* ── Footer ── */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderTop: "1px solid rgba(26,23,19,0.07)" }}
      >
        <button
          className="text-[13px] font-medium underline underline-offset-2 transition-colors"
          style={{ color: canSearch ? "var(--ink-3)" : "transparent", cursor: canSearch ? "pointer" : "default" }}
          onClick={() => {
            if (!canSearch) return;
            onDatesChange("", "");
            setPickingEnd(false);
            setPendingStart(undefined);
            setHovered(undefined);
          }}
        >
          {t.cancel}
        </button>
        <div className="flex items-center gap-1 text-[13px]" style={{ color: "var(--ink-3)" }}>
          <CalendarDays className="size-3.5" />
          <span>{pickingEnd ? t.chooseEndDate : (canSearch ? `${daysCount} j` : t.chooseStartDate)}</span>
        </div>
      </div>
    </PopoverContent>
  );

  return (
    <Popover open={calOpen} onOpenChange={(o) => { if (!o) setCalOpen(false); }}>
      <PopoverAnchor asChild>
        <div className="w-full">
          {/* ── Desktop pill (lg+) ── */}
          <div className="hidden lg:flex w-full items-stretch overflow-hidden"
            style={{ background: "white", borderRadius: "999px", boxShadow: "0 20px 50px -20px rgba(26,23,19,0.35), 0 8px 16px rgba(26,23,19,0.08)" }}>
            <button className="flex flex-1 flex-col items-start justify-center px-6 transition-colors hover:bg-paper"
              style={{ minHeight: "64px" }} onClick={() => openFor("start")}>
              <span className="eyebrow mb-0.5">{t.pickupDate}</span>
              <span className="text-sm font-semibold" style={{ color: selectedStart ? "var(--ink)" : "var(--ink-3)" }}>
                {selectedStart ? fmtShort(toStr(selectedStart)) : t.chooseStartDate}
              </span>
            </button>
            <div className="my-3 w-px" style={{ background: "var(--line-2)" }} />
            <button className="flex flex-1 flex-col items-start justify-center px-6 transition-colors hover:bg-paper"
              style={{ minHeight: "64px" }} onClick={() => openFor("end")}>
              <span className="eyebrow mb-0.5">{t.returnDate}</span>
              <span className="text-sm font-semibold" style={{ color: selectedEnd ? "var(--ink)" : "var(--ink-3)" }}>
                {selectedEnd ? fmtShort(toStr(selectedEnd)) : t.chooseEndDate}
              </span>
            </button>
            <div className="my-3 w-px" style={{ background: "var(--line-2)" }} />
            <div className="flex flex-1 flex-col items-start justify-center px-6" style={{ minHeight: "64px" }}>
              <span className="eyebrow mb-0.5">{t.locationLabel}</span>
              <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                <MapPin className="size-3.5 text-primary" /> Tunis
              </span>
            </div>
            <div className="flex items-center p-2.5">
              <button onClick={onSearch} disabled={!canSearch}
                className="flex h-[52px] items-center gap-2 px-7 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40"
                style={{ background: "#B7452B", borderRadius: "999px", whiteSpace: "nowrap" }}>
                {t.seeAvailableCars}
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          {/* ── Mobile / tablet card (<lg) ── */}
          <div className="flex lg:hidden w-full flex-col overflow-hidden"
            style={{ background: "white", borderRadius: "16px", boxShadow: "0 20px 50px -20px rgba(26,23,19,0.35), 0 8px 16px rgba(26,23,19,0.08)" }}>
            <div className="grid grid-cols-2">
              <button className="flex flex-col items-start p-4 transition-colors hover:bg-paper"
                style={{ borderRight: "1px solid var(--line-2)", borderBottom: "1px solid var(--line-2)" }}
                onClick={() => openFor("start")}>
                <span className="eyebrow mb-1 flex items-center gap-1"><CalendarDays className="size-3" /> {t.pickupDate}</span>
                <span className="text-sm font-semibold" style={{ color: selectedStart ? "var(--ink)" : "var(--ink-3)" }}>
                  {selectedStart ? fmtShort(toStr(selectedStart)) : t.chooseStartDate}
                </span>
              </button>
              <button className="flex flex-col items-start p-4 transition-colors hover:bg-paper"
                style={{ borderBottom: "1px solid var(--line-2)" }}
                onClick={() => openFor("end")}>
                <span className="eyebrow mb-1 flex items-center gap-1"><CalendarDays className="size-3" /> {t.returnDate}</span>
                <span className="text-sm font-semibold" style={{ color: selectedEnd ? "var(--ink)" : "var(--ink-3)" }}>
                  {selectedEnd ? fmtShort(toStr(selectedEnd)) : t.chooseEndDate}
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--line-2)" }}>
              <MapPin className="size-4 shrink-0 text-primary" />
              <div>
                <span className="eyebrow block">{t.locationLabel}</span>
                <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Tunis</span>
              </div>
            </div>
            <div className="p-3">
              <button onClick={onSearch} disabled={!canSearch}
                className="flex w-full h-12 items-center justify-center gap-2 text-sm font-semibold text-white transition-all disabled:opacity-40"
                style={{ background: "#B7452B", borderRadius: "999px" }}>
                {t.seeAvailableCars}
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </PopoverAnchor>

      {calendarPopover}
    </Popover>
  );
}

// ─── Reassurance Band ─────────────────────────────────────────────────────────

// ─── How It Works ────────────────────────────────────────────────────────────

function HowItWorks() {
  const { t } = useLang();
  const steps = [
    {
      n: "01",
      title: t.step01Title,
      desc: t.step01Desc,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-5">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
    },
    {
      n: "02",
      title: t.step02Title,
      desc: t.step02Desc,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-5">
          <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h10l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
          <circle cx="7.5" cy="17.5" r="2.5" /><circle cx="16.5" cy="17.5" r="2.5" />
        </svg>
      ),
    },
    {
      n: "03",
      title: t.step03Title,
      desc: t.step03Desc,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-5">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
    },
  ];

  return (
    <section style={{ background: "var(--paper-2)" }} className="py-12 md:py-20">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <div className="mb-8 md:mb-14 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">{t.howEyebrow}</p>
            <h2 className="text-[clamp(28px,4vw,44px)] font-medium leading-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}>
              {t.howTitle}
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed" style={{ color: "var(--ink-3)" }}>
            {t.howSubtitle}
          </p>
        </div>

        <div className="grid gap-px md:grid-cols-3" style={{ background: "var(--line-2)" }}>
          {steps.map((step, i) => (
            <div
              key={step.n}
              className="relative flex flex-col justify-between overflow-hidden p-5 md:p-8"
              style={{ background: i === 1 ? "var(--paper-3)" : "var(--paper-2)", minHeight: "220px" }}
            >
              {/* Watermark number */}
              <span
                className="pointer-events-none absolute right-4 top-2 select-none font-medium leading-none"
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: "96px",
                  color: i === 1 ? "rgba(26,23,19,0.06)" : "rgba(26,23,19,0.05)",
                }}
              >
                {step.n}
              </span>

              {/* Icon */}
              <div
                className="mb-6 grid size-10 place-items-center"
                style={{
                  background: i === 0 ? "#B7452B" : "white",
                  color: i === 0 ? "white" : "var(--ink-2)",
                  borderRadius: "10px",
                  border: i === 0 ? "none" : "1px solid var(--line)",
                }}
              >
                {step.icon}
              </div>

              {/* Text */}
              <div>
                <p className="eyebrow mb-2">{t.stepLabel} {step.n}</p>
                <h3 className="mb-2 text-[20px] font-medium"
                  style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ink-3)" }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: "Ahmed Ben Salem",
    location: "Tunis",
    text: "Service impeccable ! J'ai loué une SUV pour mon voyage familial à Djerba. La voiture était en parfait état et l'équipe très professionnelle. Je recommande vraiment.",
    initials: "AB",
  },
  {
    name: "Fatma Mansouri",
    location: "Sfax",
    text: "Prix transparents, aucune mauvaise surprise à la facture. La réservation en ligne est simple et intuitive. Je reviendrai sans hésiter pour ma prochaine location.",
    initials: "FM",
  },
  {
    name: "Karim Hajri",
    location: "Sousse",
    text: "J'utilise Rentcar Group pour tous mes déplacements professionnels depuis deux ans. Toujours fiable, véhicules propres et modernes. Le support répond rapidement.",
    initials: "KH",
  },
];

function Testimonials() {
  const { t } = useLang();
  return (
    <section style={{ background: "var(--paper)" }} className="py-20">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        {/* Header */}
        <div className="mb-8 md:mb-14 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-3">{t.testimonialsEyebrow}</p>
            <h2
              className="text-[clamp(32px,4vw,48px)] font-medium leading-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}
            >
              {t.testimonialsTitle}
            </h2>
          </div>
          {/* Stars summary */}
          <div className="flex items-center gap-3">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} viewBox="0 0 20 20" fill="#B7452B" className="size-5">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>
              {t.testimonialsRating}
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className="flex flex-col justify-between p-8"
              style={{
                background: i === 1 ? "#B7452B" : "white",
                borderRadius: "12px",
                border: i === 1 ? "none" : "1px solid var(--line-2)",
              }}
            >
              {/* Quote mark */}
              <div>
                <span
                  className="mb-4 block text-5xl font-black leading-none"
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    color: i === 1 ? "rgba(255,255,255,0.25)" : "var(--line)",
                  }}
                >
                  "
                </span>
                {/* Stars */}
                <div className="mb-4 flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} viewBox="0 0 20 20" fill={i === 1 ? "rgba(255,255,255,0.9)" : "#B7452B"} className="size-4">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p
                  className="mb-8 text-[15px] leading-relaxed"
                  style={{ color: i === 1 ? "rgba(255,255,255,0.85)" : "var(--ink-2)" }}
                >
                  {t.text}
                </p>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className="grid size-10 shrink-0 place-items-center text-sm font-semibold"
                  style={{
                    borderRadius: "999px",
                    background: i === 1 ? "rgba(255,255,255,0.2)" : "var(--accent-tint)",
                    color: i === 1 ? "white" : "#B7452B",
                  }}
                >
                  {t.initials}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: i === 1 ? "white" : "var(--ink)" }}
                  >
                    {t.name}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: i === 1 ? "rgba(255,255,255,0.6)" : "var(--ink-3)" }}
                  >
                    {t.location}, Tunisie
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Reassurance Band ─────────────────────────────────────────────────────────

function ReassuranceBand() {
  const { t } = useLang();
  const items = [
    { icon: "🛡️", label: t.reassuranceInsurance },
    { icon: "📞", label: t.reassuranceSupport },
    { icon: "∞", label: t.reassuranceKm },
    { icon: "✕", label: t.reassuranceCancel },
  ];
  return (
    <div style={{ background: "var(--ink)", color: "rgba(244,239,230,0.85)" }}>
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-0 px-4 py-8 md:grid-cols-4 md:px-8 md:py-10">
        {items.map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-3 border-r last:border-r-0 px-3 first:pl-0 last:pr-0 py-2 md:px-8 md:py-0"
            style={{ borderColor: "rgba(244,239,230,0.12)" }}>
            <span className="text-xl">{icon}</span>
            <span className="text-sm font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const { t } = useLang();
  return (
    <footer style={{ background: "var(--ink)", color: "rgba(244,239,230,0.7)" }}>
      <div className="mx-auto max-w-[1280px] px-8 py-16">
        <div className="mb-12 grid gap-10 border-b pb-12 md:grid-cols-2 lg:grid-cols-4"
          style={{ borderColor: "rgba(244,239,230,0.1)" }}>
          <div className="space-y-5">
            <Link to="/" className="flex items-center">
              <img src={logoImg} alt="Rentcar Group" style={{ height: "72px", width: "auto", borderRadius: "10px", background: "white", padding: "4px 8px" }} />
            </Link>
            <p className="text-sm leading-relaxed">
              {t.footerTagline}
            </p>
          </div>

          <div>
            <h4 className="mb-5 text-xs font-semibold uppercase tracking-widest text-white/50">{t.footerServices}</h4>
            <ul className="space-y-3">
              {[t.footerFleet, t.footerSupport247, t.footerPrivacyPolicy, t.footerContact].map((l) => (
                <li key={l}>
                  <span className="text-sm">{l}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-xs font-semibold uppercase tracking-widest text-white/50">{t.footerDestinations}</h4>
            <ul className="space-y-3">
              {["Tunis", "Sousse", "Hammamet", "Djerba"].map((l) => (
                <li key={l}>
                  <span className="text-sm">{l}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-xs font-semibold uppercase tracking-widest text-white/50">{t.footerContact}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Phone className="size-4 shrink-0 mt-0.5" style={{ color: "#B7452B" }} />
                <span>
                  <a href="tel:+21671854367" className="transition-colors hover:text-white block">+216 71 854 367</a>
                  <a href="tel:+21626778392" className="transition-colors hover:text-white block">+216 26 778 392</a>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0" style={{ color: "#B7452B" }} />
                <a href="mailto:rentcargroup@gmail.com" className="transition-colors hover:text-white">rentcargroup@gmail.com</a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="size-4 shrink-0 mt-0.5" style={{ color: "#B7452B" }} />
                <span>Rue Ibn Jazzar, Angle route Gammarth, Tunisie</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 text-xs md:flex-row">
          <p>© {new Date().getFullYear()} {t.footerCopyright}</p>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-white">{t.footerPrivacy}</a>
            <a href="#" className="transition-colors hover:text-white">{t.footerCgu}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

export function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, isRtl } = useLang();
  const [scrolled, setScrolled] = useState(false);

  const [localStart, setLocalStart] = useState(searchParams.get("start") ?? "");
  const [localEnd, setLocalEnd] = useState(searchParams.get("end") ?? "");

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const setDates = (start: string, end: string) => {
    setLocalStart(start);
    setLocalEnd(end);
  };

  function goToFleet() {
    if (localStart && localEnd) navigate(`/fleet?start=${localStart}&end=${localEnd}`);
    else navigate("/fleet");
  }

  const { data: allCars = [], isLoading } = useAllCars();
  const featuredCars = allCars.slice(0, 4);

  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }} dir={isRtl ? "rtl" : undefined}>
      {/* ── Transparent header overlaying hero ── */}
      <div
        className="sticky top-0 z-40"
        style={{ background: "rgba(244,239,230,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--line-2)" }}
      >
        <nav className="mx-auto flex max-w-[1280px] items-center justify-between px-8" style={{ height: "72px" }}>
          <Link to="/" className="flex items-center">
            <img src={logoImg} alt="Rentcar Group" style={{ height: "110px", width: "auto" }} />
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link
              to="/fleet"
              className="transition-opacity hover:opacity-70"
              style={{ color: "var(--ink-2)" }}
            >
              {t.fleetNav}
            </Link>
            <a
              href="#fleet"
              className="transition-opacity hover:opacity-70"
              style={{ color: "var(--ink-2)" }}
            >
              {t.chooseVehicle}
            </a>
          </div>

          <HeaderActions overlay={false} />
        </nav>
      </div>

      <main>
        {/* ── Hero ── */}
        <section
          className="relative -mt-[72px] overflow-hidden"
          style={{ minHeight: "95vh" }}
        >
          {/* Cinematic background */}
          <img
            src={fleetHero}
            alt="Flotte Rentcar Group — Tunisie"
            className="absolute inset-0 h-full w-full object-cover scale-110"
          />
          {/* Dark gradient overlay — bottom heavy */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, rgba(26,23,19,0.25) 0%, rgba(26,23,19,0.15) 40%, rgba(26,23,19,0.75) 100%)" }}
          />

          {/* Hero content — bottom-aligned */}
          <div
            className="relative z-10 mx-auto flex max-w-[1280px] flex-col justify-end px-8 pb-20"
            style={{ minHeight: "95vh" }}
          >
            <div className="max-w-3xl space-y-6">
              {/* Eyebrow */}
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "rgba(244,239,230,0.8)" }}
              >
                {t.heroEyebrow}
              </p>

              {/* Title */}
              <h1
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: "clamp(48px, 7vw, 96px)",
                  fontWeight: 300,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.05,
                  color: "white",
                  textWrap: "balance",
                } as React.CSSProperties}
              >
                {t.heroMainTitle}
              </h1>

              {/* Subtitle */}
              <p className="max-w-xl text-[17px] leading-[1.55]" style={{ color: "rgba(244,239,230,0.82)" }}>
                {t.heroMainSubtitle}
              </p>

              {/* Search bar */}
              <div className="w-full max-w-3xl">
                <HeroSearchBar
                  startDate={localStart}
                  endDate={localEnd}
                  onDatesChange={setDates}
                  onSearch={goToFleet}
                />
              </div>

              {/* Trust strip */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
                {[
                  { icon: "🛡️", label: t.trustInsurance },
                  { icon: "∞", label: t.trustKm },
                  { icon: "📞", label: t.trustSupport },
                  { icon: "✕", label: t.trustCancel },
                ].map(({ icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-[13px]"
                    style={{ color: "rgba(244,239,230,0.75)" }}>
                    <span>{icon}</span>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce">
            <ChevronDown className="size-6" style={{ color: "rgba(244,239,230,0.5)" }} />
          </div>
        </section>

        {/* ── Stats strip ── */}
        <div style={{ background: "white", borderBottom: "1px solid var(--line-2)" }}>
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-8 py-5">
            {[
              { value: t.statsCarsValue, label: t.statsCarsLabel },
              { value: t.statsFromValue, label: t.statsFromLabel },
              { value: t.statsWhatsappValue, label: t.statsWhatsappLabel },
              { value: t.statsClientsValue, label: t.statsClientsLabel },
            ].map(({ value, label }, i) => (
              <div key={label} className={cn("flex items-center gap-4", i > 0 && "border-l pl-6 md:pl-8")}
                style={{ borderColor: "var(--line-2)" }}>
                <div>
                  <p className="text-[15px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#B7452B" }}>
                    {value}
                  </p>
                  <p className="text-xs" style={{ color: "var(--ink-3)" }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Featured Cars ── */}
        <section style={{ background: "var(--paper)" }} className="py-20">
          <div className="mx-auto max-w-[1280px] px-8">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-2" style={{ color: "var(--ink-3)" }}>NOTRE FLOTTE</p>
                <h2
                  className="text-[clamp(26px,3vw,36px)] font-medium"
                  style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}
                >
                  Des véhicules pour chaque besoin.
                </h2>
              </div>
              <Link
                to="/fleet"
                className="flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70"
                style={{ color: "#B7452B" }}
              >
                {t.viewFleetPage} <ArrowRight className="size-4" />
              </Link>
            </div>

            {isLoading ? (
              <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} style={{ borderRadius: "14px", aspectRatio: "4/3", background: "var(--paper-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
                {featuredCars.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            )}

            <div className="mt-10 text-center">
              <Link
                to="/fleet"
                className="inline-flex h-[52px] items-center gap-2 px-8 text-sm font-semibold transition-all hover:-translate-y-0.5"
                style={{ background: "var(--ink)", color: "var(--paper)", borderRadius: "999px" }}
              >
                Voir toute la flotte · {allCars.length} véhicules
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <HowItWorks />

        {/* ── Testimonials ── */}
        {/* <Testimonials /> */}

        {/* Separator */}
        <div className="mx-auto max-w-[1280px] px-8">
          <div style={{ height: "1px", background: "var(--line-2)" }} />
        </div>

        {/* ── CTA ── */}
        <section style={{ background: "var(--paper)" }} className="py-16">
          <div className="mx-auto max-w-[1280px] px-8">
            <div
              className="relative overflow-hidden px-10 py-16 text-center md:px-20"
              style={{ background: "var(--ink)", borderRadius: "20px" }}
            >
              {/* Decorative terracotta circle */}
              <div
                className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full opacity-20"
                style={{ background: "#B7452B" }}
              />
              <div
                className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full opacity-10"
                style={{ background: "#B7452B" }}
              />

              <p className="eyebrow mb-4" style={{ color: "rgba(244,239,230,0.5)" }}>{t.ctaEyebrow}</p>
              <h2
                className="mb-4 text-[clamp(28px,4vw,48px)] font-medium leading-tight text-white"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {t.ctaTitle}
              </h2>
              <p className="mx-auto mb-8 max-w-md text-[15px] leading-relaxed"
                style={{ color: "rgba(244,239,230,0.65)" }}>
                {t.ctaDesc}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link to="/fleet"
                  className="inline-flex h-[52px] items-center gap-2 px-8 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                  style={{ background: "#B7452B", borderRadius: "999px", boxShadow: "var(--shadow-md)" }}>
                  {t.ctaViewFleet}
                  <ArrowRight className="size-4" />
                </Link>
                <a href="tel:+21671854367"
                  className="inline-flex h-[52px] items-center gap-2 px-8 text-sm font-semibold transition-all hover:-translate-y-0.5"
                  style={{ background: "rgba(244,239,230,0.08)", color: "rgba(244,239,230,0.85)", borderRadius: "999px", border: "1px solid rgba(244,239,230,0.15)" }}>
                  <Phone className="size-4" /> {t.ctaCall}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ─── Fleet Page ───────────────────────────────────────────────────────────────

export function FleetPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, isRtl } = useLang();
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc">("default");

  const startDate = searchParams.get("start") ?? "";
  const endDate = searchParams.get("end") ?? "";
  const hasDateFilter = !!(startDate && endDate && startDate <= endDate);

  const setDates = (start: string, end: string) => {
    if (start && end) setSearchParams({ start, end }, { replace: true });
    else setSearchParams({}, { replace: true });
  };

  const { data: allCars = [], isLoading: allLoading } = useAllCars();
  const { data: availableCars = [], isLoading: availLoading } = useAvailableCars(startDate, endDate);

  const cars = hasDateFilter ? availableCars : allCars;
  const isLoading = hasDateFilter ? availLoading : allLoading;

  const filtered = useMemo(() => {
    const list = typeFilter === "ALL" ? cars : cars.filter((c) => c.type === typeFilter);
    if (sortBy === "price_asc") return [...list].sort((a, b) => a.price_per_day - b.price_per_day);
    if (sortBy === "price_desc") return [...list].sort((a, b) => b.price_per_day - a.price_per_day);
    return list;
  }, [cars, typeFilter, sortBy]);

  const dateSuffix = hasDateFilter ? `?start=${startDate}&end=${endDate}` : "";

  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }} dir={isRtl ? "rtl" : undefined}>
      <Header />

      <main>
        {/* Page header */}
        <div style={{ background: "white", borderBottom: "1px solid var(--line-2)" }} className="py-12">
          <div className="mx-auto max-w-[1280px] px-8">
            <p className="eyebrow mb-2" style={{ color: "var(--ink-3)" }}>{t.fleetPageEyebrow}</p>
            <h1
              className="mb-4 text-[clamp(32px,4vw,52px)] font-medium leading-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}
            >
              {t.fleetPageTitle}
            </h1>
            <p className="mb-8 max-w-xl text-[15px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
              {t.fleetPageSubtitle}
            </p>

            {/* Date filter */}
            <div className="flex flex-wrap items-center gap-4">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={setDates}
                variant="inline"
              />
              {hasDateFilter && (
                <button
                  onClick={() => setSearchParams({}, { replace: true })}
                  className="text-sm font-medium transition-opacity hover:opacity-60"
                  style={{ color: "var(--ink-3)" }}
                >
                  × Effacer les dates
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Listing */}
        <section className="py-14">
          <div className="mx-auto max-w-[1280px] px-8">
            {/* Filter pills + count */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm font-medium" style={{ color: "var(--ink-3)" }}>
                {isLoading ? "…" : filtered.length} {t.carsAvailable}
                {hasDateFilter && (
                  <span className="ml-1">· {fmtShort(startDate)} → {fmtShort(endDate)}</span>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="eyebrow mr-1" style={{ color: "var(--ink-3)" }}>{t.filterType}</span>
                  {(["ALL", ...CAR_TYPES] as string[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className="h-8 rounded-full px-3 text-xs font-medium transition-colors"
                      style={typeFilter === type
                        ? { background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink)" }
                        : { background: "transparent", color: "var(--ink-2)", border: "1px solid var(--line)" }}
                    >
                      {type === "ALL" ? t.all : type}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="eyebrow mr-1" style={{ color: "var(--ink-3)" }}>{t.price}</span>
                  {(["default", "price_asc", "price_desc"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      className="h-8 rounded-full px-3 text-xs font-medium transition-colors"
                      style={sortBy === s
                        ? { background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink)" }
                        : { background: "transparent", color: "var(--ink-2)", border: "1px solid var(--line)" }}
                    >
                      {s === "default" ? t.sortDefault : s === "price_asc" ? t.sortPriceAsc : t.sortPriceDesc}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-10 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} style={{ borderRadius: "14px", aspectRatio: "4/3", background: "var(--paper-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-24 text-center">
                <p className="text-xl font-semibold" style={{ color: "var(--ink)" }}>{t.noCarsTitle}</p>
                <p className="mt-2" style={{ color: "var(--ink-3)" }}>{t.noCarsHint}</p>
              </div>
            ) : (
              <div className="grid gap-10 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((car) => (
                  <CarCard key={car.id} car={car} dateSuffix={dateSuffix} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ─── Shared header actions (DRY) ──────────────────────────────────────────────

function HeaderActions({ overlay }: { overlay: boolean }) {
  const { lang, setLang, t } = useLang();
  const { user, signOut } = useAuth();
  const [langOpen, setLangOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const LANGS: { code: Lang; label: string }[] = [
    { code: "fr", label: "Français" },
    { code: "en", label: "English" },
    { code: "ar", label: "العربية" },
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setLangOpen(!langOpen)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ color: overlay ? "rgba(255,255,255,0.8)" : "var(--ink-3)" }}
        >
          <Globe className="size-3.5" />
          {lang.toUpperCase()}
          <ChevronDown className="size-3" />
        </button>
        {langOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-36 overflow-hidden py-1 shadow-lg"
            style={{ background: "white", borderRadius: "10px", border: "1px solid var(--line-2)", zIndex: 50 }}
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setLangOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-paper"
                style={{ color: lang === l.code ? "#B7452B" : "var(--ink-2)", fontWeight: lang === l.code ? 600 : 400 }}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {user ? (
        user.role === "ADMIN" || user.role === "MANAGER" ? (
          <Button asChild variant="hero" size="sm"><Link to="/admin">Admin</Link></Button>
        ) : (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-white/10"
              style={{ color: overlay ? "rgba(255,255,255,0.9)" : "var(--ink-2)" }}
            >
              <span
                className="flex size-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: "#B7452B" }}
              >
                {((user.profile as { name?: string })?.name ?? user.email).charAt(0).toUpperCase()}
              </span>
              <span className="max-w-[120px] truncate text-sm font-medium">
                {(user.profile as { name?: string })?.name ?? user.email}
              </span>
              <ChevronDown className="size-3 opacity-60" />
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden py-1 shadow-lg"
                  style={{ background: "white", borderRadius: "10px", border: "1px solid var(--line-2)" }}
                >
                  <Link
                    to="/account"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-paper"
                    style={{ color: "var(--ink-2)" }}
                  >
                    <UserRound className="size-4" />
                    Mon compte
                  </Link>
                  <button
                    onClick={() => { setUserMenuOpen(false); signOut(); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-paper"
                    style={{ color: "var(--ink-3)" }}
                  >
                    <LogOut className="size-4" />
                    {t.logout}
                  </button>
                </div>
              </>
            )}
          </div>
        )
      ) : (
        <>
          <Button asChild variant="ghost" size="sm"
            style={{ color: overlay ? "rgba(255,255,255,0.85)" : "var(--ink-2)" }}>
            <Link to="/login">{t.login}</Link>
          </Button>
          <Button asChild variant="hero" size="sm"><Link to="/register">{t.createAccount}</Link></Button>
        </>
      )}
    </div>
  );
}

// ─── Car Detail Page ──────────────────────────────────────────────────────────

export function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLang();
  const [activeImg, setActiveImg] = useState(0);

  const startDate = searchParams.get("start") ?? "";
  const endDate = searchParams.get("end") ?? "";
  const days = startDate && endDate ? diffDays(startDate, endDate) : 0;

  const { data: car, isLoading } = useCar(id ?? "");
  const { data: bookedRanges = [] } = useCarBookedRanges(id ?? "");
  const { data: myReservations = [] } = useMyReservations(user?.id);
  const activeReservation = myReservations.find((r) => r.status === "PENDING" || r.status === "CONFIRMED");
  const createReservation = useCreateReservation();
  const { data: settings } = useAgencySettings();
  const returnHour = settings?.return_hour ?? "10:00";

  function handleDatesChange(start: string, end: string) {
    if (start && end) setSearchParams({ start, end }, { replace: true });
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const totalPrice = car ? days * car.price_per_day : 0;

  function handleReserveClick() {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    setDialogOpen(true);
  }

  async function handleConfirm() {
    if (!car || !user) return;
    setBookingError(null);
    try {
      await createReservation.mutateAsync({
        car_id: car.id,
        client_id: user.id,
        start_date: startDate,
        end_date: endDate,
      });
      setSuccess(true);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Erreur inattendue.");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--paper)" }}>
        <Header />
        <div className="flex items-center justify-center py-40">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="min-h-screen" style={{ background: "var(--paper)" }}>
        <Header />
        <div className="py-40 text-center" style={{ color: "var(--ink-3)" }}>Voiture introuvable.</div>
      </div>
    );
  }

  const specs: Array<[string, string | number]> = [
    [t.year, car.year],
    [t.fuel, car.fuel],
    [t.transmission, car.transmission],
    [t.seats, car.seats],
    [t.mileage, `${car.mileage.toLocaleString("fr-TN")} km`],
    [t.color, car.color],
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>
      <Header />
      <main className="mx-auto max-w-[1280px] px-8 py-8">
        {/* Back link */}
        <Link
          to={startDate && endDate ? `/fleet?start=${startDate}&end=${endDate}` : "/fleet"}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70"
          style={{ color: "var(--ink-3)" }}
        >
          <ArrowLeft className="size-4" /> {t.backToFleet}
        </Link>

        {/* Page header */}
        <div className="mb-8">
          <p className="eyebrow mb-1">{car.brand} · {car.year} · {car.type}</p>
          <h1
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "clamp(40px, 5vw, 72px)",
              fontWeight: 500,
              color: "var(--ink)",
              lineHeight: 1.1,
            }}
          >
            {car.model}
          </h1>
        </div>

        <div className="grid gap-14 lg:grid-cols-[1.6fr_1fr]">
          {/* Left column */}
          <div className="space-y-12">
            {/* Gallery — carousel */}
            <div className="flex flex-col gap-3">
              {/* Main image with arrows */}
              <div className="relative overflow-hidden" style={{ borderRadius: "16px", aspectRatio: "4/3", background: "var(--paper-2)" }}>
                <img
                  key={activeImg}
                  src={car.images[activeImg] || fleetHero}
                  alt={`${car.brand} ${car.model}`}
                  className="h-full w-full object-cover transition-opacity duration-300"
                  width={800} height={600}
                />
                {car.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImg((i) => (i - 1 + car.images.length) % car.images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/65"
                      aria-label="Image précédente"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <button
                      onClick={() => setActiveImg((i) => (i + 1) % car.images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/65"
                      aria-label="Image suivante"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                    {/* Dots */}
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
                      {car.images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImg(i)}
                          style={{
                            height: "5px",
                            width: i === activeImg ? "18px" : "6px",
                            borderRadius: "999px",
                            background: i === activeImg ? "white" : "rgba(255,255,255,0.45)",
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
                  {car.images.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className="shrink-0 overflow-hidden transition-all"
                      style={{
                        width: "72px", height: "54px",
                        borderRadius: "10px",
                        outline: i === activeImg ? "2px solid var(--ink)" : "2px solid transparent",
                        outlineOffset: "2px",
                        opacity: i === activeImg ? 1 : 0.55,
                      }}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* About */}
            {car.notes && (
              <div>
                <h2 className="mb-3 text-[22px] font-medium" style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}>
                  {t.carAbout}
                </h2>
                <p className="text-[17px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {car.notes}
                </p>
              </div>
            )}

            {/* Specs */}
            <div>
              <h2 className="mb-4 text-[22px] font-medium" style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}>
                {t.carSpecs}
              </h2>
              <div className="grid auto-cols-fr grid-cols-2 md:grid-cols-3">
                {specs.map(([k, v], i) => (
                  <div
                    key={k}
                    className="py-4 pr-4"
                    style={{
                      borderTop: i >= 3 ? `1px solid var(--line-2)` : `1px solid var(--line-2)`,
                      borderBottom: `1px solid var(--line-2)`,
                    }}
                  >
                    <p className="eyebrow mb-1">{k}</p>
                    <p className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — sticky booking card */}
          <aside>
            <div
              className="sticky space-y-5 p-6"
              style={{
                top: "calc(72px + 20px)",
                background: "white",
                borderRadius: "12px",
                boxShadow: "var(--shadow-md)",
              }}
            >
              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span
                  className="text-[32px] font-semibold"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ink)" }}
                >
                  {car.price_per_day}
                </span>
                <span className="text-sm" style={{ color: "var(--ink-3)" }}>{t.perDay}</span>
              </div>

              <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                {t.chooseDatesHint}
              </p>

              {activeReservation && (
                <div className="flex items-start gap-3 rounded-xl p-3 text-sm"
                  style={{ background: "#FEF3C7", border: "1px solid #FDE68A" }}>
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
                  <div>
                    <p className="font-semibold text-amber-900">{t.activeReservationWarning}</p>
                    <p className="text-amber-800">
                      {activeReservation.car.brand} {activeReservation.car.model} — {activeReservation.status === "PENDING" ? t.pendingStatus.toLowerCase() : t.confirmedStatus.toLowerCase()}
                    </p>
                  </div>
                </div>
              )}

              {/* Date picker */}
              <div>
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onChange={handleDatesChange}
                  bookedRanges={bookedRanges}
                  className="w-full"
                />
              </div>

              {/* Breakdown */}
              {days > 0 ? (
                <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--line-2)" }}>
                  <div className="flex justify-between text-sm" style={{ color: "var(--ink-3)" }}>
                    <span>{car.price_per_day} TND × {days} {t.days}</span>
                    <span className="font-semibold" style={{ color: "var(--ink)" }}>{days * car.price_per_day} TND</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold" style={{ borderColor: "var(--line-2)", color: "var(--ink)" }}>
                    <span>{t.total}</span>
                    <span className="text-lg" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#B7452B" }}>
                      {totalPrice} TND
                    </span>
                  </div>
                </div>
              ) : (
                <p className="border-t pt-4 text-center text-sm" style={{ borderColor: "var(--line-2)", color: "var(--ink-3)" }}>
                  Sélectionnez vos dates pour voir le total
                </p>
              )}

              <button
                onClick={handleReserveClick}
                disabled={!startDate || !endDate}
                className="w-full py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: "#B7452B", borderRadius: "999px", boxShadow: "var(--shadow-md)" }}
              >
                {startDate && endDate ? t.reserveNow : "Choisissez vos dates"}
              </button>

              {endDate && (
                <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs" style={{ background: "var(--paper-2)", color: "var(--ink-3)" }}>
                  <span className="mt-px text-base leading-none">⏰</span>
                  <span>
                    Retour le <strong style={{ color: "var(--ink-2)" }}>{fmtDate(nextDay(endDate))}</strong> avant <strong style={{ color: "var(--ink-2)" }}>{returnHour}</strong>.
                    Tout retard peut entraîner des frais supplémentaires.
                  </span>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o && !createReservation.isPending) { setDialogOpen(false); setSuccess(false); setBookingError(null); } }}>
        <DialogContent>
          {success ? (
            <div className="space-y-4 py-4 text-center">
              <CheckCircle2 className="mx-auto size-14 text-green-600" />
              <DialogHeader>
                <DialogTitle className="text-center" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  {t.bookingSuccess}
                </DialogTitle>
                <DialogDescription className="text-center">{t.bookingSuccessMsg}</DialogDescription>
              </DialogHeader>
              <Button variant="hero" className="w-full" onClick={() => navigate("/account")}>
                {t.viewAccount}
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{t.confirmReservation}</DialogTitle>
                <DialogDescription>{t.confirmQuestion}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 rounded-xl p-4 text-sm" style={{ background: "var(--paper-2)" }}>
                <p><span className="font-semibold">Voiture : </span>{car.brand} {car.model}</p>
                <p><span className="font-semibold">Dates : </span>{fmtDate(startDate)} → {fmtDate(endDate)} ({days} {t.days})</p>
                <p><span className="font-semibold">{t.total} : </span>
                  <strong style={{ color: "#B7452B", fontFamily: "'JetBrains Mono', monospace" }}>{totalPrice} TND</strong>
                </p>
                {endDate && (
                  <p className="border-t pt-2 text-xs" style={{ borderColor: "var(--line-2)", color: "var(--ink-3)" }}>
                    ⏰ Retour le <strong>{fmtDate(nextDay(endDate))}</strong> avant <strong>{returnHour}</strong>.
                  </p>
                )}
              </div>
              {bookingError && (
                <p className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="size-4" />{bookingError}
                </p>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={createReservation.isPending}>
                  {t.cancel}
                </Button>
                <Button variant="hero" onClick={handleConfirm} disabled={createReservation.isPending}>
                  {createReservation.isPending ? "…" : t.confirm}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function translateAuthError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (msg.includes("Email not confirmed")) return "Veuillez confirmer votre email avant de vous connecter.";
  if (msg.includes("User already registered")) return "Un compte existe déjà avec cet email.";
  if (msg.includes("Password should be at least")) return "Le mot de passe doit contenir au moins 6 caractères.";
  if (msg.includes("Unable to validate email address")) return "Adresse email invalide.";
  if (msg.includes("Email rate limit exceeded")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (msg.includes("For security purposes")) return "Trop de tentatives. Réessayez dans quelques secondes.";
  return "Une erreur est survenue. Réessayez.";
}

// ─── Auth Page ────────────────────────────────────────────────────────────────

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { signIn, signUpClient, user, loading: authLoading } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isRegister = mode === "register";
  const redirect = searchParams.get("redirect") ?? (location.state as { from?: Location })?.from?.pathname ?? "/account";

  const [form, setForm] = useState({ name: "", email: "", phone: "", cin: "", permis_id: "", address: "", password: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && !isRegister) {
      navigate(user.role === "ADMIN" || user.role === "MANAGER" ? "/admin" : redirect, { replace: true });
    }
  }, [user, authLoading, isRegister, navigate, redirect]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
  };

  const setCin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 8);
    setForm((f) => ({ ...f, cin: val }));
    setFieldErrors((fe) => ({ ...fe, cin: undefined }));
  };

  function validate(): boolean {
    const e: Partial<Record<keyof typeof form, string>> = {};
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email invalide.";
    if (!form.password) e.password = "Mot de passe requis.";
    if (isRegister) {
      if (!form.name.trim() || form.name.trim().length < 2) e.name = "Minimum 2 caractères.";
      if (!form.phone.trim()) e.phone = "Téléphone requis.";
      if (form.cin.length !== 8) e.cin = "Le CIN doit contenir 8 chiffres.";
      if (!form.permis_id.trim()) e.permis_id = "N° de permis requis.";
      if (form.password.length < 8) e.password = "Minimum 8 caractères.";
      if (form.password !== form.confirmPassword) e.confirmPassword = "Les mots de passe ne correspondent pas.";
    }
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setGlobalError(null);
    setLoading(true);
    try {
      if (isRegister) {
        const { error } = await signUpClient({ ...form });
        if (error) { setGlobalError(translateAuthError(error)); return; }
        setEmailSent(true);
      } else {
        const { error } = await signIn(form.email, form.password);
        if (error) { setGlobalError(translateAuthError(error)); return; }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotError("Email invalide.");
      return;
    }
    setForgotError(null);
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) { setForgotError(translateAuthError(error.message)); return; }
    setForgotSent(true);
  }

  if (emailSent) {
    return (
      <div className="min-h-screen" style={{ background: "var(--paper)" }}>
        <Header />
        <main className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-md">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full text-2xl" style={{ background: "var(--accent-tint)" }}>✓</div>
            <h2 className="mb-2 text-[28px] font-medium" style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}>{t.accountCreated}</h2>
            <p className="mb-6 text-sm" style={{ color: "var(--ink-3)" }}>{t.emailConfirmNotice}</p>
            <Button asChild variant="hero" className="w-full"><Link to="/login">{t.login}</Link></Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>
      <Header />
      <main className="mx-auto max-w-[520px] px-4 py-16">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: "var(--ink-3)" }}>
          <ArrowLeft className="size-4" /> Retour
        </Link>

        <div className="rounded-xl bg-white p-10 shadow-md">
          {/* ── Forgot password mode ── */}
          {forgotMode ? (
            forgotSent ? (
              <div className="text-center">
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full text-xl" style={{ background: "var(--accent-tint)" }}>✓</div>
                <h2 className="mb-2 text-[26px] font-medium" style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}>Email envoyé</h2>
                <p className="mb-6 text-sm" style={{ color: "var(--ink-3)" }}>
                  Un lien de réinitialisation a été envoyé à <strong>{forgotEmail}</strong>. Vérifiez vos spams si vous ne le voyez pas.
                </p>
                <button onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(""); }} className="text-sm font-semibold hover:underline" style={{ color: "#B7452B" }}>
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => setForgotMode(false)} className="mb-6 flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: "var(--ink-3)" }}>
                  <ArrowLeft className="size-4" /> Retour
                </button>
                <h1 className="mb-2 text-[34px] font-medium leading-tight" style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}>
                  Mot de passe oublié
                </h1>
                <p className="mb-8 text-sm" style={{ color: "var(--ink-3)" }}>
                  Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </p>
                <form onSubmit={handleForgot} className="space-y-4" noValidate>
                  <FieldInput label={t.email} type="email" value={forgotEmail} onChange={(e) => { setForgotEmail(e.target.value); setForgotError(null); }} required />
                  {forgotError && <p className="flex items-center gap-2 text-xs text-destructive"><XCircle className="size-3.5" />{forgotError}</p>}
                  <button type="submit" disabled={forgotLoading} className="h-[52px] w-full rounded-full text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50" style={{ background: "#B7452B", boxShadow: "var(--shadow-md)" }}>
                    {forgotLoading ? "…" : "Envoyer le lien"}
                  </button>
                </form>
              </>
            )
          ) : (
            /* ── Normal login / register mode ── */
            <>
              <h1 className="mb-2 text-[40px] font-medium leading-tight" style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}>
                {isRegister ? t.createAccountTitle : t.welcomeBackTitle}
              </h1>
              <p className="mb-8 text-sm" style={{ color: "var(--ink-3)" }}>
                {isRegister ? t.registerSubtitle : t.loginSubtitle}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {isRegister && (
                  <FieldInput label={t.fullName} value={form.name} onChange={set("name")} error={fieldErrors.name} />
                )}
                <FieldInput label={t.email} type="email" value={form.email} onChange={set("email")} error={fieldErrors.email} />
                {isRegister && (
                  <>
                    <FieldInput label={t.phone} value={form.phone} onChange={set("phone")} error={fieldErrors.phone} />
                    <FieldInput label={t.cin} value={form.cin} onChange={setCin} maxLength={8} error={fieldErrors.cin} />
                    <FieldInput label={t.permisId} value={form.permis_id} onChange={set("permis_id")} error={fieldErrors.permis_id} />
                    <FieldInput label={t.address} value={form.address} onChange={set("address")} />
                  </>
                )}

                {/* Password with show/hide */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium" style={{ color: "var(--ink-2)" }}>{t.password}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={set("password")}
                      className="h-11 w-full rounded-md border bg-white px-3 pr-10 text-sm outline-none transition-all"
                      style={{ borderColor: fieldErrors.password ? "#ef4444" : "var(--line)", color: "var(--ink)" }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-3)" }}>
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
                  {isRegister && form.password.length > 0 && (() => {
                    const p = form.password;
                    const score = [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
                    const labels = ["Très faible", "Faible", "Moyen", "Fort", "Très fort"];
                    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
                    return (
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{ background: i < score ? colors[score] : "var(--line-2)" }} />
                          ))}
                        </div>
                        <p className="text-xs" style={{ color: colors[score] }}>{labels[score]}</p>
                      </div>
                    );
                  })()}
                </div>

                {isRegister && (
                  <FieldInput label={t.confirmPassword} type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={set("confirmPassword")} error={fieldErrors.confirmPassword} />
                )}

                {globalError && (
                  <p className="flex items-center gap-2 text-xs text-destructive"><XCircle className="size-3.5" />{globalError}</p>
                )}

                <button type="submit" disabled={loading} className="mt-2 h-[52px] w-full rounded-full text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50" style={{ background: "#B7452B", boxShadow: "var(--shadow-md)" }}>
                  {loading ? "…" : isRegister ? t.register : t.login}
                </button>

                {!isRegister && (
                  <div className="text-center">
                    <button type="button" onClick={() => setForgotMode(true)} className="text-sm hover:underline" style={{ color: "var(--ink-3)" }}>
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}

                <p className="text-center text-sm" style={{ color: "var(--ink-3)" }}>
                  {isRegister ? t.alreadyHaveAccount : t.noAccount}{" "}
                  <Link to={isRegister ? "/login" : "/register"} className="font-semibold hover:underline" style={{ color: "#B7452B" }}>
                    {isRegister ? t.login : t.createAccount}
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Reset Password Page ──────────────────────────────────────────────────────

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError("Minimum 6 caractères."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(translateAuthError(error.message)); return; }
    setDone(true);
    setTimeout(() => navigate("/login", { replace: true }), 2500);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>
      <Header />
      <main className="mx-auto max-w-[520px] px-4 py-16">
        <div className="rounded-xl bg-white p-10 shadow-md">
          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full text-xl" style={{ background: "var(--accent-tint)" }}>✓</div>
              <h2 className="mb-2 text-[28px] font-medium" style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}>Mot de passe mis à jour</h2>
              <p className="text-sm" style={{ color: "var(--ink-3)" }}>Redirection vers la connexion…</p>
            </div>
          ) : (
            <>
              <h1 className="mb-2 text-[36px] font-medium leading-tight" style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}>
                Nouveau mot de passe
              </h1>
              <p className="mb-8 text-sm" style={{ color: "var(--ink-3)" }}>Choisissez un nouveau mot de passe pour votre compte.</p>
              <form onSubmit={handleReset} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium" style={{ color: "var(--ink-2)" }}>Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      className="h-11 w-full rounded-md border bg-white px-3 pr-10 text-sm outline-none transition-all"
                      style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-3)" }}>
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <FieldInput label="Confirmer le mot de passe" type={showPassword ? "text" : "password"} value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(null); }} />
                {error && <p className="flex items-center gap-2 text-xs text-destructive"><XCircle className="size-3.5" />{error}</p>}
                <button type="submit" disabled={loading} className="h-[52px] w-full rounded-full text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50" style={{ background: "#B7452B", boxShadow: "var(--shadow-md)" }}>
                  {loading ? "…" : "Enregistrer le mot de passe"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function FieldInput({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium" style={{ color: "var(--ink-2)" }}>{label}</label>
      <input
        {...props}
        className="h-11 w-full rounded-md border bg-white px-3 text-sm outline-none transition-all"
        style={{ borderColor: error ? "#ef4444" : "var(--line)", color: "var(--ink)" }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Account Page ─────────────────────────────────────────────────────────────

export function AccountPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<"reservations" | "profile">("reservations");

  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const { data: reservations = [], isLoading: resLoading } = useMyReservations(user?.id);
  const cancelReservation = useCancelReservation();
  const updateProfile = useUpdateProfile();

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "" });
  const [saved, setSaved] = useState(false);

  const [pwMode, setPwMode] = useState(false);
  const [pwForm, setPwForm] = useState({ newPwd: "", confirmPwd: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  function startEdit() {
    if (!profile) return;
    setEditForm({ name: profile.name, phone: profile.phone, address: profile.address ?? "" });
    setEditMode(true);
  }

  async function saveProfile() {
    if (!user) return;
    try {
      await updateProfile.mutateAsync({ userId: user.id, data: editForm });
      setEditMode(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Erreur lors de la sauvegarde. Réessayez.");
    }
  }

  const setEdit = (key: keyof typeof editForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleChangePwd(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.newPwd.length < 6) { toast.error("Minimum 6 caractères."); return; }
    if (pwForm.newPwd !== pwForm.confirmPwd) { toast.error("Les mots de passe ne correspondent pas."); return; }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPwd });
    setPwLoading(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Mot de passe mis à jour.");
    setPwMode(false);
    setPwForm({ newPwd: "", confirmPwd: "" });
  }

  if (profileLoading || resLoading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--paper)" }}>
        <Header />
        <div className="flex items-center justify-center py-40">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const upcoming = reservations.filter((r) => r.status === "PENDING" || r.status === "CONFIRMED");
  const history = reservations.filter((r) => !["PENDING", "CONFIRMED"].includes(r.status));

  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>
      <Header />
      <main className="mx-auto max-w-[1280px] px-8 py-10">
        {/* Page header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-1">{t.helloGreeting}</p>
            <h1
              className="text-[40px] font-medium"
              style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}
            >
              {profile?.name ?? user?.email}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
              {t.memberSince} {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("fr-TN", { month: "long", year: "numeric" }) : "—"}
            </p>
          </div>

          {/* Segmented tab control */}
          <div
            className="flex items-center gap-1 p-1"
            style={{ background: "var(--paper-2)", borderRadius: "999px" }}
          >
            {(["reservations", "profile"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-5 py-1.5 text-sm font-medium transition-all"
                style={activeTab === tab
                  ? { background: "white", borderRadius: "999px", color: "var(--ink)", boxShadow: "var(--shadow-sm)" }
                  : { background: "transparent", color: "var(--ink-3)" }}
              >
                {tab === "reservations" ? t.reservationsTab : t.profileTab}
              </button>
            ))}
          </div>
        </div>

        {/* Reservations tab */}
        {activeTab === "reservations" && (
          <div className="space-y-8">
            {/* À venir */}
            <div>
              <h2 className="mb-4 text-[20px] font-medium" style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}>
                {t.upcomingReservations}
              </h2>
              {upcoming.length === 0 ? (
                <div
                  className="flex flex-col items-center gap-4 py-16 text-center"
                  style={{ border: "2px dashed var(--line-2)", borderRadius: "12px", background: "var(--paper-2)" }}
                >
                  <p className="font-medium" style={{ color: "var(--ink-2)" }}>{t.noUpcomingReservations}</p>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/fleet">{t.browseFleet}</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((r) => <ReservationRow key={r.id} r={r} onCancel={() => cancelReservation.mutate(r.id)} cancelling={cancelReservation.isPending} />)}
                </div>
              )}
            </div>

            {/* Historique */}
            {history.length > 0 && (
              <div>
                <h2 className="mb-4 text-[20px] font-medium" style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}>
                  {t.historyReservations}
                </h2>
                <div className="space-y-3">
                  {history.map((r) => <ReservationRow key={r.id} r={r} onCancel={() => { }} cancelling={false} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile tab */}
        {activeTab === "profile" && (
          <div className="max-w-2xl">
            <div className="rounded-xl bg-white p-8 shadow-sm">
              <h2 className="mb-6 text-[22px] font-medium" style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}>
                {t.personalInfo}
              </h2>
              {editMode ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldInput label={t.fullName} value={editForm.name} onChange={setEdit("name")} />
                    <FieldInput label={t.phone} value={editForm.phone} onChange={setEdit("phone")} />
                  </div>
                  <FieldInput label={t.address} value={editForm.address} onChange={setEdit("address")} />
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={saveProfile}
                      disabled={updateProfile.isPending}
                      className="rounded-full px-6 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                      style={{ background: "#B7452B" }}
                    >
                      {updateProfile.isPending ? "…" : t.saveProfile}
                    </button>
                    <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>{t.cancel}</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { label: t.fullName, value: profile?.name },
                      { label: t.email, value: profile?.email },
                      { label: t.phone, value: profile?.phone },
                      { label: t.cin, value: profile?.cin },
                      { label: t.permisId, value: profile?.permis_id },
                    ].map(({ label, value }) => value ? (
                      <div key={label}>
                        <p className="eyebrow mb-0.5">{label}</p>
                        <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{value}</p>
                      </div>
                    ) : null)}
                  </div>
                  {profile?.address && (
                    <div>
                      <p className="eyebrow mb-0.5">{t.address}</p>
                      <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{profile.address}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 pt-2">
                    <Button variant="outline" size="sm" onClick={startEdit}>{t.editProfile}</Button>
                    {saved && (
                      <span className="flex items-center gap-1.5 text-sm text-green-700">
                        <CheckCircle2 className="size-4" /> {t.saved}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Change password */}
              <div className="mt-6 border-t pt-6" style={{ borderColor: "var(--line-2)" }}>
                <button
                  onClick={() => { setPwMode((v) => !v); setPwForm({ newPwd: "", confirmPwd: "" }); }}
                  className="flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70"
                  style={{ color: pwMode ? "var(--ink-3)" : "#B7452B" }}
                >
                  {pwMode ? "× Annuler" : "Changer le mot de passe"}
                </button>
                {pwMode && (
                  <form onSubmit={handleChangePwd} className="mt-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium" style={{ color: "var(--ink-2)" }}>Nouveau mot de passe</label>
                        <div className="relative">
                          <input
                            type={showPw ? "text" : "password"}
                            value={pwForm.newPwd}
                            onChange={(e) => setPwForm((f) => ({ ...f, newPwd: e.target.value }))}
                            placeholder="Min. 6 caractères"
                            className="h-11 w-full rounded-md border bg-white px-3 pr-10 text-sm outline-none transition-all"
                            style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                          />
                          <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-3)" }}>
                            {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium" style={{ color: "var(--ink-2)" }}>Confirmer</label>
                        <input
                          type={showPw ? "text" : "password"}
                          value={pwForm.confirmPwd}
                          onChange={(e) => setPwForm((f) => ({ ...f, confirmPwd: e.target.value }))}
                          className="h-11 w-full rounded-md border bg-white px-3 text-sm outline-none transition-all"
                          style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="rounded-full px-6 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
                      style={{ background: "#B7452B" }}
                    >
                      {pwLoading ? "…" : "Enregistrer"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ReservationRow({ r, onCancel, cancelling }: {
  r: { id: string; car: { brand: string; model: string; images: string[] }; start_date: string; end_date: string; total_price: number; status: ReservationStatus; rejection_reason: string | null };
  onCancel: () => void;
  cancelling: boolean;
}) {
  const { t } = useLang();
  const cfg = STATUS_CONFIG[r.status];
  const days = diffDays(r.start_date, r.end_date);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  return (
    <div
      className="flex flex-wrap items-center gap-4 p-5"
      style={{ background: "white", borderRadius: "12px", border: `1px solid ${r.status === "REJECTED" ? "#FECACA" : "var(--line-2)"}` }}
    >
      {/* Thumbnail + info — clicking navigates to detail */}
      <Link
        to={`/account/reservation/${r.id}`}
        className="flex flex-1 items-center gap-4 min-w-0"
        style={{ textDecoration: "none" }}
      >
        <img
          src={r.car.images[0] || "/placeholder.svg"}
          alt={`${r.car.brand} ${r.car.model}`}
          className="shrink-0 object-cover"
          style={{ width: "140px", height: "96px", borderRadius: "8px" }}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>
              {r.car.brand} · #{r.id.slice(-6).toUpperCase()}
            </p>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              {cfg.label}
            </span>
          </div>
          <p className="text-lg font-medium" style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}>
            {r.car.model}
          </p>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            {fmtDate(r.start_date)} → {fmtDate(r.end_date)} · {days} {t.days}
          </p>
          {r.status === "REJECTED" && r.rejection_reason && (
            <div className="mt-1 flex items-start gap-1.5 rounded-lg px-3 py-2" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <XCircle className="mt-0.5 size-3.5 shrink-0 text-red-500" />
              <p className="text-xs font-medium text-red-700">
                <span className="font-semibold">Motif du refus : </span>{r.rejection_reason}
              </p>
            </div>
          )}
        </div>
      </Link>

      {/* Price + actions — outside Link to avoid navigation on click */}
      <div className="flex items-center gap-3">
        <span
          className="text-xl font-semibold"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ink)" }}
        >
          {r.total_price} TND
        </span>
        {r.status === "PENDING" && (
          confirmingCancel ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: "var(--ink-2)" }}>Confirmer ?</span>
              <button
                onClick={() => { onCancel(); setConfirmingCancel(false); }}
                disabled={cancelling}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: "#A63333" }}
              >
                {cancelling ? "…" : "Oui, annuler"}
              </button>
              <button
                onClick={() => setConfirmingCancel(false)}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-paper"
                style={{ borderColor: "var(--line)", color: "var(--ink-2)" }}
              >
                Retour
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingCancel(true)}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-destructive/10"
              style={{ borderColor: "#A63333", color: "#A63333" }}
            >
              × {t.cancel}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ─── Account Reservation Detail ──────────────────────────────────────────────

export function AccountReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();
  const cancelReservation = useCancelReservation();

  const { data: reservations = [], isLoading } = useMyReservations(user?.id);
  const r = reservations.find((x) => x.id === id);

  const [confirmingCancel, setConfirmingCancel] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--paper)" }}>
        <div className="size-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "#B7452B" }} />
      </div>
    );
  }

  if (!r) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: "var(--paper)" }}>
        <p className="text-lg font-medium" style={{ color: "var(--ink-2)" }}>Réservation introuvable.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/account")}>
          <ArrowLeft className="mr-2 size-4" /> Retour
        </Button>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[r.status];
  const days = diffDays(r.start_date, r.end_date);
  const pricePerDay = Math.round(r.total_price / days);

  const specs: { label: string; value: string | number }[] = [
    { label: "Carburant", value: r.car.fuel },
    { label: "Transmission", value: r.car.transmission },
    { label: "Places", value: r.car.seats },
    { label: "Type", value: r.car.type },
    { label: "Couleur", value: r.car.color },
    { label: "Kilométrage", value: `${r.car.mileage.toLocaleString("fr-TN")} km` },
    { label: "Matricule", value: r.car.matricule },
    { label: "Année", value: r.car.year },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-10">

        {/* Back */}
        <button
          onClick={() => navigate("/account")}
          className="mb-6 flex items-center gap-1.5 text-sm transition-colors hover:opacity-70"
          style={{ color: "var(--ink-3)" }}
        >
          <ArrowLeft className="size-4" /> Mes réservations
        </button>

        {/* Header card */}
        <div
          className="mb-6 overflow-hidden"
          style={{ background: "white", borderRadius: "16px", border: "1px solid var(--line-2)" }}
        >
          {r.car.images[0] && (
            <img
              src={r.car.images[0]}
              alt={`${r.car.brand} ${r.car.model}`}
              className="w-full object-cover"
              style={{ height: "220px" }}
            />
          )}
          <div className="p-6">
            <div className="mb-1 flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </span>
              <span className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>
                #{r.id.slice(-6).toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: "var(--ink)" }}>
              {r.car.brand} {r.car.model}
            </h1>
          </div>
        </div>

        {/* Dates + price breakdown */}
        <div
          className="mb-6 divide-y p-6"
          style={{ background: "white", borderRadius: "16px", border: "1px solid var(--line-2)", divideColor: "var(--line-2)" }}
        >
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2" style={{ color: "var(--ink-2)" }}>
              <CalendarDays className="size-4" />
              <span className="text-sm font-medium">Date de début</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{fmtDate(r.start_date)}</span>
          </div>
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2" style={{ color: "var(--ink-2)" }}>
              <CalendarDays className="size-4" />
              <span className="text-sm font-medium">Date de fin</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{fmtDate(r.end_date)}</span>
          </div>
          <div className="flex items-center justify-between py-4">
            <span className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>Durée</span>
            <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{days} {t.days}</span>
          </div>
          <div className="flex items-center justify-between py-4">
            <span className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>Prix / jour</span>
            <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{pricePerDay} TND</span>
          </div>
          <div className="flex items-center justify-between pt-4">
            <span className="text-base font-semibold" style={{ color: "var(--ink)" }}>Total</span>
            <span
              className="text-xl font-semibold"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ink)" }}
            >
              {r.total_price} TND
            </span>
          </div>
        </div>

        {/* Car specs */}
        <div
          className="mb-6 p-6"
          style={{ background: "white", borderRadius: "16px", border: "1px solid var(--line-2)" }}
        >
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
            Caractéristiques du véhicule
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {specs.map(({ label, value }) => (
              <div key={label} className="rounded-lg p-3" style={{ background: "var(--paper)" }}>
                <p className="text-xs" style={{ color: "var(--ink-3)" }}>{label}</p>
                <p className="mt-0.5 text-sm font-medium" style={{ color: "var(--ink)" }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rejection reason */}
        {r.status === "REJECTED" && r.rejection_reason && (
          <div
            className="mb-6 flex items-start gap-3 rounded-xl p-4"
            style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
          >
            <XCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-800">Motif du refus</p>
              <p className="mt-0.5 text-sm text-red-700">{r.rejection_reason}</p>
            </div>
          </div>
        )}

        {/* Cancel action */}
        {r.status === "PENDING" && (
          <div
            className="p-6"
            style={{ background: "white", borderRadius: "16px", border: "1px solid var(--line-2)" }}
          >
            {confirmingCancel ? (
              <div className="flex items-center gap-3">
                <span className="flex-1 text-sm font-medium" style={{ color: "var(--ink-2)" }}>
                  Confirmer l'annulation de cette réservation ?
                </span>
                <button
                  onClick={() => {
                    cancelReservation.mutate(r.id, { onSuccess: () => navigate("/account") });
                    setConfirmingCancel(false);
                  }}
                  disabled={cancelReservation.isPending}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ background: "#A63333" }}
                >
                  {cancelReservation.isPending ? "…" : "Oui, annuler"}
                </button>
                <button
                  onClick={() => setConfirmingCancel(false)}
                  className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors hover:bg-paper"
                  style={{ borderColor: "var(--line)", color: "var(--ink-2)" }}
                >
                  Retour
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingCancel(true)}
                className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors hover:bg-destructive/10"
                style={{ borderColor: "#A63333", color: "#A63333" }}
              >
                × Annuler la réservation
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
