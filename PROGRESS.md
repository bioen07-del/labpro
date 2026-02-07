# LabPro - Прогресс разработки

## Текущий статус: Фаза 11 — Тестирование

### Завершённые фазы

#### Фаза 1: SQL-миграция — синхронизация схемы БД с кодом
- [x] Rename полей (type_id → container_type_id, status → container_status)
- [x] Добавить таблицы (notifications, equipment_logs, culture_type_tissue_types)
- [x] Расширить culture_types, container_types, tasks, equipment
- [x] Обновить триггеры (check_lot_closure)
- [x] P0 по умолчанию для первичной культуры
- [x] Seed-данные: tissue_types, culture_types, container_types, morphology_types, dispose_reasons

#### Фаза 2: Исправить API-функции
- [x] role в operation_containers для всех операций
- [x] FROZEN → IN_BANK в enum container_status
- [x] vial_count → cryo_vials_count
- [x] Убрать несуществующие поля из INSERT
- [x] Функция increment_passage_count

#### Фаза 3: Формы операций по ТЗ п.15
- [x] Observe — конфлюэнтность, морфология, контаминация, фото
- [x] Feed — FEFO, выбор партии, объём среды
- [x] Passage — split ratio, метрики, среды, время, позиция
- [x] Freeze — MCB/WCB, криовиалы, cells_per_vial, позиция, среды
- [x] Thaw — выбор банка, криовиалы, новый лот, позиция
- [x] Dispose — контейнеры/партии/среды, причина утилизации

#### Фаза 4: Карточки сущностей по ТЗ п.15
- [x] Culture — лоты + банки внутри, статистика
- [x] Lot — контейнеры + кнопки операций
- [x] Container — статус + размещение
- [x] Bank — QC + криовиалы
- [x] Donor — донации, история

#### Фаза 5: Списки и формы
- [x] Donors, Ready Media, Equipment, Orders, Tasks, QC, Inventory, Users

#### Фаза 6: Дашборд по ТЗ п.13
- [x] Статистика, быстрые действия, задачи, уведомления, реальные данные

#### Фаза 7: Бизнес-логика
- [x] Авто-задачи, авто-уведомления, FEFO, авто-закрытие лотов

#### Фаза 8: QR-сканер
- [x] Парсинг CNT:/EQP:/CULT:/POS:/RM:/BK:, навигация к карточкам

#### Фаза 9: Документы
- [x] Worksheet, Culture Passport, аудит-логи на карточках

#### Фаза 10: Чистка и безопасность
- [x] Удалён mock-data.ts, убран хардкод credentials, мобильное меню (Sheet), Toaster (sonner)

### Статистика

| Метрика | Значение |
|---------|----------|
| Страницы | 38 маршрутов |
| UI-компоненты | 20 (shadcn/ui) |
| API (api.ts) | ~2900 строк |
| Типы (index.ts) | ~730 строк |
| SQL миграции | 8 файлов |

### Стек: Next.js 16.1.6 + TypeScript 5.9.3 + React 19.2.3 + Tailwind 4 + Supabase + Vercel

---

*Обновлено: 07.02.2026*
