import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { ArrowLeft, Download, Mail, MessageCircle, MessageSquare, Plus, Share2, Trash2, CheckCircle2, Heart, Copy, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { useMe } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { RouteMap } from "@/components/RouteMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { BRAND, calcTotal, fmtDT, fmtDur, inr, normalizeCancellationReason, statusStyle, waPhone, type Charge } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoice/$tripId")({
  head: () => ({ meta: [
    { title: "Trip Invoice — Raman Travels" },
    { name: "description", content: "Review trip details, charges, payment and invoice sharing." },
    { property: "og:title", content: "Trip Invoice — Raman Travels" },
    { property: "og:description", content: "Review trip details, charges, payment and invoice sharing." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: InvoicePage,
});

function InvoicePage() {
  const { tripId } = Route.useParams();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const [t, items, cabs] = await Promise.all([
        supabase.from("trips").select("*").eq("id", tripId).single(),
        supabase.from("charge_items").select("*").eq("active", true).order("created_at"),
        supabase.from("cab_types").select("*").eq("active", true).order("name"),
      ]);
      if (t.error) throw t.error;
      if (items.error) throw items.error;
      if (cabs.error) throw cabs.error;
      return { trip: t.data, items: items.data ?? [], cabs: cabs.data ?? [] };
    },
  });
  const trip = q.data?.trip;
  const [km, setKm] = useState("0");
  const [rate, setRate] = useState("0");
  const [bata, setBata] = useState("0");
  const [upDown, setUpDown] = useState(false);
  const [admin, setAdmin] = useState<Record<string, number | null>>({});
  const [extras, setExtras] = useState<Charge[]>([]);
  const [link, setLink] = useState("");
  const [cabType, setCabType] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trip || !q.data) return;
    setKm(String(trip.distance_km)); setRate(String(trip.rate_per_km)); setBata(String(trip.driver_bata));
    setUpDown(trip.up_down); setLink(trip.payment_link);
    setCabType(trip.cab_type ?? "");
    setCustomerName(trip.customer_name);
    setCustomerPhone(trip.customer_phone);
    setCustomerEmail(trip.customer_email);
    setExtras((trip.extra_charges as Charge[]) ?? []);
    const saved = (trip.admin_charges as Charge[]) ?? [];
    const m: Record<string, number | null> = {};
    q.data.items.forEach((i) => {
      const s = saved.find((c) => c.name === i.name);
      m[i.name] = trip.invoiced_at ? (s ? s.amount : null) : Number(i.amount) > 0 ? Number(i.amount) : null;
    });
    setAdmin(m);
  }, [trip?.id, trip?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!trip) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  const adminCharges: Charge[] = Object.entries(admin).filter(([, v]) => v != null).map(([name, amount]) => ({ name, amount: Number(amount) }));
  const cleanExtras = extras.filter((e) => e.name && Number(e.amount));
  const cancelled = trip.status === "cancelled";
  const invoiced = !!trip.invoiced_at;
  const locked = trip.status === "paid" || trip.status === "closed";
  const selectedCab = q.data?.cabs.find((cab) => cab.id === cabType);
  const cabCharge = selectedCab ? Number(selectedCab.cost) : cabType === trip.cab_type ? Number(trip.cab_charge) : 0;
  const calc = calcTotal({ distance_km: Number(km), rate_per_km: Number(rate), up_down: upDown, driver_bata: Number(bata), admin_charges: adminCharges, extra_charges: cleanExtras, cab_charge: cabCharge });
  const selectedCabDetails = selectedCab
    ? `${selectedCab.name}${selectedCab.model ? ` · ${selectedCab.model}` : ""} · ${selectedCab.seats} seater · ${selectedCab.ac ? "AC" : "Non-AC"}${selectedCab.features.trim() ? ` · ${selectedCab.features.trim()}` : ""}`
    : cabType === trip.cab_type ? trip.cab_details ?? "" : "";

  async function save(patch: TablesUpdate<"trips">, msg: string): Promise<boolean> {
    setBusy(true);
    const { error } = await supabase.from("trips").update(patch).eq("id", tripId);
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["trip", tripId] });
    qc.invalidateQueries({ queryKey: ["all-trips"] });
    qc.invalidateQueries({ queryKey: ["my-trips"] });
    qc.invalidateQueries({ queryKey: ["invoice-pick"] });
    return true;
  }

  function generate() {
    if (!customerName.trim()) { toast.error("Enter the customer's name"); return; }
    if (!/^\d{10}$/.test(customerPhone.replace(/\D/g, "").slice(-10))) { toast.error("Enter a valid 10-digit phone number"); return; }
    save({
      customer_name: customerName.trim(), customer_phone: customerPhone.trim(), customer_email: customerEmail.trim(),
      distance_km: Number(km), rate_per_km: Number(rate), driver_bata: Number(bata), up_down: upDown,
      km_charge: calc.kmCharge, admin_charges: adminCharges, extra_charges: cleanExtras,
      cab_charge: cabCharge, total_amount: calc.total, payment_link: link, cab_type: cabType || null, cab_details: selectedCabDetails || null,
      status: "invoiced", invoiced_at: new Date().toISOString(),
    }, "Invoice generated");
  }

  async function cancelInvoice() {
    const reason = normalizeCancellationReason(cancelReason);
    if (!reason) { toast.error("Enter a reason for cancelling this invoice"); return; }
    const saved = await save({ status: "cancelled", cancel_reason: reason, cancelled_at: new Date().toISOString() }, "Invoice cancelled");
    if (saved) { setCancelOpen(false); setCancelReason(""); }
  }

  const message = [
    `🚖 *${BRAND.name}* — Invoice ${trip.trip_code}`,
    `Hello ${trip.customer_name}, thank you for travelling with us!`,
    ``,
    `📍 From: ${trip.start_address}`,
    `🏁 To: ${trip.end_address}`,
    `🕒 Start: ${fmtDT(trip.start_time)}`,
    `🕒 End: ${fmtDT(trip.end_time)}`,
    `⏱ Duration: ${fmtDur(trip.duration_min)}  |  📏 Distance: ${trip.distance_km} km${trip.up_down ? " (up & down)" : ""}`,
    `👥 Guests: ${trip.guests}`,
    trip.cab_details ? `🚘 Cab: ${trip.cab_details}` : "",
    ``,
    `KM charge: ${inr(Number(trip.km_charge))}`,
    Number(trip.cab_charge) ? `Cab price: ${inr(Number(trip.cab_charge))}` : "",
    Number(trip.driver_bata) ? `Driver bata: ${inr(Number(trip.driver_bata))}` : "",
    ...((trip.admin_charges as Charge[]) ?? []).map((c) => `${c.name}: ${inr(c.amount)}`),
    ...((trip.extra_charges as Charge[]) ?? []).map((c) => `${c.name}: ${inr(c.amount)}`),
    `*Total: ${inr(Number(trip.total_amount))}*`,
    trip.payment_link ? `\n💳 Pay here: ${trip.payment_link}` : "",
    ``,
    `📞 Contact: ${BRAND.contact}  |  Support: ${BRAND.support}`,
  ].filter((l) => l !== "").join("\n");

  const thanks = `🙏 Dear ${trip.customer_name}, we have received your payment of ${inr(Number(trip.total_amount))} for trip ${trip.trip_code}. Thank you for choosing ${BRAND.name}! We look forward to serving you again.\n📞 ${BRAND.contact} | Support ${BRAND.support}`;

  async function image() {
    const url = await toPng(cardRef.current!, { pixelRatio: 2, cacheBust: true });
    const blob = await (await fetch(url)).blob();
    return { url, file: new File([blob], `${trip!.trip_code}.png`, { type: "image/png" }) };
  }
  async function shareImage() {
    try {
      const { url, file } = await image();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: message, title: `Invoice ${trip!.trip_code}` });
      } else {
        const a = document.createElement("a"); a.href = url; a.download = file.name; a.click();
        await navigator.clipboard.writeText(message).catch(() => {});
        toast.info("Image downloaded & message copied. Attach the image in WhatsApp.");
        window.open(`https://wa.me/${waPhone(trip!.customer_phone)}?text=${encodeURIComponent(message)}`, "_blank");
      }
    } catch (e) { if ((e as Error).name !== "AbortError") toast.error((e as Error).message); }
  }
  async function download() { const { url, file } = await image(); const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); }

  const wa = (text: string) => window.open(`https://wa.me/${waPhone(trip.customer_phone)}?text=${encodeURIComponent(text)}`, "_blank");

  return (
    <div className="min-h-screen pb-16">
      <AppHeader title={me?.isAdmin ? "Admin" : "Driver"} name={me?.profile?.full_name} backTo={me?.isAdmin ? "/admin" : "/driver"} />
      <main className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Link to={me?.isAdmin ? "/admin" : "/driver"} className="inline-flex items-center text-sm text-muted-foreground"><ArrowLeft className="mr-1 h-4 w-4" />Back</Link>
          {trip.start_lat != null && trip.end_lat != null && (
            <RouteMap a={{ lat: trip.start_lat, lng: trip.start_lng! }} b={{ lat: trip.end_lat, lng: trip.end_lng! }} />
          )}
          <Card>
            <CardHeader><CardTitle className="text-3xl font-normal">Charges</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {cancelled ? (
                <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-4">
                  <div className="font-semibold text-destructive">Invoice cancelled</div>
                  <p className="text-sm">Reason: {trip.cancel_reason || "No reason recorded"}</p>
                  {trip.cancelled_at && <p className="text-xs text-muted-foreground">Cancelled {fmtDT(trip.cancelled_at)}</p>}
                </div>
              ) : (
              <>
              {!invoiced && <fieldset disabled={busy} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
                <div className="sm:col-span-2 font-semibold">Customer details</div>
                <div><Label htmlFor="invoice-customer-name">Customer name</Label><Input id="invoice-customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
                <div><Label htmlFor="invoice-customer-phone">Contact number</Label><Input id="invoice-customer-phone" type="tel" inputMode="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
                <div className="sm:col-span-2"><Label htmlFor="invoice-customer-email">Email</Label><Input id="invoice-customer-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} /></div>
              </fieldset>}
              <fieldset disabled={locked || cancelled || busy} className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Distance (km)</Label><Input type="number" step="0.1" value={km} onChange={(e) => setKm(e.target.value)} /></div>
                  <div><Label>₹ per km</Label><Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
                  <div><Label>Driver bata ₹</Label><Input type="number" value={bata} onChange={(e) => setBata(e.target.value)} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm"><Switch checked={upDown} onCheckedChange={setUpDown} />Up & down (return trip — km × 2)</label>
                <div>
                  <Label>Admin charges</Label>
                  {q.data!.items.map((i) => (
                    <div key={i.id} className="mt-1 flex items-center gap-2">
                      <Checkbox checked={admin[i.name] != null} onCheckedChange={(c) => setAdmin({ ...admin, [i.name]: c ? Number(i.amount) : null })} />
                      <span className="flex-1 text-sm">{i.name}</span>
                      <Input className="w-28" type="number" disabled={admin[i.name] == null} value={admin[i.name] ?? ""} onChange={(e) => setAdmin({ ...admin, [i.name]: Number(e.target.value) })} />
                    </div>
                  ))}
                </div>
                <div>
                  <Label>Additional charges (driver)</Label>
                  {extras.map((x, idx) => (
                    <div key={idx} className="mt-1 flex gap-2">
                      <Input placeholder="e.g. Toll" value={x.name} onChange={(e) => setExtras(extras.map((y, j) => j === idx ? { ...y, name: e.target.value } : y))} />
                      <Input className="w-28" type="number" value={x.amount || ""} onChange={(e) => setExtras(extras.map((y, j) => j === idx ? { ...y, amount: Number(e.target.value) } : y))} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setExtras(extras.filter((_, j) => j !== idx))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setExtras([...extras, { name: "", amount: 0 }])}><Plus className="mr-1 h-4 w-4" />Add charge</Button>
                </div>
                <div><Label>Payment link (UPI / Razorpay / any — paste here)</Label><Input placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} /></div>
                <div>
                  <Label>Cab type</Label>
                  <Select value={cabType || "none"} onValueChange={(value) => setCabType(value === "none" ? "" : value)}>
                    <SelectTrigger><SelectValue placeholder="Choose a cab (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No cab selected</SelectItem>
                  {q.data?.cabs.map((cab) => <SelectItem key={cab.id} value={cab.id}>{cab.name}{cab.model ? ` · ${cab.model}` : ""} · {cab.seats} seater · {cab.ac ? "AC" : "Non-AC"} · {inr(Number(cab.cost))}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {selectedCab && <p className="mt-1 text-xs text-muted-foreground">{selectedCab.features || "No additional features"} · Fixed price {inr(Number(selectedCab.cost))}</p>}
                  {q.data?.cabs.length === 0 && <p className="mt-1 text-xs text-muted-foreground">No active cab types are available. Ask the admin to add one.</p>}
                </div>
              </fieldset>
              <div className="flex items-center justify-between rounded-md bg-ink p-4 text-ink-foreground">
                <span className="font-display text-2xl">Total</span>
                <span className="font-display text-4xl text-primary">{inr(calc.total)}</span>
              </div>
              {!invoiced && !locked && <Button size="lg" className="w-full" onClick={generate} disabled={busy}>Generate invoice</Button>}
              {invoiced && trip.status === "invoiced" && <Button type="button" variant="destructive" className="w-full" onClick={() => setCancelOpen(true)} disabled={busy}><Ban className="mr-1 h-4 w-4" />Cancel invoice</Button>}
              </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <InvoiceCard refEl={cardRef} trip={trip} />
          {invoiced && !cancelled && (
            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={shareImage}><Share2 className="mr-1 h-4 w-4" />Share image</Button>
                  <Button variant="secondary" onClick={() => wa(message)}><MessageCircle className="mr-1 h-4 w-4" />WhatsApp</Button>
                  <Button variant="outline" asChild><a href={`sms:${trip.customer_phone}?body=${encodeURIComponent(message)}`}><MessageSquare className="mr-1 h-4 w-4" />SMS</a></Button>
                  <Button variant="outline" asChild><a href={`mailto:${trip.customer_email}?subject=${encodeURIComponent(`Invoice ${trip.trip_code} — ${BRAND.name}`)}&body=${encodeURIComponent(message)}`}><Mail className="mr-1 h-4 w-4" />Email</a></Button>
                  <Button variant="outline" onClick={download}><Download className="mr-1 h-4 w-4" />Download</Button>
                  <Button variant="outline" onClick={() => navigator.clipboard.writeText(message).then(() => toast.success("Message copied"))}><Copy className="mr-1 h-4 w-4" />Copy text</Button>
                </div>
                {trip.status === "invoiced" && (
                  <Button className="w-full bg-success text-success-foreground hover:bg-success/90" onClick={() => save({ status: "paid", paid_at: new Date().toISOString() }, "Marked as paid")}>
                    <CheckCircle2 className="mr-1 h-4 w-4" />Mark as paid
                  </Button>
                )}
                {trip.status === "paid" && (
                  <Button className="w-full" variant="secondary" onClick={() => { wa(thanks); save({ status: "closed", closed_at: new Date().toISOString() }, "Thank-you sent · ticket closed"); }}>
                    <Heart className="mr-1 h-4 w-4" />Send thank you & close ticket
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
          <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel invoice {trip.trip_code}?</DialogTitle>
                <DialogDescription>The invoice will be marked cancelled and remain visible in the admin trip report.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="invoice-cancel-reason">Reason for cancellation</Label>
                <Textarea id="invoice-cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Explain why this invoice needs to be cancelled" maxLength={500} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCancelOpen(false)} disabled={busy}>Keep invoice</Button>
                <Button type="button" variant="destructive" onClick={cancelInvoice} disabled={busy || !cancelReason.trim()}>{busy ? "Cancelling…" : "Confirm cancellation"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}

type TripRow = Tables<"trips">;

function InvoiceCard({ trip, refEl }: { trip: TripRow; refEl: React.RefObject<HTMLDivElement | null> }) {
  const rows: [string, string][] = [
    [`KM charge (${trip.distance_km} km${trip.up_down ? " × 2" : ""} × ₹${trip.rate_per_km})`, inr(Number(trip.km_charge))],
    ...(Number(trip.cab_charge) ? [[`Cab price${trip.cab_details ? ` · ${trip.cab_details.split(" · ")[0]}` : ""}`, inr(Number(trip.cab_charge))] as [string, string]] : []),
    ...(Number(trip.driver_bata) ? [["Driver bata", inr(Number(trip.driver_bata))] as [string, string]] : []),
    ...((trip.admin_charges as Charge[]) ?? []).map((c) => [c.name, inr(c.amount)] as [string, string]),
    ...((trip.extra_charges as Charge[]) ?? []).map((c) => [c.name, inr(c.amount)] as [string, string]),
  ];
  return (
    <div ref={refEl} className="overflow-hidden rounded-xl border-2 border-ink bg-card text-card-foreground shadow-xl">
      <div className="flex items-center justify-between bg-ink p-5 text-ink-foreground">
        <div>
          <div className="font-display text-4xl leading-none text-primary">RAMAN TRAVELS</div>
          <div className="text-xs tracking-widest text-ink-foreground/70">TAXI · TOURS · OUTSTATION</div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl">INVOICE</div>
          <div className="text-sm">{trip.trip_code}</div>
          <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-bold uppercase ${statusStyle[trip.status] ?? "bg-muted text-foreground"}`}>{trip.status === "closed" ? "paid" : trip.status}</span>
        </div>
      </div>
      <div className="stripes h-2" />
      <div className="space-y-4 p-5 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-xs uppercase text-muted-foreground">Billed to</div><div className="font-semibold">{trip.customer_name}</div><div>{trip.customer_phone}</div></div>
          <div className="text-right"><div className="text-xs uppercase text-muted-foreground">Driver</div><div className="font-semibold">{trip.driver_name || "—"}</div><div>{trip.vehicle_no}</div></div>
        </div>
        {trip.cab_details && <div className="rounded-md border border-primary/30 bg-primary/5 p-3"><div className="text-xs uppercase text-muted-foreground">Selected cab</div><div className="font-semibold">{trip.cab_details}</div></div>}
        {trip.status === "cancelled" && <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive"><div className="font-semibold">Invoice cancelled</div><div className="text-sm">Reason: {trip.cancel_reason || "No reason recorded"}</div></div>}
        <div className="space-y-1 rounded-md bg-muted p-3">
          <div><b>From:</b> {trip.start_address}</div>
          <div><b>To:</b> {trip.end_address || "—"}</div>
          <div className="grid grid-cols-2 gap-1 pt-1 text-xs">
            <div>Start: {fmtDT(trip.start_time)}</div><div>End: {fmtDT(trip.end_time)}</div>
            <div>Duration: {fmtDur(trip.duration_min)}</div><div>Distance: {trip.distance_km} km</div>
            <div>Guests: {trip.guests}</div><div>{trip.up_down ? "Up & down trip" : "One way"}</div>
          </div>
        </div>
        <table className="w-full">
          <tbody>
            {rows.map(([k, v]) => (<tr key={k} className="border-b"><td className="py-1.5">{k}</td><td className="py-1.5 text-right">{v}</td></tr>))}
          </tbody>
        </table>
        <div className="flex items-center justify-between rounded-md bg-primary p-3 text-primary-foreground">
          <span className="font-display text-2xl">TOTAL</span><span className="font-display text-3xl">{inr(Number(trip.total_amount))}</span>
        </div>
        {trip.payment_link && <div className="break-all text-xs"><b>Pay:</b> {trip.payment_link}</div>}
      </div>
      <div className="bg-ink px-5 py-3 text-center text-xs text-ink-foreground">
        Contact {BRAND.contact} · Support {BRAND.support} · Thank you for riding with us!
      </div>
    </div>
  );
}
