import { useEffect, useState } from "react";
import { Crosshair } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { getPosition, reverseGeocode, searchPlace } from "@/lib/geo";
import { toast } from "sonner";

export type Place = { label: string; lat: number; lng: number } | null;

export function PlaceInput({ value, onChange, placeholder }: { value: Place; onChange: (p: Place) => void; placeholder: string }) {
  const [q, setQ] = useState(value?.label ?? "");
  const [res, setRes] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (value && q === value.label) return;
    const t = setTimeout(() => searchPlace(q).then(setRes).catch(() => setRes([])), 500);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  async function gps() {
    setBusy(true);
    try {
      const p = await getPosition();
      const label = await reverseGeocode(p);
      setQ(label); setRes([]); onChange({ label, ...p });
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input value={q} placeholder={placeholder} onChange={(e) => { setQ(e.target.value); onChange(null); }} />
        <Button type="button" variant="secondary" onClick={gps} disabled={busy} title="Use my GPS location">
          <Crosshair className="h-4 w-4" />
        </Button>
      </div>
      {res.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          {res.map((r) => (
            <button type="button" key={r.label} className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => { setQ(r.label); setRes([]); onChange(r); }}>
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
