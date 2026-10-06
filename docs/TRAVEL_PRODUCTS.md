# Travel and SHEIN extension — 2026-10-06

## Product boundary

Travel is a separate customer catalog with one conversation per platform. Booking.com and Airbnb support location/date discovery and individual property URLs. Agoda, Trip.com and Naver Hotels initially support individual property URLs only. This is a data research service for hotel operators, rental managers and analysts, not a booking agency. No accommodation purchase or availability guarantee is offered.

Search plans preserve check-in, check-out, guest composition, room count where supported and currency. Invalid/past dates, missing parameters and unsupported operations fail before collection. Booking discovery initially supports adults only: the inspected input does not include child ages. Agoda's current card mode does not advertise dated prices. Property URLs retain supplied query parameters; their values are not silently replaced.

## Inspected supplier console contracts

Read-only inspection in the authorized browser on 2026-10-06; this is not evidence of successful paid collection.

| Product | Family | Supported operation in this release |
|---|---|---|
| Booking.com | gd_m5mbdl081229ln6t4a | collect_by_url |
| Booking.com | gd_mdy9ld3p1e0oqlj9g4 | discover_by_search_input: url, location, check_in, check_out, adults, rooms, currency |
| Airbnb | gd_ld7ll037kqy322v05 | collect_by_url; discover_by_location: location, check_in/out, num_of_adults/children/infants/pets, currency |
| Agoda | gd_m837ssst155rq3a1xo | collect_by_url |
| Trip.com | gd_mb7q8vuuej1nso8j2 | collect_by_url |
| Naver Hotels | gd_mmt7ee9m1r245mjv0v | collect_by_url |

Additional visible methods (not activated here): Booking reviews; Agoda country/URL discovery and other families; Trip location discovery; Naver country/filter/search discovery. Google is not presented as Google Hotels merely because its general domain appeared in Travel. These require their own contract qualification.

Only whitelisted supplier families and runtime-advertised schemas are accepted. Unknown required fields stop preparation. Product-host allowlists reject unrelated URLs. Public UI and responses do not expose source IDs, credentials or vendor branding.

## SHEIN: distinguish the two entries

- **Shein — Products**, gd_lemu5ceq1jxjo7vzit: marketplace ready-made dataset with US marker; approximately 46.22M records, up to $0.0025/record and $250 minimum order shown during inspection. Samples contain us.shein.com, country_code and domain. Counts and prices are supplier observations, not a quote or spend authorization.
- **Shein Products unified schema**, gd_mkv55s1f23yjzsl4ix: separate marketplace entry, also exposed as on-demand collect_by_url and discover_by_category_url. Console examples use us.shein.com; displayed scraper price $1.50/1K records. This release connects those two on-demand operations under a single SHEIN product, initially restricted to verified US URLs.
- A title without a US suffix does not prove worldwide coverage. Other regional domains are not enabled without contract and result verification. The ready-made dataset is not represented as an API search or automatically purchased.

## Execution and verification limits

Shared existing chat and collection budgets are unchanged. Each platform uses its own secure workspace cookie and signed job namespace; the spending allowance remains global. No new credentials, database grants or paid collection are required to add the catalog.

64 targeted local tests passed (including 13 new Travel cases and SHEIN adapter coverage); cloud build passed. Tests use fixtures and cover contracts, missing fields, date validation, chat state, platform separation, escaping and price/currency uncertainty. They do not establish paid-source output quality. The normalizer preserves missing values as “—”, does not assume currency, and labels a nightly/total basis only when the corresponding source field exists.

Real collection and customer payments remain disabled. Needed next: bounded authorized real samples, verify output-field mapping and total cost per usable record, then set prices and qualify each operation. Live publication and connection verification are logged separately in PROJECT_LOG.md.

## Live verification

Production deployment 19b22fc was observed Ready in Vercel. All six new connection endpoints (SHEIN, Booking, Airbnb, Agoda, Trip, Naver) returned connected=true, reason=verified; all configured tasks were advertised available. Travel catalog rendered five products in AFF7. Booking chat displayed the existing daily assistant quota rejection; no new model output or real collection was obtained. The global allowance was not raised. A follow-up normalizer bound protects persistence from oversized supplier text and URLs.
