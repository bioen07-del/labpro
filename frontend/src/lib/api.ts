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
      lots:lots(*)
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

// Создание культуры из донации с автоматическим P0 лотом и контейнерами
export async function createCultureFromDonation(data: {
  donation_id: string
  culture_type_id: string
  extraction_method: string
  container_type_id: string
  container_count: number
  position_id?: string
  notes?: string
  // Списание среды
  ready_medium_id?: string
  medium_volume_ml?: number
  // Списание контейнеров со склада
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
  const { data: culture, error: cultError } = await supabase
    .from('cultures')
    .insert({
      name: cultureCode,
      type_id: data.culture_type_id,
      donor_id: donation.donor_id,
      donation_id: data.donation_id,
      tissue_id: donation.tissue_type_id,
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

  // 5. Создать контейнеры
  const containers = []
  for (let i = 0; i < data.container_count; i++) {
    const containerCode = `${cultureCode}-L1-P0-${String(i + 1).padStart(3, '0')}`

    const { data: container, error: contError } = await supabase
      .from('containers')
      .insert({
        code: containerCode,
        lot_id: lot.id,
        container_type_id: data.container_type_id,
        position_id: data.position_id || null,
        status: 'IN_CULTURE',
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

  // 7b. Списание среды (если указана)
  if (data.ready_medium_id && data.medium_volume_ml && data.medium_volume_ml > 0) {
    // Записать operation_media
    await supabase.from('operation_media').insert({
      operation_id: seedOp.id,
      ready_medium_id: data.ready_medium_id,
      quantity_ml: data.medium_volume_ml,
      purpose: 'SEED',
    })

    // Уменьшить current_volume_ml
    const medium = await getReadyMediumById(data.ready_medium_id)
    if (medium) {
      const currentVol = medium.current_volume_ml ?? medium.volume_ml ?? 0
      const newVol = Math.max(0, currentVol - data.medium_volume_ml)

      await supabase
        .from('ready_media')
        .update({ current_volume_ml: newVol })
        .eq('id', data.ready_medium_id)

      // inventory_movement
      await createInventoryMovement({
        batch_id: medium.batch_id || null,
        movement_type: 'CONSUME',
        quantity_change: -data.medium_volume_ml,
        quantity_after: newVol,
        moved_at: now,
        notes: `Среда для посева ${cultureCode}`,
      })
    }
  }

  // 7c. Списание контейнеров со склада (если указано)
  if (data.consumable_batch_id && data.container_count > 0) {
    const { data: batch } = await supabase
      .from('batches')
      .select('*')
      .eq('id', data.consumable_batch_id)
      .single()

    if (batch) {
      const newQty = Math.max(0, (batch.quantity || 0) - data.container_count)

      await supabase
        .from('batches')
        .update({ quantity: newQty })
        .eq('id', data.consumable_batch_id)

      // inventory_movement
      await createInventoryMovement({
        batch_id: data.consumable_batch_id,
        movement_type: 'CONSUME',
        quantity_change: -data.container_count,
        quantity_after: newQty,
        moved_at: now,
        notes: `Контейнеры для посева ${cultureCode} (${data.container_count} шт.)`,
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
      culture:cultures(*),
      containers:containers!lot_id(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// ==================== BANKS ====================

export async function getBanks(filters?: { status?: string; type?: string; culture_id?: string }) {
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
      lot:lots(*),
      cryo_vials:cryo_vials(*),
      qc_tests:qc_tests(*)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
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
    query = query.eq('status', filters.container_status || filters.status)
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
      )
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
    const { error: updateError } = await supabase
      .from('containers')
      .update({
        confluent_percent: container.confluent_percent,
        morphology: container.morphology,
        contaminated: container.contaminated
      })
      .eq('id', container.container_id)
    
    if (updateError) throw updateError
  }
  
  return operation
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
  
  let updateField = 'status'
  
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
      .neq('status', 'DISPOSE')
    
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

// ==================== INVENTORY ====================

export async function getBatches(filters?: { status?: string; category?: string }) {
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
  return data as Batch[]
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

export async function getBatchById(id: string) {
  const { data, error } = await supabase
    .from('batches')
    .select('*, nomenclature:nomenclatures(*)')
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
  ] = await Promise.all([
    supabase.from('cultures').select('*', { count: 'exact', head: true }),
    supabase.from('cultures').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('banks').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['PENDING', 'IN_PROGRESS']),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('containers').select('*', { count: 'exact', head: true }).eq('status', 'IN_CULTURE'),
  ])

  return {
    totalCultures: culturesResult.count || 0,
    activeCultures: activeCulturesResult.count || 0,
    totalBanks: banksResult.count || 0,
    pendingOrders: pendingOrdersResult.count || 0,
    pendingTasks: pendingTasksResult.count || 0,
    activeContainers: activeContainersResult.count || 0,
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

export async function getTissueTypes() {
  const { data, error } = await supabase
    .from('tissue_types')
    .select('*')
    .eq('is_active', true)
    .order('name')

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

export async function getContainerTypes() {
  const { data, error } = await supabase
    .from('container_types')
    .select('*')
    .eq('is_active', true)
    .order('name')
  
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

export async function getCultureTypes() {
  const { data, error } = await supabase
    .from('culture_types')
    .select('*')
    .eq('is_active', true)
    .order('name')
  
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
    .select('*, storage_position:positions(*), created_by_user:users(*)')
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
    .select('*, storage_position:positions(*)')
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

export async function getEquipment(filters?: { type?: string; status?: string }) {
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
    .single()
  
  if (error) throw error
  return data
}

export async function createEquipmentLog(equipmentId: string, log: { temperature: number; notes?: string }) {
  const { data: logData, error: logError } = await supabase
    .from('equipment_logs')
    .insert({
      equipment_id: equipmentId,
      temperature: log.temperature,
      notes: log.notes,
      logged_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (logError) throw logError
  
  const { error: updateError } = await supabase
    .from('equipment')
    .update({ current_temperature: log.temperature })
    .eq('id', equipmentId)
  
  if (updateError) throw updateError
  
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
    .single()
  
  if (error) throw error
  return data
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
    .select('*, position:positions(*)')
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
  container_type_id: string
  target_count: number // количество новых контейнеров
  position_id: string // позиция для новых контейнеров
}

export interface PassageMediaData {
  dissociation_batch_id?: string
  dissociation_rm_id?: string
  wash_batch_id?: string
  wash_rm_id?: string
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
  
  // 3. Генерация lot_number
  const { count: lotCount } = await supabase
    .from('lots')
    .select('*', { count: 'exact', head: true })
    .eq('culture_id', sourceLot.culture_id)

  const lotNumber = `L${(lotCount || 0) + 1}`

  // 4. Создать новый лот для результатов
  const { data: newLot, error: newLotError } = await supabase
    .from('lots')
    .insert({
      lot_number: lotNumber,
      culture_id: sourceLot.culture_id,
      passage_number: newPassageNumber,
      parent_lot_id: data.split_mode === 'partial' ? data.source_lot_id : null,
      status: 'ACTIVE',
      seeded_at: new Date().toISOString()
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
  
  // 5. Создать новые контейнеры-результаты
  const resultContainers = []
  for (let i = 0; i < data.result.target_count; i++) {
    // Генерация кода контейнера
    const { count: containerCount } = await supabase
      .from('containers')
      .select('*', { count: 'exact', head: true })
      .like('code', `CT-%`)
    
    const cultureCode = sourceLot.culture_id.substring(0, 4).toUpperCase()
    const containerCode = `CT-${cultureCode}-L${newLot.id.substring(0, 1).toUpperCase()}-P${newPassageNumber}-${data.result.container_type_id.substring(0, 2).toUpperCase()}-${String((containerCount || 0) + i + 1).padStart(3, '0')}`
    
    const { data: newContainer, error: containerError } = await supabase
      .from('containers')
      .insert({
        lot_id: newLot.id,
        container_type_id: data.result.container_type_id,
        position_id: data.result.position_id,
        status: 'ACTIVE',
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
  
  // 7. Обновить SOURCE контейнеры -> DISPOSE
  for (const sourceContainer of data.source_containers) {
    const { error: disposeError } = await supabase
      .from('containers')
      .update({ status: 'DISPOSE' })
      .eq('id', sourceContainer.container_id)
    
    if (disposeError) throw disposeError
  }
  
  // 8. Создать Operation_Metrics
  const { error: metricsError } = await supabase
    .from('operation_metrics')
    .insert({
      operation_id: operation.id,
      concentration: data.metrics.concentration,
      viability_percent: data.metrics.viability_percent,
      volume_ml: data.metrics.volume_ml,
      passage_yield: data.result.target_count
    })
  
  if (metricsError) throw metricsError
  
  // 9. Создать Operation_Media для сред
  const operationMedia = []
  
  if (data.media.dissociation_batch_id) {
    operationMedia.push({
      operation_id: operation.id,
      batch_id: data.media.dissociation_batch_id,
      purpose: 'dissociation'
    })
  }
  if (data.media.dissociation_rm_id) {
    operationMedia.push({
      operation_id: operation.id,
      ready_medium_id: data.media.dissociation_rm_id,
      purpose: 'dissociation'
    })
  }
  if (data.media.wash_batch_id) {
    operationMedia.push({
      operation_id: operation.id,
      batch_id: data.media.wash_batch_id,
      purpose: 'wash'
    })
  }
  if (data.media.wash_rm_id) {
    operationMedia.push({
      operation_id: operation.id,
      ready_medium_id: data.media.wash_rm_id,
      purpose: 'wash'
    })
  }
  
  if (operationMedia.length > 0) {
    const { error: mediaError } = await supabase
      .from('operation_media')
      .insert(operationMedia)
    
    if (mediaError) throw mediaError
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
  
  return {
    operation,
    newLot,
    resultContainers
  }
}

// ==================== FEED OPERATIONS ====================

export interface FeedContainerData {
  container_id: string
  medium_id: string
  volume_ml: number
}

// FEFO: Get available media sorted by expiration date (FEFO - First Expired, First Out)
export async function getAvailableMediaForFeed(batchId?: string) {
  let query = supabase
    .from('ready_media')
    .select('*')
    .eq('status', 'ACTIVE')
    .gt('current_volume_ml', 0)
    .gt('expiration_date', new Date().toISOString().split('T')[0]) // Not expired
    .order('expiration_date', { ascending: true }) // FEFO: earliest expiration first
  
  if (batchId) {
    query = query.eq('batch_id', batchId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

// Get consumable batches matching a container type name (for write-off during culture creation)
export async function getConsumableBatchesForContainerType(containerTypeName: string) {
  const { data, error } = await supabase
    .from('batches')
    .select('*, nomenclature:nomenclatures(*)')
    .gt('quantity', 0)
    .in('status', ['ACTIVE', 'AVAILABLE'])
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
      type: 'FEED',
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
    .filter(container => container.medium_id)
    .map(container => ({
      operation_id: operation.id,
      ready_medium_id: container.medium_id,
      quantity_ml: container.volume_ml,
      purpose: 'FEED'
    }))
  
  if (operationMedia.length > 0) {
    const { error: omError } = await supabase
      .from('operation_media')
      .insert(operationMedia)
    
    if (omError) throw omError
  }
  
  // 4. Обновить current_volume_ml у ReadyMedia
  for (const container of data.containers) {
    if (container.medium_id) {
      const medium = await getReadyMediumById(container.medium_id)
      if (medium) {
        const currentVolume = medium.current_volume_ml || medium.volume_ml || 0
        const newVolume = currentVolume - container.volume_ml
        
        // Обновить volume_ml в ReadyMedia
        await supabase
          .from('ready_media')
          .update({ current_volume_ml: Math.max(0, newVolume) })
          .eq('id', container.medium_id)
        
        // 5. Создать inventory_movement запись (расход)
        await createInventoryMovement({
          batch_id: medium.batch_id || null,
          operation_id: operation.id,
          movement_type: 'CONSUME',
          quantity_change: -container.volume_ml,
          quantity_after: Math.max(0, newVolume),
          moved_at: new Date().toISOString()
        })
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
  freezing_medium: string
  viability_percent: number
  concentration: number
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
    const { data: newBank, error: bankError } = await supabase
      .from('banks')
      .insert({
        culture_id: lot.culture_id,
        lot_id: data.lot_id,
        bank_type: bankType,
        status: 'QC_PENDING', // Требует QC!
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
        status: 'QC_PENDING' // Все равно требует QC!
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
    const cultureCode = lot.culture?.name?.substring(0, 4).toUpperCase() || 'UNK'
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
  
  // 7. Обновить контейнеры-источники -> FROZEN (не IN_BANK!)
  for (const containerId of data.container_ids) {
    await supabase
      .from('containers')
      .update({ status: 'IN_BANK' })
      .eq('id', containerId)
  }
  
  // 8. Создать Operation_Metrics
  await supabase
    .from('operation_metrics')
    .insert({
      operation_id: operation.id,
      concentration: data.concentration,
      viability_percent: data.viability_percent,
      total_cells: data.total_cells,
      volume_ml: data.cryo_vial_count // примерно
    })
  
  // 9. Создать QC-задачу через createQCTask()
  if (bankId) {
    await createQCTask(bankId)
  }
  
  // 10. Создать уведомление о необходимости QC
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
  thaw_medium_id: string
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
  
  // 3. Генерация lot_number для нового лота
  const { count: thawLotCount } = await supabase
    .from('lots')
    .select('*', { count: 'exact', head: true })
    .eq('culture_id', parentLot.culture_id)

  const thawLotNumber = `L${(thawLotCount || 0) + 1}`

  // 4. Создать новый лот
  const { data: newLot, error: newLotError } = await supabase
    .from('lots')
    .insert({
      lot_number: thawLotNumber,
      culture_id: parentLot.culture_id,
      passage_number: newPassageNumber,
      parent_lot_id: parentLot.id,
      status: 'ACTIVE',
      seeded_at: new Date().toISOString(),
      notes: `Thaw from bank ${cryoVial.bank?.bank_type}`
    })
    .select()
    .single()
  
  if (newLotError) throw newLotError
  
  // 4. Создать Container для размороженной культуры
  const { count: containerCount } = await supabase
    .from('containers')
    .select('*', { count: 'exact', head: true })
    .like('code', `CT-%`)
  
  const cultureCode = parentLot.culture_id?.substring(0, 4).toUpperCase() || 'UNK'
  const containerTypeCode = data.container_type_id ? data.container_type_id.substring(0, 2).toUpperCase() : 'CT'
  const containerCode = `CT-${cultureCode}-L${newLot.id.substring(0, 1).toUpperCase()}-P${newPassageNumber}-${containerTypeCode}-${String((containerCount || 0) + 1).padStart(3, '0')}`
  
  const { data: newContainer, error: containerError } = await supabase
    .from('containers')
    .insert({
      lot_id: newLot.id,
      container_type_id: data.container_type_id,
      position_id: data.position_id,
      status: 'ACTIVE',
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
  
  // 8. Обновить крио_vial: status=THAWED, thaw_date=today
  await supabase
    .from('cryo_vials')
    .update({ 
      status: 'THAWED',
      thaw_date: new Date().toISOString().split('T')[0]
    })
    .eq('id', data.cryo_vial_id)
  
  // 9. Создать Operation_Media для среды разморозки
  await supabase
    .from('operation_media')
    .insert({
      operation_id: operation.id,
      ready_medium_id: data.thaw_medium_id,
      purpose: 'thaw'
    })
  
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
