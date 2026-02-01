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

export async function getContainers(filters?: { lot_id?: string; container_status?: string }) {
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
      ),
      container_type:container_types(*)
    `)
    .order('code')
  
  if (filters?.lot_id) {
    query = query.eq('lot_id', filters.lot_id)
  }
  if (filters?.container_status) {
    query = query.eq('container_status', filters.container_status)
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
    query = query.eq('operation_type', filters.type)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
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
      operation_type: 'DISPOSE',
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
  if (data.target_type === 'container') {
    updateField = 'container_status'
  }
  
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
  const { data, error } = await supabase
    .from('containers')
    .select(`
      *,
      lot:lots(
        *,
        culture:cultures(
          *,
          culture_type:culture_types(*)
        )
      ),
      position:positions(*)
    `)
    .eq('qr_code', qrCode)
    .single()
  
  if (error) throw error
  return data
}

export async function getEquipmentByQR(qrCode: string) {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('qr_code', qrCode)
    .single()
  
  if (error) throw error
  return data
}

export async function getCultureByQR(qrCode: string) {
  const { data, error } = await supabase
    .from('cultures')
    .select(`
      *,
      culture_type:culture_types(*),
      lots:lots(*)
    `)
    .eq('qr_code', qrCode)
    .single()
  
  if (error) throw error
  return data
}

export async function getLotByQR(qrCode: string) {
  const { data, error } = await supabase
    .from('lots')
    .select(`
      *,
      culture:cultures(
        *,
        culture_type:culture_types(*)
      ),
      containers:containers(*)
    `)
    .eq('qr_code', qrCode)
    .single()
  
  if (error) throw error
  return data
}

export async function getBankByQR(qrCode: string) {
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
    .eq('qr_code', qrCode)
    .single()
  
  if (error) throw error
  return data
}

export async function getReadyMediumByQR(qrCode: string) {
  const { data, error } = await supabase
    .from('ready_media')
    .select('*, storage_position:positions(*)')
    .eq('qr_code', qrCode)
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

export async function getNotifications(filters?: { is_read?: boolean; category?: string; limit?: number }) {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (filters?.is_read !== undefined) {
    query = query.eq('is_read', filters.is_read)
  }
  if (filters?.category) {
    query = query.eq('category', filters.category)
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
  
  if (error) throw error
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
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('is_read', false)
  
  if (error) throw error
}

export async function deleteNotification(id: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function getUnreadNotificationCount() {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)
  
  if (error) throw error
  return count || 0
}

// ==================== PASSAGE OPERATIONS ====================

export interface PassageContainerData {
  container_id: string
  split_ratio: number
  new_confluent_percent: number
  seeded_cells: number
  notes?: string
}

export async function createOperationPassage(data: {
  lot_id: string
  containers: PassageContainerData[]
  notes?: string
}) {
  const { data: operation, error: opError } = await supabase
    .from('operations')
    .insert({
      lot_id: data.lot_id,
      operation_type: 'PASSAGE',
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
    split_ratio: container.split_ratio,
    new_confluent_percent: container.new_confluent_percent,
    seeded_cells: container.seeded_cells,
    notes: container.notes
  }))
  
  const { error: ocError } = await supabase
    .from('operation_containers')
    .insert(operationContainers)
  
  if (ocError) throw ocError
  
  for (const container of data.containers) {
    const { data: currentContainer } = await supabase
      .from('containers')
      .select('passage_count')
      .eq('id', container.container_id)
      .single()
    
    const newPassageCount = (currentContainer?.passage_count || 0) + 1
    
    const { error: updateError } = await supabase
      .from('containers')
      .update({
        confluent_percent: container.new_confluent_percent,
        passage_count: newPassageCount
      })
      .eq('id', container.container_id)
    
    if (updateError) throw updateError
  }
  
  return operation
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
            // In production, you might want to throw an error or show a warning
          }
        }
      }
    }
  }
  const { data: operation, error: opError } = await supabase
    .from('operations')
    .insert({
      lot_id: data.lot_id,
      operation_type: 'FEED',
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
    role: 'SOURCE'
  }))
  
  const { error: ocError } = await supabase
    .from('operation_containers')
    .insert(operationContainers)
  
  if (ocError) throw ocError
  
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
  
  for (const container of data.containers) {
    if (container.medium_id) {
      const medium = await getReadyMediumById(container.medium_id)
      if (medium) {
        const newVolume = (medium.current_volume_ml || medium.volume_ml) - container.volume_ml
        await supabase
          .from('ready_media')
          .update({ current_volume_ml: Math.max(0, newVolume) })
          .eq('id', container.medium_id)
      }
    }
  }
  
  return operation
}

// ==================== AUTO TASKS ====================

export interface AutoTaskData {
  type: 'PASSAGE' | 'FEED' | 'OBSERVE' | 'QC' | 'BANK_CHECK' | 'MEDIA_PREP'
  target_id: string // container_id, lot_id, or bank_id
  target_type: 'container' | 'lot' | 'bank'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_days: number // days from now
  notes?: string
}

// Create automatic task after operation completion
export async function createAutoTask(data: AutoTaskData) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + data.due_days)
  
  const taskTypeMap = {
    PASSAGE: 'passage',
    FEED: 'feed',
    OBSERVE: 'observe',
    QC: 'qc',
    BANK_CHECK: 'bank_check',
    MEDIA_PREP: 'media_prep'
  }
  
  const taskData = {
    type: taskTypeMap[data.type],
    status: 'PENDING',
    priority: data.priority,
    due_date: dueDate.toISOString(),
    container_id: data.target_type === 'container' ? data.target_id : null,
    lot_id: data.target_type === 'lot' ? data.target_id : null,
    bank_id: data.target_type === 'bank' ? data.target_id : null,
    notes: data.notes,
    created_at: new Date().toISOString()
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
    target_type: 'container',
    priority: 'medium',
    due_days: daysUntilNext,
    notes: 'Автоматическая задача: следующий пассаж'
  })
}

// Create observation task for containers reaching target confluence
export async function createObserveTask(containerId: string, targetConfluence: number = 80) {
  return createAutoTask({
    type: 'OBSERVE',
    target_id: containerId,
    target_type: 'container',
    priority: 'low',
    due_days: 0,
    notes: `Проверка при достижении ${targetConfluence}% конфлюэнтности`
  })
}

// Create QC task after freeze operation
export async function createQCTask(bankId: string) {
  return createAutoTask({
    type: 'QC',
    target_id: bankId,
    target_type: 'bank',
    priority: 'high',
    due_days: 1,
    notes: 'Контроль качества после заморозки'
  })
}

// Create feed task based on media type and schedule
export async function createFeedTask(lotId: string, mediaType: string, scheduleDays: number = 2) {
  return createAutoTask({
    type: 'FEED',
    target_id: lotId,
    target_type: 'lot',
    priority: 'medium',
    due_days: scheduleDays,
    notes: `Кормление: ${mediaType}`
  })
}

// ==================== FREEZE OPERATIONS ====================

export interface FreezeData {
  lot_id: string
  container_id: string
  bank_id?: string
  cryo_vial_count: number
  freezer_position_id?: string
  freezing_medium: string
  notes?: string
}

export async function createOperationFreeze(data: FreezeData) {
  const { data: operation, error: opError } = await supabase
    .from('operations')
    .insert({
      lot_id: data.lot_id,
      operation_type: 'FREEZE',
      status: 'COMPLETED',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      notes: data.notes
    })
    .select()
    .single()
  
  if (opError) throw opError
  
  const cryoVials = []
  for (let i = 0; i < data.cryo_vial_count; i++) {
    const { count: vialCount } = await supabase
      .from('cryo_vials')
      .select('*', { count: 'exact', head: true })
      .eq('bank_id', data.bank_id || null)
    
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const vialCode = `CV-${String((vialCount || 0) + i + 1).padStart(3, '0')}-${today}`
    
    const { data: vial, error: vialError } = await supabase
      .from('cryo_vials')
      .insert({
        bank_id: data.bank_id || null,
        lot_id: data.lot_id,
        code: vialCode,
        freezing_date: new Date().toISOString().split('T')[0],
        position_id: data.freezer_position_id || null,
        status: 'IN_STOCK'
      })
      .select()
      .single()
    
    if (vialError) throw vialError
    cryoVials.push(vial)
  }
  
  const { error: ocError } = await supabase
    .from('operation_containers')
    .insert({
      operation_id: operation.id,
      container_id: data.container_id,
      role: 'SOURCE',
      notes: `Заморозка ${data.cryo_vial_count} ампул, среда: ${data.freezing_medium}`
    })
  
  if (ocError) throw ocError
  
  if (data.bank_id) {
    const { data: bank } = await supabase
      .from('banks')
      .select('cryo_vials_count')
      .eq('id', data.bank_id)
      .single()
    
    await supabase
      .from('banks')
      .update({ 
        cryo_vials_count: (bank?.cryo_vials_count || 0) + data.cryo_vial_count,
        status: 'IN_STOCK'
      })
      .eq('id', data.bank_id)
  }
  
  await supabase
    .from('containers')
    .update({ container_status: 'IN_BANK' })
    .eq('id', data.container_id)
  
  return { operation, cryoVials }
}
