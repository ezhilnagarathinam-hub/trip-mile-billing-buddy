// Free map services: OpenStreetMap Nominatim (places) + OSRM (road distance).
export type Pt = { lat: number; lng: number };

export function getPosition(): Promise<Pt> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("GPS not available"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e.message || "Location permission denied")),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}

export async function reverseGeocode(p: Pt): Promise<string> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.lat}&lon=${p.lng}&zoom=16`);
    const j = await r.json();
    return j.display_name ?? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
  } catch {
    return `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
  }
}

export async function searchPlace(q: string): Promise<{ label: string; lat: number; lng: number }[]> {
  if (q.trim().length < 3) return [];
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=5&q=${encodeURIComponent(q)}`);
  const j = (await r.json()) as { display_name: string; lat: string; lon: string }[];
  return j.map((x) => ({ label: x.display_name, lat: +x.lat, lng: +x.lon }));
}

export async function roadRoute(a: Pt, b: Pt): Promise<{ km: number; coords: [number, number][] }> {
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`);
    const j = await r.json();
    const route = j.routes?.[0];
    if (!route) throw new Error("no route");
    return {
      km: Math.round((route.distance / 1000) * 10) / 10,
      coords: route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]),
    };
  } catch {
    // Fallback: straight-line × 1.3 road factor
    const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const km = 2 * R * Math.asin(Math.sqrt(h)) * 1.3;
    return { km: Math.round(km * 10) / 10, coords: [[a.lat, a.lng], [b.lat, b.lng]] };
  }
}
