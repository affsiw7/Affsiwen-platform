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
