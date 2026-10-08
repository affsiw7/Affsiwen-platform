> **Текущая передача 08.10.2026:** см. [handover/README.md](handover/README.md), STATUS.md и ROADMAP.md. Более ранние состояния ниже датированы; поздние product checkpoints их уточняют.

# Журнал Affsiwen

Ведётся с 06.10.2026 по поручению пользователя «двигайся и всё записывай».

## Правила журнала

Записывать решения пользователя, источники/дату тарифов, допущения, изменения, проверки, реальные расходы и оставшиеся задачи. Различать: код готов локально / проверен тестами / проверен в браузере / опубликован / прошёл реальный заказ. Не записывать пароли, API-ключи, cookies и персональные данные покупателей. Работы только в Affsiwen; действия в аккаунтах только через разрешённую сессию Chrome AFF7.

## 2026-10-06 — экономика поиска компаний

### Основания и решения

1. Пользователь подтвердил, что Bright Data согласовал модель скрытого поставщика: клиент платит Affsiwen, ключ/аккаунт поставщика не получает. Это принято как подтверждение пользователя; повторное согласование не является блокером.
2. Пользователь уточнил: сейчас используются официальные тарифы, скидки появятся с объёмами. Базовые расчёты без будущих скидок.
3. Пользователь поручил продолжать работу и записывать её.
4. Рабочая рекомендация: начать замер с поиска компаний. Гипотеза покупателей — агентства и B2B-продажи. Реальный спрос не подтверждён.
5. Рабочая цель 70% до CAC/постоянных расходов — ориентир, не утверждённый публичный прайс.

### Проверенные источники

https://brightdata.com/pricing/web-scraper — прочитано 06.10.2026: PAYG $1.50/1K, Scale $499 за 384K, превышение $1.30/1K. Бесплатный лимит исключён из масштабируемой экономики. Подробности/формулы: [PROSPECTING_PILOT.md](PROSPECTING_PILOT.md).

### Сделано локально

- Добавлен серверный модуль `server/economics.mjs`: тарифная версия, месячный PAYG/Scale, цена для целевой маржи, FX, отбраковка, оплаченные повторы, обогащение, обработка, поддержка, комиссии/VAT/возвраты и CAC.
- Добавлен маршрут `POST /api/economics/quote` в локальный и облачный обработчик. Требует подтверждённую роль оператора. Покупатели/партнёры не получают закупочную информацию через этот API.
- Добавлен раздел оператора «Расчёт цены» (`#economics`). Перед расчётом видны все допущения; результат не меняет опубликованные цены и не запускает Agent.
- Бюджет сравнивается с расчётной закупкой. Реальный ограничитель расходов Bright Data НЕ подключён; API возвращает `executionAllowed: false`.
- Исправлена погрешность округления количества записей: 6000 × 1.1 должно давать 6600, а не 6601.
- Подготовлены воспроизводимые сценарии `scripts/economics-report.mjs`; результаты сохранены в [evidence/prospecting-scenarios.json](evidence/prospecting-scenarios.json).
- Подготовлен [протокол контрольного сбора](PROSPECTING_PILOT.md) и пустой журнал [реальных замеров](evidence/prospecting-runs.csv). Никаких вымышленных «фактических» результатов в нём нет.
- Исторический расчёт Meta Ads сохранён и помечен как исторический в UNIT_ECONOMICS.md.
- Пересобран public и `.release/affsiwen-platform`: 26 исходных allowlist-файлов, внутренние документы/сценарии и локальные базы в публикацию не включены.

### Проверки

- Первоначальный полный запуск: 82 теста, 79 прошли; 3 HTTP-теста остановлены запретом среды на bind 127.0.0.1 (EPERM).
- Повторены три затронутых файла последовательно с локальным сетевым доступом: 35/35 прошли. Запросы поставщикам и реальные платежи не выполнялись.
- Добавлен ещё один успешный cloud quote-тест; релизный набор 19/19 прошёл, включая расчёты и ограничения доступа.
- Итого все 83 текущие проверки покрыты успешными запусками (не одним полным запуском).
- Сборка корня и чистого релизного пакета проходит, JavaScript проходит проверку синтаксиса.
- Новая страница визуально в AFF7 не проверялась. GitHub/Vercel в этом этапе не обновлялись и не проверялись.

### Реальные расходы

Платные API-запуски, подписки, live-платежи и рекламные расходы в этом этапе: не выполнялись. Сценарии не являются счётом или разрешением расходовать бюджет.

### Следующие задачи

1. Проверить текущую облачную версию через AFF7, завершить публикацию накопленных изменений и визуально проверить три роли; старые записи внешнего состояния относятся к 01.10.2026.
2. Проверить доступ к Bright Data и контракт конкретного Google Maps discovery API (схема, лимиты, оплачиваемая единица).
3. Подготовить секреты только на серверной стороне, добавить идемпотентное исполнение, хранение run ID, резервирование/сверку расходов и обработку неизвестного результата POST. Текущий калькулятор этого не заменяет.
4. Выполнить контрольные сборы после определения лимита разрешённых расходов; записать реальную пригодность и себестоимость. Расходы ограничиваются согласованным лимитом.
5. Утвердить продукт/цену на основании измерений, подключить оплату и Google-вход и проверить заказ целиком. Реальные продажи пока выключены.

## 2026-10-06 — подготовка публикации кода и плана

По поручению владельца в публичный пакет добавлены план запуска, журнал, протокол замера и воспроизводимые сценарии. Проверка GitHub показала, что в main пока только README и каталоги api/cloud/server; полный интерфейс ещё не загружен. Подготовлен полный cloud-релиз из 32 файлов. Успешная загрузка и новый деплой пока не подтверждены. Закрытые сведения об аккаунтах, бюджете компании и локальных базах исключены.

## 2026-10-06 — опубликовано и проверено в Chrome AFF7

Этот checkpoint заменяет прежние записи «не загружено / деплой не подтверждён».

- Полный облачный пакет опубликован в [affsiw7/Affsiwen-platform](https://github.com/affsiw7/Affsiwen-platform), ветка main: интерфейс, брендовые ресурсы, API, серверные модули, SQL, сборка, тесты, план и экономика. 32 исходных файла; внутренние базы и секреты не публиковались.
- Vercel подтвердил production **Ready** для коммита `08e7aaf64ff68d6959fd340fdb30d38e57dab4d4`, deployment `D22MJouEFULW5pSwejdwXed6RhPf`. Публичный адрес: https://affsiwen-platform.vercel.app/ . GitHub автоматически запускает публикацию.
- В браузере открывается главная с брендом Affsiwen; прежнее зависание загрузки устранено. Проверен анонимный путь: описание задачи → уточнение объёма → рекомендация Agent → карточка заказа → вход. Территория LU, запрос и объём 25 сохраняются между шагами. Платного запуска не было.
- В консоли на проверенном пути не обнаружена прежняя ошибка синтаксиса; анонимный `/api/me` возвращает ожидаемый 401. Полный аудит серверных журналов не проводился.
- Supabase показывает проект Healthy. Google-провайдер **Disabled**, email confirmation включён. Auth Site URL: `http://localhost:3000`; Redirect URLs отсутствуют. Настройки только прочитаны, без изменений.
- Google-кнопка на опубликованной форме отключена. Вход, создание заказа под реальным аккаунтом, партнёрский кабинет и операторский калькулятор в публичной сессии ещё не прошли сквозную браузерную проверку. Локальные тесты не заменяют эту проверку.
- Режим по-прежнему cloud demo: помощник детерминированный, выдача и оплата синтетические. Реальные продажи, платные API, live-платежи и рекламные расходы не включались.

### Ближайшая последовательность

1. Настроить Auth Site URL для публичного домена и точный callback `/api/auth/google/callback`; подключить отдельный Google OAuth client для Affsiwen. Проверить покупателя и партнёра, сохранение черновика и невозможность самоназначения роли оператора.
2. Пройти заказ на демоданных под каждой ролью; проверить оплату-фикстуру, статус, выдачу, экспорт, обращение и возврат.
3. Подключить отдельные письма Affsiwen и реальный LLM с контролем затрат.
4. Добавить серверный адаптер поставщика, учёт/резерв расходов, run ID, идемпотентность и сверку. После согласования конкретного лимита выполнить реальные замеры по PROSPECTING_PILOT.md.
5. Рассчитать окончательную цену по измерениям, подключить Stripe sandbox и пройти платёжные сбои/повторы/возвраты. Коммерческий запуск — только после полного проверенного пути.

## 2026-10-06 — конкретные продукты на витрине

Причина: пользователю на первых страницах непонятно, что именно покупать и для кого. Главная перестроена вокруг трёх предложений: список компаний для B2B-продаж, подборка рекламы конкурентов, выгрузка публикаций конкурентов. Дополнительные продукты: таблица Instagram-профилей, видео TikTok по теме, снимок Google-выдачи.

У каждого предложения: аудитория, задача, входные параметры, состав файла, единица объёма, сценарная цена и переход прямо к продукту. На странице продукта пример таблицы до регистрации, применение результата и ограничения. Подбор помощником вторичен; партнёрский вход сохранён отдельно. Доступность, лимиты и цены берутся из серверного каталога, не дублируются в витрине. Изменение не добавляет реальное исполнение, готовую аналитику или гарантии лидов/продаж. Все примеры помечены вымышленными.

Сборка и 13 облачных API-проверок прошли. Публикация и визуальная проверка новой редакции пока ожидают доступного окна Chrome AFF7; активным оказалось окно другого профиля, действий в нём не выполнялось.

### Публикация редакции витрины

В AFF7 опубликованы коммиты `bc2e1b0` (конкретные предложения и таблицы) и `3f1f09c` (единая публичная навигация главной, каталога и карточек до входа; быстрый выбор продукта на первом экране). На живой главной проверены все шесть предложений, аудитории, входы, состав выдачи, серверные лимиты и демоцены. Переход в список компаний открывает правильный продукт, пример таблицы и форму заказа. Консоль на этом пути содержит только ожидаемый 401 анонимного `/api/me`. Это проверка витрины, не сквозной коммерческий заказ.

## 2026-10-06 — Amazon product and verified supplier connection

The product direction is now E-commerce → Amazon, combining related Amazon supplier operations behind one Affsiwen product. This supersedes the generic six-offer storefront as the primary entry point. See AMAZON_PRODUCT.md for verified catalog facts, scope and launch gaps. Production supplier authentication passed through a read-only metadata call; no collection or payment was performed. The secret is stored only in Vercel Production.

Built Amazon task selection, exact input/market/limit validation against live schemas, a persistent private request plan, explicitly synthetic results and CSV export. Supplier contracts stay server-side. Local validation: 21 tests passed and cloud build passed. Publication and live form verification are pending at this checkpoint. Live execution, Google login, payments, measured prices and LLM interpretation are not complete.

### Amazon publication verified

Published server adapter `3926411`, private workspace routes `f1e6302`, build `5bbb198`, product interface `c00db1c` and regression checks `b1ea1c5` to GitHub main. On the production page `/#product/amazon`, read-only source access is confirmed; the US keyword request prepared successfully against live schemas and persisted. The explicitly synthetic five-row result survived browser reload. CSV download visibly completed: `affsiwen-amazon-DEMO.csv`, 710 bytes. This proves the request/sample/export path, not real Amazon collection or commercial readiness. No paid run was initiated.

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


## 2026-10-06 — E-commerce expansion

User requested products analogous to Amazon across E-commerce, with economics to follow observed supplier spend. Implemented six more products: Walmart, eBay, Etsy, AliExpress, Target and Best Buy; 21 source operations. One contextual chat per store, isolated history/results, runtime schema validation, shared AI and collection allowance, table/CSV pipeline. No final price or measured margin asserted. 49 targeted tests and cloud build pass; automated source responses are fixtures. See [ECOMMERCE_PRODUCTS.md](ECOMMERCE_PRODUCTS.md) for scope, evidence, architecture and remaining acceptance.


### Published catalog checkpoint — 2026-10-06

Published commits: adapters `026587d`, public registry `9c7fb86`, backend `892387b`, build `154b4bb`, interface `28dd95b`, tests `a110cb3`, documentation `5703302`. In Chrome AFF7, the public E-commerce route visibly displays all seven products and product-specific Affsiwen links; visual layout checked. The first deployed metadata verification was interrupted by the Mac lock. Browser tool explicitly required manual unlock. No alternate browser/profile used. New-product model dialogs and paid data runs have not yet been live-verified; source connectivity must not be claimed from fixture tests.


### Live connection and dialog verification — 2026-10-06

After unlock, all six production connection endpoints returned connected=true and reason=verified (15:12–15:13 UTC). The observed methods were marked available in the returned portions of the metadata response. This is live read-only source metadata access, not evidence of paid collection success.

Walmart's live Haiku chat correctly prepared five wireless headphones for the US market, with product name/ID, price, currency, rating, source link and CSV. Opening Etsy showed its independent empty chat. AliExpress's actual model reply incorrectly suggested a more precise keyword despite URL-only support. Added a server-owned clarification for URL-only products without a supplied source URL; it removes unsupported suggestions and cannot prepare a keyword job. Regression test reproduces the bad model response. 50 targeted tests now pass. Paid collection remains untested and no new source-execution budget was enabled.


### Acceptance completed for metadata and request preparation — 2026-10-06

All six newly added product connection endpoints were live-verified. Vercel Production showed Ready for `b5963b0`; URL-only fix `9bd0688` is included. A new real AliExpress model response after publication now says a product/category URL is required and keyword search is unavailable, with no unsupported keyword option. Walmart's five-product US plan and conversation restored after leaving the product and returning. Three actual model requests were used in this verification pass, within the existing shared allowance; it was not raised.

This closes the browser-lock interruption and verifies metadata access, example model routing, the URL-only correction, and workspace restoration. It does not establish paid snapshot delivery, all 21 operation mappings on real runs, source cost, commercial pricing or payment readiness. No Bright Data trigger was submitted. Test result: 50 targeted automated tests passed, including the new regression. Published evidence: `docs/evidence/ecommerce-release-2026-10-06.json`.

## 2026-10-06 — Travel + SHEIN

Prepared Travel catalog (Booking.com, Airbnb, Agoda, Trip.com, Naver Hotels), per-platform chats and isolated persisted requests. Booking/Airbnb date-and-guest discovery; other initial Travel operations by property URL. Added SHEIN US on-demand product/category collection. Inspected both SHEIN marketplace entries: ready-made US dataset is separate from on-demand unified schema; non-US coverage not inferred from naming. See TRAVEL_PRODUCTS.md for contract evidence and limits. 63 local tests and cloud build passed; no paid collection, budget expansion or customer payment. Publication verification follows below.

### Travel / SHEIN publication verification

Live production 19b22fc observed Ready. All six new metadata connections verified and advertised their configured operations available. Travel page displayed all five products. Booking chat test was blocked by the existing daily AI quota; no live Travel conversation or paid collection is claimed. Local checks: 64 passed, including bounded result storage. Budgets unchanged. Catalog commit 20d392a; UI 19b22fc; initial tests 36f0843.

## 2026-10-06 — Temporary setup AI allowance

User explicitly approved increasing the assistant ceiling to $10/day. Production AFFSIWEN_AMAZON_CHAT_DAILY_LIMIT=100; server hard maximum 100 attempts per UTC day, reserving $0.10 per attempt. Existing daily counter and global cross-product budget key are preserved; no reset or per-product extra allowance. Actual model charges can be lower. No automatic balance top-up or change to source-collection budgets. Regression verifies blocking at 2 and 100 calls, and at 100 even with an oversized configuration. Vercel environment save confirmed; activation requires the ensuing deployment.

Activation verified: Vercel production f99d3e7 observed Ready. One live Booking chat request passed the previously exhausted allowance and produced a prepared plan for Barcelona, 2026-11-10 to 2026-11-12, 2 adults, 1 room, EUR. No collection triggered. Code commit 42094fe; test commit f99d3e7. 45 relevant regression tests passed.

## 2026-10-06 — Financial catalog

Added Financial category with Yahoo Finance: keyword/ticker discovery and quote-page profile collection. Read-only console showed one financial domain and two operations. Customer fields use explicit closing price/previous close, source currency and missing-value markers. 71 targeted tests and cloud build passed. See FINANCIAL_PRODUCTS.md for inspected contracts and product scope. Live verification follows; collection/payment remain disabled.

### Financial live publication verification

Production UI 724f3d5 and correction fc7f087 observed Ready in Vercel. Yahoo Finance connection returned connected=true, reason=verified, both search and profile available. Financial page and contextual chat rendered in AFF7. Initial model selected profile for a supplied ticker; corrected server resolution to keyword search using only the value supplied by the client. Live MSFT request then prepared one record with company/ticker/exchange/currency/closing-price/previous-close/earnings/entity/summary/link fields; plan and transcript restored after page reload. No source collection triggered and no financial values presented as actual output. 72 targeted tests passed. Fix fc7f087, regression 7bcd0a1.

## 2026-10-06 — Most Popular / Social Media

Added two views sharing product IDs: Most Popular (six externally curated products with editorial Hot label) and Social Media (15 observed platforms). Data platform named on each card, chat and plan. Private source adapter has 18 URL operations and one ChatGPT prompt operation; unsupported discovery not advertised. 95 targeted tests and build passed. No claim of Affsiwen sales popularity. See SOCIAL_POPULAR_PRODUCTS.md. Publication and live checks follow; source collection/payment remain disabled.


## Live publication — 2026-10-06

GitHub main: catalog `0a60eb3`, source routing `1072413`, interface `200e495`, question-preservation fix `9120e8d`, regression checks `0718ab9`. Vercel production showed Ready for `200e495`, then Ready for `9120e8d`. Native AFF7 verified published Social Media (15 cards), Most Popular (six cards), platform names on cards/chat/plans and editorial Hot explanation.

All 16 metadata connections reported connected=true, reason=verified and each configured operation available: LinkedIn, Instagram, TikTok, Facebook, YouTube, X, Reddit, Pinterest, Threads, Snapchat, Quora, Vimeo, Bluesky, Twitch, Bilibili and ChatGPT Search. This verifies source/schema access, not paid collection or output quality.

Live AI preparation succeeded for one Instagram public profile, five Facebook page posts and one ChatGPT Search question. Instagram proposal/history survived entering from Most Popular then Social Media. AI-search initially shortened the requested question; the published fix preserves explicit quoted questions and asks for agreement before preparing a drafted question. Retest after confirmation showed the exact question in the prepared proposal. No source run was triggered; payments and real-data buttons remain disabled.

Local final verification: 23 new tests, 95 total targeted tests passed; cloud build passed. Next: enable a separately bounded real-output pilot after agreeing collection limits, measure cost and completeness, then configure prices/payment. No collection budget or payment configuration changed in this release.


## 2026-10-06 — Research: cross-platform social product demand

Verified official paid offers from Modash, Brand24, Metricool and SparkToro, plus IAB creator research and a supplier-published agency use case. Created an isolated AffSiwen Keyword Planner research plan; 64 English phrases entered, 62 distinct displayed rows captured for US/Google/all languages, Sep 2025–Aug 2026. Google reports ranges, not exact volumes; searches are not buyers, close variants not summed. No ad campaign or collection triggered. Cross-platform aggregation/chat already offered by competitors. Candidate tests: Creator Shortlist, Content Brief, Customer Questions Brief. Current product gaps and source discovery availability recorded in SOCIAL_DEMAND_RESEARCH_2026-10-06.md. No commercial winner or willingness to pay Affsiwen claimed.

## 2026-10-06 — единый подбор авторов

Добавлен продукт Creator Shortlist: бриф → подтверждение → ограниченный поиск TikTok + YouTube → кандидаты и CSV. Instagram только по явной ссылке из биографии. Новый флаг исполнения выключен; реальный платный пилот и расчёт цены остаются отдельным этапом. Контракты, ограничения, проверки и план: CREATOR_SHORTLIST.md.

Живая приёмка Creator Shortlist: Vercel Ready d4f9bde; connected=true для обоих поисков; бриф skincare / US / английский / 5 кандидатов → явное подтверждение → предложение 10 видео TikTok + 10 YouTube. Предложение восстановлено после перезагрузки. 104 проверки прошли. Платный сбор для этой приёмки не запускался.

## 2026-10-06 — Real Estate

Добавлен весь текущий раздел готовых операций Real-estate: 11 площадок, 22 операции. Один продукт на площадку, чат, сохранение запроса и CSV; Zillow включает историю цены. Проверены параметры и ограничения географии. План и ограничения: REAL_ESTATE_PRODUCTS.md. Платный сбор и новая цена для приёмки не включаются.


Живая приёмка Real Estate: все 11 connection-эндпоинтов подтвердили connected=true, доступны все 22/22 операции. Vercel runtime 767171b наблюдался Ready; финальные проверки опубликованы f57cb37. В AFF7 проверены каталог, Zillow Austin/Houses/продажа с восстановлением после перезагрузки, история цены Zillow, Zoopla London/аренда без обязательной ссылки и Realestate.com.au по предоставленной поисковой ссылке с одной страницей. 121 локальная проверка и сборка прошли. Метаданные и подготовка предложений проверены вживую; выдача, CSV и исполнение проверены на тестовых ответах. Реальные оплачиваемые сборы и оплата не включались. Детали: REAL_ESTATE_PRODUCTS.md.


## 2026-10-08 — Полная передача

Созданы архитектура, перечень подключений и cloud-переменных без секретов, runbook, статус 42 продуктов, приоритетный план, карта доказательств и снимок исходников/исследований. Полный рабочий снимок: 191/191 проверка прошла, cloud build успешен. В AFF7 сегодня подтверждены Amazon connected=true, execution OFF/0, health Google OFF, payments fixture, commercial sales OFF. Новых платных сборов/платежей/ключей/прав не было. Текущая точка входа: handover/README.md. Локальный ZIP сохраняется в рабочей папке; внутренние текстовые записи добавлены отдельно только в локальный ZIP, секреты и базы исключены.
