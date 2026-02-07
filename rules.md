# LabPro Rules & Workflow

## Обязательные правила

### 1. Только реальные данные из Supabase
- Никаких mock-данных, fallback на фейковые данные, временных имитаций
- Если таблицы/поля нет в БД — создать SQL миграцию
- Supabase credentials только через env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

### 2. Работа с кодом
- TypeScript strict — минимум `any`, явные типы
- Все API через `frontend/src/lib/api.ts`
- Все типы в `frontend/src/types/index.ts`
- UI компоненты — shadcn/ui
- Стили — Tailwind CSS (utility-first)

### 3. Деплой
- `npm run build` должен проходить без ошибок перед коммитом
- Vercel деплоит автоматически при push в ветку
- Root Directory на Vercel: `frontend`

### 4. Git
- Ветки: `master` (основная), feature branches для больших изменений
- Коммиты: `feat:`, `fix:`, `docs:`, `refactor:`
- Перед коммитом: `npm run build`

### 5. База данных
- Схема: `supabase/schema.sql`
- Миграции: `supabase/migrations/`
- Seed: `supabase/seed.sql`
- Изменения схемы — через миграцию, не через прямое редактирование schema.sql

---

*Обновлено: 07.02.2026*
