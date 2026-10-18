# Invoice and cab workflow updates

## User-facing changes
- Add a model name and fixed per-cab invoice price to admin cab records, with edit controls.
- Save the selected cab details and price on each trip; include the one-time cab price in the invoice total and shared bill.
- Let drivers correct customer name, phone, and email before generating the invoice.
- Let drivers void an unpaid invoice only after entering a cancellation reason; show its cancelled status and reason in admin trip reports.
- Add a clear back control to authenticated pages and the sign-in page.

## Technical details
- Preserve existing cab records using defaulted model and cost fields; keep cab price snapshots on trips.
- Use the existing trip status workflow and store cancellation reason/time on the trip for admin reporting.
- Extend total calculation to add cab price once, with a focused value test.
- Use the shared header for app navigation and a home link on sign-in; retain invoice-specific role-aware return navigation.
