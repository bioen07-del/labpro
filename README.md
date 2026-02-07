# LabPro - Система управления клеточными банками

Лабораторная информационная система для учёта клеточных культур, банков и операций в биотехнологической лаборатории.

**Live:** [labpro-black.vercel.app](https://labpro-black.vercel.app)
**Repo:** [github.com/bioen07-del/labpro](https://github.com/bioen07-del/labpro)

## Возможности

- **Доноры и донации** — учёт доноров, типов тканей, статусы карантина
- **Культуры** — клеточные линии, лоты (P0..Pn), контейнеры, история пассажей
- **Клеточные банки** — MCB/WCB, криовиалы, позиции хранения, QC
- **Операции** — Observe, Feed, Passage, Freeze, Thaw, Dispose с полными формами по ТЗ
- **Инвентарь** — номенклатура, партии, FEFO-контроль, готовые среды
- **QC-тесты** — создание, внесение результатов, влияние на статус банка
- **Заявки** — на выдачу и создание банков
- **Задачи** — автоматические после операций (INSPECT, FEED, QC_DUE, FEFO)
- **Уведомления** — QC_READY, ORDER_DEADLINE, CONTAMINATION и др.
- **Документы** — Worksheet (план дня), Culture Passport (паспорт культуры)
- **QR-сканер** — парсинг кодов CNT:/EQP:/CULT:/POS:/RM:/BK:
- **Аудит** — полная история операций
- **Мобильная навигация** — Sheet-меню для мобильных устройств

## Технологический стек

| Категория | Технология | Версия |
|-----------|------------|--------|
| **Framework** | Next.js (App Router) | 16.1.6 |
| **Language** | TypeScript | 5.9.3 |
| **React** | React | 19.2.3 |
| **Styling** | Tailwind CSS | 4.x |
| **UI Components** | shadcn/ui + Radix UI | latest |
| **Database** | Supabase (PostgreSQL) | — |
| **Auth** | Supabase Auth | @supabase/ssr 0.8 |
| **Toasts** | Sonner | 2.0.7 |
| **Deployment** | Vercel | — |

## Структура проекта

```
LabPro/
├── supabase/
│   ├── schema.sql                    # Полная схема БД (основа)
│   ├── seed.sql                      # Seed-данные для тестирования
│   └── migrations/                   # SQL миграции
│       ├── 20260131120000_schema_updates.sql
│       ├── 20260201_donors_donations.sql
│       ├── 20260201000000_rls_reference_tables.sql
│       ├── 20260201200000_auth_users.sql
│       ├── 20260201210000_create_demo_users.sql
│       ├── 20260201300000_add_donations.sql
│       ├── 20260201400000_fix_rls_policies.sql
│       └── 20260207000000_phase1_sync_schema.sql
├── frontend/
│   ├── src/
│   │   ├── app/                      # 38 страниц (Next.js App Router)
│   │   ├── components/
│   │   │   ├── header.tsx            # Навигация + мобильное меню
│   │   │   └── ui/                   # 20 shadcn/ui компонентов
│   │   ├── lib/
│   │   │   ├── api.ts               # ~2900 строк — все API функции
│   │   │   ├── supabase.ts          # Supabase клиент (lazy init)
│   │   │   ├── auth-context.tsx      # AuthProvider (React Context)
│   │   │   └── utils.ts             # Утилиты (cn, formatDate, etc.)
│   │   └── types/
│   │       └── index.ts             # ~730 строк — все TypeScript типы
│   └── package.json
├── README.md
├── PROGRESS.md
├── TODO.md
└── ТЗ_LabPro.md                     # Техническое задание
```

## Страницы приложения (38 маршрутов)

| Раздел | Маршруты |
|--------|----------|
| **Дашборд** | `/` |
| **Доноры** | `/donors`, `/donors/new`, `/donors/[id]`, `/donors/[id]/donations/new` |
| **Культуры** | `/cultures`, `/cultures/new`, `/cultures/[id]`, `/cultures/passport` |
| **Банки** | `/banks`, `/banks/[id]` |
| **Лоты/Контейнеры** | `/lots/[id]`, `/containers/[id]` |
| **Операции** | `/operations`, `/operations/new`, `/operations/observe`, `/operations/feed`, `/operations/passage`, `/operations/freeze`, `/operations/thaw`, `/operations/dispose`, `/operations/worksheet` |
| **QC** | `/qc`, `/qc/new` |
| **Среды** | `/ready-media` |
| **Инвентарь** | `/inventory` |
| **Оборудование** | `/equipment`, `/equipment/new` |
| **Заявки** | `/orders`, `/orders/new` |
| **Задачи** | `/tasks`, `/tasks/new` |
| **Прочее** | `/audit`, `/documents`, `/notifications`, `/scan`, `/users`, `/login` |

## Быстрый старт

### Предварительные требования

- Node.js 18+
- npm
- Supabase проект

### Установка

```bash
git clone https://github.com/bioen07-del/labpro.git
cd labpro/frontend
npm install
```

### Настройка

```bash
# Создайте .env.local в frontend/
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EOF
```

### База данных

1. Откройте Supabase Dashboard > SQL Editor
2. Выполните `supabase/schema.sql`
3. Выполните `supabase/seed.sql`
4. Выполните миграции из `supabase/migrations/` по порядку

### Запуск

```bash
npm run dev    # http://localhost:3000
npm run build  # Production build
```

### Создание демо-пользователя

1. Supabase Dashboard > Authentication > Users > Add User
2. Email: `demo@labpro.ru`, Password: `demo1234`

## Аутентификация

Роли пользователей:
- `OPERATOR` — все операции с культурами
- `LABORANT` — инвентарь, готовые среды
- `MANAGER` — заявки, резервы
- `QC_ADMIN` — QC-тесты
- `ADMIN` — полный доступ

## Деплой на Vercel

1. Подключите репозиторий к Vercel
2. Root Directory: `frontend`
3. Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Деплой автоматический при push

---

*Обновлено: 07.02.2026*
