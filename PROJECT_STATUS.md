# LabPro — Статус проекта

**Дата обновления:** 12.02.2026
**Версия:** 1.25.15
**Реализовано:** ~97% от ТЗ (25 фаз + 13 итераций)
**Стек:** Next.js 16 + TypeScript 5.9 + React 19 + Tailwind 4 + Supabase + Vercel

---

## Документы проекта

| Файл | Назначение |
|------|------------|
| `ТЗ_LabPro.md` | Техническое задание (source of truth) |
| `PROGRESS.md` | История разработки (25 фаз + итерации) |
| `PROJECT_STATUS.md` | Текущий статус, нерешённые позиции, бэклог (этот файл) |
| `CULTURE_METRICS.md` | Формулы метрик культур (8 вариантов) |
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

## TODO на следующую сессию (работа, 13.02.2026)

### Приоритет: Высокий
1. **Синхронизация**: `git fetch origin && git merge origin/awesome-bohr` в рабочую ветку (silly-tu или master) — забрать v1.25.11 и v1.25.12
2. **Проверить заморозку**: Заморозить CT-0001-L4, убедиться что метрики появились на карточке лота, бейдж банка виден
3. **Проверить фильтрацию криовиалов**: В справочнике номенклатуры пометить криовиалы тегом FREEZING → проверить что в форме заморозки показываются только они
4. **Проверить разморозку**: Разморозить из банка, убедиться initial_cells перенеслись в новый лот

### Приоритет: Средний
5. **Рабочий объём проверить на UI**: Открыть форму заморозки, проверить toggle единый/индивидуальный, расчёты cellsPerMl
6. **Бейдж банка на лоте**: Проверить что CT-0001-L4 показывает бейдж MCB/WCB с кодом
7. **Метрики после заморозки**: Убедиться что PDL/Td считается корректно (final_cells, harvest_at заполнены)

### Приоритет: Низкий (бэклог)
8. OBSERVE: добавить запись средней конфлюэнтности в operation_metrics
9. RBAC: реализовать permission matrix и role-based route protection
10. Проверить ТЗ на оставшиеся нереализованные пункты

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
| Версия | 1.25.15 |
| Страницы | 50 маршрутов |
| UI-компоненты | 22 (shadcn/ui + QRLabel + Switch) |
| API (api.ts) | ~4750 строк |
| Типы (index.ts) | ~810 строк |
| SQL миграции | 16 файлов |
| Фаз разработки | 25 + 13 итераций |
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
- **Списание сред**: SEED, Passage, Freeze — все через writeOffBatchVolume
- **Кодогенерация**: `{CultureCode}-L{N}` для лотов, `BK-XXXX` для банков
- **Usage tags**: FEED/DISSOCIATION/WASH/SEED/FREEZING/THAW — фильтрация сред по назначению
- **Метрики**: concentration/volume — технические (только в operation_metrics), НЕ на UI
- **Версионирование**: `frontend/src/lib/version.ts` — обновлять после каждого изменения!

### Ключевые файлы
| Файл | Строк | Назначение |
|------|-------|------------|
| `frontend/src/lib/api.ts` | ~4625 | Все API-функции (Supabase) |
| `frontend/src/types/index.ts` | ~786 | TypeScript-типы |
| `frontend/src/app/page.tsx` | ~650 | Дашборд |
| `frontend/src/lib/version.ts` | ~215 | Версия + changelog |
| `CULTURE_METRICS.md` | Формулы | Td, PD, CPD, forecast |

---

*Обновлено: 12.02.2026*
