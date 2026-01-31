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

// Initialize Supabase client (use any for now until schema is deployed)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ==================== CULTURE TYPES ====================

export async function getCultureTypes() {
  const { data, error } = await supabase
    .from('culture_types')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data as CultureType[]
}

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

// ==================== LOTS ====================

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
      culture:cultures(*),
      containers:containers(*)
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
