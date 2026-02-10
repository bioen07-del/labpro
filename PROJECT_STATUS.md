# LabPro — Статус проекта

**Дата обновления:** 10.02.2026
**Версия:** 1.25.00
**Реализовано:** ~95% от ТЗ (25 фаз)
**Стек:** Next.js 16 + TypeScript 5.9 + React 19 + Tailwind 4 + Supabase + Vercel

---

## Документы проекта

| Файл | Назначение |
|------|------------|
| `ТЗ_LabPro.md` | Техническое задание (source of truth) |
| `PROGRESS.md` | История разработки (25 фаз) |
| `PROJECT_STATUS.md` | Текущий статус, нерешённые позиции, бэклог (этот файл) |
| `rules.md` | Правила разработки |

---

## Нерешённые позиции (из ТЗ)

### Приоритет: Высокий

| # | Позиция | Раздел ТЗ | Статус | Детали |
|---|---------|-----------|--------|--------|
| 1 | Списание сред при SEED + Freeze | 7.1, 7.5, 8.3 | ЗАКРЫТО ✅ | Компоненты передаются в API и списываются. Пофлаконный учёт через writeOffBatchVolume. Freeze: 3 среды (заморозка/диссоциация/промывка) с объёмами |
| 2 | Выдача — бизнес-логика (Issue workflow) | 9.2 | ЗАКРЫТО ✅ | API: reserveBankForOrder, issueOrderItems, cancelOrder. UI: кнопки Резервировать/Выдать/Отменить на карточке заказа |
| ~~3~~ | ~~Процедура ISOLATION~~ | ~~7.10~~ | ЗАКРЫТО | Реализовано как extraction_method в SEED (не отдельная операция) |
| 4 | Прогноз клеток (Cell Forecast) | 17 | ЗАКРЫТО ✅ | API: calculateAndUpdateCoefficient (авто после пассажа), forecastCells. UI: виджет прогноза на лоте |

### Приоритет: Средний

| # | Позиция | Раздел ТЗ | Статус | Детали |
|---|---------|-----------|--------|--------|
| 5 | QR-генерация и печать этикеток | 12, 22.4 | ЗАКРЫТО ✅ | QRLabel компонент (react-qr-code), печать этикеток на контейнерах и банках |
| 6 | Графики в Culture Passport | 11.4, 15.6 | ЗАКРЫТО ✅ | recharts: график конфлюэнтности (LineChart) на passport/page.tsx |
| 7 | Уведомления срочности обслуживания | 5.13 | ЗАКРЫТО ✅ | Badges ТО на списке оборудования + Equipment alerts карточка на дашборде (overdue/urgent/soon) |

### Приоритет: Низкий (инфраструктура)

| # | Позиция | Раздел ТЗ | Статус | Детали |
|---|---------|-----------|--------|--------|
| 8 | RBAC — RLS по ролям | 18 | ЧАСТИЧНО | Фундамент: 5 ролей в типах, users.role в БД, RLS включён на 24+ таблицах, audit UI. Нет: permission matrix enforcement, role-based route protection, updateUserRole(), все RLS = `USING(true)` |
| ~~9~~ | ~~E2E-тесты~~ | — | ОТЛОЖЕНО | Нет тестового фреймворка. Низкий приоритет до стабилизации бизнес-логики |
| ~~10~~ | ~~PWA / офлайн-режим~~ | — | ОТЛОЖЕНО | Нет manifest/SW. Низкий приоритет |
| ~~11~~ | ~~Real-time подписки~~ | — | ЗАКРЫТО | Реализовано: 5 подписок (orders, operations, containers, banks, qc_tests) через Supabase Realtime |

---

## План реализации (Фаза 25)

### Этап 25.1: Списание сред SEED + Freeze ✅
- [x] SEED: передать additionalComponents в API createCultureFromDonation
- [x] SEED: добавить backend списание компонентов через writeOffBatchVolume
- [x] SEED: перевести списание среды на writeOffBatchVolume (пофлаконный)
- [x] Freeze: передать dissociationMediumId + washMediumId (+ volumes) в API
- [x] Freeze: добавить backend списание диссоциации и промывки через writeOffBatchVolume
- [x] Freeze: перевести freezing_medium на writeOffBatchVolume

### Этап 25.2: Выдача — бизнес-логика ✅
- [x] API: reserveBankForOrder() — банк → RESERVED, криовиалы → RESERVED
- [x] API: issueOrderItems() — криовиалы → ISSUED, заявка → COMPLETED
- [x] API: cancelOrder() — освободить резервы → APPROVED
- [x] UI: кнопки на карточке заявки (Резервировать, Выдать, Отменить)

### Этап 25.3: Прогноз клеток ✅
- [x] API: calculateAndUpdateCoefficient() — расчёт из истории пассажей
- [x] API: автообновление cultures.coefficient после пассажа
- [x] UI: виджет прогноза на карточке лота

### Этап 25.4: QR-генерация ✅
- [x] npm install qrcode react-qr-code
- [x] Компонент QRLabel (QR + метаданные + печать)
- [x] QR-этикетки на контейнерах и банках

### Этап 25.5: Графики в паспорте ✅
- [x] npm install recharts
- [x] График конфлюэнтности (LineChart, X=дата, Y=%)
- [x] Интеграция в passport/page.tsx

### Этап 25.6: Уведомления ТО ✅
- [x] isMaintenanceSoon() + isMaintenanceOverdue() + isMaintenanceUrgent() хелперы
- [x] Badges «Скоро ТО» / «Срочно ТО» / «ТО просрочено» на списке оборудования
- [x] Equipment alerts карточка на дашборде (overdue/urgent/soon)

### Этап 25.7: Версионирование ✅
- [x] APP_VERSION + CHANGELOG в lib/version.ts
- [x] Кликабельный футер на дашборде (версия → журнал изменений в Dialog)

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
| Версия | 1.25.00 |
| Страницы | 38 маршрутов |
| UI-компоненты | 21 (shadcn/ui + QRLabel) |
| API (api.ts) | ~4050 строк |
| Типы (index.ts) | ~760 строк |
| SQL миграции | 13 файлов |
| Фаз разработки | 25 |
| npm-зависимости | +qrcode, react-qr-code, recharts |

---

## Заметки для разработки (AI-контекст)

### Окружение
- **Worktree**: `C:\Users\volchkov.se\.claude-worktrees\LabPro\silly-tu` (branch `silly-tu`)
- **Master worktree**: `C:\AICoding\Cline\LabPro` (branch `master` — для Vercel deploy)
- **Merge в master**: `cd /c/AICoding/Cline/LabPro && git merge silly-tu && git push origin master`
- **Supabase ref**: `cyyqzuuozuzlhdlzvohh`
- **Supabase Management API Token**: `sbp_d03bd67e20f574ed677837f3308abf96d6d51b0d`

### Windows: особенности среды
- PowerShell: `npx` требует `Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process; $LASTEXITCODE = 0;` перед вызовом
- PowerShell: `git`, `node`, `cmd` часто не в PATH — использовать Git Bash через Bash tool
- Git Bash пути: `/c/Users/volchkov.se/.claude-worktrees/LabPro/silly-tu`
- Кириллические имена файлов: использовать Glob tool, не PowerShell/cmd

### Ключевые паттерны кода
- **Пофлаконный учёт**: `writeOffBatchVolume()` в api.ts — списывает из текущего флакона, авто-открытие следующего
- **Списание сред**: SEED, Passage, Freeze — все через writeOffBatchVolume для ready_media с привязкой к batch
- **Alerts оборудования**: `getDashboardStats()` возвращает `equipmentAlerts[]` (overdue/urgent/soon по next_maintenance/next_validation)
- **Кодогенерация**: `{CultureCode}-L{N}` для лотов, `{LotNumber}-P{passage}-NNN` для контейнеров
- **Версионирование**: `frontend/src/lib/version.ts` — APP_VERSION + CHANGELOG. Обновлять после каждого изменения!

### Ключевые файлы
| Файл | Строк | Назначение |
|------|-------|------------|
| `frontend/src/lib/api.ts` | ~4050 | Все API-функции (Supabase) |
| `frontend/src/types/index.ts` | ~760 | TypeScript-типы |
| `frontend/src/app/page.tsx` | ~650 | Дашборд |
| `frontend/src/lib/version.ts` | ~74 | Версия + changelog |

---

*Обновлено: 10.02.2026*
