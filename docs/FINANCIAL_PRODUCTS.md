# Financial — Yahoo Finance

Date: 2026-10-06. Category name follows the supplier library: Financial.

## Scope and customer offer

A single Yahoo Finance product for company researchers, analysts and financial editors. Its assistant prepares either a keyword/ticker discovery or a quote-page profile collection. Output is a table and CSV of the available company name, stock ticker, exchange, currency, closing price, previous close, earnings date, entity type, summary and source link.

Closing price is labelled explicitly. Collection time is not quotation time. Unknown currency and absent prices remain empty (“—”). The product does not promise streaming quotes, historical series, news collection, forecasts or trading execution. Price and payment for the Affsiwen service remain deferred until measured economics.

## Read-only supplier evidence

Authorized AFF7 console inspection found Financial: 1 domain (finance.yahoo.com), 2 scrapers. Yahoo Finance business information family gd_lmrpz3vxmz972ghd7 exposes collect_by_url and discover_by_keyword. Console examples: quote/MSFT, quote/WIX, quote/NVDA; keyword examples MSFT and WIX. Displayed supplier scraper price $1.50/1K records is not a measured cost or a spend instruction.

Overview dictionary directly confirmed name, company_id, entity_type, summary, stock_ticker, currency, earnings_date, exchange, closing_price and previous_close. 54 fields were advertised in total; this release does not claim all 54. Supplier API inventory and required input schema are checked anew at runtime. Unknown required inputs and unsupported URL paths stop preparation.

## Architecture and limits

Public registry contains no upstream mapping. Private finance adapter is reused through the existing cloud chat/prepare/run/status/export pipeline, separate aff_commerce_yahoofinance workspace and signed job namespace. The existing global AI allowance ($10/day ceiling) and source-execution controls are preserved. No new credential or database grant is required.

Eight new tests cover whitelisted metadata, exact operation contracts, unsafe URLs/unsupported history, missing and zero values, constrained model schema, workspace isolation and escaped public pages. Total targeted suite: 72 passing tests; cloud build passed. Fixtures do not verify paid-source output quality.

Real collection remains disabled. Next qualification: authorized bounded source sample, actual output fields and timestamps, cost per usable record and commercial pricing. Live publication and assistant evidence are recorded in PROJECT_LOG.md.

### Financial live publication verification

Production UI 724f3d5 and correction fc7f087 observed Ready in Vercel. Yahoo Finance connection returned connected=true, reason=verified, both search and profile available. Financial page and contextual chat rendered in AFF7. Initial model selected profile for a supplied ticker; corrected server resolution to keyword search using only the value supplied by the client. Live MSFT request then prepared one record with company/ticker/exchange/currency/closing-price/previous-close/earnings/entity/summary/link fields; plan and transcript restored after page reload. No source collection triggered and no financial values presented as actual output. 72 targeted tests passed. Fix fc7f087, regression 7bcd0a1.
