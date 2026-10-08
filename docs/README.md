> **Передача 08.10.2026:** текущая точка входа — [docs/handover/README.md](docs/handover/README.md). Cloud product chats и временные supplier workspaces описаны там; старые статусы ниже сохраняются как история.

# Affsiwen platform

A marketplace for ordering public-data research products under the Affsiwen brand. Buyer, supplier and operator workflows share a persistent Supabase database. Vercel serves the interface and a same-origin Node API.

## Deployment

1. In a dedicated Supabase project, apply `cloud/schema.sql`, `cloud/intake.sql`, then `cloud/seed.sql` using the SQL editor. Re-running the seed does not overwrite existing products.
2. Deploy this repository to Vercel with Node 24 and the supplied `vercel.json`.
3. Configure server environment variables: `PUBLIC_ORIGIN` (the exact HTTPS deployment origin, no trailing slash), `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`. No service-role key is required.
4. Set the Supabase Auth site URL to the same origin. Keep email confirmation enabled. Configure an email provider suitable for external signups before inviting customers.
5. For Google login, configure the Google provider in Supabase and allow `<PUBLIC_ORIGIN>/api/auth/google/callback`. Only then set `GOOGLE_LOGIN_ENABLED=yes`.
6. Buyer and supplier roles are assigned once after verified sign-in. Operator access must be assigned separately by the database administrator to a verified team account; it is never available through registration.

## Boundaries

- General marketplace orders remain synthetic demos. Amazon is a separate AI-assisted pilot; commercial pricing and payment are not enabled.
- Amazon chat uses a server-only Anthropic connection when configured, including bounded image input. The general onboarding assistant remains a separate preview. See [Amazon implementation and acceptance](docs/AMAZON_PRODUCT.md).
- Amazon real collection is implemented but OFF until a separate pilot allowance is approved. It uses explicit confirmation, persistent runs, shared daily limits, at-most-once trigger attempts, status polling and CSV. No paid collection acceptance has yet been recorded.
- Accounts, orders, partner submissions, messages and results use Postgres. Anonymous demo conversations expire after one day and are protected by a random capability cookie.
- Tables live in a private schema with RLS and no direct client table grants. Guarded transaction functions enforce identity, ownership, role, limits and idempotency.
- Public catalog responses contain customer-facing product information. Private provider mappings, credentials, local databases and internal account records are not part of this public release.
- Real payment reconciliation, per-operation live execution acceptance, qualification workflow, production email delivery and password recovery require further integration and end-to-end acceptance tests before commercial launch.
- The supplied SQL must be reviewed and tested against a dedicated project; mock HTTP tests do not replace database authorization tests.

## Validation

`node --test tests/*.test.mjs`

`node scripts/build-cloud.mjs`

The static build uses an explicit asset allowlist. Server code, SQL and internal files are not copied to the web root.

## Product plan and project records

- [Product and launch plan](docs/PLAN.md)
- [Project log and verified status](docs/PROJECT_LOG.md)
- [Prospecting pilot: economics and measurement protocol](docs/PROSPECTING_PILOT.md)
- [Reproducible pricing scenarios](docs/evidence/prospecting-scenarios.json)
- [Real-run measurement ledger](docs/evidence/prospecting-runs.csv) — empty until real measurements exist.

Run `node scripts/economics-report.mjs` to regenerate the scenario report. These are assumptions, not measured profitability. Internal account records and private operational notes are excluded.
