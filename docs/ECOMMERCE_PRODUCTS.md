# E-commerce products — 2026-10-06

## Product decision

One marketplace = one Affsiwen product, with one conversational entry point. The assistant selects only operations available for that marketplace and prepares a concrete request. The customer stays in Affsiwen for the chat, confirmation, status, result table and CSV. Provider IDs, source contracts and credentials remain server-only. There is no fabricated demand score or supplier-branded checkout.

The user directed us to continue building ecommerce products analogous to Amazon and to calculate economics from observed Bright Data spend later. Commercial prices are not finalized. Do not treat an estimated source-record rate as total order cost or margin.

## First expansion

| Product | Included operations | Current region/scope | Primary buyers/use |
| --- | --- | --- | --- |
| Amazon | Existing ten operations: search/results, cards, reviews, sellers, bestsellers, categories, brands, seller products, UPC | Existing market validation retained | Product/competitor research |
| Walmart | Keyword search, cards, categories, SKU, reviews, seller info | Product search US/CA; reviews/sellers US | Brands and sellers comparing retail offers |
| eBay | Keyword search, cards, categories, shop assortment | ebay.com / US | Resellers and assortment researchers |
| Etsy | Keyword search, cards, shop assortment | etsy.com; locale/currency depend on received data | Makers and niche researchers |
| AliExpress | Cards by URL, category URL | Supplier inventory under aliexpress.us; observed input allows aliexpress.com | Assortment research and sourcing |
| Target | Keyword search, cards, UPC, category URL | US; optional zipcode, no invented local context | Retail research and brands |
| Best Buy | Keyword search, cards | bestbuy.com / US | Electronics sellers and buyers |

Six added products, 21 operations, seven total products including Amazon. These are implemented operations, not a claim of 21 completed live data-collection acceptance tests. Each request is validated against the current provider input schema. Unsupported tasks, countries, URL hosts and new required fields fail closed. AliExpress keyword search, eBay/Etsy review collection and sales/profit estimates are not advertised as connected operations.

## Evidence read in authorized Chrome AFF7

On 2026-10-06 the Scrapers Library showed E-commerce with 1,031 domains. That differs from the earlier user's count of 1,043 datasets; these counts describe different catalog states/entities and are not equated. UI popularity counts were not interpreted as measured paid demand.

The console displayed $1.50 per 1,000 records for inspected operations. It also displayed 5,000/5,000 free credits. Neither is used as a guarantee of final cost, free eligibility for every operation, or margin.

Verified method mappings (server-only):
- Walmart products `gd_l95fol7l1ru6rlo116`: collect_by_url, discover_by_keyword, discover_by_category_url, discover_by_sku. Seller `gd_m7ke48w81ocyu4hhz0`; reviews `gd_mpql1v8g2o8o6l1wzd`, both by URL. Keyword example includes domain; reviews example uses sort_by `Most recent`.
- eBay `gd_ltr9mjt81n0zzdk1fb`: collect_by_url, discover_by_keywords, discover_by_category, discover_by_shop_url. Category example uses a full eBay URL.
- Etsy `gd_ltppk0jdv1jqz25mz`: collect_by_url, discover_by_keywords, discover_by_shop_url.
- AliExpress `gd_mlj9v75u1w1jvaxvwp`: collect_by_url, discover_by_category_url. Domain listing: aliexpress.us. Console sample URLs: aliexpress.com.
- Target `gd_ltppk5mx2lp0v1k0vo`: collect_by_url, discover_by_keywords, discover_by_upc, discover_by_url. Category example has url, zipcode, begin_page, max_product and optional shipping_type. Begin page bounded to 1 and max_product to requested limit when those fields exist.
- Best Buy `gd_ltre1jqe1jfr7cccf`: collect_by_url, discover_by_keywords.

Primary contract references:
- https://docs.brightdata.com/api-reference/scrapers/management-apis/get-scrapers
- https://docs.brightdata.com/api-reference/rest-api/scraper/asynchronous-requests
- https://docs.brightdata.com/api-reference/scrapers/management-apis/monitor-progress
- https://docs.brightdata.com/api-reference/scrapers/delivery-apis/download-snapshot

No provider credential is included in this document.

## Implementation and safeguards

Public product registry: `dist/commerce-catalog.js`. Private validated adapters: `server/commerce.mjs`. The existing chat and asynchronous execution pipeline accept a product adapter. New API paths: `/api/commerce/{product}/connection`, `/workspace`, `/chat`, `/prepare`, `/run`, `/run/status`, `/export`. Amazon's previous paths and cookies remain compatible.

Each product has a separate HttpOnly capability cookie and a separate HMAC namespace for private paid-run records. The global AI and data-run budget namespaces are shared across products, so adding six products does not create six fresh allowances. Provider contracts are rebuilt server-side; arbitrary caller/provider URLs and dataset IDs cannot be executed. A route change cannot apply a late reply from one store to another store's screen.

The same database RPC is reused without schema, role or grant changes. Anonymous pilot persistence is still 24 hours. Long-term account-linked order history, operator cost reconciliation and production retention remain launch work.

Model configuration remains the already-connected pinned Haiku 4.5 with the existing global allowance. Per-product schemas restrict supported tasks and markets; photographs reuse the bounded image handling. The assistant cannot change budgets, trigger collection, invent service prices, or treat product descriptions as instructions.

Source execution configuration has not been increased by this catalog release. Actual collection acceptance and measured invoices are separate from metadata connectivity and model-dialog testing. Payments remain unavailable. The framework supports confirmed, bounded runs, read-only status polling, table normalization, CSV and follow-up questions over actual rows once a run exists.

## Validation / launch work

49 targeted tests passed before publication: Amazon regression checks plus six adapters, source URL restrictions, unknown required fields, public-source redaction, correct model schema, independent workspaces, real-shaped result/CSV delivery, shared cross-store AI/run quotas and product rendering. Provider responses in automated tests are fixtures. Cloud build passed.

Next: verify deployed connections and dialogs; execute small per-operation real collections in a measured pilot; record requested, returned, useful and billed records, latency, source cost, LLM input/output tokens, error/retry/reconciliation costs; then derive the customer quote and contribution margin. Do not extrapolate observed success on one method or domain to the whole catalog.
