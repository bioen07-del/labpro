# CHANGELOG — 01.02.2026 — Донации, расширение доноров, исправления UI

## Контекст
Полный скан проекта выявил 23 расхождения между кодом и ТЗ (+ Дополнение по донорам/донациям).
В этой сессии исправлены 6 блокеров, 5 функциональных проблем и 3 мелких бага.

---

## Изменённые файлы (11 штук)

### 1. `supabase/schema.sql`
**Тип**: Серьёзная доработка

- **Убраны все ENUM-типы** (строки 16-38 старого файла). Все статусные поля теперь TEXT — для гибкости и отсутствия конфликтов при миграциях
- **Добавлена таблица `tissue_types`** — справочник типов тканей (code, name, tissue_form: SOLID/LIQUID)
- **Расширена таблица `donors`**:
  - Добавлены: `middle_name`, `sex` (вместо `gender`), `phone`, `email`, `created_by`
  - Убран `gender` (заменён на `sex` для единообразия с types/index.ts)
- **Добавлена таблица `donations`** — полная сущность донации:
  - Связь с донором (`donor_id`), тип ткани (`tissue_type_id`), дата забора
  - Параметры: объём/масса, согласие, договор
  - 4 инфекционных теста: `inf_hiv`, `inf_hbv`, `inf_hcv`, `inf_syphilis`
  - Статус: QUARANTINE → APPROVED / REJECTED (авто через триггер)
- **Таблица `cultures`**: добавлен `donation_id UUID REFERENCES donations(id)`
- **Таблица `lots`**: добавлены `parent_lot_id` и `source_container_id` для поддержки split-при-пассаже
- **Добавлены индексы**: `idx_cultures_donation_id`, `idx_donations_donor_id`, `idx_donations_status`, `idx_lots_parent_lot_id`
- **Добавлен FK**: `lots.source_container_id → containers(id)` (отложенный, после создания таблицы containers)
- **Добавлен триггер**: `update_donation_status()` — автоматический расчёт статуса донации на основе результатов инфекционных тестов

### 2. `supabase/seed.sql`
**Тип**: Исправление + дополнение

- Исправлен case: `'fibroblast'` → `'FIBROBLAST'` (строка 13)
- Исправлен case: `'COBblestone'` → `'COBBLESTONE'` (строка 35)
- Добавлен seed для `tissue_types`: 9 типов тканей (ADIPOSE, CARTILAGE, BONE, BONE_MARROW, BLOOD, SKIN, MUSCLE, PLACENTA, CORD_BLOOD)

### 3. `frontend/src/types/index.ts`
**Тип**: Исправление + дополнение

- `Container.container_status` → `Container.status` (совпадает с schema.sql)
- `ContainerStatus` расширен: `'IN_CULTURE' | 'IN_BANK' | 'ISSUED' | 'DISPOSE' | 'QUARANTINE'`
- `DashboardStats` обновлён: `totalCultures`, `activeCultures`, `totalBanks`, `pendingOrders`, `pendingTasks`, `activeContainers`
- В `Database` type добавлены: `donations`, `tissue_types`

### 4. `frontend/src/lib/api.ts`
**Тип**: Новые функции + исправление

Новые функции (после секции DONORS):
- `getDonations(filters?: { donor_id, status })` — список донаций с join donor + tissue_type
- `getDonationById(id)` — детализация с join cultures
- `createDonation(donation)` — создание с авто-генерацией кода DON-XXXX
- `updateDonation(id, updates)` — обновление (статус считает триггер в БД)
- `getTissueTypes()` — справочник типов тканей

Исправлена `getDashboardStats()`:
- **Было**: count всех lots/banks/orders/containers (без фильтров)
- **Стало**: cultures total + active, banks total, orders pending, tasks pending, containers in culture

### 5. `frontend/src/components/header.tsx`
**Тип**: Изменение навигации

- **Добавлен**: `<NavLink href="/donors">Доноры</NavLink>` — после "Дашборд"
- **Удалён**: `<NavLink href="/lots">Лоты</NavLink>`
- **Удалён**: `<NavLink href="/containers">Контейнеры</NavLink>`
- **Переупорядочено**: Дашборд → Доноры → Культуры → Банки → Операции → QC → Среды → Склад → Оборудование → Заявки → Задачи → Аудит → QR

### 6. `frontend/src/app/donors/page.tsx`
**Тип**: Полная переработка

- Показывает ФИО (last_name, first_name, middle_name) вместо code + tissue_type
- Поиск по ФИО и коду
- Показывает: пол, дату рождения, телефон, статус
- Кнопка "Донация" на каждой карточке → `/donors/[id]/donations/new`
- Ссылка на карточку донора → `/donors/[id]`

### 7. `frontend/src/app/donors/new/page.tsx`
**Тип**: Полная переработка

- **Убраны**: `age`, `tissueType` (hardcoded dropdown), `tissueWeight`, `tissueTypeText`, `passageYield`
- **Добавлены**: Фамилия*, Имя*, Отчество, Дата рождения, Пол, Телефон, Email, Примечания
- Исправлена опечатка: "донороре" → "доноре"
- Redirect после создания → `/donors/[id]` (а не несуществующая страница)
- Подсказка: "После регистрации донора создайте донацию"

### 8. `frontend/src/app/donors/[id]/page.tsx` — НОВЫЙ ФАЙЛ
**Тип**: Создание с нуля

Страница детализации донора:
- Данные донора: ФИО, пол, дата рождения, телефон, email, группа крови, статус, примечания
- Статистика: общее кол-во донаций, одобренных, на карантине, отклонённых
- Список донаций с:
  - Код, дата забора, тип ткани
  - Иконки инфекционных тестов (зелёная ✓ / красная ✗ / жёлтая ⏳)
  - Бейдж статуса (Одобрена / Карантин / Отклонена)
  - Объём/масса ткани
  - Кнопка "Создать культуру" для APPROVED донаций
- Кнопка "Новая донация"

### 9. `frontend/src/app/donors/[id]/donations/new/page.tsx` — НОВЫЙ ФАЙЛ
**Тип**: Создание с нуля

Форма регистрации донации:
- Заголовок с ФИО и кодом донора (загружается по ID из URL)
- Данные забора: дата*, тип ткани (из getTissueTypes()), объём/масса (зависит от формы ткани)
- Согласие и договор: чекбокс, документ, номер/дата договора
- Результаты инфекций: 4 селекта (ВИЧ, HBV, HCV, Сифилис) — PENDING/NEGATIVE/POSITIVE
- Превью статуса в реальном времени: все NEGATIVE = Одобрена, любой POSITIVE = Отклонена, иначе = Карантин
- Sidebar: данные донора, сводка, кнопка создания
- Redirect после создания → `/donors/[id]`

### 10. `frontend/src/app/cultures/new/page.tsx`
**Тип**: Доработка

- Добавлен импорт `getDonations` из api.ts
- Добавлено состояние `donorDonations` и `donationIdState`
- При выборе донора — автоматическая загрузка его APPROVED-донаций
- Новый селект "Донация" (только одобренные)
- Предупреждение если у донора нет одобренных донаций
- `donation_id` передаётся при создании культуры
- Поддержка URL-параметров `?donor_id=...&donation_id=...` (из карточки донора)
- Обновлена сводка: показывает код донации

### 11. `frontend/src/app/page.tsx` (Dashboard)
**Тип**: Исправление

- Состояние stats: `totalLots/totalBanks/totalOrders/totalContainers` → `totalCultures/activeCultures/totalBanks/pendingOrders/pendingTasks/activeContainers`
- Карточка "Культуры": показывает `activeCultures` из `totalCultures` (было: totalLots)
- Карточка "Заявки": `pendingOrders` (было: totalOrders — все)
- Карточка "Контейнеры": `activeContainers` с подписью "в культивировании" (было: totalContainers "в работе")
- Задачи: показывают `task.title` если есть, иначе перевод `task.type`

---

## Что НЕ менялось (и НЕ нужно трогать)

- `lib/supabase.ts` — уже правильно использует `createBrowserClient`
- `lib/auth-context.tsx` — AuthProvider работает
- `middleware.ts` — защита маршрутов работает
- `login/page.tsx` — Supabase Auth с кнопками быстрого входа
- Операции в api.ts (Passage, Freeze, Thaw, Feed) — уже реализованы правильно
- Миграция `20260201210000_create_demo_users.sql` — демо-пользователи с bcrypt

---

## Требуется после этих изменений

### Миграция Supabase (ОБЯЗАТЕЛЬНО)
Нужно применить миграцию к существующей БД. Варианты:

**Вариант 1 — SQL Editor в Supabase Dashboard:**
Выполнить SQL из файла миграции (см. промпт в конце предыдущей сессии).

**Вариант 2 — Supabase CLI:**
```bash
npx supabase db push
```

### Ключевые SQL-команды миграции:
```sql
CREATE TABLE IF NOT EXISTS tissue_types (...);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS sex TEXT;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS email TEXT;
CREATE TABLE IF NOT EXISTS donations (...);
ALTER TABLE cultures ADD COLUMN IF NOT EXISTS donation_id UUID REFERENCES donations(id);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS parent_lot_id UUID REFERENCES lots(id);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS source_container_id UUID REFERENCES containers(id);
-- + RLS policies для tissue_types и donations
-- + Trigger update_donation_status()
-- + Seed tissue_types (9 записей)
```

### Удалить сломанную миграцию:
```
supabase/migrations/20260201200000_auth_users.sql → переименовать в .sql.bak
```

---

## Оставшиеся известные проблемы (не исправлены в этой сессии)

| # | Проблема | Приоритет |
|---|---|---|
| 1 | Страницы `/lots` и `/containers` всё ещё существуют (ссылки убраны из навигации, но страницы не удалены) | Низкий |
| 2 | `operations/freeze/page.tsx` хардкодит bank_type='MCB' на UI (api.ts auto-detect работает) | Средний |
| 3 | Нет страницы `/donations/[id]/page.tsx` (отдельная карточка донации) | Низкий |
| 4 | schema.sql donors имеет `gender` (старое имя) в БД — миграция должна переименовать | Средний |
| 5 | `Checkbox` компонент используется в donations/new — убедиться что shadcn/ui checkbox установлен | Средний |
