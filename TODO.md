# LabPro TODO List - Боевая версия

## Фаза 1: API функции (все сущности) ✅ ДОСТУПНО
- [x] Cultures, Banks, Lots, Containers, Orders, Operations
- [x] Donors, Tissues, Nomenclatures, Batches, QC Tests
- [x] Equipment, Ready Media, Tasks
- [ ] ContainerTypes - getAll
- [ ] Positions - CRUD + getByQR
- [ ] Batch Reservations - create/release
- [ ] Inventory Movements - create

## Фаза 2: Обновить страницы на реальные данные ✅ ДОСТУПНО
- [x] Dashboard - статистика, быстрые действия
- [x] Banks - MCB/WCB/RWB банки
- [x] Cultures - клеточные культуры
- [x] Orders - заказы на выдачу
- [x] Operations - история операций
- [x] Inventory - складской учёт

## Фаза 3: Создать формы операций ✅ ДОСТУПНО
- [x] /operations/new - форма создания операций
- [x] Feed (подкормка), Passage (пассаж), Freeze (заморозка), Thaw (разморозка)
- [ ] Create Culture (создание культуры)
- [ ] Create Donor (создание донора)
- [ ] Observe (наблюдение)
- [ ] Dispose (утилизация)

## Фаза 4: Создать недостающие страницы
- [ ] QC Tests страница
- [ ] Ready Media страница
- [ ] Equipment страница
- [ ] Donors страница
- [ ] Tasks страница

## Фаза 5: Vercel + Supabase ✅ ДОСТУПНО
- [x] .env.example - шаблон переменных окружения
- [x] vercel.json - конфигурация Vercel
- [x] supabase_schema.sql - полная схема БД
- [x] DEPLOYMENT.md - инструкция по развёртыванию

## Фаза 6: Тестирование ⏳ ОЖИДАЕТ
- [ ] Развернуть Supabase и запустить схему
- [ ] Развернуть на Vercel
- [ ] Проверить все CRUD операции
- [ ] Проверить формы операций

---
## Развёртывание

Следуйте инструкции в `DEPLOYMENT.md`:
1. Создайте проект на Supabase
2. Запустите `supabase_schema.sql` в SQL Editor
3. Подключите репозиторий к Vercel
4. Добавьте Environment Variables
5. Задеплойте
