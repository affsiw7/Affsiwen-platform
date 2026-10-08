# Подключения и передача доступов

Секретных значений здесь нет. Перечень извлечён из кода и датированных проверок. Не включать реальные значения в GitHub, ZIP для публикации, screenshots или сообщения.

| Сервис | Роль | Привязка / состояние | Что передать следующему ответственному |
|---|---|---|---|
| GitHub | Код и документация | affsiw7/Affsiwen-platform, public, main | Доступ именно к этому repo; не старому local origin |
| Vercel | UI, API, secrets, Git deploy | manager-8974 / affsiwen-platform; affsiwen-platform.vercel.app | Project access, Environment Variables, Deployments/Logs |
| Supabase | Postgres/Auth/RPC | aff7 platform / Affsiwen Platform; project kbogufjwhjpbehtexmla — прежний проверенный ref | Проверить ref в dashboard; SQL/Auth/backup access отдельным приглашением |
| Bright Data | Upstream schema/scraping | Ключ server-only Vercel BRIGHT_DATA_API_KEY; Amazon connected=true 08.10 | Компания/workspace, тариф/квоты, supplier agreement и ledger закрытым каналом |
| Anthropic | Продуктовый чат и vision | Aff7 platform; Haiku 4.5 pin; ключ только Production Secret | Workspace usage/billing и план ротации; ранее указан expiry 05.11.2026, перепроверить |
| Google OAuth | Вход покупателей/партнёров | Реализован через Supabase; GOOGLE_LOGIN_ENABLED=false 08.10 | Отдельный OAuth client и provider config; live acceptance ещё нужна |
| Resend | Письма | Выбрано отдельное пространство Affsiwen; завершение домена/доставки не подтверждено | Только пространство Affsiwen, DNS/SPF/DKIM/DMARC и SMTP настройки Supabase |
| Stripe | Будущие оплаты | Кабинет компании видели; полноценная cloud-интеграция не завершена | Sandbox/test resources, webhook и reconciliation до live |
| Sentry | Будущий мониторинг | Кабинет видели, instrumentation/delivery не доказаны | Проверить SDK и реальный test-event без пользовательских данных |
| Apify | Историческая модель/локальный адаптер | Не считать текущим upstream cloud-пилотов | История/контракты в исследованиях; не включать без отдельного решения |
| Render/Docker | Старый вариант размещения | Не текущая production-архитектура | Файлы сохранены как исторические, не применять как действующую инфраструктуру |

## Cloud-переменные

| Имя | Назначение | Секрет / значение |
|---|---|---|
| PUBLIC_ORIGIN | Exact HTTPS origin, без слеша | https://affsiwen-platform.vercel.app |
| SUPABASE_URL | URL выделенного проекта | Проверить dashboard; https://<project-ref>.supabase.co |
| SUPABASE_PUBLISHABLE_KEY | Публичный API key для серверных RPC/Auth | Не service_role; существующее значение у владельца |
| GOOGLE_LOGIN_ENABLED | Кнопка и OAuth route | yes только после настройки; сейчас false по health |
| BRIGHT_DATA_API_KEY | Upstream API | Secret, только сервер |
| ANTHROPIC_API_KEY | Messages API | Secret, только сервер |
| AFFSIWEN_AMAZON_CHAT_ENABLED | Включение чатов всех продуктов | yes в подтверждённой конфигурации 06.10 |
| AFFSIWEN_AMAZON_CHAT_MODEL | Pinned модель | claude-haiku-4-5-20251001 |
| AFFSIWEN_AMAZON_CHAT_DAILY_LIMIT | Общий дневной максимум попыток AI | 100, подтверждено 06.10; hard max 100, резерв $0.10/attempt, UTC |
| AFFSIWEN_AMAZON_RUN_ENABLED | Общий флаг supplier execution | Выключен по живой проверке 08.10 |
| AFFSIWEN_AMAZON_RUNS_PER_DAY | Общий лимит trigger attempts | 0 по живой проверке 08.10, hard max 3 |
| AFFSIWEN_CREATORS_RUN_ENABLED | Допуск составного Creator Shortlist | По умолчанию no; требуется одновременно общий execution flag |

Шаблон `cloud.env.example` содержит безопасные OFF defaults. Не копировать шаблон поверх работающих secrets: он не экспорт Vercel. Переменные APIFY_TOKEN, GOOGLE_CLIENT_SECRET, AFFSIWEN_LLM_* и STRIPE_* в старом `.env.example` относятся к локальному прототипу/будущей интеграции, не заменяют cloud-настройки.

## Порядок передачи

1. Владелец приглашает конкретного ответственного в GitHub/Vercel/Supabase и отдельные workspace поставщиков. Не выдавать доступы к другим продуктам компании.
2. Ответственный проверяет team/project/origin и права, не вытаскивает secret в чат или Git.
3. Сверяет работу текущих секретов по connection endpoint, expiry/usage и существующим незавершённым run.
4. Перед ротацией отключает новые расходы, сверяет unknown/running и дневные резервы; мигрирует namespace/ledger, а не обнуляет его.
5. После настройки OAuth/email проходит действительный buyer/supplier flow; operator выдаёт только администратор.

В этой передаче никаких приглашений, смены прав/ключей, пополнения или платного запуска не выполнялось.
