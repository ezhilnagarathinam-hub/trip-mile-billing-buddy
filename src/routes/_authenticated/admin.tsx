import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X, Trash2, Plus } from "lucide-react";
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
import { fmtDT, fmtDur, inr, statusStyle } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Raman Travels" }, { name: "description", content: "Driver reports, approvals and charges." }] }),
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
          <TabsList><TabsTrigger value="reports">Travel report</TabsTrigger><TabsTrigger value="drivers">Drivers</TabsTrigger><TabsTrigger value="charges">Charges</TabsTrigger></TabsList>
          <TabsContent value="reports"><Reports /></TabsContent>
          <TabsContent value="drivers"><Drivers /></TabsContent>
          <TabsContent value="charges"><Charges /></TabsContent>
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
                <TableCell><span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${statusStyle[t.status]}`}>{t.status}</span></TableCell>
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
    if (error) return toast.error(error.message);
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

function Charges() {
  const qc = useQueryClient();
  const s = useQuery({ queryKey: ["settings"], queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data });
  const items = useQuery({ queryKey: ["charge-items"], queryFn: async () => (await supabase.from("charge_items").select("*").order("created_at")).data ?? [] });
  const [f, setF] = useState({ rate: "", bata: "", link: "", upDown: false });
  const [n, setN] = useState({ name: "", amount: "" });
  useEffect(() => { if (s.data) setF({ rate: String(s.data.rate_per_km), bata: String(s.data.driver_bata), link: s.data.default_payment_link, upDown: s.data.up_down }); }, [s.data]);

  async function saveSettings() {
    const { error } = await supabase.from("settings").update({ rate_per_km: Number(f.rate), driver_bata: Number(f.bata), default_payment_link: f.link, up_down: f.upDown, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Charges saved — applied to new trips"); qc.invalidateQueries({ queryKey: ["settings"] });
  }
  async function addItem() {
    if (!n.name) return;
    const { error } = await supabase.from("charge_items").insert({ name: n.name, amount: Number(n.amount) || 0 });
    if (error) return toast.error(error.message);
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
