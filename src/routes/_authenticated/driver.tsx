import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Play, Square, Receipt, Clock, Users, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { PlaceInput, type Place } from "@/components/PlaceInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPosition, reverseGeocode, roadRoute } from "@/lib/geo";
import { fmtDT, fmtDur, inr, statusStyle } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/driver")({
  head: () => ({ meta: [
    { title: "Driver Trips — Raman Travels" },
    { name: "description", content: "Record customer trips, track their routes and prepare invoices." },
    { property: "og:title", content: "Driver Trips — Raman Travels" },
    { property: "og:description", content: "Record customer trips, track their routes and prepare invoices." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DriverPage,
});

function DriverPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const trips = useQuery({
    queryKey: ["my-trips", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("driver_id", me!.user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!me) return null;
  const status = me.profile?.status;
  const ongoing = trips.data?.find((t) => t.status === "ongoing");

  return (
    <div className="min-h-screen">
      <AppHeader title="Driver" name={me.profile?.full_name || me.user.email} backTo="/dashboard" />
      <main className="mx-auto max-w-4xl space-y-6 p-4">
        {status !== "approved" ? (
          <Card><CardContent className="py-10 text-center">
            <h2 className="text-3xl">{status === "rejected" ? "Account rejected" : "Waiting for approval"}</h2>
            <p className="mt-2 text-muted-foreground">{status === "rejected" ? "Please contact Raman Travels admin." : "The admin needs to approve your account before you can start trips."}</p>
          </CardContent></Card>
        ) : (
          <>
            <div className="flex justify-end">
              <Button asChild variant="secondary"><Link to="/invoice"><Receipt className="mr-1 h-4 w-4" />Create Invoice</Link></Button>
            </div>
            {ongoing ? <OngoingTrip trip={ongoing} onDone={() => qc.invalidateQueries({ queryKey: ["my-trips"] })} />
              : <NewTrip driverId={me.user.id} driverName={me.profile?.full_name ?? ""} onDone={() => qc.invalidateQueries({ queryKey: ["my-trips"] })} />}
          </>
        )}
        <Card>
          <CardHeader><CardTitle className="text-3xl font-normal">My trips</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {trips.data?.length === 0 && <p className="text-muted-foreground">No trips yet.</p>}
            {trips.data?.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div>
                  <div className="font-semibold">{t.trip_code} · {t.customer_name} <span className="text-muted-foreground">({t.customer_phone})</span></div>
                  <div className="text-xs text-muted-foreground">{fmtDT(t.start_time)} · {t.distance_km} km · {fmtDur(t.duration_min)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${statusStyle[t.status]}`}>{t.status}</span>
                  {Number(t.total_amount) > 0 && <span className="font-semibold">{inr(Number(t.total_amount))}</span>}
                  {t.status !== "ongoing" && (
                    <Button size="sm" asChild><Link to="/invoice/$tripId" params={{ tripId: t.id }}>Open</Link></Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function NewTrip({ driverId, driverName, onDone }: { driverId: string; driverName: string; onDone: () => void }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", guests: "1", vehicle: "" });
  const [from, setFrom] = useState<Place>(null);
  const [busy, setBusy] = useState(false);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{10}$/.test(f.phone.replace(/\D/g, "").slice(-10))) { toast.error("Enter a valid 10-digit phone"); return; }
    setBusy(true);
    let p = from;
    if (!p) {
      try { const g = await getPosition(); p = { ...g, label: await reverseGeocode(g) }; }
      catch { setBusy(false); { toast.error("Allow GPS or type the pickup location"); return; } }
    }
    const { data: s } = await supabase.from("settings").select("*").eq("id", 1).single();
    const { error } = await supabase.from("trips").insert({
      driver_id: driverId, driver_name: driverName,
      customer_name: f.name, customer_phone: f.phone, customer_email: f.email,
      guests: Number(f.guests) || 1, vehicle_no: f.vehicle,
      start_time: new Date().toISOString(), start_lat: p.lat, start_lng: p.lng, start_address: p.label,
      rate_per_km: s?.rate_per_km ?? 0, up_down: s?.up_down ?? false, driver_bata: s?.driver_bata ?? 0,
      payment_link: s?.default_payment_link ?? "",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Trip started. Drive safe!");
    onDone();
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Card className="border-2 border-primary">
      <CardHeader><CardTitle className="text-3xl font-normal">New trip</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={start} className="grid gap-3 sm:grid-cols-2">
          <div><Label>Customer name</Label><Input required value={f.name} onChange={set("name")} /></div>
          <div><Label>Customer phone</Label><Input required inputMode="tel" value={f.phone} onChange={set("phone")} /></div>
          <div><Label>Customer email (optional)</Label><Input type="email" value={f.email} onChange={set("email")} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Guests</Label><Input type="number" min={1} value={f.guests} onChange={set("guests")} /></div>
            <div><Label>Vehicle no</Label><Input value={f.vehicle} onChange={set("vehicle")} /></div>
          </div>
          <div className="sm:col-span-2"><Label>Pickup (From) — type or tap GPS</Label><PlaceInput value={from} onChange={setFrom} placeholder="Leave empty to use current GPS" /></div>
          <p className="text-xs text-muted-foreground sm:col-span-2">Travel ID is generated automatically when you start.</p>
          <Button size="lg" className="sm:col-span-2" disabled={busy}><Play className="mr-1 h-5 w-5" />{busy ? "Starting…" : "Start trip"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function OngoingTrip({ trip, onDone }: { trip: { id: string; trip_code: string; customer_name: string; customer_phone: string; guests: number; start_time: string | null; start_address: string; start_lat: number | null; start_lng: number | null }; onDone: () => void }) {
  const [to, setTo] = useState<Place>(null);
  const [busy, setBusy] = useState(false);

  async function end() {
    setBusy(true);
    let p = to;
    if (!p) {
      try { const g = await getPosition(); p = { ...g, label: await reverseGeocode(g) }; }
      catch { setBusy(false); { toast.error("Allow GPS or type the drop location"); return; } }
    }
    const route = trip.start_lat != null && trip.start_lng != null ? await roadRoute({ lat: trip.start_lat, lng: trip.start_lng }, p) : { km: 0 };
    const endTime = new Date();
    const dur = Math.max(1, Math.round((endTime.getTime() - new Date(trip.start_time!).getTime()) / 60000));
    const { error } = await supabase.from("trips").update({
      end_time: endTime.toISOString(), end_lat: p.lat, end_lng: p.lng, end_address: p.label,
      distance_km: route.km, duration_min: dur, status: "completed",
    }).eq("id", trip.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Trip ended · ${route.km} km · ${fmtDur(dur)}`);
    onDone();
  }

  return (
    <Card className="border-2 border-primary bg-ink text-ink-foreground">
      <CardContent className="space-y-4 py-6">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl text-primary">{trip.trip_code} · On trip</h2>
          <span className="animate-pulse rounded bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">LIVE</span>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div><Users className="mr-1 inline h-4 w-4" />{trip.customer_name} ({trip.customer_phone}) · {trip.guests} guest(s)</div>
          <div><Clock className="mr-1 inline h-4 w-4" />Started {fmtDT(trip.start_time)}</div>
          <div className="sm:col-span-2"><MapPin className="mr-1 inline h-4 w-4" />{trip.start_address}</div>
        </div>
        <div className="text-foreground"><Label className="text-ink-foreground">Drop (To) — type or tap GPS</Label><PlaceInput value={to} onChange={setTo} placeholder="Leave empty to use current GPS" /></div>
        <Button size="lg" variant="destructive" className="w-full" onClick={end} disabled={busy}>
          <Square className="mr-1 h-5 w-5" />{busy ? "Calculating distance…" : "End trip"}
        </Button>
      </CardContent>
    </Card>
  );
}
