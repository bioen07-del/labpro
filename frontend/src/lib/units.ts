/**
 * units.ts — Утилита конвертации единиц измерения
 * LabPro v1.27.00
 */

import type {
  UnitType,
  MeasurementUnit,
  MassUnit,
  VolumeUnit,
  CountUnit,
  ActivityUnit,
  MolarUnit,
  NomenclatureCategory,
} from '@/types'

// ==================== КОЭФФИЦИЕНТЫ КОНВЕРТАЦИИ ====================

// Все коэффициенты приведены к базовой единице типа (г для массы, мл для объёма)
const MASS_FACTORS: Record<MassUnit, number> = {
  'мкг': 1e-6,
  'мг': 1e-3,
  'г': 1,
  'кг': 1e3,
}

const VOLUME_FACTORS: Record<VolumeUnit, number> = {
  'мкл': 1e-3,
  'мл': 1,
  'л': 1e3,
}

const COUNT_FACTORS: Record<CountUnit, number> = {
  'шт': 1,
  'уп': 1, // упаковки не конвертируются в штуки автоматически
}

const ACTIVITY_FACTORS: Record<ActivityUnit, number> = {
  'ЕД': 1,
  'МЕ': 1, // ЕД и МЕ эквивалентны (International Units)
}

const MOLAR_FACTORS: Record<MolarUnit, number> = {
  'мкмоль': 1e-6,
  'ммоль': 1e-3,
  'моль': 1,
}

// ==================== МАППИНГ ЕДИНИЦ → ТИПЫ ====================

const UNIT_TO_TYPE: Record<string, UnitType> = {
  'мкг': 'MASS', 'мг': 'MASS', 'г': 'MASS', 'кг': 'MASS',
  'мкл': 'VOLUME', 'мл': 'VOLUME', 'л': 'VOLUME',
  'шт': 'COUNT', 'уп': 'COUNT',
  'ЕД': 'ACTIVITY', 'МЕ': 'ACTIVITY',
  'мкмоль': 'MOLAR', 'ммоль': 'MOLAR', 'моль': 'MOLAR',
}

// ==================== ЕДИНИЦЫ ПО ТИПУ ====================

const UNITS_BY_TYPE: Record<UnitType, MeasurementUnit[]> = {
  MASS: ['мкг', 'мг', 'г', 'кг'],
  VOLUME: ['мкл', 'мл', 'л'],
  COUNT: ['шт', 'уп'],
  ACTIVITY: ['ЕД', 'МЕ'],
  MOLAR: ['мкмоль', 'ммоль', 'моль'],
}

// ==================== ДЕФОЛТЫ ПО КАТЕГОРИИ НОМЕНКЛАТУРЫ ====================

const CATEGORY_DEFAULTS: Record<NomenclatureCategory, { unitType: UnitType; unit: MeasurementUnit }> = {
  MEDIUM: { unitType: 'VOLUME', unit: 'мл' },
  SERUM: { unitType: 'VOLUME', unit: 'мл' },
  BUFFER: { unitType: 'VOLUME', unit: 'мл' },
  SUPPLEMENT: { unitType: 'VOLUME', unit: 'мл' },
  ENZYME: { unitType: 'ACTIVITY', unit: 'ЕД' },
  REAGENT: { unitType: 'MASS', unit: 'мг' },
  CONSUMABLE: { unitType: 'COUNT', unit: 'шт' },
  EQUIP: { unitType: 'COUNT', unit: 'шт' },
}

// ==================== ФУНКЦИИ ====================

/**
 * Определить тип единицы по её строковому значению
 */
export function getUnitType(unit: string): UnitType | null {
  return UNIT_TO_TYPE[unit] || null
}

/**
 * Получить список единиц для заданного типа
 */
export function getUnitsForType(type: UnitType): MeasurementUnit[] {
  return UNITS_BY_TYPE[type] || []
}

/**
 * Получить дефолтные единицы для категории номенклатуры
 */
export function getDefaultUnit(category: NomenclatureCategory): { unitType: UnitType; unit: MeasurementUnit } {
  return CATEGORY_DEFAULTS[category] || { unitType: 'COUNT', unit: 'шт' }
}

/**
 * Конвертировать значение между единицами одного типа
 * Возвращает null если единицы разных типов
 */
export function convertUnit(value: number, from: string, to: string): number | null {
  const fromType = getUnitType(from)
  const toType = getUnitType(to)

  if (!fromType || !toType || fromType !== toType) return null

  let fromFactor: number
  let toFactor: number

  switch (fromType) {
    case 'MASS':
      fromFactor = MASS_FACTORS[from as MassUnit]
      toFactor = MASS_FACTORS[to as MassUnit]
      break
    case 'VOLUME':
      fromFactor = VOLUME_FACTORS[from as VolumeUnit]
      toFactor = VOLUME_FACTORS[to as VolumeUnit]
      break
    case 'COUNT':
      fromFactor = COUNT_FACTORS[from as CountUnit]
      toFactor = COUNT_FACTORS[to as CountUnit]
      break
    case 'ACTIVITY':
      fromFactor = ACTIVITY_FACTORS[from as ActivityUnit]
      toFactor = ACTIVITY_FACTORS[to as ActivityUnit]
      break
    case 'MOLAR':
      fromFactor = MOLAR_FACTORS[from as MolarUnit]
      toFactor = MOLAR_FACTORS[to as MolarUnit]
      break
    default:
      return null
  }

  return (value * fromFactor) / toFactor
}

/**
 * Конвертировать в базовую единицу типа (г для массы, мл для объёма)
 */
export function toBaseUnit(value: number, unit: string): number | null {
  const type = getUnitType(unit)
  if (!type) return null

  switch (type) {
    case 'MASS': return value * MASS_FACTORS[unit as MassUnit]
    case 'VOLUME': return value * VOLUME_FACTORS[unit as VolumeUnit]
    case 'COUNT': return value * COUNT_FACTORS[unit as CountUnit]
    case 'ACTIVITY': return value * ACTIVITY_FACTORS[unit as ActivityUnit]
    case 'MOLAR': return value * MOLAR_FACTORS[unit as MolarUnit]
    default: return null
  }
}

/**
 * Форматировать значение с автоматическим выбором единицы
 * Пример: formatWithUnit(1500, 'мкл') → "1.5 мл"
 */
export function formatWithUnit(value: number, unit: string): string {
  const type = getUnitType(unit)
  if (!type) return `${value} ${unit}`

  // Для COUNT и ACTIVITY — не конвертируем
  if (type === 'COUNT' || type === 'ACTIVITY') {
    return `${value} ${unit}`
  }

  const factors = type === 'MASS' ? MASS_FACTORS : type === 'MOLAR' ? MOLAR_FACTORS : type === 'VOLUME' ? VOLUME_FACTORS : VOLUME_FACTORS
  const units = UNITS_BY_TYPE[type]

  // Конвертируем в базовую единицу
  const baseValue = (value * (factors as Record<string, number>)[unit])

  // Ищем наиболее удобную единицу (значение >= 1 и < 1000)
  for (let i = units.length - 1; i >= 0; i--) {
    const u = units[i]
    const converted = baseValue / (factors as Record<string, number>)[u]
    if (converted >= 1 || i === 0) {
      // Округляем до 2 знаков
      const rounded = Math.round(converted * 100) / 100
      return `${rounded} ${u}`
    }
  }

  return `${value} ${unit}`
}

/**
 * Получить label для единицы концентрации
 */
export function getConcentrationLabel(concentration: number | undefined, concentrationUnit: string | undefined): string {
  if (!concentration || !concentrationUnit) return ''
  return `${concentration}${concentrationUnit}`
}

/**
 * Единицы концентрации для выбора
 */
export const CONCENTRATION_UNITS = ['×', 'мг/мл', 'мкг/мл', 'мМ', 'М', '%', 'ЕД/мл'] as const
export type ConcentrationUnit = typeof CONCENTRATION_UNITS[number]

/**
 * Автоопределение unit_type по текстовому значению unit
 * Используется для миграции существующих данных
 */
export function inferUnitType(unit: string): UnitType | null {
  // Прямой маппинг
  const direct = getUnitType(unit)
  if (direct) return direct

  // Fuzzy matching для кириллицы
  const lower = unit.toLowerCase().trim()
  if (['мкг', 'мг', 'г', 'кг', 'грамм', 'миллиграмм'].some(u => lower.includes(u))) return 'MASS'
  if (['мкл', 'мл', 'л', 'литр', 'миллилитр'].some(u => lower.includes(u))) return 'VOLUME'
  if (['шт', 'уп', 'штук', 'упаков'].some(u => lower.includes(u))) return 'COUNT'
  if (['ед', 'ме', 'единиц'].some(u => lower.includes(u))) return 'ACTIVITY'
  if (['мкмоль', 'ммоль', 'моль', 'микромоль', 'миллимоль'].some(u => lower.includes(u))) return 'MOLAR'

  return null
}

/**
 * Все доступные единицы (flat list)
 */
// ==================== МОЛЯРНЫЕ РАСЧЁТЫ ====================

/**
 * Конвертировать количество вещества в моль (базовая единица).
 * Если unit — массовая (мг, г...), нужен molecularWeight (г/моль).
 * Если unit — молярная (ммоль, мкмоль...), MW не нужен.
 * Возвращает null если конвертация невозможна.
 */
export function toMoles(amount: number, unit: string, molecularWeight?: number | null): number | null {
  const type = getUnitType(unit)
  if (type === 'MOLAR') {
    return amount * MOLAR_FACTORS[unit as MolarUnit]
  }
  if (type === 'MASS' && molecularWeight && molecularWeight > 0) {
    const grams = amount * MASS_FACTORS[unit as MassUnit]
    return grams / molecularWeight
  }
  return null
}

/**
 * Рассчитать объём растворителя для целевой молярной концентрации.
 * amount — кол-во вещества (в unit), concMM — целевая конц. (мМ)
 * Возвращает объём в мл или null.
 */
export function calcVolumeForMolarConc(
  amount: number,
  unit: string,
  targetConcMM: number,
  molecularWeight?: number | null,
): number | null {
  const moles = toMoles(amount, unit, molecularWeight)
  if (moles == null || targetConcMM <= 0) return null
  // C(мМ) = n(ммоль) / V(мл) → V = n(ммоль) / C(мМ)
  const mmol = moles * 1000
  return mmol / targetConcMM
}

/**
 * Рассчитать молярную концентрацию при заданном объёме растворителя.
 * Возвращает конц. в мМ или null.
 */
export function calcMolarConc(
  amount: number,
  unit: string,
  volumeMl: number,
  molecularWeight?: number | null,
): number | null {
  const moles = toMoles(amount, unit, molecularWeight)
  if (moles == null || volumeMl <= 0) return null
  const mmol = moles * 1000
  return mmol / volumeMl
}

// ==================== РАСЧЁТЫ АКТИВНОСТИ ====================

/**
 * Рассчитать общую активность (ЕД) по массе и удельной активности.
 * amount — масса (в unit), specificActivity — ЕД/мг
 */
export function calcTotalActivity(amount: number, unit: string, specificActivity: number): number | null {
  const type = getUnitType(unit)
  if (type !== 'MASS' || specificActivity <= 0) return null
  const mg = amount * MASS_FACTORS[unit as MassUnit] / MASS_FACTORS['мг'] // конвертируем в мг
  return mg * specificActivity
}

/**
 * Рассчитать объём растворителя для целевой концентрации ЕД/мл.
 * amount — масса (в unit), specificActivity — ЕД/мг, targetEUml — целевая ЕД/мл.
 * Возвращает мл или null.
 */
export function calcVolumeForActivityConc(
  amount: number,
  unit: string,
  specificActivity: number,
  targetEUml: number,
): number | null {
  const totalEU = calcTotalActivity(amount, unit, specificActivity)
  if (totalEU == null || targetEUml <= 0) return null
  return totalEU / targetEUml
}

/**
 * Рассчитать концентрацию ЕД/мл при заданном объёме растворителя.
 */
export function calcActivityConc(
  amount: number,
  unit: string,
  specificActivity: number,
  volumeMl: number,
): number | null {
  const totalEU = calcTotalActivity(amount, unit, specificActivity)
  if (totalEU == null || volumeMl <= 0) return null
  return totalEU / volumeMl
}

export const ALL_UNITS: MeasurementUnit[] = [
  'мкг', 'мг', 'г', 'кг',
  'мкл', 'мл', 'л',
  'шт', 'уп',
  'ЕД', 'МЕ',
  'мкмоль', 'ммоль', 'моль',
]
