# ПОЛНЫЙ АУДИТ ПРОЕКТА LabPro: Расхождения кода с ТЗ

## Общая оценка
Проект LabPro реализован на ~85%, но **большая часть функционала НЕ РАБОТАЕТ в production** из-за критических расхождений между схемой БД (`schema.sql`), TypeScript-типами (`types/index.ts`) и API-функциями (`api.ts`). Основная причина: **несовпадение имён полей** между БД и кодом, **отсутствующие таблицы/поля в БД**, и **использование mock-данных вместо реальных API**.

---

## ТАБЛИЦА РАСХОЖДЕНИЙ

### КРИТИЧЕСКИЕ (блокируют работу)

| # | Файл | Часть ТЗ | Расхождение | Что нужно сделать |
|---|------|----------|-------------|-------------------|
| 1 | `schema.sql:384` vs `types/index.ts:98` vs `api.ts:222,429` | ERD: Контейнеры | В БД поле называется `status` (тип `container_status`), в TypeScript и API используется `container_status`. Все SELECT/UPDATE запросы к контейнерам ПАДАЮТ. | Переименовать колонку в БД: `ALTER TABLE containers RENAME COLUMN status TO container_status;` ИЛИ поменять во всём коде `container_status` на `status` |
| 2 | `schema.sql:383` vs `types/index.ts:96` | ERD: Контейнеры | В БД поле `type_id`, в TypeScript `container_type_id`. Все JOIN-запросы к типам контейнеров НЕ РАБОТАЮТ. | Переименовать в БД: `ALTER TABLE containers RENAME COLUMN type_id TO container_type_id;` ИЛИ поменять в коде |
| 3 | `api.ts:324-330` vs `schema.sql:510-520` | Операция OBSERVE | API вставляет в `operation_containers` без обязательного поля `role` (constraint `NOT NULL`). Insert ПАДАЕТ. | Добавить `role: 'SOURCE'` в каждый insert для operation_containers |
| 4 | `api.ts:1597-1604` vs `schema.sql:510-520` | Операция PASSAGE | API вставляет `split_ratio`, `new_confluent_percent`, `seeded_cells` в `operation_containers`, но этих полей НЕТ в схеме. Также нет `role`. Insert ПАДАЕТ. | Добавить недостающие поля в таблицу `operation_containers` или вынести в `operation_metrics`. Добавить `role` |
| 5 | `api.ts:1658-1663` vs `schema.sql:510-520` | Операция FEED | API вставляет `medium_id`, `volume_ml` в `operation_containers`, но этих полей НЕТ в схеме. Также нет `role`. Insert ПАДАЕТ. | Данные о средах должны идти в `operation_media`, а не в `operation_containers`. Добавить `role` |
| 6 | `api.ts:1738-1744` vs `schema.sql:510-520` | Операция FREEZE | API вставляет `cryo_vial_ids`, `notes` в `operation_containers`, но этих полей НЕТ в схеме. Также нет `role`. Insert ПАДАЕТ. | Убрать `cryo_vial_ids`, добавить `role: 'SOURCE'`, создать связь через отдельную таблицу или JSON-поле |
| 7 | `api.ts:1617-1618` | Операция PASSAGE | Вызывается несуществующая RPC-функция `increment_passage_count` и поле `passage_count` которого НЕТ в БД. | Добавить поле `passage_count INTEGER DEFAULT 0` в `containers` и создать функцию `increment_passage_count()` ИЛИ считать passage из lot |
| 8 | `api.ts:1676,1679` vs `schema.sql:476-491` | Операция FEED | Используется поле `current_volume_ml` в `ready_media`, которого НЕТ в БД. | Добавить поле `current_volume_ml DECIMAL(10,2)` в `ready_media` или использовать `volume_ml` |
| 9 | `api.ts:1724-1725` vs `schema.sql:413-422` | Операция FREEZE | Вставляется `lot_id` и `freezing_date` в `cryo_vials`, но этих полей НЕТ в схеме. | Добавить `freezing_date DATE` и `lot_id UUID REFERENCES lots(id)` в таблицу `cryo_vials` |
| 10 | `api.ts:1752` vs `schema.sql:395-411` | Операция FREEZE | Читается поле `vial_count` из `banks`, но в БД поле называется `cryo_vials_count`. | Заменить `vial_count` на `cryo_vials_count` в api.ts |
| 11 | `api.ts:1768` | Операция FREEZE | Обновляет `container_status` на `'FROZEN'`, но enum `container_status` допускает только `ACTIVE`, `IN_BANK`, `DISPOSE`. Значение `FROZEN` не валидно. | Использовать `IN_BANK` вместо `FROZEN`, или добавить `FROZEN` в enum |
| 12 | `api.ts:981-1017` vs `schema.sql` | Оборудование: логи | Таблица `equipment_logs` используется в API, но НЕ СУЩЕСТВУЕТ в схеме БД. Все операции с логами ПАДАЮТ. | Создать таблицу `equipment_logs` в schema.sql |
| 13 | `api.ts:999` vs `schema.sql:601-611` | Оборудование | Обновляется поле `current_temperature`, которого НЕТ в таблице `equipment`. | Добавить поле `current_temperature DECIMAL(5,1)` в `equipment` |

### ВЫСОКИЙ ПРИОРИТЕТ (функционал работает некорректно)

| # | Файл | Часть ТЗ | Расхождение | Что нужно сделать |
|---|------|----------|-------------|-------------------|
| 14 | `header.tsx:19,26,88,93` | Уведомления | Header использует `mockNotifications` из mock-data.ts вместо реального API. Счётчик уведомлений и список — фейковые. | Заменить на вызов `getNotifications()` из api.ts с useEffect |
| 15 | `users/page.tsx:10-58` | Пользователи: RBAC | Страница пользователей использует `mockUsers` — жёстко вшитый массив. Нет вызова `getUsers()` API. | Заменить mock на `getUsers()`, добавить useEffect для загрузки |
| 16 | `containers/page.tsx:12-33` | Контейнеры: список | Страница контейнеров использует `mockContainers` — 2 захардкоженных записи. Нет API-вызовов. | Заменить mock на `getContainers()`, добавить фильтрацию и поиск |
| 17 | `schema.sql:777,782,795` | Авто-закрытие лота | Триггер `check_lot_closure` проверяет `NEW.status = 'DISPOSE'`, но если поле переименовать в `container_status` — триггер сломается. Сейчас триггер и код API используют разные имена поля. | Синхронизировать имя поля в триггере с финальным решением по именованию |
| 18 | `page.tsx:43-48` (Dashboard) | Дашборд: задачи и уведомления | ТЗ требует блоки "Мои задачи" и "Уведомления" на дашборде. Сейчас показывает только статистику + последние банки/заказы/операции. Нет блока задач. | Добавить секции Tasks и Notifications на дашборд с вызовами `getTasks()` и `getNotifications()` |
| 19 | `header.tsx:122-133` | Авторизация | Имя пользователя и email захардкожены: "Администратор", "admin@labpro.local". Нет привязки к реальному авторизованному пользователю. | Получать данные через `getCurrentUser()` и отображать реальное имя/роль |
| 20 | `operations/new/page.tsx` | Все операции | Вкладки FEED, OBSERVE, FREEZE, THAW, DISPOSE показывают заглушку "в разработке". Отдельные страницы операций (`/operations/feed`, `/operations/observe` и т.д.) реализованы, но единая форма создания операции не завершена. | Либо перенаправлять на отдельные страницы, либо встроить полные формы в табы |
| 21 | `schema.sql:836-876` | RBAC: политики | Все RLS-политики дают доступ любому `authenticated` пользователю. Нет разграничения по ролям (OPERATOR, MANAGER, ADMIN и т.д.) как требует ТЗ. | Реализовать RLS с проверкой `auth.jwt() ->> 'role'` для каждой таблицы |

### СРЕДНИЙ ПРИОРИТЕТ (частично работает / недостаёт функционала)

| # | Файл | Часть ТЗ | Расхождение | Что нужно сделать |
|---|------|----------|-------------|-------------------|
| 22 | `scan/page.tsx` | QR-сканирование | Реализован только поиск позиций по QR (`getPositionByQR`). Поиск контейнеров, сред, оборудования по QR-коду — заглушки. | Реализовать парсинг QR-кодов (CNT:, EQP:, CULT:, POS:) и поиск соответствующих сущностей |
| 23 | `api.ts` | FEFO-контроль | Функция `check_fefo_compliance()` определена в БД, но НИГДЕ не вызывается в API. Инвентарь не проверяет FEFO при расходовании. | Интегрировать вызов `check_fefo_compliance` при создании операций FEED, PASSAGE, FREEZE |
| 24 | `cultures/[id]/page.tsx`, `banks/[id]/page.tsx` | Аудит-история | Вкладки "История" показывают заглушку "История будет доступна после интеграции с audit_logs". | Реализовать запрос к `audit_logs` с фильтрацией по сущности |
| 25 | `api.ts` | Задачи: автосоздание | ТЗ требует автоматическое создание задач после операций (INSPECT через 2-3 дня после Observe, FEED через 2-3 дня, и т.д.). Нет такой логики. | Добавить side-effect в каждую `createOperation*` функцию: вызывать `createTask()` с правильным типом и due_date |
| 26 | `api.ts` | Уведомления: автосоздание | ТЗ требует автоматические уведомления (QC_READY, ORDER_DEADLINE, CONTAMINATION и т.д.). Нет такой логики. | Добавить триггеры в БД или side-effects в API для создания уведомлений |
| 27 | `api.ts` | Forecast: прогноз роста | ТЗ описывает алгоритм прогноза времени достижения целевой конфлюентности. Не реализован. | Реализовать функцию `forecastGrowth()` на основе истории наблюдений |
| 28 | Все страницы со списками | Dropdown-действия | Кнопки действий в dropdown-меню (Просмотр, Изменить статус, Создать паспорт и т.д.) — UI без обработчиков. | Подключить обработчики onClick с вызовами API |
| 29 | `api.ts` | Доноры + Культуры | ТЗ описывает связь Donor → Donation → Culture. В БД нет таблицы `donations`. Culture связывается напрямую с donor. | Добавить таблицу `donations` или документировать упрощение |
| 30 | Вся навигация | Donors | В header нет ссылки на страницу доноров `/donors`. Есть только `/donors/new`. | Создать страницу списка доноров `/donors/page.tsx` и добавить в навигацию |
| 31 | `schema.sql:706-730` | Код контейнера | Функция `generate_container_code()` определена, но НИГДЕ не используется. Коды генерируются в JS. | Либо удалить мёртвую функцию, либо вызывать через RPC |

---

## СВОДКА ПО ФАЙЛАМ

### Файлы с КРИТИЧЕСКИМИ проблемами:
- **`supabase/schema.sql`** — 8 несоответствий с API (поля, таблицы, триггеры)
- **`frontend/src/lib/api.ts`** — 13 функций используют несуществующие поля/таблицы
- **`frontend/src/types/index.ts`** — имена полей не совпадают с БД

### Файлы с mock-данными вместо API:
- **`frontend/src/components/header.tsx`** — mock уведомления
- **`frontend/src/app/users/page.tsx`** — mock пользователи
- **`frontend/src/app/containers/page.tsx`** — mock контейнеры

### Файлы с заглушками "в разработке":
- **`frontend/src/app/operations/new/page.tsx`** — 5 из 6 табов

---

## ПРОМПТЫ ДЛЯ ИИ-АГЕНТА

### Промпт 1: Исправление схемы БД (КРИТИЧЕСКИЙ)

```
Ты Senior Database Engineer. Проект LabPro (Supabase/PostgreSQL).

Задача: Привести схему БД в соответствие с кодом фронтенда.

Файл: supabase/schema.sql

Нужно создать SQL-миграцию которая:

1. ALTER TABLE containers RENAME COLUMN status TO container_status;
2. ALTER TABLE containers RENAME COLUMN type_id TO container_type_id;
3. ALTER TABLE containers ADD COLUMN passage_count INTEGER DEFAULT 0;
4. ALTER TABLE cryo_vials ADD COLUMN freezing_date DATE;
5. ALTER TABLE cryo_vials ADD COLUMN lot_id UUID REFERENCES lots(id);
6. ALTER TABLE ready_media ADD COLUMN current_volume_ml DECIMAL(10,2);
7. ALTER TABLE equipment ADD COLUMN current_temperature DECIMAL(5,1);
8. Добавить значение 'FROZEN' в enum container_status (или заменить на IN_BANK в коде);
9. CREATE TABLE equipment_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
     temperature DECIMAL(5,1),
     notes TEXT,
     logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
10. Добавить недостающие поля в operation_containers:
    - notes TEXT
    - medium_id UUID REFERENCES ready_media(id)
    - volume_ml DECIMAL(10,2)
    - split_ratio VARCHAR(20)
    - new_confluent_percent INTEGER
    - seeded_cells DECIMAL(15,2)
    (Сделать поле role NULLABLE или добавить DEFAULT)
11. Обновить триггер check_lot_closure: заменить status на container_status;
12. Создать функцию increment_passage_count(row_id UUID);
13. Обновить все RLS-политики;
14. Обновить schema.sql целиком и создать отдельный файл migration.sql;

ВАЖНО: Не ломать существующие данные. Использовать IF NOT EXISTS где возможно.
```

### Промпт 2: Исправление API-функций (КРИТИЧЕСКИЙ)

```
Ты Senior Full-Stack Developer. Проект LabPro (Next.js + Supabase).

Задача: Исправить все API-функции в frontend/src/lib/api.ts чтобы они соответствовали реальной схеме БД.

Контекст: Схема БД уже обновлена (поля переименованы, таблицы добавлены).

Что нужно исправить:

1. createOperationObserve (строки 324-330):
   - Добавить role: 'SOURCE' в каждый объект operationContainers

2. createOperationPassage (строки 1597-1604):
   - Добавить role: 'SOURCE' в operationContainers
   - Исправить passage_count: заменить supabase.rpc на прямой UPDATE:
     passage_count: (current_passage_count || 0) + 1
   - Метрики (split_ratio, seeded_cells) вынести в operation_metrics

3. createOperationFeed (строки 1658-1663):
   - Данные о средах (medium_id, volume_ml) вынести в operation_media
   - Добавить role: 'SOURCE' в operation_containers
   - Исправить current_volume_ml: убедиться что поле есть в БД

4. createOperationFreeze (строки 1738-1744):
   - Убрать cryo_vial_ids из operation_containers
   - Добавить role: 'SOURCE'
   - Заменить vial_count на cryo_vials_count (строка 1752)
   - Заменить 'FROZEN' на 'IN_BANK' (строка 1768)
   - Код контейнера cryo_vial: генерировать по формату из ТЗ

5. createOperationDispose (строки 410-429):
   - Проверить что имя поля container_status совпадает с БД

6. createEquipmentLog (строки 981-1005):
   - Убедиться что таблица equipment_logs существует в БД

7. Общее:
   - Все операции должны создавать Task (side-effect) по ТЗ
   - Все операции должны записывать inventory_movement при расходовании сред
   - Удалить дублирование hardcoded credentials (строки 18-19)

Прочитай файл api.ts ЦЕЛИКОМ, затем прочитай schema.sql ЦЕЛИКОМ.
Исправляй только то, что точно сломано. Не рефактори рабочий код.
```

### Промпт 3: Замена mock-данных на реальные API (ВЫСОКИЙ ПРИОРИТЕТ)

```
Ты Senior React Developer. Проект LabPro (Next.js 16, App Router, TypeScript).

Задача: Заменить все mock-данные на реальные API-вызовы в трёх файлах.

Файл 1: frontend/src/components/header.tsx
- Строка 19: Удалить import mockNotifications, mockDashboardStats из mock-data
- Добавить useState + useEffect для загрузки уведомлений через getNotifications() из api.ts
- Добавить useState + useEffect для текущего пользователя через getCurrentUser()
- Заменить hardcoded "Администратор"/"admin@labpro.local" (строки 131-132) на данные из getCurrentUser
- Кнопка "Выйти" (строка 147): подключить signOut() из api.ts
- Кнопка "Прочитать все" (строка 85): подключить markAllNotificationsRead()

Файл 2: frontend/src/app/users/page.tsx
- Удалить массив mockUsers (строки 10-58)
- Добавить "use client", useState, useEffect
- Загружать данные через getUsers() из api.ts
- Добавить loading state и error handling
- Реализовать кнопку "Добавить пользователя" (переход на /users/new или модальное окно)

Файл 3: frontend/src/app/containers/page.tsx
- Удалить массив mockContainers (строки 12-33)
- Добавить "use client", useState, useEffect
- Загружать данные через getContainers() из api.ts
- Добавить фильтрацию по статусу (ACTIVE/IN_BANK/DISPOSE)
- Добавить поиск по коду контейнера
- Добавить loading state и error handling

ВАЖНО: Сохранить существующий UI/UX. Менять только источник данных.
Использовать паттерн из рабочих страниц (cultures/page.tsx, banks/page.tsx).
```

### Промпт 4: Реализация недостающего функционала (СРЕДНИЙ ПРИОРИТЕТ)

```
Ты Senior Full-Stack Developer. Проект LabPro (Next.js 16 + Supabase).

Задача: Реализовать недостающий функционал по ТЗ.

1. DASHBOARD (frontend/src/app/page.tsx):
   - Добавить секцию "Мои задачи" с вызовом getTasks({ status: 'PENDING' })
   - Добавить секцию "Уведомления" с вызовом getNotifications()
   - Убрать hardcoded алерты, заменить на реальные данные

2. QR-СКАНЕР (frontend/src/app/scan/page.tsx):
   - Реализовать парсинг QR по формату из ТЗ:
     CNT:{code} → поиск контейнера через getContainers({code})
     EQP:{code} → поиск оборудования через getEquipment({code})
     CULT:{code} → поиск культуры через getCultures({code})
     POS:{code} → поиск позиции (уже работает)
   - Отображать карточку найденного объекта с кнопками действий

3. ИСТОРИЯ/АУДИТ (cultures/[id] и banks/[id]):
   - Заменить заглушку "История будет доступна" на реальный запрос
   - Вызывать getAuditLogs() с фильтром по target_type и target_id
   - Отобразить в виде timeline

4. FEFO-КОНТРОЛЬ (api.ts):
   - В createOperationFeed: перед использованием партии вызвать check_fefo_compliance через supabase.rpc()
   - Если не FEFO-compliant — показать предупреждение (вернуть warning в ответе)

5. АВТОЗАДАЧИ (api.ts):
   - После createOperationObserve → createTask(INSPECT, через 2-3 дня)
   - После createOperationFeed → createTask(FEED, через 2-3 дня)
   - После createOperationFreeze → createTask(QC_DUE, для банка)

6. ОПЕРАЦИЯ /operations/new:
   - Табы FEED, OBSERVE, FREEZE, THAW, DISPOSE: заменить заглушки на redirect
     на соответствующие страницы /operations/feed, /operations/observe и т.д.

Прочитай ТЗ_LabPro.md и ТЗ_LabPro_ИИ.md перед началом работы.
```

### Промпт 5: Финальная проверка и тестирование

```
Ты QA-инженер и Full-Stack Developer. Проект LabPro (Next.js 16 + Supabase).

Задача: Провести end-to-end проверку всех операций.

Для КАЖДОЙ из операций ниже:
1. Прочитай код формы (frontend page)
2. Прочитай код API-функции (api.ts)
3. Прочитай схему БД (schema.sql) для всех затрагиваемых таблиц
4. Проверь что ВСЕ поля совпадают (имена, типы, NOT NULL constraints)
5. Проверь что ВСЕ FK-ссылки валидны
6. Составь список оставшихся расхождений

Операции для проверки:
- OBSERVE: observe/page.tsx → createOperationObserve → operations, operation_containers, containers
- FEED: feed/page.tsx → createOperationFeed → operations, operation_containers, operation_media, ready_media, batches
- PASSAGE: new/page.tsx (passage tab) → createOperationPassage → operations, operation_containers, containers, lots
- FREEZE: freeze/page.tsx → createOperationFreeze → operations, operation_containers, banks, cryo_vials, containers
- DISPOSE: dispose/page.tsx → createOperationDispose → operations, containers/batches/ready_media
- Culture creation: cultures/new/page.tsx → createCulture, createLot, createContainer
- Bank creation: через freeze → createBank

Дополнительно проверь:
- npm run build проходит без ошибок
- Все import-ы разрешаются
- Нет unused imports или переменных
- TypeScript типы совпадают с реальными данными из Supabase
```

---

## ПОРЯДОК ИСПРАВЛЕНИЯ

1. **Миграция БД** (Промпт 1) — исправляет фундамент
2. **API-функции** (Промпт 2) — исправляет обмен данными
3. **Mock → API** (Промпт 3) — подключает реальные данные к UI
4. **Недостающий функционал** (Промпт 4) — дополняет по ТЗ
5. **Тестирование** (Промпт 5) — валидация всего

---

## ДОПОЛНИТЕЛЬНЫЕ НАХОДКИ

1. **Безопасность**: Supabase credentials захардкожены в `supabase.ts:8-9` и `api.ts:18-19` как fallback. Нужно удалить и полагаться только на env-переменные Vercel.
2. **Навигация**: Нет страницы списка доноров (`/donors`), нет ссылки в header.
3. **Мобильное меню**: Кнопка "Menu" в header (строка 153) не имеет обработчика — мобильная навигация не работает.
4. **Trigger updated_at**: Определён только для `cultures`. Нужен для `lots`, `containers`, `banks`, `operations` и др.
5. **Dead code в schema.sql**: функции `generate_container_code()` и `check_fefo_compliance()` определены но нигде не вызываются.
