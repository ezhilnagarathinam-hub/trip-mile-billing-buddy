import { describe, expect, it } from "vitest";
import { calcTotal, normalizeCancellationReason } from "@/lib/format";

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

  it("requires a non-empty cancellation reason", () => {
    expect(normalizeCancellationReason("   ")).toBeNull();
    expect(normalizeCancellationReason("Customer requested correction")).toBe("Customer requested correction");
  });
});