import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X, Trash2, Plus, Car, Pencil, Save, BadgeCheck, Clock3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDT, fmtDur, inr, statusStyle, summarizeDriverBata } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "Admin Reports & Settings — Raman Travels" },
    { name: "description", content: "Review travel reports, approve drivers, manage charges, and track driver bata settlements." },
    { property: "og:title", content: "Admin Reports & Settings — Raman Travels" },
    { property: "og:description", content: "Review travel reports, approve drivers, manage charges, and track driver bata settlements." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminPage,
});

function AdminPage() {
  const { data: me, isLoading } = useMe();
  if (isLoading) return null;
  if (!me?.isAdmin) return <Navigate to="/driver" />;
  return (
    <div className="min-h-screen">
      <AppHeader title="Admin" name={me.profile?.full_name} />
      <main className="mx-auto max-w-6xl p-4">
        <Tabs defaultValue="reports">
          <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-5"><TabsTrigger value="reports">Travel report</TabsTrigger><TabsTrigger value="drivers">Drivers</TabsTrigger><TabsTrigger value="bata">Driver bata</TabsTrigger><TabsTrigger value="charges">Charges</TabsTrigger><TabsTrigger value="cabs">Cab types</TabsTrigger></TabsList>
          <TabsContent value="reports"><Reports /></TabsContent>
          <TabsContent value="drivers"><Drivers /></TabsContent>
          <TabsContent value="bata"><DriverBata /></TabsContent>
          <TabsContent value="charges"><Charges /></TabsContent>
          <TabsContent value="cabs"><CabTypes /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Reports() {
  const [driver, setDriver] = useState("all");
  const trips = useQuery({ queryKey: ["all-trips"], queryFn: async () => (await supabase.from("trips").select("*").order("created_at", { ascending: false })).data ?? [] });
  const all = trips.data ?? [];
  const drivers = Array.from(new Map(all.map((t) => [t.driver_id, t.driver_name || "Driver"])).entries());
  const list = driver === "all" ? all : all.filter((t) => t.driver_id === driver);
  const collected = list.filter((t) => t.status === "paid" || t.status === "closed").reduce((s, t) => s + Number(t.total_amount), 0);
  const pending = list.filter((t) => t.status === "invoiced").reduce((s, t) => s + Number(t.total_amount), 0);
  const km = list.reduce((s, t) => s + Number(t.distance_km), 0);
  return (
    <div className="space-y-4 pt-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[["Trips", String(list.length)], ["Collected", inr(collected)], ["Pending", inr(pending)], ["Total km", km.toFixed(1)]].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-ink p-4 text-ink-foreground"><div className="text-xs uppercase tracking-widest opacity-70">{k}</div><div className="font-display text-4xl text-primary">{v}</div></div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Label>Driver</Label>
        <select className="h-9 rounded-md border bg-card px-2 text-sm" value={driver} onChange={(e) => setDriver(e.target.value)}>
          <option value="all">All drivers</option>
          {drivers.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
      </div>
      <Card><CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Trip</TableHead><TableHead>Driver</TableHead><TableHead>Customer</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead>
            <TableHead>Duration</TableHead><TableHead>Km</TableHead><TableHead>Route</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {list.map((t) => (
              <TableRow key={t.id}>
                <TableCell><Link className="font-semibold underline" to="/invoice/$tripId" params={{ tripId: t.id }}>{t.trip_code}</Link></TableCell>
                <TableCell>{t.driver_name}</TableCell>
                <TableCell>{t.customer_name}<div className="text-xs text-muted-foreground">{t.customer_phone} · {t.guests} guest(s)</div></TableCell>
                <TableCell className="whitespace-nowrap text-xs">{fmtDT(t.start_time)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{fmtDT(t.end_time)}</TableCell>
                <TableCell>{fmtDur(t.duration_min)}</TableCell>
                <TableCell>{t.distance_km}{t.up_down ? " ×2" : ""}</TableCell>
                <TableCell className="max-w-56 truncate text-xs" title={`${t.start_address} → ${t.end_address}`}>{t.start_address.split(",")[0]} → {t.end_address.split(",")[0] || "…"}</TableCell>
                <TableCell className="font-semibold">{inr(Number(t.total_amount))}</TableCell>
                <TableCell>
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${statusStyle[t.status] ?? "bg-muted text-foreground"}`}>{t.status}</span>
                  {t.status === "cancelled" && t.cancel_reason && <div className="mt-1 max-w-48 text-xs text-destructive">Reason: {t.cancel_reason}</div>}
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={10} className="py-8 text-center text-muted-foreground">No trips yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function Drivers() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const [{ data: p }, { data: r }] = await Promise.all([supabase.from("profiles").select("*").order("created_at", { ascending: false }), supabase.from("user_roles").select("*").eq("role", "admin")]);
      const admins = new Set((r ?? []).map((x) => x.user_id));
      return (p ?? []).filter((x) => !admins.has(x.id));
    },
  });
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Driver ${status}`);
    qc.invalidateQueries({ queryKey: ["drivers"] });
  }
  return (
    <Card className="mt-4"><CardContent className="space-y-2 pt-6">
      {q.data?.map((d) => (
        <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
          <div><div className="font-semibold">{d.full_name || d.email}</div><div className="text-xs text-muted-foreground">{d.email} · {d.phone} · joined {fmtDT(d.created_at)}</div></div>
          <div className="flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${d.status === "approved" ? "bg-success text-success-foreground" : d.status === "rejected" ? "bg-destructive text-destructive-foreground" : "bg-accent"}`}>{d.status}</span>
            {d.status !== "approved" && <Button size="sm" onClick={() => setStatus(d.id, "approved")}><Check className="mr-1 h-4 w-4" />Approve</Button>}
            {d.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => setStatus(d.id, "rejected")}><X className="mr-1 h-4 w-4" />Reject</Button>}
          </div>
        </div>
      ))}
      {q.data?.length === 0 && <p className="text-muted-foreground">No drivers yet.</p>}
    </CardContent></Card>
  );
}

function DriverBata() {
  const qc = useQueryClient();
  const trips = useQuery({
    queryKey: ["bata-settlements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").not("end_time", "is", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [saving, setSaving] = useState<string | null>(null);
  const rows = trips.data ?? [];
  const summaries = summarizeDriverBata(rows);
  const earned = summaries.reduce((sum, driver) => sum + driver.earned, 0);
  const settled = summaries.reduce((sum, driver) => sum + driver.settled, 0);
  const pending = earned - settled;

  async function setSettled(tripId: string, isSettled: boolean) {
    setSaving(tripId);
    const { error } = await supabase.from("trips").update({ driver_bata_settled: isSettled }).eq("id", tripId);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success(isSettled ? "Driver bata marked settled" : "Driver bata marked pending");
    qc.invalidateQueries({ queryKey: ["bata-settlements"] });
    qc.invalidateQueries({ queryKey: ["all-trips"] });
  }

  return (
    <div className="space-y-5 pt-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Total bata", inr(earned)], ["Settled", inr(settled)], ["Pending", inr(pending)]].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-ink p-4 text-ink-foreground">
            <div className="text-xs uppercase tracking-widest opacity-70">{label}</div>
            <div className="font-display text-3xl text-primary">{value}</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Bata is counted for trips that have ended. Payment or invoice cancellation does not change the driver’s earned bata.</p>
      {summaries.map((driver) => {
        const driverSettled = driver.trips.filter((trip) => trip.driver_bata_settled).reduce((sum, trip) => sum + Number(trip.driver_bata), 0);
        return (
          <section key={driver.driverId} className="space-y-3 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{driver.name}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>Earned <b>{inr(driver.earned)}</b></span>
                <span className="text-success">Settled <b>{inr(driverSettled)}</b></span>
                <span className="text-destructive">Pending <b>{inr(driver.pending)}</b></span>
              </div>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Trip</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Trip status</TableHead><TableHead className="text-right">Bata</TableHead><TableHead>Settlement</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {driver.trips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell><Link className="font-semibold underline" to="/invoice/$tripId" params={{ tripId: trip.id }}>{trip.trip_code}</Link></TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDT(trip.end_time ?? trip.created_at)}</TableCell>
                      <TableCell>{trip.customer_name}</TableCell>
                      <TableCell><span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${statusStyle[trip.status] ?? "bg-muted text-foreground"}`}>{trip.status}</span></TableCell>
                      <TableCell className="text-right font-semibold">{inr(Number(trip.driver_bata))}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {trip.driver_bata_settled
                          ? <span className="text-success"><BadgeCheck className="mr-1 inline h-4 w-4" />Settled {trip.driver_bata_settled_at ? fmtDT(trip.driver_bata_settled_at) : ""}</span>
                          : <span className="text-destructive"><Clock3 className="mr-1 inline h-4 w-4" />Pending</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant={trip.driver_bata_settled ? "outline" : "secondary"} disabled={saving === trip.id} onClick={() => setSettled(trip.id, !trip.driver_bata_settled)}>
                          {trip.driver_bata_settled ? "Mark pending" : "Mark settled"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        );
      })}
      {summaries.length === 0 && <div className="border-t py-10 text-center text-muted-foreground">No completed trips with driver bata yet.</div>}
    </div>
  );
}

function Charges() {
  const qc = useQueryClient();
  const s = useQuery({ queryKey: ["settings"], queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data });
  const items = useQuery({ queryKey: ["charge-items"], queryFn: async () => (await supabase.from("charge_items").select("*").order("created_at")).data ?? [] });
  const [f, setF] = useState({ rate: "", minimumKm: "0", minimumFare: "0", bata: "", link: "", upDown: false });
  const [n, setN] = useState({ name: "", amount: "" });
  useEffect(() => { if (s.data) setF({ rate: String(s.data.rate_per_km), minimumKm: String(s.data.minimum_km), minimumFare: String(s.data.minimum_fare), bata: String(s.data.driver_bata), link: s.data.default_payment_link, upDown: s.data.up_down }); }, [s.data]);

  async function saveSettings() {
    const minimumKm = Number(f.minimumKm);
    const minimumFare = Number(f.minimumFare);
    if ((minimumKm > 0) !== (minimumFare > 0)) { toast.error("Enter both the minimum kilometres and fixed fare, or set both to zero"); return; }
    const { error } = await supabase.from("settings").update({ rate_per_km: Number(f.rate), minimum_km: minimumKm, minimum_fare: minimumFare, driver_bata: Number(f.bata), default_payment_link: f.link, up_down: f.upDown, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("Charges saved — applied to new trips"); qc.invalidateQueries({ queryKey: ["settings"] });
  }
  async function addItem() {
    if (!n.name) return;
    const { error } = await supabase.from("charge_items").insert({ name: n.name, amount: Number(n.amount) || 0 });
    if (error) { toast.error(error.message); return; }
    setN({ name: "", amount: "" }); qc.invalidateQueries({ queryKey: ["charge-items"] });
  }
  async function updItem(id: string, patch: { active?: boolean; amount?: number }) {
    await supabase.from("charge_items").update(patch).eq("id", id); qc.invalidateQueries({ queryKey: ["charge-items"] });
  }
  async function delItem(id: string) { await supabase.from("charge_items").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["charge-items"] }); }

  return (
    <div className="grid gap-4 pt-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-3xl font-normal">Fixed charges</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Rate per km (₹)</Label><Input type="number" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Minimum distance (km)</Label><Input type="number" min={0} step="0.1" value={f.minimumKm} onChange={(e) => setF({ ...f, minimumKm: e.target.value })} /></div>
            <div><Label>Fixed fare for minimum distance (₹)</Label><Input type="number" min={0} step="0.01" value={f.minimumFare} onChange={(e) => setF({ ...f, minimumFare: e.target.value })} /></div>
          </div>
          <p className="text-sm text-muted-foreground">{Number(f.minimumKm) > 0 && Number(f.minimumFare) > 0 ? `First ${f.minimumKm} km: ${inr(Number(f.minimumFare))}; distance beyond that: ${inr(Number(f.rate))} per km.` : "Set both minimum distance and fixed fare to enable the minimum trip fare."}</p>
          <div><Label>Driver bata (₹ per trip)</Label><Input type="number" value={f.bata} onChange={(e) => setF({ ...f, bata: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.upDown} onCheckedChange={(v) => setF({ ...f, upDown: v })} />Charge up & down by default (km × 2)</label>
          <div><Label>Default payment link (UPI / gateway)</Label><Input placeholder="https://rzp.io/… or upi://pay?pa=…" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} /></div>
          <Button onClick={saveSettings}>Save</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-3xl font-normal">Additional charge items</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.data?.map((i) => (
            <div key={i.id} className="flex items-center gap-2">
              <Switch checked={i.active} onCheckedChange={(v) => updItem(i.id, { active: v })} />
              <span className="flex-1 text-sm">{i.name}</span>
              <Input className="w-24" type="number" defaultValue={String(i.amount)} onBlur={(e) => updItem(i.id, { amount: Number(e.target.value) })} />
              <Button variant="ghost" size="icon" onClick={() => delItem(i.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input placeholder="Name (e.g. Hill charge)" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
            <Input className="w-24" type="number" placeholder="₹" value={n.amount} onChange={(e) => setN({ ...n, amount: e.target.value })} />
            <Button onClick={addItem}><Plus className="h-4 w-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">Active items with an amount are pre-selected on each invoice; drivers can untick or adjust.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function CabTypes() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["cab-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cab_types").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [draft, setDraft] = useState({ name: "", model: "", seats: "4", ac: true, features: "", cost: "0" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", model: "", seats: "4", ac: true, features: "", cost: "0" });

  async function update(id: string, patch: { name?: string; model?: string; seats?: number; ac?: boolean; features?: string; cost?: number; active?: boolean }): Promise<boolean> {
    const { error } = await supabase.from("cab_types").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    qc.invalidateQueries({ queryKey: ["cab-types"] });
    return true;
  }

  async function addCab(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    const { error } = await supabase.from("cab_types").insert({
      name: draft.name.trim(), model: draft.model.trim(), seats: Math.max(1, Number(draft.seats) || 1), ac: draft.ac, features: draft.features.trim(), cost: Math.max(0, Number(draft.cost) || 0),
    });
    if (error) { toast.error(error.message); return; }
    setDraft({ name: "", model: "", seats: "4", ac: true, features: "", cost: "0" });
    toast.success("Cab type added");
    qc.invalidateQueries({ queryKey: ["cab-types"] });
  }

  async function removeCab(id: string) {
    const { error } = await supabase.from("cab_types").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Cab type removed");
    qc.invalidateQueries({ queryKey: ["cab-types"] });
  }

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <CardHeader><CardTitle className="text-3xl font-normal">Cab types</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {q.data?.map((cab) => (
            <div key={cab.id} className="space-y-3 rounded-md border p-3">
              {editingId === cab.id ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div><Label htmlFor={`cab-name-${cab.id}`}>Cab name</Label><Input id={`cab-name-${cab.id}`} value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} /></div>
                  <div><Label htmlFor={`cab-model-${cab.id}`}>Model</Label><Input id={`cab-model-${cab.id}`} value={editDraft.model} onChange={(e) => setEditDraft({ ...editDraft, model: e.target.value })} /></div>
                  <div><Label htmlFor={`cab-seats-${cab.id}`}>Seats</Label><Input id={`cab-seats-${cab.id}`} type="number" min={1} value={editDraft.seats} onChange={(e) => setEditDraft({ ...editDraft, seats: e.target.value })} /></div>
                  <div><Label htmlFor={`cab-cost-${cab.id}`}>Fixed cab price (₹)</Label><Input id={`cab-cost-${cab.id}`} type="number" min={0} step="0.01" value={editDraft.cost} onChange={(e) => setEditDraft({ ...editDraft, cost: e.target.value })} /></div>
                  <div className="flex items-center gap-2 pt-6"><Switch checked={editDraft.ac} onCheckedChange={(ac) => setEditDraft({ ...editDraft, ac })} /><span className="text-sm">{editDraft.ac ? "AC" : "Non-AC"}</span></div>
                  <div><Label htmlFor={`cab-features-${cab.id}`}>Features</Label><Input id={`cab-features-${cab.id}`} value={editDraft.features} placeholder="Luggage space, child seat" onChange={(e) => setEditDraft({ ...editDraft, features: e.target.value })} /></div>
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3">
                    <Button type="button" size="sm" onClick={async () => {
                      if (!editDraft.name.trim()) { toast.error("Enter a cab name"); return; }
                      if (await update(cab.id, { name: editDraft.name.trim(), model: editDraft.model.trim(), seats: Math.max(1, Number(editDraft.seats) || 1), ac: editDraft.ac, features: editDraft.features.trim(), cost: Math.max(0, Number(editDraft.cost) || 0) })) {
                        toast.success("Cab details saved");
                        setEditingId(null);
                      }
                    }}><Save className="h-4 w-4" />Save changes</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel edit</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{cab.name}{cab.model ? ` · ${cab.model}` : ""}</div>
                    <div className="text-sm text-muted-foreground">{cab.seats} seater · {cab.ac ? "AC" : "Non-AC"} · {cab.features || "No extra features"}</div>
                    <div className="mt-1 font-semibold">Fixed price: {inr(Number(cab.cost))}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={cab.active} onCheckedChange={(active) => update(cab.id, { active })} aria-label={`Make ${cab.name} ${cab.active ? "unavailable" : "available"}`} />
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      setEditDraft({ name: cab.name, model: cab.model, seats: String(cab.seats), ac: cab.ac, features: cab.features, cost: String(cab.cost) });
                      setEditingId(cab.id);
                    }}><Pencil className="h-4 w-4" />Edit</Button>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${cab.name}`} onClick={() => removeCab(cab.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {q.data?.length === 0 && <p className="text-sm text-muted-foreground">No cab types added yet.</p>}
          <form onSubmit={addCab} className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><Label htmlFor="new-cab-name">Cab name</Label><Input id="new-cab-name" placeholder="e.g. Sedan" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></div>
            <div><Label htmlFor="new-cab-model">Model</Label><Input id="new-cab-model" placeholder="e.g. Dzire" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} /></div>
            <div><Label htmlFor="new-cab-seats">Seats</Label><Input id="new-cab-seats" type="number" min={1} value={draft.seats} onChange={(e) => setDraft({ ...draft, seats: e.target.value })} /></div>
            <div><Label htmlFor="new-cab-cost">Fixed cab price (₹)</Label><Input id="new-cab-cost" type="number" min={0} step="0.01" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} /></div>
            <div className="flex items-center gap-2 pt-6"><Switch checked={draft.ac} onCheckedChange={(ac) => setDraft({ ...draft, ac })} /><span className="text-sm">{draft.ac ? "AC" : "Non-AC"}</span></div>
            <div><Label htmlFor="new-cab-features">Features</Label><Input id="new-cab-features" placeholder="Luggage space, child seat" value={draft.features} onChange={(e) => setDraft({ ...draft, features: e.target.value })} /></div>
            <Button className="sm:col-span-2 lg:col-span-3" type="submit"><Car className="mr-1 h-4 w-4" />Add cab</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
