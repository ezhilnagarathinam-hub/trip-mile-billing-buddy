# Add cab types to Raman Travels

## User experience
- Add a Cab Types section in Admin where admins can create, edit, activate/deactivate, and delete cab choices.
- Each choice includes its display name, seating capacity, AC/non-AC status, and optional features.
- Drivers can select an active cab type while preparing an invoice. The invoice saves a text snapshot so existing bills keep their cab details if the admin later changes the catalog.
- Show the selected cab details on the generated invoice image and its shared message.

## Technical details
- Add a `cab_types` table with authenticated read access and admin-only writes, including explicit grants and RLS policies.
- Add nullable `cab_type` and `cab_details` fields to trips, preserving existing records and bill snapshots.
- Update generated database types, the admin management screen, and invoice editor/rendering.
- Record the catalog and invoice-snapshot approach in `AGENTS.md` and maintain the project roadmap.
