# Проверки и происхождение сведений

## 8 октября 2026

Полный рабочий снимок: `node --test tests/*.test.mjs` — **191 tests, 191 pass, 0 fail, 0 skipped**. Первый sandbox-запуск не мог открыть loopback listeners (EPERM); повтор с разрешёнными локальными тестовыми серверами прошёл. Сервисы поставщиков и платные вызовы в этих проверках заменены тестовыми ответами.

`node scripts/build-cloud.mjs` завершился успешно. Проверяет синтаксис выбранных браузерных модулей и создаёт public из allowlist. `prepare-public` создаёт выбранный cloud-release; он не является всей историей workspace.

В разрешённой Chrome AFF7-сессии прочитаны живые Amazon connection и health: source connected, execution OFF/0, Google OFF, fixture payment/commercial sales OFF. Все 42 платформенных продукта пересчитаны по dist/commerce-catalog.js. Остальные account settings/балансы/договоры не аудировались заново. Полный live-платёж/сбор не запускался.

## Последняя опубликованная функциональная приёмка 6 октября

Ссылки на подробную доказательную историю:

- AMAZON_PRODUCT.md: connection, schema, реальный Anthropic text+photo response, restore; run mocks и причины OFF.
- ECOMMERCE_PRODUCTS.md и evidence/ecommerce-release-2026-10-06.json: площадки, scope и metadata/chat acceptance.
- TRAVEL_PRODUCTS.md: place/date/query ограничения.
- FINANCIAL_PRODUCTS.md: Yahoo Finance ticker routing, поля/сохранение, no valuation advice.
- SOCIAL_POPULAR_PRODUCTS.md: реальные поддерживаемые URL режимы, editorial Hot.
- SOCIAL_DEMAND_RESEARCH_2026-10-06.md: источники и диапазоны Google Keyword Planner; поиски не равно покупатели.
- CREATOR_SHORTLIST.md: unified brief, TikTok+YouTube discovery, подтверждение, disabled composite execution.
- REAL_ESTATE_PRODUCTS.md: 11 источников/22 операции, ограничения города/ссылки, live plan examples, 121 relevant tests.
- PROJECT_LOG.md: chronological records; PLAN.md — решения и этапы, включая явно исторические checkpoints.

## Уровни доказательства

1. Наличие исходников и passing fixtures доказывает поведение на тестовых данных.
2. connected=true/available=true доказывает доступ к inventory/schema на момент проверки.
3. Реальный чат доказывает прохождение AI/config/persistence для показанного запроса.
4. Платный run + snapshot + invoice + CSV нужен для утверждения фактической выдачи/себестоимости.
5. Оплаченный клиент + margin/CAC/repeat нужен для коммерческого вывода.

Текущий проект имеет уровни 1–3 для датированных сценариев; уровни 4–5 ещё не завершены. Нельзя считать все поля заполненными, все рынки поддержанными или все готовые datasets подключёнными.

## Целостность передачи

В архиве есть FILE_MANIFEST.json с sha256 каждого файла. Проверяющий скрипт в пакете читает manifest и сопоставляет bytes/hash. Архивы не включают .env с реальными значениями, cookies, auth exports, базы, .git или клиентские данные. Для публичного снимка есть отдельный SHA256SUMS.txt; полный локальный ZIP содержит local-only-records, которые не публикуются.

Дата/результат финальной GitHub публикации и Vercel Ready проверяются после загрузки пакета. Commit ID завершающей загрузки не встраивается обратно в тот же ZIP, чтобы не создавать самоссылочную перепаковку; его можно проверить в истории репозитория.
