// API functions for LabPro - Supabase integration
import { supabase } from '@/lib/supabase'
import type { 
  CultureType, 
  Culture, 
  Lot, 
  Bank, 
  Container, 
  Operation, 
  Order,
  Batch,
  Task,
  User
} from '@/types'

// Supabase client is imported from '@/lib/supabase' - single client for the entire app

// ==================== CULTURE TYPES ====================

export async function getCultureTypeById(id: string) {
  const { data, error } = await supabase
    .from('culture_types')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data as CultureType
}

// ==================== CULTURE TYPE ↔ TISSUE TYPE ====================

export async function getCultureTypesByTissueType(tissueTypeId: string) {
  const { data, error } = await supabase
    .from('culture_type_tissue_types')
    .select('*, culture_type:culture_types(*), tissue_type:tissue_types(*)')
    .eq('tissue_type_id', tissueTypeId)
    .order('is_primary', { ascending: false })

  if (error) throw error
  return data
}

export async function getTissueTypesByCultureType(cultureTypeId: string) {
  const { data, error } = await supabase
    .from('culture_type_tissue_types')
    .select('*, culture_type:culture_types(*), tissue_type:tissue_types(*)')
    .eq('culture_type_id', cultureTypeId)

  if (error) throw error
  return data
}

// --- CRUD для связей culture_type ↔ tissue_type ---

export async function getAllCultureTypeTissueLinks() {
  const { data, error } = await supabase
    .from('culture_type_tissue_types')
    .select('*, culture_type:culture_types(*), tissue_type:tissue_types(*)')
  if (error) throw error
  return data ?? []
}

export async function linkCultureTypeToTissueType(
  cultureTypeId: string,
  tissueTypeId: string,
  isPrimary: boolean = false,
) {
  const { data, error } = await supabase
    .from('culture_type_tissue_types')
    .insert({ culture_type_id: cultureTypeId, tissue_type_id: tissueTypeId, is_primary: isPrimary })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function unlinkCultureTypeFromTissueType(
  cultureTypeId: string,
  tissueTypeId: string,
) {
  const { error } = await supabase
    .from('culture_type_tissue_types')
    .delete()
    .eq('culture_type_id', cultureTypeId)
    .eq('tissue_type_id', tissueTypeId)
  if (error) throw error
}

export async function updateCultureTypeTissueLink(
  cultureTypeId: string,
  tissueTypeId: string,
  isPrimary: boolean,
) {
  const { data, error } = await supabase
    .from('culture_type_tissue_types')
    .update({ is_primary: isPrimary })
    .eq('culture_type_id', cultureTypeId)
    .eq('tissue_type_id', tissueTypeId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ==================== CULTURES ====================

export async function getCultures(filters?: { status?: string; type_id?: string }) {
  let query = supabase
    .from('cultures')
    .select(`
      *,
      culture_type:culture_types(*),
      donor:donors(*),
      lots:lots(passage_number)
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.type_id) {
    query = query.eq('type_id', filters.type_id)
  }

  const { data, error } = await query
  if (error) throw error
  return data as (Culture & { culture_type: CultureType })[]
}

export async function getCultureById(id: string) {
  const { data, error } = await supabase
    .from('cultures')
    .select(`
      *,
      culture_type:culture_types(*),
      lots:lots(
        *,
        containers:containers!lot_id(
          *,
          container_type:container_types(*)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createCulture(culture: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('cultures')
    .insert(culture)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Расчёт коэффициента выхода клеток на основе истории пассажей
// Формула: Coefficient = (Concentration × Volume) / (Area × Confluent% / 100)
export async function calculateAndUpdateCoefficient(cultureId: string): Promise<{
  coefficient: number | null
  passageCount: number
  confidence: 'high' | 'medium' | 'none'
}> {
  // 1. Получить lot_id для данной культуры
  const { data: cultureLots } = await supabase
    .from('lots')
    .select('id')
    .eq('culture_id', cultureId)

  const lotIds = (cultureLots || []).map((l: any) => l.id)
  if (lotIds.length === 0) {
    return { coefficient: null, passageCount: 0, confidence: 'none' }
  }

  // 2. Получить PASSAGE операции для этих лотов
  const { data: operations } = await supabase
    .from('operations')
    .select(`
      id,
      type,
      lot_id,
      metrics:operation_metrics(*),
      containers:operation_containers(
        container_id,
        role,
        confluent_percent,
        container:containers(container_type_id, container_type:container_types(surface_area))
      )
    `)
    .eq('type', 'PASSAGE')
    .in('lot_id', lotIds)
    .order('created_at', { ascending: false })

  if (!operations || operations.length === 0) {
    return { coefficient: null, passageCount: 0, confidence: 'none' }
  }

  // Рассчитать коэффициент для каждого пассажа
  const coefficients: number[] = []
  for (const op of operations) {
    const metrics = (op.metrics as any[])?.[0]
    if (!metrics?.concentration || !metrics?.volume_ml) continue

    // Найти SOURCE контейнеры (с площадью и конфлюэнтностью)
    const sourceContainers = ((op.containers as any[]) || []).filter(
      (c: any) => c.role === 'SOURCE' && c.confluent_percent > 0
    )
    if (sourceContainers.length === 0) continue

    let totalArea = 0
    let weightedConfluent = 0
    for (const sc of sourceContainers) {
      const area = sc.container?.container_type?.surface_area || 0
      if (area > 0) {
        totalArea += area
        weightedConfluent += area * (sc.confluent_percent / 100)
      }
    }
    if (totalArea <= 0 || weightedConfluent <= 0) continue

    const avgConfluent = weightedConfluent / totalArea
    const coeff = (metrics.concentration * metrics.volume_ml) / (totalArea * avgConfluent)
    if (isFinite(coeff) && coeff > 0) {
      coefficients.push(coeff)
    }
  }

  if (coefficients.length === 0) {
    return { coefficient: null, passageCount: operations.length, confidence: 'none' }
  }

  // Среднее значение коэффициента
  const avgCoefficient = coefficients.reduce((a, b) => a + b, 0) / coefficients.length
  const confidence = coefficients.length >= 3 ? 'high' : coefficients.length >= 1 ? 'medium' : 'none'

  // Обновить в БД
  await supabase
    .from('cultures')
    .update({
      coefficient: Math.round(avgCoefficient * 100) / 100,
      coefficient_updated_at: new Date().toISOString(),
    })
    .eq('id', cultureId)

  return { coefficient: avgCoefficient, passageCount: coefficients.length, confidence }
}

// Прогноз выхода клеток для контейнера
export function forecastCells(
  coefficient: number,
  surfaceArea: number,
  targetConfluent: number = 0.9
): number {
  return coefficient * surfaceArea * targetConfluent
}

// ==================== CULTURE METRICS (Td, CPD, PD) ====================

export interface PassageMetric {
  passageNumber: number
  lotNumber: string
  seedDate: string
  harvestDate: string | null
  initialCells: number
  finalCells: number
  viability: number
  durationHours: number
  populationDoublings: number
  doublingTime: number | null
  growthRate: number | null
}

export interface CultureMetrics {
  passages: PassageMetric[]
  currentTd: number | null
  averageTd: number | null
  cumulativePD: number
  growthRate: number | null
  coefficient: number | null
  confidence: 'high' | 'medium' | 'none'
}

export async function calculateCultureMetrics(cultureId: string): Promise<CultureMetrics> {
  // 1. Получить все лоты культуры с данными для расчёта
  const { data: lots, error } = await supabase
    .from('lots')
    .select('lot_number, passage_number, initial_cells, final_cells, viability, seeded_at, harvest_at')
    .eq('culture_id', cultureId)
    .order('passage_number', { ascending: true })

  if (error) throw error

  // 2. Получить coefficient из культуры
  const { data: culture } = await supabase
    .from('cultures')
    .select('coefficient')
    .eq('id', cultureId)
    .single()

  const passages: PassageMetric[] = []
  let cumulativePD = 0

  for (const lot of (lots || [])) {
    const N0 = lot.initial_cells
    const Nf = lot.final_cells
    const v = (lot.viability ?? 100) / 100 // viability как доля
    if (!N0 || N0 <= 0 || !Nf || Nf <= 0) continue

    // PD = log2(Nf × v / N0) — коррекция на жизнеспособность
    const effectiveCells = Nf * v
    if (effectiveCells <= N0) continue // нет роста
    const pd = Math.log2(effectiveCells / N0)

    // Duration в часах
    let durationHours = 0
    let td: number | null = null
    let r: number | null = null

    if (lot.seeded_at && lot.harvest_at) {
      durationHours = (new Date(lot.harvest_at).getTime() - new Date(lot.seeded_at).getTime()) / (1000 * 60 * 60)
      if (durationHours > 0 && pd > 0) {
        td = durationHours / pd     // Td = duration / PD
        r = Math.LN2 / td           // r = ln(2) / Td
      }
    }

    cumulativePD += pd

    passages.push({
      passageNumber: lot.passage_number,
      lotNumber: lot.lot_number,
      seedDate: lot.seeded_at || '',
      harvestDate: lot.harvest_at || null,
      initialCells: N0,
      finalCells: Nf,
      viability: lot.viability ?? 100,
      durationHours,
      populationDoublings: Math.round(pd * 100) / 100,
      doublingTime: td ? Math.round(td * 10) / 10 : null,
      growthRate: r ? Math.round(r * 10000) / 10000 : null,
    })
  }

  // 3. Среднее Td по последним 3 пассажам с данными
  const withTd = passages.filter(p => p.doublingTime !== null)
  const last3 = withTd.slice(-3)
  const averageTd = last3.length > 0
    ? Math.round(last3.reduce((s, p) => s + p.doublingTime!, 0) / last3.length * 10) / 10
    : null

  const currentTd = withTd.length > 0 ? withTd[withTd.length - 1].doublingTime : null
  const currentR = currentTd ? Math.LN2 / currentTd : null

  const confidence: 'high' | 'medium' | 'none' =
    withTd.length >= 3 ? 'high' : withTd.length >= 1 ? 'medium' : 'none'

  return {
    passages,
    currentTd,
    averageTd,
    cumulativePD: Math.round(cumulativePD * 100) / 100,
    growthRate: currentR ? Math.round(currentR * 10000) / 10000 : null,
    coefficient: culture?.coefficient ?? null,
    confidence,
  }
}

// Прогноз роста — экспоненциальный (по Td)
export function forecastGrowth(
  currentTd: number,
  N0: number,
  targetCells: number,
): { hoursToTarget: number; daysToTarget: number } {
  if (currentTd <= 0 || N0 <= 0 || targetCells <= N0) {
    return { hoursToTarget: 0, daysToTarget: 0 }
  }
  const hours = currentTd * Math.log2(targetCells / N0)
  return {
    hoursToTarget: Math.round(hours * 10) / 10,
    daysToTarget: Math.round(hours / 24 * 10) / 10,
  }
}

// Создание культуры из донации с автоматическим P0 лотом и контейнерами
export async function createCultureFromDonation(data: {
  donation_id: string
  culture_type_id: string
  extraction_method: string
  // Поддерживает множественный выбор контейнеров
  container_type_id?: string   // deprecated — для обратной совместимости
  container_count?: number     // deprecated — для обратной совместимости
  containers_list?: Array<{
    container_type_id: string
    count: number
    position_id?: string
    consumable_batch_id?: string  // ID партии расходников для списания этого типа
  }>
  position_id?: string
  notes?: string
  // Списание среды
  ready_medium_id?: string
  medium_volume_ml?: number
  // Дополнительные компоненты (сыворотка, реагенты, добавки)
  additional_components?: Array<{
    ready_medium_id: string
    volume_ml: number
  }>
  // Списание контейнеров со склада (deprecated — used with single container_type_id)
  consumable_batch_id?: string
}) {
  // 1. Получить донацию для donor_id и tissue_id
  const donation = await getDonationById(data.donation_id)
  if (!donation) throw new Error('Донация не найдена')

  // 2. Генерация кода культуры CT-XXXX
  const { count: cultCount } = await supabase
    .from('cultures')
    .select('*', { count: 'exact', head: true })

  const cultureCode = `CT-${String((cultCount || 0) + 1).padStart(4, '0')}`

  // 3. Создать культуру
  // tissue_id -> FK к таблице tissues (не tissue_types), оставляем null
  const { data: culture, error: cultError } = await supabase
    .from('cultures')
    .insert({
      name: cultureCode,
      type_id: data.culture_type_id,
      donor_id: donation.donor_id,
      donation_id: data.donation_id,
      extraction_method: data.extraction_method,
      passage_number: 0,
      status: 'ACTIVE',
      received_date: new Date().toISOString().split('T')[0],
      notes: data.notes
    })
    .select()
    .single()

  if (cultError) throw cultError

  // 4. Создать лот P0
  const { data: lot, error: lotError } = await supabase
    .from('lots')
    .insert({
      lot_number: `${cultureCode}-L1`,
      culture_id: culture.id,
      passage_number: 0, // P0 — первичная культура
      status: 'ACTIVE',
      seeded_at: new Date().toISOString()
    })
    .select()
    .single()

  if (lotError) throw lotError

  // 5. Создать контейнеры (поддержка множественных типов)
  // Формируем единый список: containers_list ИЛИ fallback из старых полей
  const containerGroups = data.containers_list && data.containers_list.length > 0
    ? data.containers_list
    : data.container_type_id
      ? [{ container_type_id: data.container_type_id, count: data.container_count || 1, position_id: data.position_id, consumable_batch_id: data.consumable_batch_id }]
      : []

  if (containerGroups.length === 0) throw new Error('Не указаны контейнеры')

  const containers: any[] = []
  let globalIdx = 0
  for (const group of containerGroups) {
    for (let i = 0; i < group.count; i++) {
      globalIdx++
      const containerCode = `${cultureCode}-L1-P0-${String(globalIdx).padStart(3, '0')}`

      const { data: container, error: contError } = await supabase
        .from('containers')
        .insert({
          code: containerCode,
          lot_id: lot.id,
          container_type_id: group.container_type_id,
          position_id: group.position_id || data.position_id || null,
          container_status: 'IN_CULTURE',
          passage_number: 0,
          confluent_percent: 0,
          contaminated: false,
          seeded_at: new Date().toISOString()
        })
        .select()
        .single()

      if (contError) throw contError
      containers.push(container)
    }
  }

  // 6. Создать auto-task INSPECT через 1 день
  for (const container of containers) {
    await createAutoTask({
      type: 'OBSERVE',
      target_id: container.id,
      target_type: 'CONTAINER',
      due_days: 1
    })
  }

  // 7. Создать операцию SEED + списания
  const now = new Date().toISOString()
  const { data: seedOp, error: seedOpError } = await supabase
    .from('operations')
    .insert({
      lot_id: lot.id,
      type: 'SEED',
      status: 'COMPLETED',
      started_at: now,
      completed_at: now,
      notes: data.notes || 'Первичный посев из донации',
    })
    .select()
    .single()

  if (seedOpError) throw seedOpError

  // 7a. Привязать контейнеры к операции
  const opContainers = containers.map((c: any) => ({
    operation_id: seedOp.id,
    container_id: c.id,
    role: 'TARGET',
  }))
  await supabase.from('operation_containers').insert(opContainers)

  // 7b. Хелпер для списания готовой среды (пофлаконный учёт)
  async function writeOffReadyMediumSeed(rmId: string, volumeMl: number, purpose: string) {
    try {
      const { data: rm } = await supabase
        .from('ready_media')
        .select('current_volume_ml, volume_ml, batch_id')
        .eq('id', rmId)
        .single()
      if (rm) {
        const currentVol = rm.current_volume_ml ?? rm.volume_ml ?? 0
        const newVol = Math.max(0, currentVol - volumeMl)
        await supabase
          .from('ready_media')
          .update({ current_volume_ml: newVol, ...(newVol <= 0 ? { status: 'USED' } : {}) })
          .eq('id', rmId)
        // Если среда привязана к batch — пофлаконный учёт
        if (rm.batch_id) {
          await writeOffBatchVolume(rm.batch_id, volumeMl, seedOp.id, `Среда для посева ${cultureCode} (${purpose}, ${volumeMl} мл)`)
        } else {
          await createInventoryMovement({
            batch_id: rmId,
            movement_type: 'CONSUME',
            quantity: -volumeMl,
            reference_type: 'OPERATION',
            reference_id: seedOp.id,
            notes: `Среда для посева ${cultureCode} (${purpose}, ${volumeMl} мл)`,
          })
        }
      }
    } catch (err) {
      console.error(`Failed to write off ready medium (${purpose}):`, err)
    }
  }

  // Списание основной среды
  if (data.ready_medium_id && data.medium_volume_ml && data.medium_volume_ml > 0) {
    await supabase.from('operation_media').insert({
      operation_id: seedOp.id,
      ready_medium_id: data.ready_medium_id,
      quantity_ml: data.medium_volume_ml,
      purpose: 'SEED',
    })
    await writeOffReadyMediumSeed(data.ready_medium_id, data.medium_volume_ml, 'посев')
  }

  // 7b2. Списание дополнительных компонентов (сыворотка, реагенты, добавки)
  if (data.additional_components && data.additional_components.length > 0) {
    for (const comp of data.additional_components) {
      if (comp.ready_medium_id && comp.volume_ml > 0) {
        await supabase.from('operation_media').insert({
          operation_id: seedOp.id,
          ready_medium_id: comp.ready_medium_id,
          quantity_ml: comp.volume_ml,
          purpose: 'COMPONENT',
        })
        await writeOffReadyMediumSeed(comp.ready_medium_id, comp.volume_ml, 'компонент')
      }
    }
  }

  // 7c. Списание контейнеров со склада (поддержка множественных типов)
  // Собираем все consumable_batch_id из containerGroups + deprecated поле
  const batchWriteoffs = new Map<string, number>() // batch_id -> total count
  for (const group of containerGroups) {
    if (group.consumable_batch_id) {
      const prev = batchWriteoffs.get(group.consumable_batch_id) || 0
      batchWriteoffs.set(group.consumable_batch_id, prev + group.count)
    }
  }
  // Deprecated single batch_id (только если containers_list не задан)
  if (!data.containers_list && data.consumable_batch_id && (data.container_count || 0) > 0) {
    const prev = batchWriteoffs.get(data.consumable_batch_id) || 0
    batchWriteoffs.set(data.consumable_batch_id, prev + (data.container_count || 0))
  }

  for (const [batchId, writeoffQty] of batchWriteoffs.entries()) {
    const { data: batch } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (batch) {
      const newQty = Math.max(0, (batch.quantity || 0) - writeoffQty)

      await supabase
        .from('batches')
        .update({ quantity: newQty })
        .eq('id', batchId)

      await createInventoryMovement({
        batch_id: batchId,
        movement_type: 'CONSUME',
        quantity: -writeoffQty,
        reference_type: 'OPERATION',
        reference_id: seedOp.id,
        notes: `Контейнеры для посева ${cultureCode} (${writeoffQty} шт.)`,
      })
    }
  }

  return { culture, lot, containers }
}

export async function updateCulture(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('cultures')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ==================== LOTS ====================

export async function createLot(lot: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('lots')
    .insert(lot)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getLots(filters?: { status?: string; culture_id?: string }) {
  let query = supabase
    .from('lots')
    .select(`
      *,
      culture:cultures(
        *,
        culture_type:culture_types(*)
      )
    `)
    .order('created_at', { ascending: false })
  
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.culture_id) {
    query = query.eq('culture_id', filters.culture_id)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getLotById(id: string) {
  const { data, error } = await supabase
    .from('lots')
    .select(`
      *,
      culture:cultures(*, culture_type:culture_types(*)),
      containers:containers!lot_id(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// ==================== BANKS ====================

export async function getBanks(filters?: { status?: string; type?: string; culture_id?: string; lot_id?: string }) {
  let query = supabase
    .from('banks')
    .select(`
      *,
      culture:cultures(
        *,
        culture_type:culture_types(*)
      )
    `)
    .order('created_at', { ascending: false })
  
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.type) {
    query = query.eq('bank_type', filters.type)
  }
  if (filters?.culture_id) {
    query = query.eq('culture_id', filters.culture_id)
  }
  if (filters?.lot_id) {
    query = query.eq('lot_id', filters.lot_id)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getBankById(id: string) {
  const { data, error } = await supabase
    .from('banks')
    .select(`
      *,
      culture:cultures(
        *,
        culture_type:culture_types(*)
      ),
      lot:lots(*, culture:cultures(*, culture_type:culture_types(*))),
      cryo_vials:cryo_vials(*),
      qc_tests:qc_tests(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error

  // Self-heal: if bank has no culture_id but lot has culture_id, fix it
  if (data && !data.culture_id && data.lot?.culture_id) {
    await supabase
      .from('banks')
      .update({ culture_id: data.lot.culture_id })
      .eq('id', id)
    // Use culture from lot for current response
    data.culture = data.lot.culture
    data.culture_id = data.lot.culture_id
  }

  return data
}

// ==================== CONTAINERS ====================

export async function getContainers(filters?: { lot_id?: string; container_status?: string; status?: string }) {
  let query = supabase
    .from('containers')
    .select(`
      *,
      lot:lots!lot_id(
        *,
        culture:cultures(
          *,
          culture_type:culture_types(*)
        )
      ),
      container_type:container_types(*)
    `)
    .order('code')
  
  if (filters?.lot_id) {
    query = query.eq('lot_id', filters.lot_id)
  }
  if (filters?.container_status || filters?.status) {
    query = query.eq('container_status', filters.container_status || filters.status)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getContainerById(id: string) {
  const { data, error } = await supabase
    .from('containers')
    .select(`
      *,
      lot:lots!lot_id(
        *,
        culture:cultures(*)
      ),
      bank:banks(*),
      container_type:container_types(*),
      position:positions(
        *,
        equipment:equipment(*)
      ),
      operations:operations(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// ==================== OPERATIONS ====================

export async function getOperations(filters?: { lot_id?: string; type?: string; status?: string }) {
  let query = supabase
    .from('operations')
    .select(`
      *,
      lot:lots(
        *,
        culture:cultures(
          *,
          culture_type:culture_types(*)
        )
      ),
      operation_containers:operation_containers(
        *,
        container:containers(*)
      ),
      operation_metrics:operation_metrics(*)
    `)
    .order('started_at', { ascending: false })
  
  if (filters?.lot_id) {
    query = query.eq('lot_id', filters.lot_id)
  }
  if (filters?.type) {
    query = query.eq('type', filters.type)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getOperationById(id: string) {
  const { data, error } = await supabase
    .from('operations')
    .select(`
      *,
      lot:lots(
        *,
        culture:cultures(
          *,
          culture_type:culture_types(*)
        )
      ),
      operation_containers:operation_containers(
        *,
        container:containers(*)
      ),
      operation_media:operation_media(
        *,
        batch:batches(*),
        ready_medium:ready_media(*)
      ),
      operation_metrics:operation_metrics(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createOperation(operation: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('operations')
    .insert(operation)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ==================== OBSERVE OPERATION ====================

export interface ObserveContainerData {
  container_id: string
  confluent_percent: number
  morphology: string
  contaminated: boolean
}

export async function createOperationObserve(data: {
  lot_id: string
  containers: ObserveContainerData[]
  notes?: string
}) {
  const { data: operation, error: opError } = await supabase
    .from('operations')
    .insert({
      lot_id: data.lot_id,
      type: 'OBSERVE',
      status: 'COMPLETED',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      notes: data.notes
    })
    .select()
    .single()
  
  if (opError) throw opError
  
  const operationContainers = data.containers.map(container => ({
    operation_id: operation.id,
    container_id: container.container_id,
    role: 'SOURCE',
    confluent_percent: container.confluent_percent,
    morphology: container.morphology,
    contaminated: container.contaminated
  }))
  
  const { error: ocError } = await supabase
    .from('operation_containers')
    .insert(operationContainers)
  
  if (ocError) throw ocError
  
  for (const container of data.containers) {
    const updateFields: Record<string, unknown> = {
      confluent_percent: container.confluent_percent,
      morphology: container.morphology,
      contaminated: container.contaminated,
    }

    // Авто-карантин при обнаружении контаминации
    if (container.contaminated) {
      updateFields.container_status = 'QUARANTINE'
    }

    const { error: updateError } = await supabase
      .from('containers')
      .update(updateFields)
      .eq('id', container.container_id)

    if (updateError) throw updateError

    // Создать уведомление о контаминации
    if (container.contaminated) {
      try {
        await createNotification({
          type: 'CONTAMINATION',
          title: 'Контаминация обнаружена!',
          message: `Контейнер в лоте помечен как контаминированный. Рекомендуется утилизация.`,
          link_type: 'CONTAINER',
          link_id: container.container_id,
          is_read: false,
        })
      } catch (notifErr) {
        console.error('Failed to create contamination notification:', notifErr)
      }
    }
  }

  return operation
}

// ==================== CONTAINER PHOTOS ====================

/**
 * Upload a photo for a specific container (linked to an operation).
 * Stores file in Supabase Storage bucket "container-photos".
 * Records metadata in container_photos table.
 */
export async function uploadContainerPhoto(
  containerId: string,
  operationId: string,
  file: File,
): Promise<{ path: string; url: string } | null> {
  const timestamp = Date.now()
  const ext = file.name.split('.').pop() || 'jpg'
  const filePath = `${containerId}/${timestamp}.${ext}`

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('container-photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    // If bucket doesn't exist, try to continue without photo upload
    throw uploadError
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('container-photos')
    .getPublicUrl(filePath)

  const publicUrl = urlData?.publicUrl || ''

  // Record in DB
  const { error: dbError } = await supabase
    .from('container_photos')
    .insert({
      container_id: containerId,
      operation_id: operationId,
      file_path: filePath,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
    })

  if (dbError) {
    console.error('DB insert error for photo:', dbError)
    // Photo uploaded but metadata failed — non-critical
  }

  return { path: filePath, url: publicUrl }
}

/**
 * Get all photos for a container, optionally filtered by operation.
 */
export async function getContainerPhotos(
  containerId: string,
  operationId?: string,
) {
  let query = supabase
    .from('container_photos')
    .select('*')
    .eq('container_id', containerId)
    .order('created_at', { ascending: false })

  if (operationId) {
    query = query.eq('operation_id', operationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// ==================== DISPOSE OPERATION ====================

export interface DisposeData {
  target_type: 'container' | 'batch' | 'ready_medium'
  target_id: string
  reason: string
  notes?: string
}

export async function createOperationDispose(data: DisposeData) {
  let lot_id: string | null = null
  
  if (data.target_type === 'container') {
    const container = await getContainerById(data.target_id)
    lot_id = container?.lot_id
  }
  
  const { data: operation, error: opError } = await supabase
    .from('operations')
    .insert({
      lot_id,
      type: 'DISPOSE',
      status: 'COMPLETED',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      notes: `${data.reason}${data.notes ? '. ' + data.notes : ''}`
    })
    .select()
    .single()
  
  if (opError) throw opError
  
  let tableName: string
  let statusValue: string
  
  switch (data.target_type) {
    case 'container':
      tableName = 'containers'
      statusValue = 'DISPOSE'
      break
    case 'batch':
      tableName = 'batches'
      statusValue = 'DISPOSE'
      break
    case 'ready_medium':
      tableName = 'ready_media'
      statusValue = 'DISPOSE'
      break
    default:
      throw new Error('Unknown target_type')
  }
  
  // containers используют container_status, остальные — status
  let updateField = data.target_type === 'container' ? 'container_status' : 'status'

  const { error: updateError } = await supabase
    .from(tableName)
    .update({ [updateField]: statusValue })
    .eq('id', data.target_id)
  
  if (updateError) throw updateError
  
  if (data.target_type === 'container' && lot_id) {
    const { data: remainingContainers } = await supabase
      .from('containers')
      .select('id')
      .eq('lot_id', lot_id)
      .neq('container_status', 'DISPOSE')
    
    if (!remainingContainers || remainingContainers.length === 0) {
      await supabase
        .from('lots')
        .update({ status: 'DISPOSE' })
        .eq('id', lot_id)
    }
  }
  
  return operation
}

export async function completeOperation(id: string) {
  const { data, error } = await supabase
    .from('operations')
    .update({ 
      status: 'COMPLETED' as const,
      completed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ==================== ORDERS ====================

export async function getOrders(filters?: { status?: string; type?: string }) {
  let query = supabase
    .from('orders')
    .select(`
      *,
      culture_type:culture_types(*)
    `)
    .order('created_at', { ascending: false })
  
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.type) {
    query = query.eq('order_type', filters.type)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data as Order[]
}

export async function getOrderById(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      culture_type:culture_types(*),
      bank:banks(*)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function createOrder(order: Record<string, unknown>) {
  const today = new Date()
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '')
  
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .like('order_number', `ORD-${datePrefix}-%`)
  
  const orderNumber = `ORD-${datePrefix}-${String((count || 0) + 1).padStart(4, '0')}`
  
  const { data, error } = await supabase
    .from('orders')
    .insert({ ...order, order_number: orderNumber })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateOrderStatus(id: string, status: Order['status']) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ==================== ORDER WORKFLOW ====================

// Резервирование банка для заявки
export async function reserveBankForOrder(orderId: string, bankId: string, vialCount: number) {
  // 1. Обновить статус банка → RESERVED
  const { error: bankErr } = await supabase
    .from('banks')
    .update({ status: 'RESERVED' })
    .eq('id', bankId)
    .in('status', ['APPROVED']) // только из APPROVED

  if (bankErr) throw bankErr

  // 2. Получить криовиалы из банка (AVAILABLE)
  const { data: vials, error: vialsErr } = await supabase
    .from('cryo_vials')
    .select('id')
    .eq('bank_id', bankId)
    .eq('status', 'AVAILABLE')
    .limit(vialCount)

  if (vialsErr) throw vialsErr
  if (!vials || vials.length === 0) throw new Error('Нет доступных криовиалов в банке')

  // 3. Создать order_items для каждого криовиала
  const items = vials.map((v: any) => ({
    order_id: orderId,
    bank_id: bankId,
    cryo_vial_id: v.id,
    quantity: 1,
    status: 'RESERVED',
  }))
  await supabase.from('order_items').insert(items)

  // 4. Обновить статус криовиалов → RESERVED
  const vialIds = vials.map((v: any) => v.id)
  await supabase
    .from('cryo_vials')
    .update({ status: 'RESERVED' })
    .in('id', vialIds)

  // 5. Заявка → IN_PROGRESS
  await supabase
    .from('orders')
    .update({ status: 'IN_PROGRESS' })
    .eq('id', orderId)

  return { reservedCount: vials.length }
}

// Выдача криовиалов по заявке
export async function issueOrderItems(orderId: string) {
  // 1. Получить order_items со статусом RESERVED
  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('id, cryo_vial_id, bank_id')
    .eq('order_id', orderId)
    .eq('status', 'RESERVED')

  if (itemsErr) throw itemsErr
  if (!items || items.length === 0) throw new Error('Нет зарезервированных позиций для выдачи')

  // 2. Обновить статус order_items → ISSUED
  await supabase
    .from('order_items')
    .update({ status: 'ISSUED' })
    .eq('order_id', orderId)
    .eq('status', 'RESERVED')

  // 3. Обновить статус криовиалов → ISSUED
  const vialIds = items.map((i: any) => i.cryo_vial_id).filter(Boolean)
  if (vialIds.length > 0) {
    await supabase
      .from('cryo_vials')
      .update({ status: 'ISSUED' })
      .in('id', vialIds)
  }

  // 4. Проверить банки — если все криовиалы выданы, банк → ISSUED
  const bankIds = [...new Set(items.map((i: any) => i.bank_id).filter(Boolean))]
  for (const bankId of bankIds) {
    const { data: remaining } = await supabase
      .from('cryo_vials')
      .select('id')
      .eq('bank_id', bankId)
      .in('status', ['AVAILABLE', 'RESERVED'])

    if (!remaining || remaining.length === 0) {
      await supabase.from('banks').update({ status: 'ISSUED' }).eq('id', bankId)
    } else {
      // Есть ещё криовиалы — вернуть банк в APPROVED
      await supabase.from('banks').update({ status: 'APPROVED' }).eq('id', bankId)
    }
  }

  // 5. Заявка → COMPLETED
  await supabase
    .from('orders')
    .update({ status: 'COMPLETED', issued_at: new Date().toISOString() })
    .eq('id', orderId)

  return { issuedCount: items.length }
}

// Отмена заявки — освобождение резервов
export async function cancelOrder(orderId: string) {
  // 1. Получить order_items со статусом RESERVED
  const { data: items } = await supabase
    .from('order_items')
    .select('id, cryo_vial_id, bank_id')
    .eq('order_id', orderId)
    .eq('status', 'RESERVED')

  if (items && items.length > 0) {
    // 2. Вернуть криовиалы → AVAILABLE
    const vialIds = items.map((i: any) => i.cryo_vial_id).filter(Boolean)
    if (vialIds.length > 0) {
      await supabase.from('cryo_vials').update({ status: 'AVAILABLE' }).in('id', vialIds)
    }

    // 3. Вернуть банки → APPROVED
    const bankIds = [...new Set(items.map((i: any) => i.bank_id).filter(Boolean))]
    for (const bankId of bankIds) {
      await supabase.from('banks').update({ status: 'APPROVED' }).eq('id', bankId)
    }

    // 4. Удалить order_items
    await supabase.from('order_items').delete().eq('order_id', orderId)
  }

  // 5. Заявка → CANCELLED
  await supabase
    .from('orders')
    .update({ status: 'CANCELLED' })
    .eq('id', orderId)
}

// ==================== INVENTORY ====================

export async function getBatches(filters?: { status?: string; category?: string; usage_tag?: string }) {
  let query = supabase
    .from('batches')
    .select(`
      *,
      nomenclature:nomenclatures(*)
    `)
    .order('expiration_date')

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) {
    console.error('getBatches error:', error)
    return [] as Batch[]
  }
  // Client-side filter by nomenclature category since nested filtering is limited
  let result = data as Batch[]
  if (filters?.category) {
    result = result.filter((b: any) => b.nomenclature?.category === filters.category)
  }
  // Client-side filter by usage_tag (nomenclature.usage_tags array)
  if (filters?.usage_tag) {
    const tag = filters.usage_tag
    const tagged = result.filter((b: any) => {
      const tags = b.nomenclature?.usage_tags as string[] | undefined
      return tags && tags.includes(tag)
    })
    // Fallback: if no tagged results, return all (backward compatibility)
    if (tagged.length > 0) result = tagged
  }
  return result
}

export async function createBatch(batch: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('batches')
    .insert(batch)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateBatch(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('batches')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ---- Volume-per-unit batch deduction ----

/**
 * Проверяет, поместится ли списание volumeMl в текущий флакон.
 * Чистая функция для UI-предупреждений (не обращается к БД).
 */
export function checkBatchVolumeDeduction(
  batch: { quantity: number; volume_per_unit?: number | null; current_unit_volume?: number | null },
  volumeMl: number
): { fits: boolean; unitsNeeded: number; totalAvailable: number } {
  if (!batch.volume_per_unit || batch.volume_per_unit <= 0) {
    return { fits: true, unitsNeeded: 0, totalAvailable: batch.quantity }
  }
  const vpu = batch.volume_per_unit
  const currentUnitVol = batch.current_unit_volume ?? vpu
  const totalAvailable = currentUnitVol + Math.max(0, batch.quantity - 1) * vpu

  if (volumeMl <= currentUnitVol) {
    return { fits: true, unitsNeeded: 0, totalAvailable }
  }

  const overflow = volumeMl - currentUnitVol
  const fullUnitsNeeded = Math.ceil(overflow / vpu)

  return { fits: false, unitsNeeded: fullUnitsNeeded, totalAvailable }
}

/**
 * Списание объёма из партии с пофлаконным учётом.
 * Если volume_per_unit не задан — fallback на старое поведение (quantity -= volumeMl).
 * Если volume_per_unit задан — списание из текущего флакона, при нехватке — открытие новых.
 */
export async function writeOffBatchVolume(
  batchId: string,
  volumeMl: number,
  operationId: string,
  purpose: string
): Promise<{ newQuantity: number; newCurrentUnitVolume: number | null; unitsOpened: number }> {
  const { data: batch, error } = await supabase
    .from('batches')
    .select('quantity, volume_per_unit, current_unit_volume')
    .eq('id', batchId)
    .single()

  if (error || !batch) throw new Error(`Batch ${batchId} not found`)

  let newQuantity: number
  let newCurrentUnitVolume: number | null
  let unitsOpened = 0

  if (batch.volume_per_unit == null || batch.volume_per_unit <= 0) {
    // Старое поведение: quantity -= volumeMl
    newQuantity = Math.max(0, (batch.quantity || 0) - volumeMl)
    newCurrentUnitVolume = null
  } else {
    const vpu = batch.volume_per_unit
    let curVol = batch.current_unit_volume ?? vpu
    let qty = batch.quantity || 0
    let toDeduct = volumeMl

    if (toDeduct <= curVol) {
      curVol -= toDeduct
      toDeduct = 0
    } else {
      // Исчерпываем текущий флакон
      toDeduct -= curVol
      curVol = 0
      qty = Math.max(0, qty - 1)
      unitsOpened++

      // Открываем новые по необходимости
      while (toDeduct > 0 && qty > 0) {
        unitsOpened++
        if (toDeduct <= vpu) {
          curVol = vpu - toDeduct
          toDeduct = 0
        } else {
          toDeduct -= vpu
          qty = Math.max(0, qty - 1)
        }
      }

      if (toDeduct > 0) curVol = 0
    }

    // Если текущий флакон пуст, но есть ещё — просто ждём следующего списания
    newQuantity = qty
    newCurrentUnitVolume = curVol
  }

  const batchDepleted = newQuantity <= 0 && (newCurrentUnitVolume == null || newCurrentUnitVolume <= 0)

  const updateData: Record<string, unknown> = {
    quantity: newQuantity,
    status: batchDepleted ? 'USED' : 'AVAILABLE',
  }
  if (newCurrentUnitVolume != null) {
    updateData.current_unit_volume = newCurrentUnitVolume
  }

  await supabase.from('batches').update(updateData).eq('id', batchId)

  await createInventoryMovement({
    batch_id: batchId,
    movement_type: 'CONSUME',
    quantity: -volumeMl,
    reference_type: 'OPERATION',
    reference_id: operationId,
    notes: `${purpose} (${volumeMl} мл)${unitsOpened > 0 ? ` [открыто ${unitsOpened} нов. ед.]` : ''}`,
  })

  return { newQuantity, newCurrentUnitVolume, unitsOpened }
}

export async function getBatchById(id: string) {
  const { data, error } = await supabase
    .from('batches')
    .select('*, nomenclature:nomenclatures(*, container_type:container_types(*))')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getNomenclatures() {
  const { data, error } = await supabase
    .from('nomenclatures')
    .select('*')
    .order('name')

  if (error) throw error
  return data ?? []
}

// ==================== TASKS ====================

export async function getTasks(filters?: { status?: string; type?: string }) {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      container:containers(*),
      bank:banks(*),
      order:orders(*)
    `)
    .order('due_date')
  
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.type) {
    query = query.eq('type', filters.type)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createTask(task: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function completeTask(id: string) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ 
      status: 'COMPLETED' as const,
      completed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ==================== STATS ====================

export async function getDashboardStats() {
  const [
    culturesResult,
    activeCulturesResult,
    banksResult,
    pendingOrdersResult,
    pendingTasksResult,
    activeContainersResult,
    equipmentResult,
  ] = await Promise.all([
    supabase.from('cultures').select('*', { count: 'exact', head: true }),
    supabase.from('cultures').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('banks').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['PENDING', 'IN_PROGRESS']),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('containers').select('*', { count: 'exact', head: true }).eq('container_status', 'IN_CULTURE'),
    supabase.from('equipment').select('id, name, code, next_maintenance, next_validation, status').neq('is_active', false),
  ])

  // Equipment alerts: overdue or upcoming within 7 days
  const equipmentAlerts: Array<{ id: string; name: string; code: string; type: 'maintenance' | 'validation'; urgency: 'overdue' | 'urgent' | 'soon'; date: string }> = []
  const now = new Date()
  const in7days = new Date(now.getTime() + 7 * 86400000)
  const in30days = new Date(now.getTime() + 30 * 86400000)

  for (const eq of equipmentResult.data || []) {
    for (const field of ['next_maintenance', 'next_validation'] as const) {
      if (!eq[field]) continue
      const d = new Date(eq[field])
      const alertType = field === 'next_maintenance' ? 'maintenance' as const : 'validation' as const
      if (d < now) {
        equipmentAlerts.push({ id: eq.id, name: eq.name, code: eq.code, type: alertType, urgency: 'overdue', date: eq[field] })
      } else if (d < in7days) {
        equipmentAlerts.push({ id: eq.id, name: eq.name, code: eq.code, type: alertType, urgency: 'urgent', date: eq[field] })
      } else if (d < in30days) {
        equipmentAlerts.push({ id: eq.id, name: eq.name, code: eq.code, type: alertType, urgency: 'soon', date: eq[field] })
      }
    }
  }

  // Sort: overdue first, then urgent, then soon
  const urgencyOrder = { overdue: 0, urgent: 1, soon: 2 }
  equipmentAlerts.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

  return {
    totalCultures: culturesResult.count || 0,
    activeCultures: activeCulturesResult.count || 0,
    totalBanks: banksResult.count || 0,
    pendingOrders: pendingOrdersResult.count || 0,
    pendingTasks: pendingTasksResult.count || 0,
    activeContainers: activeContainersResult.count || 0,
    equipmentAlerts,
  }
}

// ==================== AUTH ====================

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

export function subscribeToOrders(callback: (payload: unknown) => void) {
  return supabase
    .channel('orders-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      callback
    )
    .subscribe()
}

// ==================== DONORS ====================

export async function getDonors() {
  const { data, error } = await supabase
    .from('donors')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getDonorById(id: string) {
  const { data, error } = await supabase
    .from('donors')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createDonor(donor: Record<string, unknown>) {
  const { count } = await supabase
    .from('donors')
    .select('*', { count: 'exact', head: true })
  
  const code = `DN-${String((count || 0) + 1).padStart(4, '0')}`
  
  const { data, error } = await supabase
    .from('donors')
    .insert({ ...donor, code })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateDonor(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('donors')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ==================== DONATIONS ====================

export async function getDonations(filters?: { donor_id?: string; status?: string; statuses?: string[] }) {
  let query = supabase
    .from('donations')
    .select('*, donor:donors(*), tissue_type:tissue_types(*)')
    .order('created_at', { ascending: false })

  if (filters?.donor_id) {
    query = query.eq('donor_id', filters.donor_id)
  }
  if (filters?.statuses && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses)
  } else if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getDonationById(id: string) {
  const { data, error } = await supabase
    .from('donations')
    .select('*, donor:donors(*), tissue_type:tissue_types(*), cultures(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createDonation(donation: Record<string, unknown>) {
  const { count } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })

  const code = `DON-${String((count || 0) + 1).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('donations')
    .insert({ ...donation, code })
    .select()
    .single()

  if (error) throw error
  return data
}

// Создать QC-задачи для анализов донации со статусом PENDING
export async function createDonationInfectionTasks(donationId: string, donationCode: string) {
  const tests = ['ВИЧ', 'Гепатит B', 'Гепатит C', 'Сифилис']
  const testCodes = ['HIV', 'HBV', 'HCV', 'SYPHILIS']

  for (let i = 0; i < tests.length; i++) {
    try {
      await supabase.from('tasks').insert({
        title: `${tests[i]} — ${donationCode}`,
        type: 'QC_DUE',
        target_type: 'DONATION' as any,
        target_id: donationId,
        status: 'PENDING',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 дней
      })
    } catch {
      // Ignore errors for individual tasks
    }
  }
}

export async function updateDonation(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('donations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== TISSUE TYPES ====================

export async function getTissueTypes(includeInactive = false) {
  let query = supabase
    .from('tissue_types')
    .select('*')
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query.order('name')

  if (error) throw error
  return data
}

// ==================== TISSUES ====================

export async function getTissues(filters?: { donor_id?: string }) {
  let query = supabase
    .from('tissues')
    .select('*, donor:donors(*)')
    .order('created_at', { ascending: false })
  
  if (filters?.donor_id) {
    query = query.eq('donor_id', filters.donor_id)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createTissue(tissue: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('tissues')
    .insert(tissue)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ==================== CONTAINER TYPES ====================

export async function getContainerTypes(includeInactive = false) {
  let query = supabase
    .from('container_types')
    .select('*')
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query.order('name')

  if (error) throw error
  return data
}

// ==================== MORPHOLOGY TYPES ====================

export async function getMorphologyTypes() {
  const { data, error } = await supabase
    .from('morphology_types')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

// ==================== MEDIUM TYPES ====================

export async function getMediumTypes() {
  // Note: medium_types table does not exist in current schema.
  // Medium information is stored in nomenclatures with category filter.
  const { data, error } = await supabase
    .from('nomenclatures')
    .select('*')
    .eq('category', 'MEDIUM')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('getMediumTypes error:', error)
    return []
  }
  return data
}

// ==================== DISPOSE REASONS ====================

export async function getDisposeReasons() {
  const { data, error } = await supabase
    .from('dispose_reasons')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

// ==================== CULTURE TYPES ====================

export async function getCultureTypes(includeInactive = false) {
  let query = supabase
    .from('culture_types')
    .select('*')
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query.order('name')

  if (error) throw error
  return data
}

// ==================== QC TESTS ====================

export async function getQCTests(filters?: { status?: string; target_type?: string; target_id?: string }) {
  let query = supabase
    .from('qc_tests')
    .select('*, created_by_user:users(*)')
    .order('created_at', { ascending: false })
  
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.target_type) {
    query = query.eq('target_type', filters.target_type)
  }
  if (filters?.target_id) {
    query = query.eq('target_id', filters.target_id)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getQCTestById(id: string) {
  const { data, error } = await supabase
    .from('qc_tests')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function createQCTest(qcTest: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('qc_tests')
    .insert(qcTest)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateQCTestStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('qc_tests')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function submitQCResult(id: string, result: 'PASSED' | 'FAILED', notes?: string) {
  const { data, error } = await supabase
    .from('qc_tests')
    .update({
      result,
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      notes
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ==================== READY MEDIA ====================

export async function getReadyMedia(filters?: { status?: string }) {
  let query = supabase
    .from('ready_media')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getReadyMediumById(id: string) {
  const { data, error } = await supabase
    .from('ready_media')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function createReadyMedium(readyMedium: Record<string, unknown>) {
  const { count } = await supabase
    .from('ready_media')
    .select('*', { count: 'exact', head: true })
  
  const code = `RM-${String((count || 0) + 1).padStart(4, '0')}`
  
  const { data, error } = await supabase
    .from('ready_media')
    .insert({ ...readyMedium, code })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function activateReadyMedium(id: string) {
  const { data, error } = await supabase
    .from('ready_media')
    .update({ status: 'ACTIVE', activated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function disposeReadyMedium(id: string) {
  const { data, error } = await supabase
    .from('ready_media')
    .update({ status: 'DISPOSE' })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ==================== EQUIPMENT ====================

export async function getEquipment(filters?: { type?: string; status?: string; includeInactive?: boolean }) {
  let query = supabase
    .from('equipment')
    .select('*')
    .order('name')

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (!filters?.includeInactive) {
    query = query.neq('is_active', false)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getEquipmentById(id: string) {
  const { data, error } = await supabase
    .from('equipment')
    .select('*, positions:positions(*)')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function createEquipment(equipment: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('equipment')
    .insert(equipment)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateEquipment(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('equipment')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) throw error
  return data?.[0] ?? null
}

export async function deactivateEquipment(id: string) {
  const { error } = await supabase
    .from('equipment')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}

export async function activateEquipment(id: string) {
  const { error } = await supabase
    .from('equipment')
    .update({ is_active: true })
    .eq('id', id)
  if (error) throw error
}

export async function deleteEquipment(id: string) {
  const { error } = await supabase
    .from('equipment')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function createEquipmentLog(equipmentId: string, log: { temperature?: number; humidity?: number; co2_level?: number; o2_level?: number; notes?: string }) {
  const { data: logData, error: logError } = await supabase
    .from('equipment_logs')
    .insert({
      equipment_id: equipmentId,
      temperature: log.temperature ?? null,
      humidity: log.humidity ?? null,
      co2_level: log.co2_level ?? null,
      o2_level: log.o2_level ?? null,
      notes: log.notes,
      logged_at: new Date().toISOString()
    })
    .select()
    .single()

  if (logError) throw logError

  return logData
}

export async function getEquipmentLogs(equipmentId: string, limit = 100) {
  const { data, error } = await supabase
    .from('equipment_logs')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('logged_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function getMonitoringParams(equipmentId?: string) {
  if (!equipmentId) return []
  const { data, error } = await supabase
    .from('equipment_monitoring_params')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function saveMonitoringParams(
  equipmentId: string,
  equipmentType: string,
  params: { param_key: string; param_label: string; unit: string; min_value?: number; max_value?: number; is_required: boolean; sort_order: number }[]
) {
  // Delete existing params for this equipment
  const { error: delError } = await supabase
    .from('equipment_monitoring_params')
    .delete()
    .eq('equipment_id', equipmentId)

  if (delError) throw delError

  if (params.length === 0) return []

  // Insert new params
  const rows = params.map(p => ({
    equipment_id: equipmentId,
    equipment_type: equipmentType,
    ...p,
  }))

  const { data, error } = await supabase
    .from('equipment_monitoring_params')
    .insert(rows)
    .select()

  if (error) throw error
  return data
}

// ==================== POSITIONS ====================

export async function getPositions(filters?: { equipment_id?: string; is_active?: boolean }) {
  let query = supabase
    .from('positions')
    .select('*, equipment:equipment(*)')
    .order('path')
  
  if (filters?.equipment_id) {
    query = query.eq('equipment_id', filters.equipment_id)
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getPositionById(id: string) {
  const { data, error } = await supabase
    .from('positions')
    .select('*, equipment:equipment(*)')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function getPositionByQR(qrCode: string) {
  const { data, error } = await supabase
    .from('positions')
    .select('*, equipment:equipment(*)')
    .eq('qr_code', qrCode)
    .single()
  
  if (error) throw error
  return data
}

// ==================== QR CODE LOOKUPS ====================

export async function getContainerByQR(qrCode: string) {
  // containers не имеют qr_code — ищем по code
  const { data, error } = await supabase
    .from('containers')
    .select(`
      *,
      lot:lots!lot_id(
        *,
        culture:cultures(
          *,
          culture_type:culture_types(*)
        )
      ),
      position:positions(*)
    `)
    .eq('code', qrCode)
    .single()

  if (error) throw error
  return data
}

export async function getEquipmentByQR(qrCode: string) {
  // equipment не имеет qr_code — ищем по code
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('code', qrCode)
    .single()

  if (error) throw error
  return data
}

export async function getCultureByQR(qrCode: string) {
  // cultures не имеют qr_code — ищем по name (код культуры)
  const { data, error } = await supabase
    .from('cultures')
    .select(`
      *,
      culture_type:culture_types(*),
      lots:lots(*)
    `)
    .eq('name', qrCode)
    .single()

  if (error) throw error
  return data
}

export async function getLotByQR(qrCode: string) {
  // lots не имеют qr_code — ищем по lot_number
  const { data, error } = await supabase
    .from('lots')
    .select(`
      *,
      culture:cultures(
        *,
        culture_type:culture_types(*)
      ),
      containers:containers!lot_id(*)
    `)
    .eq('lot_number', qrCode)
    .single()

  if (error) throw error
  return data
}

export async function getBankByQR(qrCode: string) {
  // banks не имеют qr_code — ищем по code
  const { data, error } = await supabase
    .from('banks')
    .select(`
      *,
      culture:cultures(
        *,
        culture_type:culture_types(*)
      ),
      lot:lots(*),
      cryo_vials:cryo_vials(*)
    `)
    .eq('code', qrCode)
    .single()

  if (error) throw error
  return data
}

export async function getReadyMediumByQR(qrCode: string) {
  // ready_media не имеет qr_code — ищем по code
  const { data, error } = await supabase
    .from('ready_media')
    .select('*, storage_position:positions(*)')
    .eq('code', qrCode)
    .single()

  if (error) throw error
  return data
}

export function parseQRCode(code: string): { type: string; value: string } | null {
  if (code.startsWith('POS:')) {
    return { type: 'position', value: code.substring(4) }
  }
  if (code.startsWith('CNT:')) {
    return { type: 'container', value: code.substring(4) }
  }
  if (code.startsWith('EQP:')) {
    return { type: 'equipment', value: code.substring(4) }
  }
  if (code.startsWith('CULT:')) {
    return { type: 'culture', value: code.substring(5) }
  }
  if (code.startsWith('INV:')) {
    return { type: 'lot', value: code.substring(4) }
  }
  if (code.startsWith('RM:')) {
    return { type: 'ready_medium', value: code.substring(3) }
  }
  if (code.startsWith('BK:')) {
    return { type: 'bank', value: code.substring(3) }
  }
  return { type: 'unknown', value: code }
}

export async function createPosition(position: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('positions')
    .insert(position)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updatePosition(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('positions')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) throw error
  return data?.[0] ?? null
}

// ==================== INVENTORY MOVEMENTS ====================

export async function createInventoryMovement(movement: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('inventory_movements')
    .insert(movement)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getInventoryMovements(filters?: { batch_id?: string; movement_type?: string }) {
  let query = supabase
    .from('inventory_movements')
    .select('*, batch:batches(*), moved_by_user:users(*)')
    .order('moved_at', { ascending: false })
  
  if (filters?.batch_id) {
    query = query.eq('batch_id', filters.batch_id)
  }
  if (filters?.movement_type) {
    query = query.eq('movement_type', filters.movement_type)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

// ==================== BATCH RESERVATIONS ====================

export async function createBatchReservation(reservation: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('batch_reservations')
    .insert(reservation)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function releaseBatchReservation(id: string) {
  const { data, error } = await supabase
    .from('batch_reservations')
    .update({ released_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function releaseBatchReservationsByOperation(operationId: string) {
  const { error } = await supabase
    .from('batch_reservations')
    .update({ released_at: new Date().toISOString() })
    .eq('operation_id', operationId)
    .is('released_at', null)
  
  if (error) throw error
}

// ==================== CONTAINERS ====================

export async function createContainer(container: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('containers')
    .insert(container)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateContainer(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('containers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateContainerPosition(id: string, positionId: string) {
  const { data, error } = await supabase
    .from('containers')
    .update({ position_id: positionId, placed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getContainersByLot(lotId: string) {
  const { data, error } = await supabase
    .from('containers')
    .select('*, position:positions(*), container_type:container_types(id, name, code, surface_area_cm2, volume_ml)')
    .eq('lot_id', lotId)
    .order('code')

  if (error) throw error
  return data
}

// ==================== BANKS ====================

export async function createBank(bank: Record<string, unknown>) {
  const { count } = await supabase
    .from('banks')
    .select('*', { count: 'exact', head: true })
  
  const code = `BK-${String((count || 0) + 1).padStart(4, '0')}`
  
  const { data, error } = await supabase
    .from('banks')
    .insert({ ...bank, code })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateBankStatus(id: string, status: string, qcPassed?: boolean) {
  const updates: Record<string, unknown> = { status }
  if (qcPassed !== undefined) {
    updates.qc_passed = qcPassed
  }
  
  const { data, error } = await supabase
    .from('banks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ==================== CRYO VIALS ====================

export async function createCryoVial(cryoVial: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('cryo_vials')
    .insert(cryoVial)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateCryoVialStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('cryo_vials')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getCryoVials(filters?: { bank_id?: string; status?: string }) {
  let query = supabase
    .from('cryo_vials')
    .select(`
      *,
      bank:banks(
        *,
        culture:cultures(
          *,
          culture_type:culture_types(*)
        )
      ),
      position:positions(
        *,
        equipment:equipment(*)
      )
    `)
    .order('vial_number')
  
  if (filters?.bank_id) {
    query = query.eq('bank_id', filters.bank_id)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getCryoVialById(id: string) {
  const { data, error } = await supabase
    .from('cryo_vials')
    .select(`
      *,
      bank:banks(*),
      position:positions(*)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function updateCryoVial(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('cryo_vials')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ==================== REAL-TIME SUBSCRIPTIONS ====================

export function subscribeToOperations(callback: (payload: unknown) => void) {
  return supabase
    .channel('operations-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'operations' },
      callback
    )
    .subscribe()
}

export function subscribeToContainers(callback: (payload: unknown) => void) {
  return supabase
    .channel('containers-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'containers' },
      callback
    )
    .subscribe()
}

export function subscribeToBanks(callback: (payload: unknown) => void) {
  return supabase
    .channel('banks-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'banks' },
      callback
    )
    .subscribe()
}

// ==================== AUDIT LOGS ====================

export async function getAuditLogs(filters?: { 
  action?: string; 
  entity_type?: string; 
  user_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}) {
  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      user:users(id, full_name, email)
    `)
    .order('created_at', { ascending: false })
  
  if (filters?.action) {
    query = query.eq('action', filters.action)
  }
  if (filters?.entity_type) {
    query = query.eq('entity_type', filters.entity_type)
  }
  if (filters?.user_id) {
    query = query.eq('user_id', filters.user_id)
  }
  if (filters?.date_from) {
    query = query.gte('created_at', filters.date_from)
  }
  if (filters?.date_to) {
    query = query.lte('created_at', filters.date_to)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }
  
  const { data, error } = await query
  if (error) {
    console.warn('getAuditLogs error:', error.message)
    return []
  }
  return data || []
}

export async function getAuditLogById(id: string) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      user:users(id, full_name, email)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// ==================== USERS ====================

export async function getUsers(filters?: { role?: string; is_active?: boolean }) {
  let query = supabase
    .from('users')
    .select('*')
    .order('full_name')
  
  if (filters?.role) {
    query = query.eq('role', filters.role)
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function createUser(user: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateUser(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export function subscribeToQCTests(callback: (payload: unknown) => void) {
  return supabase
    .channel('qc-tests-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'qc_tests' },
      callback
    )
    .subscribe()
}

// ==================== NOTIFICATIONS ====================

export async function getNotifications(filters?: { is_read?: boolean; type?: string; user_id?: string; limit?: number }) {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.is_read !== undefined) {
    query = query.eq('is_read', filters.is_read)
  }
  if (filters?.type) {
    query = query.eq('type', filters.type)
  }
  if (filters?.user_id) {
    query = query.eq('user_id', filters.user_id)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getNotificationById(id: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createNotification(notification: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function markNotificationRead(id: string) {
  // В БД нет поля read_at, только is_read
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function markAllNotificationsRead(userId?: string) {
  let query = supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { error } = await query
  if (error) throw error
}

export async function deleteNotification(id: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getUnreadNotificationCount(userId?: string) {
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { count, error } = await query
  if (error) return 0
  return count || 0
}

// ==================== PASSAGE OPERATIONS ====================

export interface PassageSourceData {
  container_id: string
  split_ratio: number // 0-1, какая часть используется для passage
  confluent_percent: number
  viability_percent: number
  concentration: number // клеток/мл
  volume_ml: number
}

export interface PassageResultData {
  container_groups: { container_type_id: string; target_count: number; consumable_batch_id?: string }[]
  position_id: string // позиция для новых контейнеров
}

export interface PassageMediaData {
  dissociation_batch_id?: string
  dissociation_rm_id?: string
  dissociation_volume_ml?: number
  wash_batch_id?: string
  wash_rm_id?: string
  wash_volume_ml?: number
  seed_batch_id?: string
  seed_rm_id?: string
  seed_volume_ml?: number
}

export async function createOperationPassage(data: {
  source_lot_id: string
  source_containers: PassageSourceData[]
  metrics: {
    concentration: number // клеток/мл
    volume_ml: number
    viability_percent: number
  }
  media: PassageMediaData
  result: PassageResultData
  split_mode: 'full' | 'partial' // full = все контейнеры, partial = часть
  notes?: string
}) {
  // 1. Получить исходный лот для определения passage_number
  const { data: sourceLot, error: lotError } = await supabase
    .from('lots')
    .select('*')
    .eq('id', data.source_lot_id)
    .single()
  
  if (lotError) throw lotError
  
  const newPassageNumber = (sourceLot.passage_number || 0) + 1
  
  // 2. Создать Operation
  const { data: operation, error: opError } = await supabase
    .from('operations')
    .insert({
      lot_id: data.source_lot_id,
      type: 'PASSAGE',
      status: 'COMPLETED',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      notes: data.notes
    })
    .select()
    .single()
  
  if (opError) throw opError
  
  // 3. Генерация lot_number с префиксом культуры
  const { data: cultureForLot } = await supabase
    .from('cultures')
    .select('name')
    .eq('id', sourceLot.culture_id)
    .single()
  const culturePrefix = cultureForLot?.name || sourceLot.culture_id.substring(0, 8)

  const { count: lotCount } = await supabase
    .from('lots')
    .select('*', { count: 'exact', head: true })
    .eq('culture_id', sourceLot.culture_id)

  const lotNumber = `${culturePrefix}-L${(lotCount || 0) + 1}`

  // 4. Создать новый лот для результатов
  const totalCells = data.metrics.concentration * data.metrics.volume_ml
  const { data: newLot, error: newLotError } = await supabase
    .from('lots')
    .insert({
      lot_number: lotNumber,
      culture_id: sourceLot.culture_id,
      passage_number: newPassageNumber,
      parent_lot_id: data.split_mode === 'partial' ? data.source_lot_id : null,
      status: 'ACTIVE',
      seeded_at: new Date().toISOString(),
      initial_cells: totalCells,
      viability: data.metrics.viability_percent,
    })
    .select()
    .single()
  
  if (newLotError) throw newLotError
  
  // 4. Записать SOURCE контейнеры в operation_containers
  const sourceOperationContainers = data.source_containers.map(container => ({
    operation_id: operation.id,
    container_id: container.container_id,
    role: 'SOURCE',
    confluent_percent: container.confluent_percent
  }))
  
  const { error: ocError } = await supabase
    .from('operation_containers')
    .insert(sourceOperationContainers)
  
  if (ocError) throw ocError
  
  // 5. Создать новые контейнеры-результаты (по группам типов)
  const cultureName = culturePrefix

  // Считаем существующие контейнеры в этом лоте для уникальной нумерации
  const { count: existingInLot } = await supabase
    .from('containers')
    .select('*', { count: 'exact', head: true })
    .eq('lot_id', newLot.id)

  const resultContainers = []
  let globalIdx = (existingInLot || 0)
  for (const group of data.result.container_groups) {
    for (let i = 0; i < group.target_count; i++) {
      globalIdx++
      // lotNumber уже содержит префикс культуры (CT-0001-L2), используем напрямую
      let containerCode = `${lotNumber}-P${newPassageNumber}-${String(globalIdx).padStart(3, '0')}`

      // Проверяем уникальность кода, при коллизии добавляем суффикс
      const { count: codeExists } = await supabase
        .from('containers')
        .select('*', { count: 'exact', head: true })
        .eq('code', containerCode)

      if ((codeExists || 0) > 0) {
        const suffix = Date.now().toString(36).slice(-4)
        containerCode = `${containerCode}-${suffix}`
      }

      const { data: newContainer, error: containerError } = await supabase
        .from('containers')
        .insert({
          lot_id: newLot.id,
          container_type_id: group.container_type_id,
          position_id: data.result.position_id || null,
          container_status: 'IN_CULTURE',
          passage_number: newPassageNumber,
          confluent_percent: 0, // Новый контейнер, конфлюэнтность 0
          code: containerCode,
          qr_code: `CNT:${containerCode}`
        })
        .select()
        .single()

      if (containerError) throw containerError
      resultContainers.push(newContainer)
    }
  }
  
  // 5b. Списание расходников (контейнеров) со склада
  const passageBatchWriteoffs = new Map<string, number>()
  for (const group of data.result.container_groups) {
    if (group.consumable_batch_id) {
      const prev = passageBatchWriteoffs.get(group.consumable_batch_id) || 0
      passageBatchWriteoffs.set(group.consumable_batch_id, prev + group.target_count)
    }
  }
  for (const [batchId, writeoffQty] of passageBatchWriteoffs) {
    try {
      const { data: batchData } = await supabase
        .from('batches')
        .select('quantity')
        .eq('id', batchId)
        .single()
      const currentQty = batchData?.quantity || 0
      const newQty = Math.max(0, currentQty - writeoffQty)
      await supabase
        .from('batches')
        .update({ quantity: newQty, status: newQty <= 0 ? 'USED' : 'AVAILABLE' })
        .eq('id', batchId)
      await createInventoryMovement({
        batch_id: batchId,
        movement_type: 'CONSUME',
        quantity: -writeoffQty,
        reference_type: 'OPERATION',
        reference_id: operation.id,
        notes: `Контейнеры для пассажа (${writeoffQty} шт.)`,
      })
    } catch (moveErr) {
      console.error('Failed to write off consumables for passage:', moveErr)
    }
  }

  // 6. Записать RESULT контейнеры в operation_containers
  const resultOperationContainers = resultContainers.map(container => ({
    operation_id: operation.id,
    container_id: container.id,
    role: 'RESULT',
    confluent_percent: 0
  }))

  const { error: resultOcError } = await supabase
    .from('operation_containers')
    .insert(resultOperationContainers)

  if (resultOcError) throw resultOcError

  // 7. Обновить SOURCE контейнеры -> USED (пассаж, не утилизация)
  for (const sourceContainer of data.source_containers) {
    const { error: usedError } = await supabase
      .from('containers')
      .update({ container_status: 'USED' })
      .eq('id', sourceContainer.container_id)

    if (usedError) throw usedError
  }
  
  // 8. Создать Operation_Metrics
  const { error: metricsError } = await supabase
    .from('operation_metrics')
    .insert({
      operation_id: operation.id,
      concentration: data.metrics.concentration,
      viability_percent: data.metrics.viability_percent,
      volume_ml: data.metrics.volume_ml,
      passage_yield: data.result.container_groups.reduce((sum, g) => sum + g.target_count, 0)
    })
  
  if (metricsError) throw metricsError
  
  // 9. Создать Operation_Media для сред
  const operationMedia: Record<string, unknown>[] = []

  if (data.media.dissociation_batch_id) {
    operationMedia.push({
      operation_id: operation.id,
      batch_id: data.media.dissociation_batch_id,
      purpose: 'dissociation',
      quantity_ml: data.media.dissociation_volume_ml ?? null,
    })
  }
  if (data.media.dissociation_rm_id) {
    operationMedia.push({
      operation_id: operation.id,
      ready_medium_id: data.media.dissociation_rm_id,
      purpose: 'dissociation',
      quantity_ml: data.media.dissociation_volume_ml ?? null,
    })
  }
  if (data.media.wash_batch_id) {
    operationMedia.push({
      operation_id: operation.id,
      batch_id: data.media.wash_batch_id,
      purpose: 'wash',
      quantity_ml: data.media.wash_volume_ml ?? null,
    })
  }
  if (data.media.wash_rm_id) {
    operationMedia.push({
      operation_id: operation.id,
      ready_medium_id: data.media.wash_rm_id,
      purpose: 'wash',
      quantity_ml: data.media.wash_volume_ml ?? null,
    })
  }
  if (data.media.seed_batch_id) {
    operationMedia.push({
      operation_id: operation.id,
      batch_id: data.media.seed_batch_id,
      purpose: 'seed',
      quantity_ml: data.media.seed_volume_ml ?? null,
    })
  }
  if (data.media.seed_rm_id) {
    operationMedia.push({
      operation_id: operation.id,
      ready_medium_id: data.media.seed_rm_id,
      purpose: 'seed',
      quantity_ml: data.media.seed_volume_ml ?? null,
    })
  }

  if (operationMedia.length > 0) {
    const { error: mediaError } = await supabase
      .from('operation_media')
      .insert(operationMedia)

    if (mediaError) throw mediaError
  }

  // 9b. Списание всех сред/реактивов для пассажа
  // Хелпер для списания готовой среды
  async function writeOffReadyMedium(rmId: string, volumeMl: number, purpose: string) {
    try {
      const { data: rm } = await supabase
        .from('ready_media')
        .select('current_volume_ml, volume_ml')
        .eq('id', rmId)
        .single()
      if (rm) {
        const currentVol = rm.current_volume_ml ?? rm.volume_ml ?? 0
        const newVol = Math.max(0, currentVol - volumeMl)
        await supabase
          .from('ready_media')
          .update({ current_volume_ml: newVol, status: newVol <= 0 ? 'USED' : undefined })
          .eq('id', rmId)
        await createInventoryMovement({
          batch_id: rmId,
          movement_type: 'CONSUME',
          quantity: -volumeMl,
          reference_type: 'OPERATION',
          reference_id: operation.id,
          notes: `Среда для пассажа (${purpose}, ${volumeMl} мл)`,
        })
      }
    } catch (err) {
      console.error(`Failed to write off ready medium (${purpose}):`, err)
    }
  }
  // Хелпер для списания реактивов из партии (пофлаконный учёт)
  async function writeOffBatch(batchId: string, volumeMl: number, purpose: string) {
    try {
      await writeOffBatchVolume(batchId, volumeMl, operation.id, `Реактив для пассажа (${purpose}, ${volumeMl} мл)`)
    } catch (err) {
      console.error(`Failed to write off batch (${purpose}):`, err)
    }
  }

  // Списание диссоциации
  if (data.media.dissociation_rm_id && data.media.dissociation_volume_ml) {
    await writeOffReadyMedium(data.media.dissociation_rm_id, data.media.dissociation_volume_ml, 'диссоциация')
  }
  if (data.media.dissociation_batch_id && data.media.dissociation_volume_ml) {
    await writeOffBatch(data.media.dissociation_batch_id, data.media.dissociation_volume_ml, 'диссоциация')
  }
  // Списание промывки
  if (data.media.wash_rm_id && data.media.wash_volume_ml) {
    await writeOffReadyMedium(data.media.wash_rm_id, data.media.wash_volume_ml, 'промывка')
  }
  if (data.media.wash_batch_id && data.media.wash_volume_ml) {
    await writeOffBatch(data.media.wash_batch_id, data.media.wash_volume_ml, 'промывка')
  }
  // Списание среды для посева
  if (data.media.seed_rm_id && data.media.seed_volume_ml) {
    await writeOffReadyMedium(data.media.seed_rm_id, data.media.seed_volume_ml, 'посев')
  }
  if (data.media.seed_batch_id && data.media.seed_volume_ml) {
    await writeOffBatch(data.media.seed_batch_id, data.media.seed_volume_ml, 'посев')
  }

  // 10. Создать auto-task INSPECT для новых контейнеров
  for (const newContainer of resultContainers) {
    await createAutoTask({
      type: 'OBSERVE',
      target_id: newContainer.id,
      target_type: 'CONTAINER',
      due_days: 1
    })
  }
  
  // 11. Если split_mode === 'partial', создать задачу на следующий пассаж
  if (data.split_mode === 'partial') {
    await createAutoTask({
      type: 'PASSAGE',
      target_id: newLot.id,
      target_type: 'LOT',
      due_days: 3
    })
  }
  
  // 12. Автообновление коэффициента выхода клеток
  try {
    await calculateAndUpdateCoefficient(sourceLot.culture_id)
  } catch (err) {
    console.error('Failed to update coefficient after passage:', err)
  }

  return {
    operation,
    newLot,
    resultContainers
  }
}

// ==================== FEED OPERATIONS ====================

export interface FeedContainerData {
  container_id: string
  medium_id?: string   // ready_medium_id (when rm:id was selected)
  batch_id?: string    // batch_id (when batch:id was selected)
  volume_ml: number
}

// FEFO: Get available media sorted by expiration date (FEFO - First Expired, First Out)
export async function getAvailableMediaForFeed(batchId?: string) {
  let query = supabase
    .from('ready_media')
    .select('*')
    .in('status', ['ACTIVE', 'PREPARED'])
    .order('expiration_date', { ascending: true }) // FEFO: earliest expiration first

  if (batchId) {
    query = query.eq('batch_id', batchId)
  }

  const { data, error } = await query
  if (error) throw error
  // Client-side filter: only media with remaining volume
  return (data || []).filter((m: any) => {
    const vol = m.current_volume_ml ?? m.volume_ml ?? 0
    return vol > 0
  })
}

// ---- Unified media selection by usage_tag ----

/**
 * Parse a combined medium ID like "rm:uuid" or "batch:uuid" into its components.
 * Shared across all operation forms.
 */
export function parseMediumId(combined: string): { type: 'ready_medium' | 'batch'; id: string } | null {
  if (!combined) return null
  const [type, ...rest] = combined.split(':')
  const id = rest.join(':')
  if (type === 'rm') return { type: 'ready_medium', id }
  if (type === 'batch') return { type: 'batch', id }
  return null
}

/**
 * Build combined media options list from ready_media + batches.
 * Returns array with rm:/batch: prefixed IDs for unified selection.
 */
export function buildMediaOptions(
  readyMedia: any[],
  reagentBatches: any[]
): { id: string; label: string; type: 'ready_medium' | 'batch'; category?: string }[] {
  const options: { id: string; label: string; type: 'ready_medium' | 'batch'; category?: string }[] = []

  for (const m of readyMedia) {
    const vol = m.current_volume_ml ?? m.volume_ml ?? '?'
    options.push({
      id: `rm:${m.id}`,
      label: `${m.name || m.code} (${vol} мл) — Готовая среда`,
      type: 'ready_medium',
      category: 'MEDIUM',
    })
  }

  for (const b of reagentBatches) {
    const nom = b.nomenclature
    if (!nom) continue
    let qtyLabel: string
    if (b.volume_per_unit && b.volume_per_unit > 0) {
      const curVol = b.current_unit_volume ?? b.volume_per_unit
      qtyLabel = `${b.quantity} фл × ${b.volume_per_unit} мл, тек: ${curVol} мл`
    } else {
      qtyLabel = `${b.quantity} ${b.unit || 'шт.'}`
    }
    options.push({
      id: `batch:${b.id}`,
      label: `${nom.name || b.batch_number} (${qtyLabel})${b.expiration_date ? ` до ${new Date(b.expiration_date).toLocaleDateString('ru-RU')}` : ''} — Склад`,
      type: 'batch',
      category: nom.category || undefined,
    })
  }

  return options
}

/**
 * Get available media (ready_media + batches) filtered by usage_tag.
 * Fallback: if no results found (tags not configured), returns ALL available media/batches.
 */
export async function getAvailableMediaByUsage(usageTag: string): Promise<{
  readyMedia: any[]
  reagentBatches: any[]
}> {
  // 1. Get ready_media with remaining volume (no FK to batches — query separately if needed)
  const { data: rmData, error: rmErr } = await supabase
    .from('ready_media')
    .select('*')
    .in('status', ['ACTIVE', 'PREPARED'])
    .order('expiration_date', { ascending: true })

  if (rmErr) throw rmErr

  // 2. Get reagent batches
  const { data: batchData, error: batchErr } = await supabase
    .from('batches')
    .select('*, nomenclature:nomenclatures(*)')
    .gt('quantity', 0)
    .in('status', ['AVAILABLE', 'RESERVED'])
    .order('expiration_date', { ascending: true })

  if (batchErr) throw batchErr

  // Filter by volume > 0
  const allRM = (rmData || []).filter((m: any) => {
    const vol = m.current_volume_ml ?? m.volume_ml ?? 0
    return vol > 0
  })

  // Filter batches: exclude CONSUMABLE
  const allBatches = (batchData ?? []).filter((b: any) => {
    const nom = b.nomenclature
    if (!nom) return false
    return nom.category !== 'CONSUMABLE'
  })

  // Filter by usage_tag
  // ready_media doesn't have FK to batches; include all RM for now (they are pre-mixed media)
  // In the future, ready_media could have its own usage_tags column
  const filteredRM = allRM.filter((m: any) => {
    // Ready media are pre-made — always available for SEED/FEED/THAW etc.
    // If composition stores nomenclature data, we could filter by that
    const tags: string[] = m.usage_tags || []
    if (tags.length > 0) return tags.includes(usageTag)
    // No tags = include for any usage (backward compatibility)
    return true
  })

  const filteredBatches = allBatches.filter((b: any) => {
    const tags: string[] = b.nomenclature?.usage_tags || []
    return tags.includes(usageTag)
  })

  // Fallback: if no tagged results, return ALL (backward compatibility)
  if (filteredRM.length === 0 && filteredBatches.length === 0) {
    return { readyMedia: allRM, reagentBatches: allBatches }
  }

  return { readyMedia: filteredRM, reagentBatches: filteredBatches }
}

// Get consumable batches matching a container type name (for write-off during culture creation)
export async function getAllConsumableBatches() {
  const { data, error } = await supabase
    .from('batches')
    .select('*, nomenclature:nomenclatures(*)')
    .gt('quantity', 0)
    .in('status', ['AVAILABLE', 'RESERVED'])
    .order('expiration_date', { ascending: true })

  if (error) throw error

  return (data ?? []).filter((b: any) => {
    const nom = b.nomenclature
    if (!nom) return false
    return nom.category === 'CONSUMABLE'
  })
}

// Получить партии контейнеров со склада с привязкой к container_type_id (через nomenclatures)
export async function getContainerStockByType() {
  const { data, error } = await supabase
    .from('batches')
    .select('*, nomenclature:nomenclatures(*, container_type:container_types(*))')
    .gt('quantity', 0)
    .in('status', ['AVAILABLE', 'RESERVED'])
    .order('expiration_date', { ascending: true })

  if (error) throw error

  // Фильтруем только те, у кого nomenclature.container_type_id не null
  return (data ?? []).filter((b: any) => {
    return b.nomenclature?.container_type_id != null
  })
}

// Получить все партии реагентов/сред/ферментов/буферов для форм операций
export async function getReagentBatches() {
  const { data, error } = await supabase
    .from('batches')
    .select('*, nomenclature:nomenclatures(*)')
    .gt('quantity', 0)
    .in('status', ['AVAILABLE', 'RESERVED'])
    .order('expiration_date', { ascending: true })

  if (error) throw error

  return (data ?? []).filter((b: any) => {
    const nom = b.nomenclature
    if (!nom) return false
    return nom.category !== 'CONSUMABLE' || nom.container_type_id == null
  })
}

export async function getConsumableBatchesForContainerType(containerTypeName: string) {
  const { data, error } = await supabase
    .from('batches')
    .select('*, nomenclature:nomenclatures(*)')
    .gt('quantity', 0)
    .in('status', ['AVAILABLE', 'RESERVED'])
    .order('expiration_date', { ascending: true }) // FEFO

  if (error) throw error

  // Client-side filter: match nomenclature category = CONSUMABLE and name contains the container type
  const filtered = (data ?? []).filter((b: any) => {
    const nom = b.nomenclature
    if (!nom) return false
    if (nom.category !== 'CONSUMABLE') return false
    const nomName = (nom.name || '').toLowerCase()
    const ctName = containerTypeName.toLowerCase()
    return nomName.includes(ctName) || ctName.includes(nomName)
  })

  return filtered
}

export async function createOperationFeed(data: {
  lot_id: string
  containers: FeedContainerData[]
  notes?: string
}) {
  // FEFO Validation: Check if selected media is the earliest available
  for (const container of data.containers) {
    if (container.medium_id) {
      const selectedMedium = await getReadyMediumById(container.medium_id)
      if (selectedMedium) {
        const availableMedia = await getAvailableMediaForFeed(selectedMedium.batch_id)
        if (availableMedia && availableMedia.length > 0) {
          const earliestMedium = availableMedia[0]
          if (earliestMedium.id !== container.medium_id) {
            console.warn(`FEFO Warning: Using ${selectedMedium.code} but ${earliestMedium.code} expires earlier`)
          }
        }
      }
    }
  }
  
  // 1. Создать Operation
  const { data: operation, error: opError } = await supabase
    .from('operations')
    .insert({
      lot_id: data.lot_id,
      type: 'FEEDING',
      status: 'COMPLETED',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      notes: data.notes
    })
    .select()
    .single()
  
  if (opError) throw opError
  
  // 2. Создать operation_containers
  const operationContainers = data.containers.map(container => ({
    operation_id: operation.id,
    container_id: container.container_id,
    role: 'SOURCE'
  }))
  
  const { error: ocError } = await supabase
    .from('operation_containers')
    .insert(operationContainers)
  
  if (ocError) throw ocError
  
  // 3. Создать operation_media
  const operationMedia = data.containers
    .filter(container => container.medium_id || container.batch_id)
    .map(container => ({
      operation_id: operation.id,
      ready_medium_id: container.medium_id || null,
      batch_id: container.batch_id || null,
      quantity_ml: container.volume_ml,
      purpose: 'FEED'
    }))

  if (operationMedia.length > 0) {
    const { error: omError } = await supabase
      .from('operation_media')
      .insert(operationMedia)

    if (omError) throw omError
  }

  // 4. Списание сред: ready_media или batch (пофлаконный учёт)
  for (const container of data.containers) {
    if (container.medium_id) {
      // Ready medium: update current_volume_ml
      const medium = await getReadyMediumById(container.medium_id)
      if (medium) {
        const currentVolume = medium.current_volume_ml || medium.volume_ml || 0
        const newVolume = currentVolume - container.volume_ml

        await supabase
          .from('ready_media')
          .update({ current_volume_ml: Math.max(0, newVolume), ...(newVolume <= 0 ? { status: 'USED' } : {}) })
          .eq('id', container.medium_id)

        await createInventoryMovement({
          batch_id: medium.batch_id || null,
          movement_type: 'CONSUME',
          quantity: -container.volume_ml,
          reference_type: 'OPERATION',
          reference_id: operation.id,
          notes: `Среда для подкормки (${container.volume_ml} мл)`,
        })
      }
    } else if (container.batch_id) {
      // Batch: пофлаконный учёт через writeOffBatchVolume
      try {
        await writeOffBatchVolume(
          container.batch_id,
          container.volume_ml,
          operation.id,
          `Среда для подкормки (${container.volume_ml} мл)`
        )
      } catch (err) {
        console.error('Failed to write off feed batch:', err)
      }
    }
  }
  
  // 6. Создать auto-task FEED на следующую смену (через 2-3 дня)
  const lot = await getLotById(data.lot_id)
  if (lot?.culture_id) {
    const culture = await getCultureById(lot.culture_id)
    const intervalDays = culture?.culture_type?.passage_interval_days || 3
    
    await createFeedTask(
      data.lot_id,
      'feed',
      intervalDays
    )
  }
  
  return operation
}

// ==================== AUTO TASKS ====================

export interface AutoTaskData {
  type: 'PASSAGE' | 'FEED' | 'OBSERVE' | 'QC' | 'BANK_CHECK' | 'MEDIA_PREP'
  target_id: string // container_id, lot_id, or bank_id
  target_type: 'CONTAINER' | 'LOT' | 'BANK' | 'CULTURE' | 'EQUIPMENT'
  due_days: number // days from now
  interval_days?: number
}

// Create automatic task after operation completion
export async function createAutoTask(data: AutoTaskData) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + data.due_days)

  // Map task types to DB enum values
  const taskTypeMap: Record<string, string> = {
    PASSAGE: 'INSPECT',    // осмотр после пассажа
    FEED: 'FEED',
    OBSERVE: 'INSPECT',    // наблюдение = осмотр
    QC: 'QC_DUE',
    BANK_CHECK: 'INSPECT', // проверка банка = осмотр
    MEDIA_PREP: 'MAINTENANCE'
  }

  // Auto-generate title based on type
  const titleMap: Record<string, string> = {
    PASSAGE: 'Осмотр после пассажа',
    FEED: 'Подкормка',
    OBSERVE: 'Осмотр',
    QC: 'Контроль качества',
    BANK_CHECK: 'Проверка банка',
    MEDIA_PREP: 'Подготовка среды'
  }

  const taskData = {
    type: taskTypeMap[data.type] || data.type,
    title: titleMap[data.type] || data.type,
    target_type: data.target_type,
    target_id: data.target_id,
    status: 'PENDING',
    due_date: dueDate.toISOString().split('T')[0],
    interval_days: data.interval_days || data.due_days
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single()

  if (error) throw error
  return task
}

// Create follow-up task after passage operation (e.g., for next passage)
export async function createPassageFollowUpTask(lotId: string, containerId: string, daysUntilNext: number = 3) {
  return createAutoTask({
    type: 'PASSAGE',
    target_id: containerId,
    target_type: 'CONTAINER',
    due_days: daysUntilNext
  })
}

// Create observation task for containers reaching target confluence
export async function createObserveTask(containerId: string, targetConfluence: number = 80) {
  return createAutoTask({
    type: 'OBSERVE',
    target_id: containerId,
    target_type: 'CONTAINER',
    due_days: 0
  })
}

// Create QC task after freeze operation
export async function createQCTask(bankId: string) {
  return createAutoTask({
    type: 'QC',
    target_id: bankId,
    target_type: 'BANK',
    due_days: 1
  })
}

// Auto-create standard QC tests for a new bank
export async function createAutoQCTests(bankId: string) {
  const testTypes = ['MYCOPLASMA', 'STERILITY', 'LAL', 'VIA'] as const
  const tests = testTypes.map(test_type => ({
    test_type,
    target_type: 'BANK',
    target_id: bankId,
    status: 'PENDING',
  }))

  const { data, error } = await supabase
    .from('qc_tests')
    .insert(tests)
    .select()

  if (error) throw error
  return data
}

// Create feed task based on media type and schedule
export async function createFeedTask(lotId: string, mediaType: string, scheduleDays: number = 2) {
  return createAutoTask({
    type: 'FEED',
    target_id: lotId,
    target_type: 'LOT',
    due_days: scheduleDays
  })
}

// ==================== FREEZE OPERATIONS ====================

export interface FreezeData {
  lot_id: string
  container_ids: string[]
  bank_id?: string // если не передан - создать новый
  cryo_vial_count: number
  freezer_position_id: string
  cells_per_vial: number
  total_cells: number
  freezing_medium?: string
  freezing_medium_rm_id?: string     // ID готовой среды для заморозки
  freezing_medium_batch_id?: string  // ID партии для заморозки (со склада)
  freezing_medium_volume_ml?: number // Объём среды для заморозки
  // Среда диссоциации (фермент для снятия клеток)
  dissociation_medium_id?: string    // ready_medium_id
  dissociation_batch_id?: string     // batch_id (со склада)
  dissociation_volume_ml?: number
  // Среда промывки (буфер)
  wash_medium_id?: string            // ready_medium_id
  wash_batch_id?: string             // batch_id (со склада)
  wash_volume_ml?: number
  cryo_batch_id?: string             // Партия криовиалов со склада
  viability_percent: number
  concentration: number
  volume_ml?: number                 // Общий объём суспензии (мл)
  notes?: string
}

export async function createOperationFreeze(data: FreezeData) {
  // 1. Получить лот и культуру для определения MCB/WCB
  const { data: lot, error: lotError } = await supabase
    .from('lots')
    .select('*, culture:cultures(*)')
    .eq('id', data.lot_id)
    .single()
  
  if (lotError) throw lotError
  
  // 2. Автоопределение MCB/WCB: проверить есть ли уже банки у этой культуры
  const { data: existingBanks } = await supabase
    .from('banks')
    .select('id')
    .eq('culture_id', lot.culture_id)
  
  const bankType = (existingBanks && existingBanks.length > 0) ? 'WCB' : 'MCB'
  
  // 3. Создать новый банк если bank_id не передан
  let bankId = data.bank_id
  if (!bankId) {
    // Генерация кода банка BK-XXXX
    const { count: bankCount } = await supabase
      .from('banks')
      .select('*', { count: 'exact', head: true })
    const bankCode = `BK-${String((bankCount || 0) + 1).padStart(4, '0')}`

    const { data: newBank, error: bankError } = await supabase
      .from('banks')
      .insert({
        code: bankCode,
        culture_id: lot.culture_id,
        lot_id: data.lot_id,
        bank_type: bankType,
        status: 'QUARANTINE', // Ожидает QC
        cryo_vials_count: data.cryo_vial_count,
        cells_per_vial: data.cells_per_vial,
        total_cells: data.total_cells,
        position_id: data.freezer_position_id,
        qc_passed: false,
        freezing_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()
    
    if (bankError) throw bankError
    bankId = newBank.id
  } else {
    // Обновить существующий банк
    const { data: existingBank } = await supabase
      .from('banks')
      .select('cryo_vials_count, total_cells')
      .eq('id', bankId)
      .single()
    
    await supabase
      .from('banks')
      .update({
        cryo_vials_count: (existingBank?.cryo_vials_count || 0) + data.cryo_vial_count,
        total_cells: (existingBank?.total_cells || 0) + data.total_cells,
        status: 'QUARANTINE' // Ожидает QC
      })
      .eq('id', bankId)
  }
  
  // 4. Создать Operation
  const { data: operation, error: opError } = await supabase
    .from('operations')
    .insert({
      lot_id: data.lot_id,
      type: 'FREEZE',
      status: 'COMPLETED',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      notes: `${data.notes || ''} | Bank type: ${bankType}`
    })
    .select()
    .single()
  
  if (opError) throw opError
  
  // 5. Создать криовиалы
  const cryoVials = []
  const { count: baseVialCount } = await supabase
    .from('cryo_vials')
    .select('*', { count: 'exact', head: true })
    .eq('bank_id', bankId)
  
  for (let i = 0; i < data.cryo_vial_count; i++) {
    const vialNum = (baseVialCount || 0) + i + 1
    const cultureCode = lot.culture?.name || 'UNK'
    const vialCode = `CV-${cultureCode}-${bankType}-V${String(vialNum).padStart(3, '0')}`
    
    const { data: vial, error: vialError } = await supabase
      .from('cryo_vials')
      .insert({
        bank_id: bankId,
        lot_id: data.lot_id,
        code: vialCode,
        vial_number: String(vialNum),
        cells_count: data.cells_per_vial,
        freezing_date: new Date().toISOString().split('T')[0],
        position_id: data.freezer_position_id,
        status: 'IN_STOCK',
        qr_code: `CV:${vialCode}`
      })
      .select()
      .single()
    
    if (vialError) throw vialError
    cryoVials.push(vial)
  }
  
  // 6. Записать SOURCE контейнеры в operation_containers
  const operationContainers = data.container_ids.map(containerId => ({
    operation_id: operation.id,
    container_id: containerId,
    role: 'SOURCE'
  }))
  
  const { error: ocError } = await supabase
    .from('operation_containers')
    .insert(operationContainers)
  
  if (ocError) throw ocError
  
  // 7. Обновить контейнеры-источники -> IN_BANK
  for (const containerId of data.container_ids) {
    await supabase
      .from('containers')
      .update({ container_status: 'IN_BANK' })
      .eq('id', containerId)
  }

  // 7.5. Обновить лот: final_cells, viability, harvest_at (заморозка = harvest)
  await supabase
    .from('lots')
    .update({
      final_cells: data.total_cells,
      viability: data.viability_percent,
      harvest_at: new Date().toISOString(),
    })
    .eq('id', data.lot_id)

  // 8. Создать Operation_Metrics
  await supabase
    .from('operation_metrics')
    .insert({
      operation_id: operation.id,
      concentration: data.concentration,
      viability_percent: data.viability_percent,
      total_cells: data.total_cells,
      volume_ml: data.volume_ml || null
    })
  
  // 9. Создать QC-задачу и авто-тесты
  if (bankId) {
    await createQCTask(bankId)
    try {
      await createAutoQCTests(bankId)
    } catch (e) {
      console.error('Failed to auto-create QC tests:', e)
    }
  }
  
  // 10. Списание сред (пофлаконный учёт)
  // Хелпер для списания готовой среды при заморозке
  async function writeOffFreezeRM(rmId: string, volumeMl: number, purpose: string) {
    try {
      const { data: rm } = await supabase
        .from('ready_media')
        .select('current_volume_ml, volume_ml, batch_id')
        .eq('id', rmId)
        .single()
      if (rm) {
        const currentVol = rm.current_volume_ml ?? rm.volume_ml ?? 0
        const newVol = Math.max(0, currentVol - volumeMl)
        await supabase
          .from('ready_media')
          .update({ current_volume_ml: newVol, ...(newVol <= 0 ? { status: 'USED' } : {}) })
          .eq('id', rmId)
        if (rm.batch_id) {
          await writeOffBatchVolume(rm.batch_id, volumeMl, operation.id, `Среда для заморозки (${purpose}, ${volumeMl} мл)`)
        } else {
          await createInventoryMovement({
            batch_id: rmId,
            movement_type: 'CONSUME',
            quantity: -volumeMl,
            reference_type: 'OPERATION',
            reference_id: operation.id,
            notes: `Среда для заморозки (${purpose}, ${volumeMl} мл)`,
          })
        }
        await supabase.from('operation_media').insert({
          operation_id: operation.id,
          ready_medium_id: rmId,
          quantity_ml: volumeMl,
          purpose: purpose.toUpperCase(),
        })
      }
    } catch (err) {
      console.error(`Failed to write off freeze medium (${purpose}):`, err)
    }
  }

  // Хелпер для списания партии со склада при заморозке
  async function writeOffFreezeBatch(batchId: string, volumeMl: number, purpose: string) {
    try {
      await writeOffBatchVolume(batchId, volumeMl, operation.id, `Реактив для заморозки (${purpose}, ${volumeMl} мл)`)
      await supabase.from('operation_media').insert({
        operation_id: operation.id,
        batch_id: batchId,
        quantity_ml: volumeMl,
        purpose: purpose.toUpperCase(),
      })
    } catch (err) {
      console.error(`Failed to write off freeze batch (${purpose}):`, err)
    }
  }

  // 10a. Среда заморозки
  const freezeRmId = data.freezing_medium_rm_id || data.freezing_medium
  const freezeVolume = data.freezing_medium_volume_ml
  if (freezeRmId && freezeVolume && freezeVolume > 0) {
    await writeOffFreezeRM(freezeRmId, freezeVolume, 'заморозка')
  } else if (data.freezing_medium_batch_id && freezeVolume && freezeVolume > 0) {
    await writeOffFreezeBatch(data.freezing_medium_batch_id, freezeVolume, 'заморозка')
  }

  // 10b. Среда диссоциации
  if (data.dissociation_medium_id && data.dissociation_volume_ml && data.dissociation_volume_ml > 0) {
    await writeOffFreezeRM(data.dissociation_medium_id, data.dissociation_volume_ml, 'диссоциация')
  } else if (data.dissociation_batch_id && data.dissociation_volume_ml && data.dissociation_volume_ml > 0) {
    await writeOffFreezeBatch(data.dissociation_batch_id, data.dissociation_volume_ml, 'диссоциация')
  }

  // 10c. Среда промывки
  if (data.wash_medium_id && data.wash_volume_ml && data.wash_volume_ml > 0) {
    await writeOffFreezeRM(data.wash_medium_id, data.wash_volume_ml, 'промывка')
  } else if (data.wash_batch_id && data.wash_volume_ml && data.wash_volume_ml > 0) {
    await writeOffFreezeBatch(data.wash_batch_id, data.wash_volume_ml, 'промывка')
  }

  // 11. Списание криовиалов со склада
  if (data.cryo_batch_id) {
    try {
      const { data: batchData } = await supabase
        .from('batches')
        .select('quantity')
        .eq('id', data.cryo_batch_id)
        .single()
      if (batchData) {
        const newQty = Math.max(0, (batchData.quantity || 0) - data.cryo_vial_count)
        await supabase
          .from('batches')
          .update({ quantity: newQty, status: newQty <= 0 ? 'USED' : 'AVAILABLE' })
          .eq('id', data.cryo_batch_id)
        await createInventoryMovement({
          batch_id: data.cryo_batch_id,
          movement_type: 'CONSUME',
          quantity: -data.cryo_vial_count,
          reference_type: 'OPERATION',
          reference_id: operation.id,
          notes: `Криовиалы для заморозки (${data.cryo_vial_count} шт.)`,
        })
      }
    } catch (err) {
      console.error('Failed to write off cryo vials:', err)
    }
  }

  // 12. Создать уведомление о необходимости QC
  if (bankId) {
    await createNotification({
      type: 'QC_READY',
      title: 'Требуется QC для банка',
      message: `Банк ${bankType} создан и ожидает контроль качества`,
      link_type: 'BANK',
      link_id: bankId,
      is_read: false
    })
  }

  return {
    operation,
    cryoVials,
    bankId,
    bankType
  }
}

// ==================== THAW OPERATIONS ====================

export interface ThawData {
  cryo_vial_id: string
  lot_name?: string // имя нового лота
  container_type_id: string
  position_id: string
  thaw_medium_id?: string           // Ready medium (rm:uuid → id)
  thaw_batch_id?: string            // Batch from warehouse (batch:uuid → id)
  thaw_medium_volume_ml?: number    // Объём среды для разморозки
  consumable_batch_id?: string      // Партия контейнера со склада
  viability_percent?: number
  notes?: string
}

export async function createOperationThaw(data: ThawData) {
  // 1. Получить криовиал и связанный банк
  const { data: cryoVial, error: vialError } = await supabase
    .from('cryo_vials')
    .select('*, bank:banks(*), lot:lots(*)')
    .eq('id', data.cryo_vial_id)
    .single()
  
  if (vialError) throw vialError
  
  // Валидация: банк должен быть APPROVED, криовиал IN_STOCK
  if (cryoVial.bank?.status !== 'APPROVED') {
    throw new Error('Банк должен быть APPROVED для разморозки')
  }
  if (cryoVial.status !== 'IN_STOCK') {
    throw new Error('Криовиал должен быть IN_STOCK для разморозки')
  }
  
  // 2. Получить родительский лот для passage_number
  const { data: parentLot, error: lotError } = await supabase
    .from('lots')
    .select('*')
    .eq('id', cryoVial.lot_id)
    .single()
  
  if (lotError) throw lotError
  
  const newPassageNumber = (parentLot?.passage_number || 0) + 1
  
  // 3. Генерация lot_number для нового лота (с префиксом культуры)
  const { data: cultureForThaw } = await supabase
    .from('cultures')
    .select('name')
    .eq('id', parentLot.culture_id)
    .single()
  const thawCultureName = cultureForThaw?.name || parentLot.culture_id?.substring(0, 8) || 'UNK'

  const { count: thawLotCount } = await supabase
    .from('lots')
    .select('*', { count: 'exact', head: true })
    .eq('culture_id', parentLot.culture_id)

  const thawLotNumber = `${thawCultureName}-L${(thawLotCount || 0) + 1}`

  // 4. Создать новый лот (initial_cells = клетки из криовиала)
  const { data: newLot, error: newLotError } = await supabase
    .from('lots')
    .insert({
      lot_number: thawLotNumber,
      culture_id: parentLot.culture_id,
      passage_number: newPassageNumber,
      parent_lot_id: parentLot.id,
      status: 'ACTIVE',
      seeded_at: new Date().toISOString(),
      initial_cells: cryoVial.cells_count || null,
      viability: data.viability_percent || null,
      notes: `Thaw from bank ${cryoVial.bank?.bank_type}`
    })
    .select()
    .single()

  if (newLotError) throw newLotError

  // 5. Создать Container для размороженной культуры
  // lot_number уже содержит префикс культуры (CT-0001-L3), поэтому используем его напрямую
  const containerCode = `${thawLotNumber}-P${newPassageNumber}-001`

  const { data: newContainer, error: containerError } = await supabase
    .from('containers')
    .insert({
      lot_id: newLot.id,
      container_type_id: data.container_type_id,
      position_id: data.position_id,
      container_status: 'IN_CULTURE',
      passage_number: newPassageNumber,
      confluent_percent: 0,
      code: containerCode,
      qr_code: `CNT:${containerCode}`
    })
    .select()
    .single()

  if (containerError) throw containerError

  // 5. Создать Operation THAW
  const { data: operation, error: opError } = await supabase
    .from('operations')
    .insert({
      lot_id: newLot.id,
      type: 'THAW',
      status: 'COMPLETED',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      notes: data.notes
    })
    .select()
    .single()
  
  if (opError) throw opError
  
  // 6. Записать cryo_vial как SOURCE в operation_containers
  await supabase
    .from('operation_containers')
    .insert({
      operation_id: operation.id,
      container_id: cryoVial.id, // Это cryo_vial, но связываем через таблицу
      role: 'SOURCE'
    })
  
  // 7. Записать новый контейнер как RESULT
  await supabase
    .from('operation_containers')
    .insert({
      operation_id: operation.id,
      container_id: newContainer.id,
      role: 'RESULT',
      confluent_percent: 0
    })
  
  // 7.5. Создать operation_metrics для THAW
  await supabase
    .from('operation_metrics')
    .insert({
      operation_id: operation.id,
      total_cells: cryoVial.cells_count || null,
      viability_percent: data.viability_percent || null,
    })

  // 8. Обновить крио_vial: status=THAWED, thaw_date=today
  await supabase
    .from('cryo_vials')
    .update({ 
      status: 'THAWED',
      thaw_date: new Date().toISOString().split('T')[0]
    })
    .eq('id', data.cryo_vial_id)
  
  // 9. Создать Operation_Media для среды разморозки
  if (data.thaw_medium_id || data.thaw_batch_id) {
    await supabase
      .from('operation_media')
      .insert({
        operation_id: operation.id,
        ready_medium_id: data.thaw_medium_id || null,
        batch_id: data.thaw_batch_id || null,
        purpose: 'thaw',
        quantity_ml: data.thaw_medium_volume_ml ?? null,
      })
  }

  // 9b. Списание среды для разморозки (ready_medium ИЛИ batch)
  const thawVolume = data.thaw_medium_volume_ml ?? 0
  if (data.thaw_medium_id && thawVolume > 0) {
    try {
      const { data: rm } = await supabase
        .from('ready_media')
        .select('current_volume_ml, volume_ml, batch_id')
        .eq('id', data.thaw_medium_id)
        .single()
      if (rm) {
        const currentVol = rm.current_volume_ml ?? rm.volume_ml ?? 0
        const newVol = Math.max(0, currentVol - thawVolume)
        await supabase
          .from('ready_media')
          .update({ current_volume_ml: newVol, ...(newVol <= 0 ? { status: 'USED' } : {}) })
          .eq('id', data.thaw_medium_id)
        if (rm.batch_id) {
          await writeOffBatchVolume(rm.batch_id, thawVolume, operation.id, `Среда для разморозки (${thawVolume} мл)`)
        } else {
          await createInventoryMovement({
            batch_id: data.thaw_medium_id,
            movement_type: 'CONSUME',
            quantity: -thawVolume,
            reference_type: 'OPERATION',
            reference_id: operation.id,
            notes: `Среда для разморозки (${thawVolume} мл)`,
          })
        }
      }
    } catch (err) {
      console.error('Failed to write off thaw medium (ready_media):', err)
    }
  } else if (data.thaw_batch_id && thawVolume > 0) {
    try {
      await writeOffBatchVolume(data.thaw_batch_id, thawVolume, operation.id, `Среда для разморозки (${thawVolume} мл)`)
    } catch (err) {
      console.error('Failed to write off thaw medium (batch):', err)
    }
  }

  // 9c. Списание контейнера со склада
  if (data.consumable_batch_id) {
    try {
      const { data: batchData } = await supabase
        .from('batches')
        .select('quantity')
        .eq('id', data.consumable_batch_id)
        .single()
      if (batchData) {
        const newQty = Math.max(0, (batchData.quantity || 0) - 1)
        await supabase
          .from('batches')
          .update({ quantity: newQty, status: newQty <= 0 ? 'USED' : 'AVAILABLE' })
          .eq('id', data.consumable_batch_id)
        await createInventoryMovement({
          batch_id: data.consumable_batch_id,
          movement_type: 'CONSUME',
          quantity: -1,
          reference_type: 'OPERATION',
          reference_id: operation.id,
          notes: 'Контейнер для разморозки (1 шт.)',
        })
      }
    } catch (err) {
      console.error('Failed to write off container for thaw:', err)
    }
  }

  // 10. Проверить банк: если все криовиалы THAWED -> status=EXPIRED
  const { data: allVials } = await supabase
    .from('cryo_vials')
    .select('status')
    .eq('bank_id', cryoVial.bank_id)
  
  if (allVials) {
    const allThawed = allVials.every((v: { status: string }) => v.status === 'THAWED')
    if (allThawed) {
      await supabase
        .from('banks')
        .update({ status: 'EXPIRED' })
        .eq('id', cryoVial.bank_id)
    }
  }
  
  // 11. Создать auto-task INSPECT на 24 часа
  await createAutoTask({
    type: 'OBSERVE',
    target_id: newContainer.id,
    target_type: 'CONTAINER',
    due_days: 1 // 24 часа
  })
  
  // 12. Создать auto-task FEED на 2-3 дня
  await createFeedTask(newLot.id, 'feed', 2)
  
  return {
    operation,
    newLot,
    newContainer
  }
}

// ==================== BUSINESS LOGIC ====================

// Каскад REJECTED: при отклонении донации блокируем связанные банки
export async function cascadeRejectedDonation(donationId: string) {
  // 1. Получить все культуры из этой донации
  const { data: cultures } = await supabase
    .from('cultures')
    .select('id')
    .eq('donation_id', donationId)

  if (!cultures || cultures.length === 0) return

  for (const culture of cultures) {
    // 2. Получить банки этой культуры со статусом QUARANTINE
    const { data: banks } = await supabase
      .from('banks')
      .select('id')
      .eq('culture_id', culture.id)
      .eq('status', 'QUARANTINE')

    if (banks) {
      for (const bank of banks) {
        // 3. Перевести банки в DISPOSE
        await supabase
          .from('banks')
          .update({ status: 'DISPOSE' })
          .eq('id', bank.id)

        // 4. Перевести все криовиалы банка в DISPOSED
        await supabase
          .from('cryo_vials')
          .update({ status: 'DISPOSED' })
          .eq('bank_id', bank.id)
      }
    }

    // 5. Создать уведомление
    await createNotification({
      type: 'CONTAMINATION',
      title: 'Донация отклонена',
      message: `Донация отклонена. Банки культуры заблокированы.`,
      link_type: 'CULTURE',
      link_id: culture.id,
      is_read: false
    })
  }
}

// Каскад APPROVED: при одобрении донации разблокируем банки QUARANTINE → QC_PENDING
export async function cascadeApprovedDonation(donationId: string) {
  const { data: cultures } = await supabase
    .from('cultures')
    .select('id')
    .eq('donation_id', donationId)

  if (!cultures || cultures.length === 0) return

  for (const culture of cultures) {
    const { data: banks } = await supabase
      .from('banks')
      .select('id')
      .eq('culture_id', culture.id)
      .eq('status', 'QUARANTINE')

    if (banks) {
      for (const bank of banks) {
        await supabase
          .from('banks')
          .update({ status: 'QC_PENDING' })
          .eq('id', bank.id)

        // Создать QC задачу
        await createQCTask(bank.id)
      }
    }
  }
}

// Обновление статуса донации с каскадом
export async function updateDonationStatusWithCascade(id: string, status: 'APPROVED' | 'REJECTED') {
  // 1. Обновить статус донации
  const { data, error } = await supabase
    .from('donations')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // 2. Каскад
  if (status === 'REJECTED') {
    await cascadeRejectedDonation(id)
  } else if (status === 'APPROVED') {
    await cascadeApprovedDonation(id)
  }

  return data
}

// Проверка и авто-закрытие лота (когда все контейнеры утилизированы/заморожены)
export async function checkAndCloseLot(lotId: string) {
  const { data: containers } = await supabase
    .from('containers')
    .select('id, status')
    .eq('lot_id', lotId)

  if (!containers || containers.length === 0) return

  const allDisposed = containers.every((c: { status: string }) =>
    c.status === 'DISPOSE' || c.status === 'IN_BANK' || c.status === 'ISSUED'
  )

  if (allDisposed) {
    await supabase
      .from('lots')
      .update({ status: 'CLOSED', harvest_at: new Date().toISOString() })
      .eq('id', lotId)
  }
}

// Проверка донации: можно ли замораживать/выдавать (не QUARANTINE)
export function canFreezeOrIssue(donationStatus: string): boolean {
  return donationStatus === 'APPROVED'
}

// Проверка донации: можно ли культивировать (не REJECTED)
export function canCultivate(donationStatus: string): boolean {
  return donationStatus !== 'REJECTED'
}

// Получить FEFO-оптимальную партию по номенклатуре
export async function getFefoBatch(nomenclatureId: string) {
  const { data, error } = await supabase
    .from('batches')
    .select('*, nomenclature:nomenclatures(*)')
    .eq('nomenclature_id', nomenclatureId)
    .eq('status', 'ACTIVE')
    .gt('quantity', 0)
    .gt('expiration_date', new Date().toISOString().split('T')[0])
    .order('expiration_date', { ascending: true })
    .limit(1)
    .single()

  if (error) return null
  return data
}

// Проверка оборудования: нужна ли валидация
export async function checkEquipmentValidation(equipmentId: string): Promise<{needsValidation: boolean; urgency: 'ok' | 'soon' | 'urgent' | 'overdue'}> {
  const { data: equipment } = await supabase
    .from('equipment')
    .select('next_validation, next_maintenance')
    .eq('id', equipmentId)
    .single()

  if (!equipment) return { needsValidation: false, urgency: 'ok' }

  const today = new Date()
  const oneMonth = new Date(today)
  oneMonth.setMonth(oneMonth.getMonth() + 1)
  const oneWeek = new Date(today)
  oneWeek.setDate(oneWeek.getDate() + 7)

  if (equipment.next_validation) {
    const validationDate = new Date(equipment.next_validation)
    if (validationDate < today) return { needsValidation: true, urgency: 'overdue' }
    if (validationDate < oneWeek) return { needsValidation: true, urgency: 'urgent' }
    if (validationDate < oneMonth) return { needsValidation: true, urgency: 'soon' }
  }

  return { needsValidation: false, urgency: 'ok' }
}

// ==================== REFERENCE TABLES CRUD ====================

// --- Container Types ---
export async function createContainerType(data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from('container_types').insert(data).select().single()
  if (error) throw error
  return result
}

export async function updateContainerType(id: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from('container_types').update(data).eq('id', id).select().single()
  if (error) throw error
  return result
}

// --- Culture Types ---
export async function createCultureType(data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from('culture_types').insert(data).select().single()
  if (error) throw error
  return result
}

export async function updateCultureType(id: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from('culture_types').update(data).eq('id', id).select().single()
  if (error) throw error
  return result
}

// --- Tissue Types ---
export async function createTissueType(data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from('tissue_types').insert(data).select().single()
  if (error) throw error
  return result
}

export async function updateTissueType(id: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from('tissue_types').update(data).eq('id', id).select().single()
  if (error) throw error
  return result
}

// --- Morphology Types ---
export async function createMorphologyType(data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from('morphology_types').insert(data).select().single()
  if (error) throw error
  return result
}

export async function updateMorphologyType(id: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from('morphology_types').update(data).eq('id', id).select().single()
  if (error) throw error
  return result
}

// --- Dispose Reasons ---
export async function createDisposeReason(data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from('dispose_reasons').insert(data).select().single()
  if (error) throw error
  return result
}

export async function updateDisposeReason(id: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from('dispose_reasons').update(data).eq('id', id).select().single()
  if (error) throw error
  return result
}

// --- Nomenclatures ---
export async function createNomenclature(data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from('nomenclatures').insert(data).select().single()
  if (error) throw error
  return result
}

export async function updateNomenclature(id: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from('nomenclatures').update(data).eq('id', id).select().single()
  if (error) throw error
  return result
}

export async function deleteNomenclature(id: string) {
  const { error } = await supabase.from('nomenclatures').delete().eq('id', id)
  if (error) throw error
}

export async function deleteContainerType(id: string) {
  const { error } = await supabase.from('container_types').delete().eq('id', id)
  if (error) throw error
}

export async function deleteCultureType(id: string) {
  const { error } = await supabase.from('culture_types').delete().eq('id', id)
  if (error) throw error
}

export async function deleteTissueType(id: string) {
  const { error } = await supabase.from('tissue_types').delete().eq('id', id)
  if (error) throw error
}

export async function deleteMorphologyType(id: string) {
  const { error } = await supabase.from('morphology_types').delete().eq('id', id)
  if (error) throw error
}

export async function deleteDisposeReason(id: string) {
  const { error } = await supabase.from('dispose_reasons').delete().eq('id', id)
  if (error) throw error
}

export async function getAllNomenclatures() {
  const { data, error } = await supabase
    .from('nomenclatures')
    .select('*, container_type:container_types(*)')
    .order('name')

  if (error) throw error
  return data ?? []
}
