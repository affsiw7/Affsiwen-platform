# Состояние продукта на передачу

Дата: 2026-10-08. Где проверка была только 6 октября, дата указана явно. Не выдаём старую приёмку за новое тестирование каждого сервиса.

## Реализовано

- Посадочная, каталог по площадкам, чаты, фото в чате, предложение с критериями и объёмом, восстановление диалога, отображение таблицы и CSV.
- Облачный backend на Vercel с Postgres/Supabase Auth; общий demo marketplace с покупателем, партнёром и оператором, заявками, заказами и обращениями.
- Адаптеры поставщика: чтение inventory/schema, проверка входов, допустимых доменов, рынков и полей; приватные контракты на сервере.
- Ограниченное async-исполнение: план → одна попытка trigger → snapshot → status → нормализация → результат/экспорт. Код проверен на тестовых ответах, платная живая приёмка не завершена.
- Общие лимиты AI и исполнения; оптимистическая revision-блокировка; неизвестный исход платного запроса не повторяется автоматически.

## Каталог: 42 различных продукта

| Раздел | Продукты | Где детали |
|---|---|---|
| E-commerce, 8 | Amazon, Walmart, eBay, Etsy, AliExpress, Target, SHEIN US, Best Buy | ECOMMERCE_PRODUCTS.md, AMAZON_PRODUCT.md |
| Travel, 5 | Booking.com, Airbnb, Agoda, Trip.com, Naver | TRAVEL_PRODUCTS.md |
| Financial, 1 | Yahoo Finance | FINANCIAL_PRODUCTS.md |
| Social Media, 15 | LinkedIn, Instagram, TikTok, Facebook, YouTube, X, Reddit, Pinterest, Threads, Snapchat, Quora, Vimeo, Bluesky, Twitch, Bilibili | SOCIAL_POPULAR_PRODUCTS.md |
| AI Search, 1 | ChatGPT Search | SOCIAL_POPULAR_PRODUCTS.md |
| Research, 1 | Creator Shortlist: TikTok + YouTube, Instagram только по явной ссылке | CREATOR_SHORTLIST.md |
| Real Estate, 11 | Zillow, Otodom, Realestate.com.au, Zoopla, Zonaprop, Inmuebles24, Metrocuadrado, TocToc, Properati, InfoCasas, Suumo | REAL_ESTATE_PRODUCTS.md |

Most Popular — подборка шести существующих продуктов, не дополнительные продукты. У каждого продукта доступны только наблюдавшиеся операции: URL-only продукт нельзя рекламировать как свободный поиск по словам. Готовые массовые датасеты и свежий сбор — разные форматы; число 1043 из E-commerce поставщика не означает 1043 подключённых продукта Affsiwen.

## Подтверждено вживую

6 октября: опубликованы разделы; проверены metadata-подключения и отдельные реальные ответы Anthropic, фото, планы и восстановление. Real Estate: все 11 площадок, 22/22 операции доступны; Zillow Austin/Houses/продажа, история цены Zillow, Zoopla London/аренда, выдача Realestate.com.au с одной страницей подготовлены без платного сбора. Последний checkpoint передачи этого раздела: GitHub `9a853c9`, Vercel Ready.

8 октября: в разрешённом Chrome AFF7 прочитаны `/api/amazon/connection` и `/api/health`. Amazon `connected=true`, `reason=verified`; исполнение `enabled=false`, `maxRecords=10`, `maxRunsPerDay=0`. Health: `cloud-demo`, `supabase-postgres`, `googleLogin=false`, `payments=fixture`, `commercialSales=false`. Общий health всё ещё пишет `assistant=demo`: это описание общего marketplace, а не точный статус продуктового Anthropic-чата. Оно не отменяет отдельной живой AI-приёмки 6 октября.

## Не завершено / не обещать клиенту

- Google OAuth: код есть, флаг выключен; сквозная приёмка buyer/supplier/operator ещё нужна.
- Email/восстановление пароля: отдельное пространство/домен Affsiwen и доставка не подтверждены готовыми.
- Реальные Bright Data результаты для всех операций: контракт/schema доступен ≠ доставка и качество проверены.
- Цена и Stripe: нет утверждённого прайса, полноценной проверки webhook/суммы/валюты/повтора/возврата для cloud-пилотов.
- Связь anonymous product workspace с постоянным заказом/покупателем: не завершена. Срок 24 часа не годится для коммерческой истории.
- Расчёт фактической себестоимости, CAC и повторных покупок: нет достаточных замеров, нет подтверждённой маржи.
- Коммерческие юридические страницы, retention/delete policy, эксплуатационный мониторинг и восстановление cloud DB: требуют приёмки.

Экономические примеры в старых файлах — сценарии/история, не действующий прайс. Наличие кабинетов Stripe/Resend/Sentry не доказывает работающую интеграцию.
