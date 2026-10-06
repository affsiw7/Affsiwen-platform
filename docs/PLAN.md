# Affsiwen — план продукта и запуска

Актуальность: 6 октября 2026. Статусы относятся к коду и указанным проверкам; не означают готовность принимать реальные деньги.

## Продукт

Клиент описывает задачу → помощник уточняет критерии → клиент видит состав результата и цену → создаётся заказ → исполнитель получает задание на серверной стороне → данные проходят проверку → клиент получает таблицу/CSV/JSON в Affsiwen → принимает результат или открывает обращение.

Покупатель работает с брендом Affsiwen. В интерфейсе продукт называется Agent; внешние исполнители не рекламируются покупателям. Оценки Affsiwen — редакционные и объясняются методологией; популярность внешнего инструмента не выдаётся за число платящих покупателей.

## Роли

- Покупатель: вход, подбор продукта, параметры заказа, оплата, статус, данные, экспорт, повтор, обращение.
- Партнёр: заявка на продукт, описание задачи/аудитории/входов/выходов/ограничений, статус рассмотрения. Публикация после проверки оператором.
- Оператор: отбор, каталог, цены, заказы, обращения, сверка расходов, расчёт экономики и подключений. Публичная регистрация не предоставляет эту роль.

## Архитектура

Vercel обслуживает интерфейс и same-origin API. Supabase хранит аккаунты и заказы в Postgres с изоляцией ролей/владельцев. Секреты исполнителей остаются на сервере. Создание заказов и подтверждение платежей должны быть идемпотентны. Нельзя автоматически повторять платный POST с неизвестным исходом.

Текущая версия — cloud demo: синтетические результаты, демооплата, детерминированный помощник. Реальный платёж, реальный сбор, LLM и рабочий Google OAuth требуют подключения и проверок.

## Этапы и критерии готовности

| Этап | Статус на 06.10 | Критерий завершения |
|---|---|---|
| Каталог, роли, заказы, результат и обращения | Реализованы в демо | Проверить на опубликованной версии под каждой ролью |
| Репозиторий и публикация | Опубликовано и проверено | main: 08e7aaf; Vercel Ready; главная и анонимный подбор открываются |
| Экономика поиска компаний | Код опубликован; сценарии, не реальные замеры | Проверить калькулятор оператора; заменить допущения измерениями |
| Google-вход | Код подготовлен; провайдер выключен, URL ещё localhost | OAuth настроен, buyer/supplier прошли вход, роль оператора не повышается |
| Письма и восстановление доступа | Не завершены | Отдельный домен/отправитель Affsiwen; доставка и восстановление проверены |
| LLM-подбор | Демо | Реальная модель с ограниченным каталогом, ценами с сервера и лимитом расходов |
| Внешнее исполнение | Не подключено в cloud demo | Версионированный контракт, резерв расходов, run ID, сбор/проверка/выдача и сбои |
| Платежи | Демо | Sandbox: webhook, сумма/валюта, повтор, возврат и восстановление после сбоя |
| Первый коммерческий Agent | Не квалифицирован | Права, пригодность, фактическая закупка, цена и ограничения подтверждены |
| Коммерческий запуск | Выключен | Полный реальный путь заказа, поддержка, юридические страницы, контроль затрат |
| Масштабирование | Не начато | Измерены CAC, вклад после переменных расходов, повторные покупки |

## Первый контрольный продукт

Поиск локальных компаний по категории и территории. Начальный результат: название, категория, адрес, источник, доступные сайт/телефон. Не гарантируем email, LinkedIn, штат, интерес к покупке или существование нужного количества компаний.

Проверить несколько категорий и территорий; отдельно измерить сырые, оплаченные, уникальные и пригодные записи, покрытие полей, время и сумму счёта. Подробности в [PROSPECTING_PILOT.md](PROSPECTING_PILOT.md).

## Экономика

Публичный тариф — исходная закупка; будущие скидки не спасают убыточный старт. Маржа считается после закупки, обогащения, обработки, комиссий, возвратов и поддержки. CAC показывается отдельно, затем постоянные расходы. 70% до CAC — рабочий ориентир, не обещание прибыли. Ранее обсуждавшиеся пакеты не утверждены.

## Правило выпуска

Новая функция считается опубликованной только после успешного деплоя и проверки страницы/сценария. Локальные тесты и факт загрузки файлов не заменяют проверку публичного сервиса. Платные действия требуют установленного бюджета. Ключи, cookies, базы, договоры и данные клиентов не хранятся в этом публичном репозитории.

## Проверенный публичный результат

6 октября: [платформа](https://affsiwen-platform.vercel.app/) открывается; проверены главная и анонимный путь до входа с сохранением параметров. Google, кабинеты трёх ролей и полный заказ требуют следующих проверок. Подробный checkpoint: [PROJECT_LOG.md](PROJECT_LOG.md).

## Витрина: решение от 06.10.2026

Главная продаёт конкретные выгрузки, а не доступ к абстрактным Agents. Три первых продукта:

| Продукт | Для кого | Вход | Результат |
|---|---|---|---|
| Список компаний для B2B-продаж | Агентства, отделы продаж | Категория и город | Организации, адреса, доступные сайты и телефоны |
| Подборка рекламы конкурентов | Маркетологи, рекламные агентства | Рекламодатели в библиотеке Meta | Тексты, форматы, доступные ссылки на объявления и креативы |
| Выгрузка публикаций конкурентов | SMM и контент-команды | Публичные Instagram-аккаунты | Публикации, подписи, даты, форматы и доступные реакции |

Следом: таблица Instagram-профилей, подборка видео TikTok, снимок Google-выдачи. Каждое предложение содержит конкретную аудиторию, входы, поля результата, пример таблицы, применение и ограничения. Помощник нужен для неуверенного покупателя; основной путь — продукт → параметры → заказ. Партнёрский маршрут отделён от покупки.

Это упаковка текущих демо-возможностей, не доказательство спроса и не новый коммерческий прайс. Лимиты и цены загружаются из каталога. Нельзя обещать входящие лиды, эффективность чужой рекламы, автоматический контент-план или прогноз вирусности.

## Active scope: Amazon first (2026-10-06)

Build E-commerce → Amazon as one product with separate task modes. Prioritize actual supplier schemas, a verified connection, request preparation and results/export. See AMAZON_PRODUCT.md for the full integration matrix and remaining real-execution, pricing, identity and payment gates. Previous generic prospecting work is background, not the active launch product.

## Revised interaction: one Amazon conversation

Customer explains a goal → assistant clarifies missing input → server validates the chosen operation → a specific result and price appear in the conversation → confirmed payment → controlled run → result. The old task-selector screen is superseded. The last three commercial steps remain disabled. Configure a separate model API account, validate real costs, finalize total customer prices and taxes, and complete payment/execution reconciliation before accepting money.

LLM configuration: `OPENAI_API_KEY`, `AFFSIWEN_AMAZON_CHAT_MODEL`, explicit `AFFSIWEN_AMAZON_CHAT_ENABLED=yes`, optional `AFFSIWEN_AMAZON_CHAT_DAILY_LIMIT` (default 50, max 100). Do not enable until the chosen model contract, authentication flow and spend cap have been tested. Secrets remain server-only. Existing Bright Data credentials are not LLM credentials.

## Active configuration after Anthropic connection

`ANTHROPIC_API_KEY` is a server-only production secret. `AFFSIWEN_AMAZON_CHAT_MODEL=claude-haiku-4-5-20251001`, `AFFSIWEN_AMAZON_CHAT_ENABLED=yes`, `AFFSIWEN_AMAZON_CHAT_DAILY_LIMIT=10`. OpenAI setup is superseded. Do not widen the approved $1/day assistant allowance without authorization. Key expires 2026-11-05; arrange controlled rotation before then. Real pricing, payment and paid data execution remain later milestones; current chat prepares the requested result only.


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


## 2026-10-06 — E-commerce expansion

User requested products analogous to Amazon across E-commerce, with economics to follow observed supplier spend. Implemented six more products: Walmart, eBay, Etsy, AliExpress, Target and Best Buy; 21 source operations. One contextual chat per store, isolated history/results, runtime schema validation, shared AI and collection allowance, table/CSV pipeline. No final price or measured margin asserted. 49 targeted tests and cloud build pass; automated source responses are fixtures. See [ECOMMERCE_PRODUCTS.md](ECOMMERCE_PRODUCTS.md) for scope, evidence, architecture and remaining acceptance.
