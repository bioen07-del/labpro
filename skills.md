# LabPro — Технический стек и навыки

## Стек

| Категория | Технология | Версия |
|-----------|------------|--------|
| **Framework** | Next.js (App Router) | 16.1.6 |
| **Language** | TypeScript | 5.9.3 |
| **React** | React | 19.2.3 |
| **Styling** | Tailwind CSS | 4.x |
| **UI Components** | shadcn/ui (Radix UI) | latest |
| **Database** | Supabase (PostgreSQL) | — |
| **Auth** | Supabase Auth (@supabase/ssr) | 0.8 |
| **Toasts** | Sonner | 2.0.7 |
| **Deployment** | Vercel | — |

## Ключевые файлы

| Файл | Назначение | Размер |
|------|------------|--------|
| `frontend/src/lib/api.ts` | Все API функции | ~2900 строк |
| `frontend/src/types/index.ts` | TypeScript типы | ~730 строк |
| `frontend/src/lib/supabase.ts` | Supabase клиент (lazy init) | — |
| `frontend/src/lib/auth-context.tsx` | AuthProvider | — |
| `frontend/src/components/header.tsx` | Навигация + мобильное меню | — |
| `supabase/schema.sql` | Полная схема БД | — |

## Страницы: 38 маршрутов
## UI-компоненты: 20 (shadcn/ui)
## SQL миграции: 8 файлов

## Доступ

- **GitHub**: https://github.com/bioen07-del/labpro
- **Vercel**: https://labpro-black.vercel.app
- **Supabase**: подключён через env vars

---

*Обновлено: 07.02.2026*
