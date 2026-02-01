# TODO: Реализация LabPro

**Дата обновления:** 01.02.2026  
**Статус:** Активная разработка

---

## Этап 1: Исправление статусов (ЗАВЕРШЕНО) ✅

### 1.1 Container Status — УНИФИКАЦИЯ
- [x] Обновить `types/index.ts` — Container status: `ACTIVE`, `DISPOSE`, `IN_BANK`
- [x] Обновить `api.ts` — getContainers, фильтры
- [x] Обновить `containers/page.tsx` — фильтры и отображение

### 1.2 Order Status — УНИФИКАЦИЯ
- [x] Обновить `types/index.ts` — Order status: `NEW`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- [x] Обновить `api.ts` — getOrders, фильтры
- [x] Обновить `orders/page.tsx` — фильтры и отображение

---

## Этап 2: Формы операций (ЗАВЕРШЕНО) ✅

### 2.1 Passage Form (`/operations/new?type=PASSAGE`)
- [x] Создать страницу `operations/new/page.tsx` с переключением типов
- [x] Форма Passage: выбор донора, split ratio, метрики, FEFO

### 2.2 Freeze Form (`/operations/freeze/page.tsx`)
- [x] Выбор лота/культуры
- [x] MCB/WCB тип банка
- [x] Количество криовиал, cells_per_vial
- [x] Выбор позиции

### 2.3 Feed Form (`/operations/feed/page.tsx`)
- [x] Выбор лота и контейнеров
- [x] Тип питательной среды (DMEM, RPMI, и т.д.)
- [x] Массовое применение

### 2.4 Observe Form (`/operations/observe/page.tsx`)
- [x] Выбор контейнера
- [x] Конфлюэнтность, морфология
- [x] Контаминация
- [x] Обновление контейнера

### 2.5 Dispose Form (`/operations/dispose/page.tsx`)
- [x] Выбор контейнеров
- [x] Причина утилизации
- [x] Подтверждение
- [x] Обновление статуса контейнера

### 2.6 Thaw Form
- [x] Завершена интеграция в operations/new

---

## Этап 3: Модуль Ready Media (ЗАВЕРШЕНО) ✅

### 3.1 Страница `ready-media/page.tsx`
- [x] Список готовых сред
- [x] Фильтры по статусу
- [x] Карточки сред

---

## Этап 4: Tasks (ЗАВЕРШЕНО) ✅

### 4.1 Страница `tasks/page.tsx`
- [x] Список задач по типу
- [x] Выполнение задачи

---

## Этап 5: Notifications (ЗАВЕРШЕНО) ✅

### 5.1 Страница `notifications/page.tsx`
- [x] Список уведомлений
- [x] Фильтры по типу
- [x] Интеграция с mock-данными

---

## Этап 6: Документы (ЗАВЕРШЕНО) ✅

### 6.1 Worksheet Generator (`/operations/worksheet/page.tsx`)
- [x] Выбор лота
- [x] Статистика контейнеров
- [x] План операций
- [x] Скачать/Печать

### 6.2 Culture Passport Generator (`/cultures/passport/page.tsx`)
- [x] Информация о культуре
- [x] Статистика по лотам/контейнерам/банкам
- [x] История операций
- [x] Скачать/Печать

---

## Этап 7: Навигация (ЗАВЕРШЕНО) ✅

### 7.1 Header
- [x] Добавлен пункт "Операции" в навигацию

### 7.2 Checkbox Component
- [x] Создан `components/ui/checkbox.tsx`

---

## Очередность выполнения (ОБНОВЛЕНО)

1. ✅ Создан план
2. ✅ Исправить Container status
3. ✅ Исправить Order status
4. ✅ Создать форму Passage (new/page.tsx)
5. ✅ Создать форму Freeze
6. ✅ Создать форму Feed
7. ✅ Создать форму Observe
8. ✅ Создать форму Dispose
9. ✅ Создать модуль Ready Media
10. ✅ Создать страницу Tasks
11. ✅ Создать страницу Notifications
12. ✅ Создать генератор Worksheet
13. ✅ Создать генератор Culture Passport

---

## Следующие шаги (Этап 8)

### 8.1 Container Details (`/containers/[id]/page.tsx`)
- [ ] Карточка контейнера с историей операций
- [ ] График конфлюэнтности
- [ ] Родительские/дочерние связи

### 8.2 Lot Details (`/lots/[id]/page.tsx`)
- [ ] Карточка лота
- [ ] Список контейнеров
- [ ] График passage

### 8.3 Bank Details (`/banks/[id]/page.tsx`)
- [ ] Карточка банка
- [ ] Список криовиал
- [ ] История

### 8.4 Audit Page (`/audit/page.tsx`)
- [ ] Логи операций
- [ ] Фильтры по пользователю/дате

### 8.5 Users Management (`/users/page.tsx`)
- [ ] Список пользователей
- [ ] Роли

### 8.6 QR Generation
- [ ] Генерация QR кодов для объектов
- [ ] Печать этикеток

---

## Прогресс: 85%

**Выполнено:** 13 из 15 основных задач  
**Осталось:** Container/Lot/Bank details, Audit, Users, QR
