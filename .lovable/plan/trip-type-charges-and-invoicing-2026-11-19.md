# Trip-type charges and invoicing

## What will change
- Add editable Outstation, Local Trip, and Day Rent types in Admin → Charges, with support for adding trip types.
- Give each type its own per-kilometre rate, minimum distance and fare, bata enabled/disabled setting and fixed/percentage bata value, and payment link. Keep the existing additional-charge items list available for every type.
- Let drivers choose a trip type when starting a trip, then show and save that type's pricing on its invoice so later admin edits do not change past trips.
- Calculate percentage bata from the trip's distance fare, before cab and additional charges; keep fixed bata as a set amount.

## Technical details
- Add a JSON configuration field to existing settings and additive trip snapshot fields; initialize the three requested types from current settings, preserving legacy trip prices.
- Enforce type pricing snapshots and percentage bata calculation in the existing database trigger.
- Update admin charge controls, driver trip creation, invoice breakdown/messages, and focused pricing tests.
- Apply the database change, use regenerated database types, run focused tests, and verify the preview build.
