# Most Popular / Social Media — 2026-10-06

## Catalog and source identity

Two views reference the same product IDs and workspaces. Most Popular follows a read-only snapshot of the supplier's curated popular category: LinkedIn, Instagram, TikTok, Facebook, X, ChatGPT. Hot is an Affsiwen editorial label based on that external snapshot, not evidence of Affsiwen purchases or conversion performance. No supplier counters are represented as paying buyers.

Social Media includes all 15 observed domains: LinkedIn, Instagram, TikTok, Facebook, YouTube, X, Reddit, Pinterest, Threads, Snapchat, Quora, Vimeo, Bluesky, Twitch and Bilibili. Customer cards, chat and prepared plans explicitly identify the original platform (“Data from Instagram”, etc.), while execution infrastructure, credentials and upstream IDs remain server-only.

## Inspected initial contracts

Authorized AFF7 console; each operation is collect_by_url (pdp configuration). Required schemas are checked anew via supplier inventory. Other discover modes visible in the console are not silently enabled.

| Product | Type | Family |
|---|---|---|
| LinkedIn | People profile; company | gd_l1viktl72bvl7bjuj0; gd_l1vikfnt1wgvvqz95w |
| Instagram | Profile; post | gd_l1vikfch901nx3by4; gd_lk5ns7kz21pck8jpis |
| TikTok | Profile; video post | gd_l1villgoiiidt09ci; gd_lu702nij2f790tmv9h |
| Facebook | Page posts from profile URL | gd_lkaxegm826bjpoo9m5 |
| YouTube | Video | gd_lk56epmy2i5g7lzu0k |
| X | Post | gd_lwxkxvnf1cynvib9co |
| Reddit | Post | gd_lvz8ah06191smkebj4 |
| Pinterest | Pin | gd_lk0sjs4d21kdr7cnlv |
| Threads | Profile | gd_mde7jg3ld2h3hnnf2 |
| Snapchat | Spotlight video | gd_ma0ydx431w6stl16ge |
| Quora | Public answer | gd_lvz1rbj81afv3m6n5y |
| Vimeo | Video | gd_lxk88z3v1ketji4pn |
| Bluesky | Post | gd_m6hn4r5s27zfhc7w4 |
| Twitch | Channel | gd_m5wbb7fp2ktz2483hl |
| Bilibili | Video post | gd_mrhub1btbamw5fq1t |
| ChatGPT Search | Independent prompt | gd_m7aof0k82r803d5bjm |

Bilibili's sample body was empty; Overview confirmed a required full video URL. Its runtime schema still must match before preparation. LinkedIn region il.linkedin.com was observed; no arbitrary subdomains are allowed. Quora es.quora.com was observed; unqualified regional/space domains remain excluded.

Facebook num_of_posts is bounded by the agreed limit. Profile and individual-content operations use validated path types; a post cannot become a profile lookup. Required unknown fields stop preparation. Closed data, private messages, unsupported keyword discovery and sensitive-person inferences are not offered.

ChatGPT Search is a separate prompt-based product, not a social network. Overview confirmed url/prompt, web_search, require_sources, answer_text, links_attached, citations and references. This release requests web_search=true and require_sources=true where present in the runtime schema; one independent prompt, one response, no inherited context. Plain text output is used; answer_html is never rendered. An answer is a snapshot and may change on repetition. It is not an automated full brand-visibility audit.

## Verification and commercial state

23 new test cases; 95 total targeted tests passed and cloud build passed. Fixtures cover all 18 URL operations and one prompt operation, host/path boundaries, source identity, missing/zero metrics, cited output, Hot snapshot membership and model operation correction. These tests do not prove paid-source output completeness.

Separate secure workspace and signed run namespace per product; existing budgets remain global. AI allowance stays at the approved $10/day ceiling. Real source collection and customer payment remain disabled. Next qualification: actual bounded outputs, field quality, completion rates, cost per usable result and commercial pricing. Live publication evidence is recorded in PROJECT_LOG.md.


## Live publication — 2026-10-06

GitHub main: catalog `0a60eb3`, source routing `1072413`, interface `200e495`, question-preservation fix `9120e8d`, regression checks `0718ab9`. Vercel production showed Ready for `200e495`, then Ready for `9120e8d`. Native AFF7 verified published Social Media (15 cards), Most Popular (six cards), platform names on cards/chat/plans and editorial Hot explanation.

All 16 metadata connections reported connected=true, reason=verified and each configured operation available: LinkedIn, Instagram, TikTok, Facebook, YouTube, X, Reddit, Pinterest, Threads, Snapchat, Quora, Vimeo, Bluesky, Twitch, Bilibili and ChatGPT Search. This verifies source/schema access, not paid collection or output quality.

Live AI preparation succeeded for one Instagram public profile, five Facebook page posts and one ChatGPT Search question. Instagram proposal/history survived entering from Most Popular then Social Media. AI-search initially shortened the requested question; the published fix preserves explicit quoted questions and asks for agreement before preparing a drafted question. Retest after confirmation showed the exact question in the prepared proposal. No source run was triggered; payments and real-data buttons remain disabled.

Local final verification: 23 new tests, 95 total targeted tests passed; cloud build passed. Next: enable a separately bounded real-output pilot after agreeing collection limits, measure cost and completeness, then configure prices/payment. No collection budget or payment configuration changed in this release.
