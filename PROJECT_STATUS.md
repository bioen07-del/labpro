# LabPro — Статус проекта

**Дата обновления:** 14.02.2026
**Версия:** 1.27.01
**Реализовано:** ~98% от ТЗ (25 фаз + 17 итераций)
**Стек:** Next.js 16 + TypeScript 5.9 + React 19 + Tailwind 4 + Supabase + Vercel

---

## Документы проекта

| Файл | Назначение |
|------|------------|
| `ТЗ_LabPro.md` | Техническое задание (source of truth) |
| `PROGRESS.md` | История разработки (25 фаз + итерации) |
| `PROJECT_STATUS.md` | Текущий статус, нерешённые позиции, бэклог (этот файл) |
| `CULTURE_METRICS.md` | Формулы метрик культур (8 вариантов) |
| `TODO_UNITS_CALCULATOR.md` | Архитектура единиц измерения и калькулятора растворов |
| `CLAUDE_MEMORY.md` | AI-контекст для межсессионной работы |
| `rules.md` | Правила разработки |

---

## Нерешённые позиции (из ТЗ)

### Приоритет: Высокий

| # | Позиция | Раздел ТЗ | Статус | Детали |
|---|---------|-----------|--------|--------|
| 1 | Списание сред при SEED + Freeze | 7.1, 7.5, 8.3 | ЗАКРЫТО ✅ | writeOffBatchVolume, 3 среды при заморозке |
| 2 | Выдача — бизнес-логика | 9.2 | ЗАКРЫТО ✅ | reserveBankForOrder, issueOrderItems, cancelOrder |
| 3 | Прогноз клеток (Cell Forecast) | 17 | ЗАКРЫТО ✅ | calculateAndUpdateCoefficient, forecastCells, forecastGrowth |
| 4 | Метрики культуры (Td, PD, CPD) | 17 | ЗАКРЫТО ✅ | calculateCultureMetrics(), CULTURE_METRICS.md |

### Приоритет: Средний

| # | Позиция | Раздел ТЗ | Статус | Детали |
|---|---------|-----------|--------|--------|
| 5 | QR-генерация и печать | 12, 22.4 | ЗАКРЫТО ✅ | QRLabel, позиции оборудования, контейнеры, банки |
| 6 | Графики в паспортах | 11.4, 15.6 | ЗАКРЫТО ✅ | recharts: конфлюэнтность, Td/PD по пассажам |
| 7 | Уведомления ТО | 5.13 | ЗАКРЫТО ✅ | Badges + dashboard alerts |
| 8 | Usage tags для сред | 8.3 | ЗАКРЫТО ✅ | FEED/DISSOCIATION/WASH/SEED/FREEZING/THAW |

### Приоритет: Низкий (инфраструктура)

| # | Позиция | Раздел ТЗ | Статус | Детали |
|---|---------|-----------|--------|--------|
| 9 | RBAC — RLS по ролям | 18 | ЧАСТИЧНО | 5 ролей в типах, users.role, RLS включён на 24+ таблицах. Нет: permission matrix, role-based routes, все RLS = `USING(true)` |
| ~~10~~ | ~~E2E-тесты~~ | — | ОТЛОЖЕНО | Низкий приоритет |
| ~~11~~ | ~~PWA / офлайн~~ | — | ОТЛОЖЕНО | Низкий приоритет |
| ~~12~~ | ~~Real-time~~ | — | ЗАКРЫТО | 5 подписок Supabase Realtime |

---

## Аудит метрик операций (12.02.2026)

### Текущее состояние сохранения метрик

| Операция | operation_metrics | Лот обновляется | Контейнеры | Примечание |
|----------|:-:|:-:|:-:|----------|
| OBSERVE | ❌ | ❌ | ✅ confluent_percent, morphology | Конфлюэнтность только в контейнерах |
| PASSAGE | ✅ | ✅ initial_cells (новый), containers | ✅ USED (старые), IN_CULTURE (новые) | Полный цикл |
| FEED | ❌ | ❌ | ❌ | Только списание сред |
| FREEZE | ✅ | ✅ final_cells, viability, harvest_at | ✅ IN_BANK | v1.25.11: фикс лота |
| THAW | ✅ | ✅ initial_cells из vial.cells_count | ✅ IN_CULTURE (новый) | v1.25.12: фикс |
| DISPOSE | ❌ | ✅ статус (если все утилизированы) | ✅ DISPOSE | Только статусы |

### Ключевые принципы метрик
- **кл/мл (concentration)** — технический показатель, только в operation_metrics для расчётов, НЕ отображается на UI карточек лота/культуры
- **operation_metrics** — история «в момент операции» (concentration, viability, total_cells, volume_ml)
- **lot record** — lifecycle state (initial_cells, final_cells, viability, seeded_at, harvest_at)
- **calculateCultureMetrics()** — использует lot.initial_cells, lot.final_cells, lot.harvest_at для PD/Td

### TODO: Метрики (для будущих итераций)
- [ ] OBSERVE: сохранять среднюю конфлюэнтность в operation_metrics (для истории)
- [ ] FEED: опционально принимать viability/notes
- [ ] Стандартизировать: что в operation_metrics vs что в lot record

---

## Сессия 12.02.2026 (дом, awesome-bohr)

### v1.25.11
- [x] Заморозка: метрики (final_cells, viability, harvest_at) сохраняются в лот
- [x] Заморозка: криовиалы фильтруются по тегу FREEZING (usage_tags)
- [x] Заморозка: рабочий объём — единый или индивидуальный по пробиркам
- [x] API: getBatches поддерживает фильтрацию по usage_tag

### v1.25.12
- [x] Убрана «Концентрация кл/мл» с карточек лота и культуры (технический показатель)
- [x] Разморозка: initial_cells = cryo_vial.cells_count + operation_metrics
- [x] Заморозка: volume_ml = реальный объём суспензии (не кол-во виалов)
- [x] Лот: бейдж «Банк» (MCB/WCB) с кодом и статусом QC
- [x] API: getBanks поддерживает lot_id

---

## Сессия 12.02.2026 (работа, silly-tu) — v1.25.15 → v1.25.17

### v1.25.16
- [x] SQL-миграция: qc_test_configs, culture_type_qc_requirements, unit в inventory_movements
- [x] Категорийные фильтры сред во всех формах операций (Passage, Feed, Freeze, Thaw)
- [x] Fix PASSAGE additionalComponents → отправка в API + списание
- [x] Доп. компоненты (сыворотка, добавки) в Feed, Freeze, Thaw (UI + API)
- [x] Thaw: объём среды, контейнер из склада, доп. компоненты
- [x] Partial freeze split: новый банковский лот при частичной заморозке
- [x] Unit accounting (мл/шт) во всех inventory_movements
- [x] Ready-media/new: свободный выбор компонентов + фильтр

### v1.25.17
- [x] SQL-миграция: nomenclatures +min_stock_threshold/type, batches +initial_quantity
- [x] Настраиваемый порог «Мало»: 3 типа — QTY (шт), VOLUME (мл суммарно), PERCENT (% от начального)
- [x] isLowStock() вместо хардкода quantity≤5
- [x] Порог «Мало» для расходников (consumables)
- [x] Фикс отображения расходников: шт, не мл (category !== 'CONSUMABLE')
- [x] Per-component category filter в ready-media/new
- [x] Фикс usage_tags: доп. компоненты в Feed/Freeze/Thaw используют ВСЕ среды (allMediaOptions)
- [x] Каждый доп. компонент имеет свой categoryFilter (не общий)

---

## Сессия 14.02.2026 (дом) — v1.27.01

### v1.27.01
- [x] Приёмка: единицы измерения автоподтягиваются из номенклатуры (unit + unit_type → каскадный Select)
- [x] Приёмка: content_per_package автозаполняет «Штук в упаковке» для расходников
- [x] Калькулятор: per-component режим — каждый компонент может быть в % / мл / мг / ЕД
- [x] Калькулятор: «Базовая среда» → «Растворитель» — опциональна для стоков
- [x] Калькулятор: растворитель/разбавитель с категорийным фильтром (любая категория)
- [x] Калькулятор: убран AS_RECEIVED из выбора типа раствора
- [x] Калькулятор: 2 режима — Приготовление (RECIPE) и Разведение стока (DILUTION)
- [x] Калькулятор: компоненты в мг/ЕД не вычитаются из объёма растворителя

---

## TODO на следующую сессию

### Приоритет: Высокий
1. **Списание при приготовлении**: submitRecipe → writeOffBatchVolume для растворителя и каждого компонента
2. **Тестирование**: полный цикл приготовления рабочей среды и стока на live-данных
3. **Молярные расчёты**: поддержка мМ/М в калькуляторе (molecular_weight из номенклатуры)

### Приоритет: Средний
4. **Шаблоны рецептов**: сохранение/загрузка рецептов для повторного использования
5. **Серийные разведения**: UI для автоматического создания серии разведений из стока

### Приоритет: Низкий (бэклог)
6. RBAC: permission matrix и role-based route protection
7. Тестирование порогов «Мало» в QTY/VOLUME/PERCENT режимах
8. QC-справочник: проверить CRUD и привязку к типам культур

---

## Схема кодов

| Сущность | Формат | Пример |
|----------|--------|--------|
| Донор | `DN-XXXX` | DN-0001 |
| Донация | `DON-XXXX` | DON-0001 |
| Культура | `CT-XXXX` | CT-0001 |
| Лот (P0) | `{CT}-L1` | CT-0001-L1 |
| Лот (пассаж) | `{CT}-L{N}` | CT-0001-L2 |
| Контейнер | `{Lot}-P{N}-NNN` | CT-0001-L2-P1-001 |
| Банк | `BK-XXXX` | BK-0001 |
| Криовиал | `CV-{CT}-{Type}-VNNN` | CV-CT-0001-MCB-V001 |
| Готовая среда | `RM-XXXX` | RM-0001 |

---

## Статистика

| Метрика | Значение |
|---------|----------|
| Версия | 1.27.01 |
| Страницы | 50 маршрутов |
| UI-компоненты | 22 (shadcn/ui + QRLabel + Switch) |
| API (api.ts) | ~5000 строк |
| Типы (index.ts) | ~860 строк |
| Утилиты (units.ts) | ~224 строки |
| SQL миграции | 19 файлов |
| Фаз разработки | 25 + 17 итераций |
| npm-зависимости | +qrcode, react-qr-code, recharts |

---

## Заметки для разработки (AI-контекст)

### Окружение
- **Работа — Worktree**: `C:\Users\volchkov.se\.claude-worktrees\LabPro\silly-tu` (branch `silly-tu`)
- **Работа — Master worktree**: `C:\AICoding\Cline\LabPro` (branch `master` — для Vercel deploy)
- **Работа — Merge в master**: `cd /c/AICoding/Cline/LabPro && git merge silly-tu && git push origin master`
- **Дом — Master**: `C:\VSCline\LabPro` (branch `master`)
- **Дом — Worktree**: `C:\Users\bioen\.claude-worktrees\LabPro\awesome-bohr` (branch `awesome-bohr`)
- **Git remote**: `https://github.com/bioen07-del/labpro.git`
- **Supabase ref**: `cyyqzuuozuzlhdlzvohh`

### Ключевые паттерны кода
- **Пофлаконный учёт**: `writeOffBatchVolume()` — списывает из текущего флакона, авто-открытие следующего
- **Списание доп. компонентов**: `writeOffAdditionalComponents()` — универсальный хелпер для всех операций
- **Кодогенерация**: `{CultureCode}-L{N}` для лотов, `BK-XXXX` для банков
- **Usage tags**: FEED/DISSOCIATION/WASH/SEED/FREEZING/THAW — фильтрация основных сред по назначению
- **allMediaOptions**: дополнительные компоненты грузят ВСЕ среды (не по usage_tag) + per-component categoryFilter
- **Метрики**: concentration/volume — технические (только в operation_metrics), НЕ на UI
- **Порог «Мало»**: isLowStock(batch) — 3 режима (QTY/VOLUME/PERCENT), fallback: quantity≤5
- **Версионирование**: `frontend/src/lib/version.ts` — обновлять после каждого изменения!

### Ключевые файлы
| Файл | Строк | Назначение |
|------|-------|------------|
| `frontend/src/lib/api.ts` | ~5000 | Все API-функции (Supabase) |
| `frontend/src/types/index.ts` | ~860 | TypeScript-типы |
| `frontend/src/lib/units.ts` | ~224 | Конвертация единиц измерения |
| `frontend/src/app/page.tsx` | ~650 | Дашборд |
| `frontend/src/lib/version.ts` | ~280 | Версия + changelog |
| `CULTURE_METRICS.md` | Формулы | Td, PD, CPD, forecast |
| `TODO_UNITS_CALCULATOR.md` | Архитектура | Единицы, калькулятор, сток-растворы |

---

*Обновлено: 14.02.2026*
