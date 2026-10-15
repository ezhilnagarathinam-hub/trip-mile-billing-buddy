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

export function calcTotal(t: {
  distance_km: number; rate_per_km: number; up_down: boolean; driver_bata: number;
  admin_charges: Charge[]; extra_charges: Charge[];
}) {
  const billedKm = Number(t.distance_km) * (t.up_down ? 2 : 1);
  const kmCharge = Math.round(billedKm * Number(t.rate_per_km));
  const sum = (a: Charge[]) => a.reduce((s, c) => s + Number(c.amount || 0), 0);
  return { billedKm, kmCharge, total: kmCharge + Number(t.driver_bata || 0) + sum(t.admin_charges) + sum(t.extra_charges) };
}

export const statusStyle: Record<string, string> = {
  ongoing: "bg-accent text-accent-foreground",
  completed: "bg-muted text-foreground",
  invoiced: "bg-primary text-primary-foreground",
  paid: "bg-success text-success-foreground",
  closed: "bg-ink text-ink-foreground",
};
