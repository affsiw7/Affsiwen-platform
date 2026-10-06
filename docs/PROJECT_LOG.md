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
