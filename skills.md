# LabPro Skills & Competencies

## Технический Стек

| Категория | Технологии |
|-----------|------------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS |
| **UI Components** | shadcn/ui (Radix UI primitives) |
| **Backend** | Next.js API Routes, Supabase |
| **Database** | PostgreSQL (Supabase) |
| **Deployment** | Vercel, GitHub Actions |
| **MCP Tools** | Vercel MCP, GitHub MCP |

## Ключевые Навыки

### Frontend Development
- [ ] Создание страниц в `frontend/src/app/`
- [ ] Компоненты в `frontend/src/components/`
- [ ] Типы в `frontend/src/types/index.ts`
- [ ] Mock данные в `frontend/src/lib/mock-data.ts`
- [ ] API функции в `frontend/src/lib/api.ts`

### TypeScript
- [ ] Определение интерфейсов и типов
- [ ] Работа с Supabase типами (Database)
- [ ] strict mode - никаких `any`

### Tailwind CSS
- [ ] Utility-first стилизация
- [ ] Адаптивный дизайн (`md:`, `lg:`)
- [ ] Тёмная тема (если есть)

### Supabase
- [ ] Database schema в `supabase/schema.sql`
- [ ] Seed data в `supabase/seed.sql`
- [ ] Row Level Security (RLS)

### Vercel Deployment
- [ ] Автоматический деплой из GitHub
- [ ] Проверка через Vercel MCP
- [ ] Environment variables

## Git Workflow

```bash
# 1. Создание ветки (если нужно)
git checkout -b feature/название

# 2. Работа с файлами
git add -A
git commit -m "feat/fix/docs: описание"

# 3. Push
git push origin master

# 4. Pull Request (опционально)
```

### Префиксы коммитов
- `feat:` - новая функциональность
- `fix:` - исправление багов
- `docs:` - документация
- `refactor:` - рефакторинг
- `style:` - стили

## Анализ Ошибок

### TypeScript Errors
1. Читать сообщение об ошибке
2. Найти строку с ошибкой
3. Проверить типы в `types/index.ts`
4. Исправить по логу, не гадать

### Vercel Build Errors
1. `vercel_getdeployments` → посмотреть `errorMessage`
2. `vercel_getdeployment` → детальные логи
3. Исправить строго по логам

### Supabase Errors
1. Проверить RLS политики
2. Проверить типы данных
3. Проверить связи между таблицами

## Доступ к Проекту

- **GitHub**: https://github.com/bioen07-del/labpro
- **Vercel**: https://labpro-git-master-bioen07s-projects.vercel.app
- **Supabase**: Проект подключён

## Файлы Конфигурации

| Файл | Назначение |
|------|------------|
| `frontend/next.config.ts` | Next.js конфигурация |
| `frontend/tsconfig.json` | TypeScript конфигурация |
| `frontend/package.json` | Зависимости |
| `supabase/schema.sql` | База данных |
| `rules.md` | Правила работы |

---

*Обновлено: 31.01.2026*
