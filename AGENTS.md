<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep admin-managed cab catalog entries separate from trips, and snapshot selected cab details, fixed price, admin-controlled trip fare settings, and invoice cancellation reasons on each trip so invoices remain historically accurate; enforce fare snapshots in the database to prevent driver edits.
- Store driver bata settlement on each trip with admin-only updates so payout totals remain auditable and drivers cannot self-settle.
