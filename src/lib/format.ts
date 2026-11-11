export const BRAND = {
  name: "Raman Travels",
  contact: "9942409322",
  support: "9786129527",
};

export type Charge = { name: string; amount: number };

export const inr = (n: number) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const fmtDT = (s?: string | null) =>
  s ? new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

export const fmtDur = (min: number) => `${Math.floor((min || 0) / 60)}h ${(min || 0) % 60}m`;

export const waPhone = (p: string) => {
  const d = (p || "").replace(/\D/g, "");
  return d.length === 10 ? "91" + d : d;
};

export const normalizeCancellationReason = (reason: string) => reason.trim() || null;

export function summarizeDriverBata<T extends {
  driver_id: string;
  driver_name: string;
  driver_bata: number;
  driver_bata_settled: boolean;
}>(trips: T[]) {
  const byDriver = new Map<string, { driverId: string; name: string; trips: T[]; earned: number; settled: number }>();
  for (const trip of trips) {
    const summary = byDriver.get(trip.driver_id) ?? {
      driverId: trip.driver_id,
      name: trip.driver_name || "Driver",
      trips: [],
      earned: 0,
      settled: 0,
    };
    summary.trips.push(trip);
    summary.earned += Number(trip.driver_bata || 0);
    if (trip.driver_bata_settled) summary.settled += Number(trip.driver_bata || 0);
    byDriver.set(trip.driver_id, summary);
  }
  return Array.from(byDriver.values(), (driver) => ({ ...driver, pending: driver.earned - driver.settled }));
}

export function calcDistanceCharge(t: {
  distance_km: number; rate_per_km: number; up_down: boolean;
  minimum_km?: number; minimum_fare?: number;
}) {
  const billedKm = Number(t.distance_km) * (t.up_down ? 2 : 1);
  const minimumKm = Math.max(0, Number(t.minimum_km || 0));
  const fixedFare = minimumKm > 0 ? Math.max(0, Number(t.minimum_fare || 0)) : 0;
  const extraKm = minimumKm > 0 ? Math.max(0, billedKm - minimumKm) : billedKm;
  const extraKmCharge = Math.round(extraKm * Number(t.rate_per_km));
  return { billedKm, fixedFare, extraKm, extraKmCharge, total: fixedFare + extraKmCharge };
}

export function calcTotal(t: {
  distance_km: number; rate_per_km: number; up_down: boolean; driver_bata: number;
  admin_charges: Charge[]; extra_charges: Charge[]; cab_charge?: number;
  minimum_km?: number; minimum_fare?: number;
}) {
  const distanceCharge = calcDistanceCharge(t);
  const { billedKm } = distanceCharge;
  const kmCharge = distanceCharge.total;
  const sum = (a: Charge[]) => a.reduce((s, c) => s + Number(c.amount || 0), 0);
  const cabCharge = Number(t.cab_charge || 0);
  return { billedKm, kmCharge, distanceCharge, cabCharge, total: kmCharge + Number(t.driver_bata || 0) + sum(t.admin_charges) + sum(t.extra_charges) + cabCharge };
}

export const statusStyle: Record<string, string> = {
  ongoing: "bg-accent text-accent-foreground",
  completed: "bg-muted text-foreground",
  invoiced: "bg-primary text-primary-foreground",
  paid: "bg-success text-success-foreground",
  closed: "bg-ink text-ink-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};
