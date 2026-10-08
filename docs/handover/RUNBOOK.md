# Запуск, эксплуатация и восстановление

## Получение исходников

Канонический repo: affsiw7/Affsiwen-platform. В ZIP есть `workspace-source/` (вся разработка, включая ранний SQLite) и `cloud-release/` (allowlist текущего cloud). Не менять origin рабочего checkout без проверки владельца. Не загружать local-only-records в публичный repo.

Нужен Node 24.x. Текущий проект использует встроенные Node модули; dependencies в package не объявлены. Не требуется установка неизвестных пакетов.

Полный рабочий снимок:

```sh
cd workspace-source
node --test tests/*.test.mjs
node scripts/build-cloud.mjs
node scripts/prepare-public.mjs
```

Для HTTP тестов система должна разрешать loopback listeners. Cloud-release имеет отдельный package с build, но не local dev/start. Команда `node server/http.mjs` в рабочем снимке — только ранний SQLite server, не эквивалент Supabase cloud. Для cloud-проверок используются tests/cloud.test.mjs и выделенный Vercel preview; секреты не передавать тестам с непроверенным кодом.

## Новая среда cloud

1. Создать/выбрать выделенный проект Affsiwen; не переиспользовать другой продукт.
2. Перед применением SQL ознакомиться с schema/RPC ownership и проверить резервную копию. Для новой базы: schema.sql → intake.sql → seed.sql. Seed `on conflict do nothing`, но SQL — не система миграций с версиями. На живой базе бездумно не повторять.
3. В изолированной среде выполнить verify.sql и негативные проверки authorization. verify.sql выполняет acceptance-транзакцию с rollback; предварительно прочитать, не использовать его как безусловную команду на production.
4. Vercel: Node 24, `node scripts/build-cloud.mjs`, output public, supplied vercel.json. Добавить exact origin, Supabase URL/publishable key, остальные flags OFF. Service-role key не требуется.
5. Supabase Auth Site URL и callbacks должны соответствовать новой среде. Google-вход включать только после проверки правильного provider/client. Для production callback: `https://affsiwen-platform.vercel.app/api/auth/google/callback`.
6. Preview → build Ready → browser/API/DB acceptance → согласованная production publication. Main GitHub auto-deploy связан с Vercel; запись в main может опубликовать изменения.

## Проверка публикации

- Проверить intended GitHub repo/team/project/commit и Vercel Ready.
- Открыть главную, category, product; прочитать health и connection. Проверить реальный ассистентный ответ только в разрешённой квоте.
- Проверить сохранение параметров после reload, отсутствие поставщик-ключей в response/UI, корректность disabled run/payment.
- Для разрешённого supplier pilot проверить фактический run/snapshot в кабинете, поля/CSV, стоимость, пустой/ошибочный результат и дальнейшее восстановление. Это НЕ выполняется автоматически при передаче.

## Диагностика

| Симптом | Что проверить / действие |
|---|---|
| Страница висит на подключении | Console/API health, PUBLIC_ORIGIN, Supabase URL/key, наличие RPC, failed deployment; не менять другие проекты |
| Health=assistant demo, но продуктовый чат работает | Общий demo status; проверить конкретный продукт и pinned model; исправление health отдельно |
| connection=false | Secret presence/expiry, inventory availability, schema/операции и host restrictions. Не угадывать IDs/inputs |
| 429 chat | Общая UTC-квота/длина истории/1000 intake docs. Не сбрасывать counter или повышать лимит самостоятельно |
| 409 workspace | expected_revision conflict; прочитать свежий workspace. Не повторять платный trigger |
| 503 run | Флаг OFF/нет key/нулевой allowance; это штатная блокировка до пилота |
| starting/unknown | Сверить snapshot/поставщика вручную; нет автоматического повторного POST |
| running | Разрешено read-only progress; дождаться завершения/проверить provider. Не создавать новый платный job |
| пустые поля | «—» означает поле не получено; не подставлять валюту, площадь или метрики из догадок |
| Google disabled | Provider, callback/site URL и флаг; секрет клиента на стороне Supabase |
| Письма не доходят | Отдельный домен/SMTP, verified sender, delivery/errors; не использовать чужой workspace |

## Резервные копии

ZIP сохраняет код/документацию, а не живые заказы/Auth/history. Backup Supabase зависит от выбранного плана и конфигурации; нужен отдельный подтверждённый план backup/restore и пробное восстановление в изолированный проект. Не выгружать production users/credentials в публичный GitHub.

`scripts/backup.mjs` и `restore.mjs` относятся к локальному SQLite, НЕ Supabase. Они читают var/pilot.sqlite; restore не перезаписывает существующую БД. Локальные базы намеренно не включены в архив передачи.

Rollback Vercel восстанавливает код, но не откатывает SQL/данные/списания поставщика. Перед rollback убедиться в совместимости RPC/schema с прошлым backend. Не включать повторное исполнение неизвестных run после отката.
