import { useEffect, useRef } from "react";
import { roadRoute } from "@/lib/geo";

export function RouteMap({ a, b }: { a: { lat: number; lng: number }; b: { lat: number; lng: number } }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
      const dot = (c: string) => L.divIcon({ className: "", html: `<div style="width:16px;height:16px;border-radius:50%;background:${c};border:3px solid #111"></div>` });
      L.marker([a.lat, a.lng], { icon: dot("#facc15") }).addTo(map);
      L.marker([b.lat, b.lng], { icon: dot("#111") }).addTo(map);
      const r = await roadRoute(a, b);
      if (cancelled) return;
      const line = L.polyline(r.coords, { color: "#111", weight: 5 }).addTo(map);
      map.fitBounds(line.getBounds(), { padding: [30, 30] });
    })();
    return () => { cancelled = true; map?.remove(); };
  }, [a.lat, a.lng, b.lat, b.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={ref} className="h-64 w-full rounded-lg border" />;
}
