# Amazon in Affsiwen — implementation record

Updated 2026-10-06. Category: **E-commerce**. Product: **Amazon**.

## Product decision

A visitor chooses Amazon inside Affsiwen, describes the task, supplies the exact keyword or Amazon URL, confirms a market and record limit, and receives a table/export inside Affsiwen. Related supplier datasets are modes of this product, not duplicate store listings. No supplier account or API key is given to a buyer. Natural-language interpretation is not yet connected: the current task selector and exact input are explicit.

## Verified supplier catalog

The authenticated Bright Data E-commerce catalog displayed **1,043 datasets**. This is the supplier category count, not the number of products already integrated in Affsiwen. The Amazon catalog displayed six ready datasets and 14 scraping operations on 2026-10-06.

Ready datasets: Amazon products; Amazon Reviews; Amazon sellers info; Amazon products global dataset; Amazon best seller products; Amazon products search. Ready datasets and fresh scraping are different purchase paths; this implementation prepares fresh collection requests only. A combined Amazon/Walmart product was not verified. Walmart remains separate.

| Affsiwen mode | Confirmed supplier operation |
| --- | --- |
| Search results | Product Search: keyword + domain URL, optional pages |
| Find products | Products keyword / global keywords |
| Product details | Products / global collect by URL |
| Reviews | Reviews collect by product URL |
| Seller information | Sellers info collect by URL |
| Best sellers | Products / global discover by best_sellers_url |
| Category | Products / global discover by category_url |
| Brand | Global discover by brand |
| Seller assortment | Global discover by seller |
| UPC | Products discover by upc; currently US only |

The server reads actual input schemas, validates required fields, and rejects unsupported operations/markets. One source input per request; initial limit 1–100 records; one search page; variations disabled. Availability does not guarantee every field or every country works. Each mode still needs a bounded real execution and output mapping before commercial release.

## Supplier connection and prices

Production API authentication was verified through the read-only Amazon scraper inventory on 2026-10-06. The key is in Vercel Production Secret configuration only. It is absent from the browser, repository and this document. No paid collection was initiated during the connection check.

The configurator showed **$1.50 per 1,000 records** for the inspected products, reviews, global products and product-search operations. This is an observed supplier rate, not measured delivered cost or an approved Affsiwen selling price. Requested limits are not a contractual cost ceiling. Free-credit balances are not treated as a guarantee against charges. Measurement must include unsuccessful jobs, duplicates, retries, variable record expansion, processing, payments, refunds and support. Future volume discounts are excluded from current economics.

## Current implementation

- Server-only supplier inventory and request validation; raw contracts never returned to buyers.
- Private anonymous workspace capability in HttpOnly, Secure, SameSite cookie; 24-hour persisted document with optimistic revision checks.
- Plan preparation, workspace restore, explicitly synthetic sample rows and CSV.
- No collection trigger, payment or AI analysis is represented as working.
- Prepared supplier contract is stored privately for future execution, not sent from the browser.
- Existing demo-only account/checkout functions remain separate.

## Remaining work for real usage

1. Confirm a bounded real-test spend limit. Implement durable run records, atomic budget reservation, idempotent submission, unknown-outcome handling, status retrieval and export storage. Never blindly retry a chargeable trigger.
2. Validate a real small run for each enabled mode and map returned fields. Measure record counts, missing fields, duplication, completion time and supplier cost. Fail closed on unverified modes.
3. Integrate buyer ownership and Google login. Restore existing pending requests after login. Keep operator actions restricted.
4. Establish price from observed costs; implement checkout test-mode reconciliation before enabling commercial sales.
5. Add actual structured LLM intent routing with explicit parameter confirmation and no authority to widen budgets.
6. Verify full buyer → request → quote → payment → execution → result → export path, including failure/refund cases.

## Primary sources

- [Amazon scraper](https://brightdata.com/products/web-scraper/amazon)
- [Scraper inventory and live schemas](https://docs.brightdata.com/api-reference/scrapers/management-apis/get-scrapers)
- [Asynchronous collection](https://docs.brightdata.com/api-reference/rest-api/scraper/asynchronous-requests)
- [Web Scraper pricing](https://brightdata.com/pricing/web-scraper)

Catalog counts and configurator fields above were observed in the authorized account, not inferred from marketing claims.

## Live verification

Production `https://affsiwen-platform.vercel.app/#product/amazon`: keyword request prepared against actual supplier schema, persisted plan and synthetic sample restored after reload, CSV download completed (710 bytes). 21 local tests and cloud build passed. Published interface commit: `c00db1c`; tests: `b1ea1c5`. This is not evidence of real collected data.

## 2026-10-06 — conversation replaces the task menu

User corrected the journey: one Amazon assistant should infer the data product, clarify the request and offer a concrete result for a concrete price. Removed the visible task menu and parameter form from the primary Amazon page. Added server-persisted conversation, one-question clarification, offer card, revised quote on volume change and sample/export within the conversation.

The deployed dialog remains an explicitly labeled deterministic preview until a separate LLM account is configured. A Responses API adapter is implemented behind explicit feature configuration, authenticated access and a globally reserved daily call ceiling (default 50, maximum 100). It uses strict structured output, bounded messages, a 15-second timeout, and cannot set prices or trigger execution. Failures do not silently switch to pretend AI responses.

Preview pricing is calculated server-side: supplier $1.50/1000 from the observed tariff; scenario FX USD→EUR 1.00; 2x billable-record reserve; assistant €0.10, processing €0.10 and support €0.50; payment €0.30 + 3%; target contribution 70%; round upward to €0.10. Thus 10 records → €3.90, 50 → €4.30, 100 → €4.90. Except the supplier rate, these inputs are assumptions, not measurements. Taxes, real completion costs and customer acceptance remain unverified. The quote is explicitly preview-only, payable=false; no purchase endpoint or real charge is enabled. It is not a promise of these launch prices or margin.

Validation: 25 server/API tests passed, including persisted dialog, revising offers, stale-plan rejection, idempotent repeated messages and blocking model-generated prices; cloud build passed. Publication and live chat verification pending at this checkpoint.

### Publication checkpoint — chat revision not yet live

26 targeted tests now pass, including rejection of anonymous paid-model calls and reservation/enforcement of the global daily allowance. Build passes. The first GitHub navigation did not complete while the user configured Claude in AFF7. The computer-use tool reported the user changed Chrome; after re-reading state the active profile later became Roman. No action was taken in that profile. Publication of this chat revision is pending an available authorized AFF7 window. The existing deployed Amazon page remains the previous task-menu version. Live LLM, payment and data execution remain off.

## 2026-10-06 — Anthropic connected, vision verified

This checkpoint supersedes the prior OpenAI-only plan, preview-only chat state and indicative-price display. The user selected Anthropic and explicitly authorized a workspace-only API key for the Affsiwen Vercel server and up to $1/day of assistant usage, without balance top-ups or paid Bright Data collection. Key created in the dedicated workspace, no Admin API access, expires 2026-11-05. Value saved only as Vercel Production Secret `ANTHROPIC_API_KEY`; never put in repository or client bundle.

Selected pinned model `claude-haiku-4-5-20251001`. Current official Anthropic catalog lists Haiku 4.5 at $1/MTok input and $5/MTok output; it accepts text and images. Sonnet 5.5 is $2/$10, Opus 5.5 $4/$20, Fable 5.1 $10/$50. Selection is based on published cost and modality, not a measured conversion advantage. Sources: https://platform.claude.com/docs/ru/models/overview and https://platform.claude.com/docs/ru/models/haiku-4-5/overview .

Implementation: Anthropic Messages API with forced structured reply tool, server-validated task parameters and one image before text. No autonomous paid tools or data execution. The pre-sale chat is public with a shared atomic allowance: at most ten attempts/day, reserving $0.10 per attempt (including failures/unknown outcomes) against the $1 authorized ceiling. Text payload <=60 KB, one standard-tier image, output <=1000 tokens, no extended thinking or expensive fallback. This is the Affsiwen application's limit, not an organization-wide Anthropic billing setting. Model/token usage is retained privately per conversation for later measurement. The daily allowance is keyed by UTC day.

Photo path: JPEG/PNG/WebP, client original <=10 MB and <=50 MP; downsample to a longest edge of 1280 and encode JPEG; server limits decoded input to 1 MiB and checks media signature. Photo is sent to Anthropic only on explicit chat submission. Full bytes are not persisted in the workspace database; a short generated description is retained for following turns, so later detail-dependent questions may need the image again. No face identification or assumption of exact product identity from a photo. Official vision documentation: https://platform.claude.com/docs/en/build-with-claude/vision .

Live verification on /#product/amazon: a real request for 10 insulated-water-bottle products on Amazon Germany produced a validated plan, expected columns and CSV deliverable. A synthetic image with a blue rectangle left and orange circle right was sent through the upload control and actual API. Claude identified blue on the left and orange circle on the right, calling the near-square rectangle a square; this verifies vision transport/response, not precise visual identification accuracy. The first ready answer incorrectly said “starting search”; server now replaces ready wording with a fixed truthful preparation message and regression tests cover this. No Bright Data trigger was sent.

Pricing and payments are deferred per user instruction: offers show “price being prepared”, no sample euro amount and no checkout. Success here means working AI conversation and request preparation, not real data fulfillment or completed sales. 28 targeted tests and cloud build pass. Initial published commits: caa3520 (model), 66cc314 (routes), ddb4434 (chat UI), 1ac2f5f (timeout), 768989d (tests). Follow-up wording and usage-log fixes are in progress.

### Final live acceptance — 2026-10-06

Three actual Anthropic responses were observed through the published Affsiwen interface: (1) fully specified Amazon DE product request; (2) uploaded synthetic image recognition plus clarification; (3) after navigating away/reloading, a follow-up referencing the first request correctly preserved Amazon DE and “insulated water bottle” and changed the volume from 10 to 5. The third response uses the corrected server-owned wording “Сбор ещё не запущен”. The offer shows no amount, with payment unavailable. No supplier scraping or payment was triggered.

Follow-up commits: 9c2e67a (truthful ready message), 2091064 (private token usage history), 9633e3c (deferred-price wording), ef447f0 (28th regression check). Interface, saved dialog and image input were checked in Chrome AFF7. Public product: https://affsiwen-platform.vercel.app/#product/amazon . No broader production log audit or sales/conversion validation is implied.


## 2026-10-06 — real Amazon data execution implemented; activation pending

Implemented the async request-to-result path: the saved chat plan is validated again against the live supplier input schema, then one explicitly confirmed trigger creates a persistent run. Status reads obtain the completed snapshot, normalize actual fields into the promised columns and expose a table, Amazon links and CSV. Follow-up assistant replies receive these actual rows as untrusted reference data, with missing fields left unknown. The model cannot launch paid tools or enlarge the budget itself.

Execution defaults OFF. Activation requires server configuration `AFFSIWEN_AMAZON_RUN_ENABLED=yes` plus `AFFSIWEN_AMAZON_RUNS_PER_DAY` (hard maximum 3). Each request is capped at 10 records, one input, with both per-input and total supplier query limits. A separate Bright Data pilot allowance has been requested; the existing Anthropic approval does not cover collection. At this checkpoint no paid trigger, real snapshot or measured collection cost has been observed. Test fixtures must not be described as real acceptance.

Safety and durability: private run and global daily budget capabilities are HMAC-derived server-side using the supplier secret; they are not supplied by the browser or stored in its editable intake document. Existing Supabase revision checks admit one trigger attempt per plan. Daily reservations are not released on failure; uncertain trigger outcomes block automatic repetition. Read-only polling may resume after reload. No new database grants, service-role credentials or schema migration are needed. The pilot uses the existing 24-hour capability storage: it is not yet durable customer order history. A supplier-key rotation changes the HMAC namespace and therefore needs a run/budget migration before re-enabling execution.

The shared application allowance permits at most 3 attempts/day and records a conservative $0.25 reservation per attempt. This is an application guard, not a supplier account billing cap or a measured invoice. Do not enable after a tariff change without reviewing it. No client payment, automatic top-up, retry purchase or refund flow is enabled. Unknown runs need manual supplier reconciliation before any replacement request.

Verification: 36 targeted server/API tests pass, including parallel duplicate submission, persisted actual-shaped rows, CSV, cross-session isolation, global quotas, untrusted contract rejection, empty/failed responses and uncertain submission without retry. Cloud build passes. These are mocked-provider tests; real acceptance remains pending. Initial implementation commits: `40dc094` (runner), `0c40fea` (cloud routes), `acfe609` (interface).

Primary API contracts read in the authorized browser on 2026-10-06:
- [Asynchronous trigger and result limits](https://docs.brightdata.com/api-reference/rest-api/scraper/asynchronous-requests)
- [Snapshot progress](https://docs.brightdata.com/api-reference/scrapers/management-apis/monitor-progress)
- [JSON snapshot download](https://docs.brightdata.com/api-reference/scrapers/delivery-apis/download-snapshot)

Next acceptance: approve a bounded collection allowance, run 5 products for “insulated water bottle” on Amazon Germany, verify returned fields and CSV, restore the run after reload, and ask the assistant to compare only those rows. Validate other operations individually before promoting them as tested. Then measure total costs and establish commercial prices, ownership, retention and payment reconciliation.


### Deployment acceptance — 2026-10-06

GitHub commits `dd307b6` (tests), `5e4457e` (plan/log), `6307b73` (README) are published. Vercel Production reports Ready for commit `6307b73` at deployment `xuedBttE5uEaDW9SRMxYBU46u53B`. In authorized Chrome AFF7, the public Amazon page restored the existing conversation/plan and displayed the new disabled real-data action. Existing sample rows remain explicitly synthetic; no actual collection or cost measurement is claimed. The separate Bright Data spend question remains unanswered, so execution configuration was not enabled.
