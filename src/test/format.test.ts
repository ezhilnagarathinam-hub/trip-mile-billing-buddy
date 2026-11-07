import { describe, expect, it } from "vitest";
import { calcDistanceCharge, calcTotal, normalizeCancellationReason } from "@/lib/format";

describe("invoice total", () => {
  it("adds the fixed cab price once alongside distance, admin, and driver charges", () => {
    const result = calcTotal({
      distance_km: 10,
      rate_per_km: 20,
      up_down: true,
      driver_bata: 300,
      cab_charge: 2000,
      admin_charges: [{ name: "Parking", amount: 50 }],
      extra_charges: [{ name: "Toll", amount: 40 }],
    });

    expect(result.kmCharge).toBe(400);
    expect(result.cabCharge).toBe(2000);
    expect(result.total).toBe(2790);
  });

  it("charges the fixed fare for the first 20 km and the per-km rate only beyond it", () => {
    const result = calcDistanceCharge({ distance_km: 25, rate_per_km: 20, up_down: false, minimum_km: 20, minimum_fare: 500 });

    expect(result.fixedFare).toBe(500);
    expect(result.extraKm).toBe(5);
    expect(result.extraKmCharge).toBe(100);
    expect(result.total).toBe(600);
  });

  it("applies the minimum fare once to the full return-trip distance", () => {
    const result = calcDistanceCharge({ distance_km: 10, rate_per_km: 20, up_down: true, minimum_km: 20, minimum_fare: 500 });

    expect(result.billedKm).toBe(20);
    expect(result.total).toBe(500);
  });

  it("requires a non-empty cancellation reason", () => {
    expect(normalizeCancellationReason("   ")).toBeNull();
    expect(normalizeCancellationReason("Customer requested correction")).toBe("Customer requested correction");
  });
});