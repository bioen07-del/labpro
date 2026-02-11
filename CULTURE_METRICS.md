# Метрики роста клеточных культур — формулы и алгоритмы

> Техническая документация LabPro. Описание моделей расчёта кинетики роста.

---

## Обозначения

| Символ | Описание |
|--------|----------|
| A | Площадь поверхности посуды (см²) |
| N₀ | Число посеянных клеток |
| N(t) | Число клеток в момент времени t |
| Nf | Число клеток в момент снятия/пассажа |
| ρ = N/A | Плотность клеток (клеток/см²) |
| t | Время культивирования (часы) |
| Td | Время удвоения — doubling time (часы) |
| r | Удельная скорость роста (1/ч), r = ln(2) / Td |
| PD | Population doublings за один пассаж |
| CPD | Cumulative Population Doublings — суммарные удвоения |
| v | Жизнеспособность (viability, доля живых после снятия) |
| h | Эффективность сбора (доля клеток, реально собранных) |
| N_target | Число клеток при целевой confluency (порог пассажа) |

---

## Реализованные формулы

### Вариант 2. Экспоненциальный рост (базовый) — **РЕАЛИЗОВАН**

**Файл:** `frontend/src/lib/api.ts` → `calculateCultureMetrics()`

#### 2.1 Калибровка по одному пассажу

Имея N₀, Nf, t (часы):

```
r = ln(Nf / N₀) / t
Td = ln(2) / r = t × ln(2) / ln(Nf / N₀)
```

#### 2.2 Прогноз

```
t_target = Td × log₂(N_target / N₀)
N(t) = N₀ × 2^(t / Td)
```

**Файл:** `frontend/src/lib/api.ts` → `forecastGrowth()`

### Вариант 5. CPD (кумулятивные удвоения) — **РЕАЛИЗОВАН**

Для каждого пассажа i:

```
PD_i = log₂(Nf_i × v_i / N₀_i)
CPD_n = Σ PD_i  (i = 1..n)
```

Где v_i — жизнеспособность (Вариант 8).

**Файл:** `frontend/src/lib/api.ts` → `calculateCultureMetrics()`

### Вариант 8. Коррекция на жизнеспособность — **РЕАЛИЗОВАН**

Измеряемый выход с коррекцией:

```
N_measured = Nf × v
PD = log₂(Nf × v / N₀)
```

Используется при расчёте PD и Td для каждого пассажа.

---

## Формулы для будущей реализации

### Вариант 1. Простая пропорция по площади

```
Nf_2 ≈ Nf_75 × (A₂ / 75)
N₀_2 ≈ N₀_75 × (A₂ / 75)
```

Подходит для грубой оценки при стабильной линии. Минус: не даёт времени.

### Вариант 3. Экспонента + лаг-фаза

Для адгезивных клеток с «мёртвым» временем t_lag (прикрепление):

```
если t ≤ t_lag: N(t) = N₀
если t > t_lag: N(t) = N₀ × e^(r × (t - t_lag))
t_target = t_lag + ln(N_target / N₀) / r
```

Требует эмпирическую оценку t_lag (обычно 6-24 ч).

### Вариант 4. Логистический рост (замедление к монослою)

```
dN/dt = r × N × (1 - N/K)
N(t) = K / (1 + ((K - N₀) / N₀) × e^(-r×t))
t_target = (1/r) × ln(N_target × (K - N₀) / (N₀ × (K - N_target)))
K = ρ_max × A
```

Где K — ёмкость поверхности (100% confluency). Нужны несколько точек роста.

### Вариант 6. Падение скорости с пассажами

#### 6.1 Линейное ухудшение

```
Td(P) = Td₀ + a × (P - P₀)
Td(CPD) = Td₀ + b × (CPD - CPD₀)
```

#### 6.2 Мультипликативное

```
Td(P) = Td₀ × (1 + k)^(P - P₀)
```

### Вариант 7. Нормализация на см²

```
ρ₀ = N₀ / A
ρ_target = N_target / A
t_target = Td × log₂(ρ_target / ρ₀)
N_target = ρ_target × A
```

Переносимая модель для T25/T75/планшеты.

---

## Структура данных в LabPro

### Источники данных для метрик

| Данные | Таблица | Поле |
|--------|---------|------|
| Число посеянных клеток | lots | initial_cells |
| Число снятых клеток | lots | final_cells |
| Жизнеспособность | lots | viability (%) |
| Дата посева | lots | seeded_at |
| Дата снятия | lots | harvest_at |
| Номер пассажа | lots | passage_number |
| Площадь посуды | container_types | surface_area (см²) |
| Конфлюэнтность | containers | confluent_percent (%) |
| Концентрация | operation_metrics | concentration |
| Объём суспензии | operation_metrics | volume_ml |
| Коэффициент выхода | cultures | coefficient |

### Интерфейс `CultureMetrics`

```typescript
interface CultureMetrics {
  passages: PassageMetric[]
  currentTd: number | null      // Текущее Td (часы)
  averageTd: number | null      // Среднее Td по последним 3 пассажам
  cumulativePD: number          // CPD
  growthRate: number | null     // r = ln(2) / Td
  coefficient: number | null    // Коэффициент выхода
  confidence: 'high' | 'medium' | 'none'
}

interface PassageMetric {
  passageNumber: number
  lotNumber: string
  seedDate: string
  harvestDate: string | null
  initialCells: number
  finalCells: number
  viability: number
  durationHours: number
  populationDoublings: number   // PD = log₂(Nf × v / N₀)
  doublingTime: number | null   // Td = duration / PD
  growthRate: number | null     // r = ln(2) / Td
}
```

### Отображение в UI

| Страница | Метрики |
|----------|---------|
| Культура /cultures/[id] | Td (текущее/среднее), CPD, коэффициент, confidence |
| Лот /lots/[id] | PD, Td для этого пассажа, прогноз роста |
| Паспорт /cultures/passport | Td/CPD в статистике, график Td по пассажам |

---

## Минимальный набор параметров модели

1. **ρ_target** (или N_target) — плотность при целевой confluency
2. **Td** или **r** — время удвоения / скорость роста
3. **t_lag** (опционально) — лаг-фаза
4. **v** — жизнеспособность

### Входы для прогноза
- Площадь A (см²)
- Посев N₀ или ρ₀
- Целевая confluency → N_target
- Номер пассажа / CPD (если учитываем старение)

### Выходы
- Время до пассажа t_target (часы)
- Прогноз N(t) или Nf
- Текущий Td, CPD
