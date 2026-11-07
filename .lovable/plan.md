# Admin-configured minimum trip fare

## What will change
- Add minimum-distance and fixed-fare settings to Admin → Charges, alongside the existing per-kilometre rate.
- Calculate the distance charge as the fixed fare for the configured initial kilometres, plus the configured per-kilometre rate for distance beyond that threshold. Apply the minimum fare once per trip, using the full billed distance for return trips.
- Show the same pricing and a clear fare breakdown in the driver’s invoice screen. Keep the admin-configured threshold, fixed fare, and kilometre rate locked from driver edits; driver-added extra charges remain separate.
- Save the applicable pricing with each trip so later admin changes do not rewrite an earlier trip’s pricing.

## Technical approach
- Add the new settings and per-trip snapshot fields additively, preserving existing trips and the current rate-only behavior when the minimum fare is not configured.
- Enforce pricing snapshots at the database layer, not only by disabling screen controls, while keeping trip distance and return-trip details as trip inputs.
- Update the shared total calculation, invoice breakdown, and focused tests for the example fare and distance above the threshold.
- Apply the database migration, regenerate database types, and verify the Charges screen and invoice flow.
