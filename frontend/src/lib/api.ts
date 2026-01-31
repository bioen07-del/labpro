// API functions for LabPro - Supabase integration
import { createClient } from '@supabase/supabase-js'
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

// Initialize Supabase client - uses environment variables from Vercel
// Fallback значения для разработки (должны быть переопределены в Vercel Dashboard)
const DEFAULT_SUPABASE_URL = 'https://cyyqzuuozuzlhdlzvohh.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5eXF6dXVvenV6bGhkbHp2b2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDMwOTksImV4cCI6MjA4NTQxOTA5OX0.XsrKQc78LNYVZbqPpOlg4zSyFctgFTagUGOYrE5yn2k'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

// ==================== CULTURES ====================

export async function getCultures(filters?: { status?: string; type_id?: string }) {
  let query = supabase
    .from('cultures')
    .select(`
      *,
      culture_type:culture_types(*)
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

// ==================== CULTURES ====================

export async function createCulture(culture: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('cultures')
    .insert(culture)
    .select()
    .single()
  
  if (error) throw error
  return data
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
      containers:containers(*)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// ==================== BANKS ====================

export async function getBanks(filters?: { status?: string; type?: string }) {
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

export async function getContainers(filters?: { bank_id?: string; status?: string }) {
  let query = supabase
    .from('containers')
    .select(`
      *,
      lot:lots(
        *,
        culture:cultures(
          *,
          culture_type:culture_types(*)
        )
      )
    `)
    .order('code')
  
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

export async function getContainerById(id: string) {
  const { data, error } = await supabase
    .from('containers')
    .select(`
      *,
      lot:lots(*),
      bank:banks(*),
      operations:operations(*)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// ==================== OPERATIONS ====================

export async function getOperations(filters?: { container_id?: string; type?: string }) {
  let query = supabase
    .from('operations')
    .select(`
      *,
      container:containers(
        *,
        lot:lots(
          *,
          culture:cultures(
            *,
            culture_type:culture_types(*)
          )
        )
      )
    `)
    .order('started_at', { ascending: false })
  
  if (filters?.container_id) {
    query = query.eq('container_id', filters.container_id)
  }
  if (filters?.type) {
    query = query.eq('type', filters.type)
  }
  
  const { data, error } = await query
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
  // Создаем операцию OBSERVE
  const { data: operation, error: opError } = await supabase
    .from('operations')
    .insert({
      lot_id: data.lot_id,
      operation_type: 'OBSERVE',
      status: 'COMPLETED',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      notes: data.notes
    })
    .select()
    .single()
  
  if (opError) throw opError
  
  // Создаем записи operation_container и обновляем контейнеры
  const operationContainers = data.containers.map(container => ({
    operation_id: operation.id,
    container_id: container.container_id,
    confluent_percent: container.confluent_percent,
    morphology: container.morphology,
    contaminated: container.contaminated
  }))
  
  const { error: ocError } = await supabase
    .from('operation_containers')
    .insert(operationContainers)
  
  if (ocError) throw ocError
  
  // Обновляем контейнеры
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
  // Определяем lot_id в зависимости от типа объекта
  let lot_id: string | null = null
  
  if (data.target_type === 'container') {
    const container = await getContainerById(data.target_id)
    lot_id = container?.lot_id
  }
  
  // Создаем операцию DISPOSE
  const { data: operation, error: opError } = await supabase
    .from('operations')
    .insert({
      lot_id,
      operation_type: 'DISPOSE',
      status: 'COMPLETED',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      notes: `${data.reason}${data.notes ? '. ' + data.notes : ''}`
    })
    .select()
    .single()
  
  if (opError) throw opError
  
  // Обновляем статус объекта
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
  
  const { error: updateError } = await supabase
    .from(tableName)
    .update({ status: statusValue })
    .eq('id', data.target_id)
  
  if (updateError) throw updateError
  
  // Если все контейнеры лота утилизированы - закрываем лот
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
  // Generate order number
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
  if (error) throw error
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
  const [lotsResult, banksResult, ordersResult, containersResult] = await Promise.all([
    supabase.from('lots').select('status', { count: 'exact', head: true }),
    supabase.from('banks').select('status', { count: 'exact', head: true }),
    supabase.from('orders').select('status', { count: 'exact', head: true }),
    supabase.from('containers').select('status', { count: 'exact', head: true }),
  ])
  
  return {
    totalLots: lotsResult.count || 0,
    totalBanks: banksResult.count || 0,
    totalOrders: ordersResult.count || 0,
    totalContainers: containersResult.count || 0,
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

// Subscribe to real-time updates
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
    .select('*, tissues(*)')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function createDonor(donor: Record<string, unknown>) {
  // Generate donor code
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
  // Generate RM code
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
  // Создаем запись лога
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
  
  // Обновляем текущую температуру оборудования
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
  // Generate bank code
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
}) {
  let query = supabase
    .from('audit_logs')
    .select('*, user:users(*)')
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
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getAuditLogById(id: string) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, user:users(*)')
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

// ==================== REAL-TIME SUBSCRIPTIONS ====================

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
