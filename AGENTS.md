<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Roles live in `public.user_roles` (enum patient/doctor/pharmacist), assigned by the `handle_new_user` signup trigger; check them with `has_role()` in RLS — never trust client state for privileges.
- Prescription code (12 digits) and `expires_at` (issued + 7 days) are set by DB triggers and are immutable on update; clients never compute them.
- The 4-digit SMS code lives in `prescription_sms` (readable only by the patient and issuing doctor); pharmacists dispense only through the `dispense_prescription` RPC, which checks the code and deducts 1 unit of `pharmacy_stock` atomically.
- Per-pharmacy stock is the `pharmacy_stock` table; shortage and substitute logic (same XPN, free, in stock) lives in `src/lib/pharmacy-data.ts` as pure functions covered by tests.
- Chronic diagnosis keys are stored in `medicines.covered_conditions` and labelled in `src/lib/conditions.ts`.
- Pharmacy region/district/hours are display data in `src/lib/pharmacy-data.ts` because the schema has no columns for them.
- Patient dashboard modules live in `src/components/dashboard/` and share state through `CareDashboard`; doctor and pharmacist panels live in `src/components/portals/` and `/dashboard` picks one by role.
- Daily intake logs, demo prescriptions and the Telegram-reminder toggle are stored per user in browser localStorage (`src/lib/care-store.ts`) since no table exists for them.
- Demo quick-login (`src/lib/demo-auth.ts`) signs in or signs up fixed demo accounts from the browser; it relies on auto-confirm email being on.
- All UI copy is Uzbek; code identifiers stay English.
